const fs = require('fs');
const path = require('path');
const os = require('os');
const db = require('../../config/database');
const config = require('../../config');

// ── Resolve backup directory ─────────────────────────────────────────────────
let cachedBackupDir = null;

const getBackupDir = () => {
  if (cachedBackupDir) return cachedBackupDir;

  if (process.env.BACKUP_DIR) {
    cachedBackupDir = process.env.BACKUP_DIR;
  } else if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_VERSION) {
    cachedBackupDir = path.join(os.tmpdir(), 'PGMS_Backups');
  } else {
    cachedBackupDir = path.join(os.homedir(), 'Documents', 'PGMS_Backups');
  }
  return cachedBackupDir;
};

const ensureBackupDir = () => {
  let dir = getBackupDir();
  try {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log(`[BACKUP] Created backup directory: ${dir}`);
    }
    // Verify we have read and write permissions for the directory
    fs.accessSync(dir, fs.constants.R_OK | fs.constants.W_OK);
  } catch (err) {
    console.warn(`[BACKUP] Directory ${dir} not accessible:`, err.message);
    console.warn(`[BACKUP] Falling back to os.tmpdir()`);
    dir = path.join(os.tmpdir(), 'PGMS_Backups');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log(`[BACKUP] Created fallback backup directory: ${dir}`);
    }
    cachedBackupDir = dir; // update cache
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

