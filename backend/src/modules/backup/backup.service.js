const fs = require('fs');
const path = require('path');
const os = require('os');
const db = require('../../config/database');
const config = require('../../config');

// ── Resolve backup directory ─────────────────────────────────────────────────
// Default: C:\Users\<user>\Documents\PGMS_Backups (or BACKUP_DIR env override)
const getBackupDir = () => {
  if (process.env.BACKUP_DIR) return process.env.BACKUP_DIR;
  return path.join(os.homedir(), 'Documents', 'PGMS_Backups');
};

const ensureBackupDir = () => {
  const dir = getBackupDir();
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`[BACKUP] Created backup directory: ${dir}`);
  }
  return dir;
};

// ── Detect active database type ──────────────────────────────────────────────
const getDbType = () => {
  return process.env.SUPABASE_DATABASE_URL ? 'postgresql' : 'sqlite';
};

// ── Timestamp helper ─────────────────────────────────────────────────────────
const getTimestamp = () => {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
};

// ── SQLite Backup Strategy ───────────────────────────────────────────────────
const backupSqlite = async () => {
  const backupDir = ensureBackupDir();
  const sourceFile = path.resolve(__dirname, '../../../dev.sqlite3');

  if (!fs.existsSync(sourceFile)) {
    throw new Error('SQLite database file not found: ' + sourceFile);
  }

  const timestamp = getTimestamp();
  const backupFilename = `pgms_backup_${timestamp}.sqlite3`;
  const backupPath = path.join(backupDir, backupFilename);

  // Copy the database file
  fs.copyFileSync(sourceFile, backupPath);

  // Also copy WAL file if it exists (for consistency)
  const walFile = sourceFile + '-wal';
  if (fs.existsSync(walFile)) {
    fs.copyFileSync(walFile, backupPath + '-wal');
  }

  const stats = fs.statSync(backupPath);
  return {
    filename: backupFilename,
    path: backupPath,
    size: stats.size,
    type: 'sqlite',
    created_at: new Date().toISOString()
  };
};

// ── PostgreSQL (Supabase) Backup Strategy ────────────────────────────────────
// Exports all tables as JSON via Knex (no pg_dump CLI required)
const backupPostgresql = async () => {
  const backupDir = ensureBackupDir();
  const timestamp = getTimestamp();
  const backupFilename = `pgms_backup_${timestamp}.json`;
  const backupPath = path.join(backupDir, backupFilename);

  // Get all table names from the public schema
  const tables = await db.raw(`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_type = 'BASE TABLE'
    AND table_name NOT LIKE 'knex_%'
    ORDER BY table_name
  `);

  const tableNames = tables.rows.map(r => r.table_name);
  const backupData = {
    metadata: {
      created_at: new Date().toISOString(),
      type: 'postgresql',
      tables_count: tableNames.length,
      version: '1.0'
    },
    tables: {}
  };

  // Export each table
  for (const tableName of tableNames) {
    try {
      const rows = await db(tableName).select('*');
      backupData.tables[tableName] = {
        row_count: rows.length,
        data: rows
      };
    } catch (err) {
      console.error(`[BACKUP] Warning: Could not export table "${tableName}": ${err.message}`);
      backupData.tables[tableName] = { row_count: 0, data: [], error: err.message };
    }
  }

  fs.writeFileSync(backupPath, JSON.stringify(backupData, null, 2), 'utf8');

  const stats = fs.statSync(backupPath);
  return {
    filename: backupFilename,
    path: backupPath,
    size: stats.size,
    type: 'postgresql',
    created_at: new Date().toISOString()
  };
};

// ── Perform Backup (auto-detect) ─────────────────────────────────────────────
const performBackup = async () => {
  const dbType = getDbType();
  console.log(`[BACKUP] Starting ${dbType} backup...`);

  let result;
  if (dbType === 'sqlite') {
    result = await backupSqlite();
  } else {
    result = await backupPostgresql();
  }

  console.log(`[BACKUP] ✅ Backup completed: ${result.filename} (${formatSize(result.size)})`);
  return result;
};

// ── List All Backups ─────────────────────────────────────────────────────────
const listBackups = () => {
  const backupDir = ensureBackupDir();

  const files = fs.readdirSync(backupDir)
    .filter(f => f.startsWith('pgms_backup_') && (f.endsWith('.sqlite3') || f.endsWith('.json')))
    .map(filename => {
      const filepath = path.join(backupDir, filename);
      const stats = fs.statSync(filepath);
      const type = filename.endsWith('.sqlite3') ? 'sqlite' : 'postgresql';

      // Extract date from filename: pgms_backup_2026-06-21_020000.ext
      const dateMatch = filename.match(/pgms_backup_(\d{4}-\d{2}-\d{2})_(\d{2})(\d{2})(\d{2})/);
      let created_at = stats.mtime.toISOString();
      if (dateMatch) {
        created_at = new Date(`${dateMatch[1]}T${dateMatch[2]}:${dateMatch[3]}:${dateMatch[4]}`).toISOString();
      }

      return {
        filename,
        size: stats.size,
        size_formatted: formatSize(stats.size),
        type,
        created_at
      };
    })
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at)); // Newest first

  return files;
};


// ── Restore from Backup ─────────────────────────────────────────────────────
const restoreBackup = async (filename) => {
  const backupDir = getBackupDir();
  const filepath = path.join(backupDir, filename);

  // Security: prevent path traversal
  if (!filepath.startsWith(backupDir) || !filename.startsWith('pgms_backup_')) {
    throw new Error('Invalid backup filename');
  }

  if (!fs.existsSync(filepath)) {
    throw new Error('Backup file not found');
  }

  const dbType = getDbType();

  if (filename.endsWith('.sqlite3') && dbType === 'sqlite') {
    // SQLite restore: copy backup file over current database
    const targetFile = path.resolve(__dirname, '../../../dev.sqlite3');

    // Create a safety backup before restoring
    const safetyBackup = targetFile + '.pre_restore_backup';
    if (fs.existsSync(targetFile)) {
      fs.copyFileSync(targetFile, safetyBackup);
    }

    fs.copyFileSync(filepath, targetFile);

    // Restore WAL if exists
    const walBackup = filepath + '-wal';
    const walTarget = targetFile + '-wal';
    if (fs.existsSync(walBackup)) {
      fs.copyFileSync(walBackup, walTarget);
    } else if (fs.existsSync(walTarget)) {
      fs.unlinkSync(walTarget);
    }

    // Remove SHM file to force WAL rebuild
    const shmTarget = targetFile + '-shm';
    if (fs.existsSync(shmTarget)) {
      fs.unlinkSync(shmTarget);
    }

    console.log(`[BACKUP] ✅ SQLite database restored from: ${filename}`);
    return { restored: true, filename, type: 'sqlite', note: 'Server restart recommended for full effect.' };

  } else if (filename.endsWith('.json') && dbType === 'postgresql') {
    // PostgreSQL restore: re-import JSON data
    const backupData = JSON.parse(fs.readFileSync(filepath, 'utf8'));

    for (const [tableName, tableData] of Object.entries(backupData.tables)) {
      if (!tableData.data || tableData.data.length === 0) continue;
      try {
        await db(tableName).del(); // Clear existing data
        // Insert in batches of 100
        for (let i = 0; i < tableData.data.length; i += 100) {
          const batch = tableData.data.slice(i, i + 100);
          await db(tableName).insert(batch);
        }
      } catch (err) {
        console.error(`[BACKUP] Warning: Could not restore table "${tableName}": ${err.message}`);
      }
    }

    console.log(`[BACKUP] ✅ PostgreSQL database restored from: ${filename}`);
    return { restored: true, filename, type: 'postgresql' };

  } else {
    throw new Error(`Backup type mismatch. Backup is ${filename.endsWith('.sqlite3') ? 'SQLite' : 'PostgreSQL'} but active database is ${dbType}.`);
  }
};

// ── Backup Stats ─────────────────────────────────────────────────────────────
const getBackupStats = () => {
  const backups = listBackups();
  const totalSize = backups.reduce((sum, b) => sum + b.size, 0);

  return {
    total_backups: backups.length,
    total_size: totalSize,
    total_size_formatted: formatSize(totalSize),
    last_backup: backups.length > 0 ? backups[0] : null,
    backup_directory: getBackupDir(),
    db_type: getDbType()
  };
};

// ── Get backup file path for download ────────────────────────────────────────
const getBackupFilePath = (filename) => {
  const backupDir = getBackupDir();
  const filepath = path.join(backupDir, filename);

  if (!filepath.startsWith(backupDir) || !filename.startsWith('pgms_backup_')) {
    throw new Error('Invalid backup filename');
  }

  if (!fs.existsSync(filepath)) {
    throw new Error('Backup file not found');
  }

  return filepath;
};

// ── Format file size ─────────────────────────────────────────────────────────
const formatSize = (bytes) => {
  if (bytes === 0) return '0 B';
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return (bytes / Math.pow(1024, i)).toFixed(2) + ' ' + sizes[i];
};

// ── Upload a backup file ─────────────────────────────────────────────────────
const uploadBackup = (originalFilename, fileBuffer) => {
  const backupDir = ensureBackupDir();

  // Validate file extension
  const ext = path.extname(originalFilename).toLowerCase();
  if (ext !== '.sqlite3' && ext !== '.json') {
    throw new Error('Invalid file type. Only .sqlite3 and .json backup files are accepted.');
  }

  // Generate a proper backup filename if user uploads with a different name
  let targetFilename = originalFilename;
  if (!originalFilename.startsWith('pgms_backup_')) {
    const timestamp = getTimestamp();
    targetFilename = `pgms_backup_${timestamp}_uploaded${ext}`;
  }

  const targetPath = path.join(backupDir, targetFilename);

  // Don't overwrite existing backups
  if (fs.existsSync(targetPath)) {
    const timestamp = getTimestamp();
    targetFilename = `pgms_backup_${timestamp}_uploaded${ext}`;
  }

  const finalPath = path.join(backupDir, targetFilename);
  fs.writeFileSync(finalPath, fileBuffer);

  const stats = fs.statSync(finalPath);
  console.log(`[BACKUP] ✅ Uploaded backup: ${targetFilename} (${formatSize(stats.size)})`);

  return {
    filename: targetFilename,
    path: finalPath,
    size: stats.size,
    size_formatted: formatSize(stats.size),
    type: ext === '.sqlite3' ? 'sqlite' : 'postgresql',
    created_at: new Date().toISOString()
  };
};

module.exports = {
  performBackup,
  listBackups,
  restoreBackup,
  getBackupStats,
  getBackupFilePath,
  uploadBackup
};