// ── Schema helpers ───────────────────────────────────────────────────────────
const getTableColumns = async (tableName) => {
  const dbType = getDbType();
  if (dbType === 'sqlite') {
    const pragma = await db.raw('PRAGMA table_info(??)', [tableName]);
    return pragma.map(col => col.name);
  } else {
    const res = await db.raw(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = ? AND table_schema = 'public'
    `, [tableName]);
    return res.rows.map(r => r.column_name);
  }
};

const getTableNames = async () => {
  const dbType = getDbType();
  if (dbType === 'sqlite') {
    const tables = await db.raw("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE 'knex_%'");
    return tables.map(t => t.name);
  } else {
    const tables = await db.raw(`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE' AND table_name NOT LIKE 'knex_%'
    `);
    return tables.rows.map(r => r.table_name);
  }
};

// ── Perform Tenant-Specific JSON Backup ─────────────────────────────────────
const backupTenantData = async (userId) => {
  if (!userId) throw new Error('userId is required for tenant backup');
  
  const backupDir = ensureBackupDir();
  const timestamp = getTimestamp();
  const backupFilename = `pgms_backup_user${userId}_${timestamp}.json`;
  const backupPath = path.join(backupDir, backupFilename);

  const tableNames = await getTableNames();
  const backupData = {
    metadata: {
      created_at: new Date().toISOString(),
      type: 'tenant_export',
      user_id: userId,
      version: '1.0'
    },
    tables: {}
  };

  // Export each table
  for (const tableName of tableNames) {
    try {
      const columns = await getTableColumns(tableName);
      let query = db(tableName).select('*');
      
      let includeTable = false;

      if (tableName === 'users') {
        query = query.where('user_id', userId);
        includeTable = true;
      } else if (columns.includes('user_id')) {
        query = query.where('user_id', userId);
        includeTable = true;
      } else if (columns.includes('admin_user_id')) {
        query = query.where('admin_user_id', userId);
        includeTable = true;
      }

      // Super Admin (userId === 1) gets all rows if they do a tenant backup
      if (userId === 1) {
        query = db(tableName).select('*');
        includeTable = true;
      }

      if (includeTable) {
        const rows = await query;
        backupData.tables[tableName] = {
          row_count: rows.length,
          data: rows
        };
      }
    } catch (err) {
      console.error(`[BACKUP] Warning: Could not export table "${tableName}": ${err.message}`);
      backupData.tables[tableName] = { row_count: 0, data: [], error: err.message };
    }
  }

  fs.writeFileSync(backupPath, JSON.stringify(backupData, null, 2), 'utf8');

  const stats = fs.statSync(backupPath);
  console.log(`[BACKUP] ✅ Tenant backup completed: ${backupFilename} (${formatSize(stats.size)})`);
  return {
    filename: backupFilename,
    path: backupPath,
    size: stats.size,
    type: 'json',
    created_at: new Date().toISOString()
  };
};

const performBackup = async (userId) => {
  console.log(`[BACKUP] Starting tenant export for user ${userId}...`);
  return await backupTenantData(userId);
};

// ── List All Backups ─────────────────────────────────────────────────────────
const listBackups = (userId) => {
  const backupDir = ensureBackupDir();
  const userPrefix = `pgms_backup_user${userId}_`;

  const files = fs.readdirSync(backupDir)
    .filter(f => f.startsWith(userPrefix) && f.endsWith('.json'))
    .map(filename => {
      const filepath = path.join(backupDir, filename);
      const stats = fs.statSync(filepath);
      
      let dateMatch = filename.match(/_(\d{4}-\d{2}-\d{2})_(\d{2})(\d{2})(\d{2})\.json/);
      let created_at = stats.mtime.toISOString();

      if (dateMatch) {
        created_at = new Date(`${dateMatch[1]}T${dateMatch[2]}:${dateMatch[3]}:${dateMatch[4]}`).toISOString();
      }

      return {
        filename,
        size: stats.size,
        size_formatted: formatSize(stats.size),
        type: 'json',
        created_at
      };
    })
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at)); // Newest first

  return files;
};

// ── Restore from Backup ─────────────────────────────────────────────────────
const restoreBackup = async (filename, userId) => {
  if (!userId) throw new Error('userId is required for restore');

  const backupDir = getBackupDir();
  const filepath = path.join(backupDir, filename);
  const userPrefix = `pgms_backup_user${userId}_`;

  if (!filepath.startsWith(backupDir) || !filename.startsWith(userPrefix)) {
    throw new Error('Invalid backup filename or unauthorized access');
  }

  if (!fs.existsSync(filepath)) {
    throw new Error('Backup file not found');
  }

  if (filename.endsWith('.json')) {
    // Tenant JSON restore
    const backupData = JSON.parse(fs.readFileSync(filepath, 'utf8'));

    if (backupData.metadata.user_id !== userId) {
      throw new Error('Cannot restore backup belonging to another user');
    }

    // Safety checks
    const targetUserId = backupData.metadata.user_id;

    for (const [tableName, tableData] of Object.entries(backupData.tables)) {
      if (!tableData.data || tableData.data.length === 0) continue;
      try {
        const columns = await getTableColumns(tableName);
        let delQuery = db(tableName);
        
        let shouldClear = false;
        if (tableName === 'users') {
           // Wait, do not delete user row, just update if needed, but for now skip users row deletion to avoid breaking auth
           shouldClear = false; 
        } else if (columns.includes('user_id')) {
           delQuery = delQuery.where('user_id', targetUserId);
           shouldClear = true;
        } else if (columns.includes('admin_user_id')) {
           delQuery = delQuery.where('admin_user_id', targetUserId);
           shouldClear = true;
        }

        if (shouldClear && tableName !== 'users') {
          await delQuery.del(); // Clear existing data
        }

        // Insert in batches of 100
        if (tableName !== 'users') {
          for (let i = 0; i < tableData.data.length; i += 100) {
            const batch = tableData.data.slice(i, i + 100);
            await db(tableName).insert(batch);
          }
        }
      } catch (err) {
        console.error(`[BACKUP] Warning: Could not restore table "${tableName}": ${err.message}`);
      }
    }

    console.log(`[BACKUP] ✅ Tenant database restored from: ${filename}`);
    return { restored: true, filename, type: 'json' };
  } else {
    throw new Error(`Legacy SQLite restores not supported via tenant UI.`);
  }
};

// ── Backup Stats ─────────────────────────────────────────────────────────────
const getBackupStats = (userId) => {
  const backups = listBackups(userId);
  const totalSize = backups.reduce((sum, b) => sum + b.size, 0);

  return {
    total_backups: backups.length,
    total_size: totalSize,
    total_size_formatted: formatSize(totalSize),
    last_backup: backups.length > 0 ? backups[0] : null,
    backup_directory: getBackupDir(),
    db_type: 'tenant_json'
  };
};

// ── Get backup file path for download ────────────────────────────────────────
const getBackupFilePath = (filename, userId) => {
  const backupDir = getBackupDir();
  const filepath = path.join(backupDir, filename);
  const userPrefix = `pgms_backup_user${userId}_`;

  if (!filepath.startsWith(backupDir) || !filename.startsWith(userPrefix)) {
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
const uploadBackup = (originalFilename, fileBuffer, userId) => {
  const backupDir = ensureBackupDir();

  const ext = path.extname(originalFilename).toLowerCase();
  if (ext !== '.json') {
    throw new Error('Invalid file type. Only tenant .json backup files are accepted.');
  }

  let targetFilename = originalFilename;
  const userPrefix = `pgms_backup_user${userId}_`;
  
  if (!originalFilename.startsWith(userPrefix)) {
    const timestamp = getTimestamp();
    targetFilename = `${userPrefix}${timestamp}_uploaded${ext}`;
  }

  let finalPath = path.join(backupDir, targetFilename);
  if (fs.existsSync(finalPath)) {
    const timestamp = getTimestamp();
    targetFilename = `${userPrefix}${timestamp}_uploaded${ext}`;
    finalPath = path.join(backupDir, targetFilename);
  }

  // Validate JSON contents before writing
  try {
    const jsonStr = fileBuffer.toString('utf8');
    const parsed = JSON.parse(jsonStr);
    if (!parsed.metadata || parsed.metadata.user_id !== userId) {
      throw new Error("JSON backup does not belong to your user account.");
    }
  } catch (err) {
    throw new Error('Invalid JSON backup file: ' + err.message);
  }

  fs.writeFileSync(finalPath, fileBuffer);
  const stats = fs.statSync(finalPath);
  console.log(`[BACKUP] ✅ Uploaded tenant backup: ${targetFilename} (${formatSize(stats.size)})`);

  return {
    filename: targetFilename,
    path: finalPath,
    size: stats.size,
    size_formatted: formatSize(stats.size),
    type: 'json',
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
