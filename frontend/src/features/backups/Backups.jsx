import React, { useState, useEffect, useCallback, useRef } from 'react';
import api from '../../services/api';
import {
  Database, Download, RotateCcw, HardDrive, Clock,
  FolderOpen, AlertTriangle, CheckCircle, Loader, Plus, RefreshCw, Shield, Upload
} from 'lucide-react';

const Backups = () => {
  const [backups, setBackups] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState('');
  const [message, setMessage] = useState({ type: '', text: '' });
  const fileInputRef = useRef(null);

  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 5000);
  };

  const fetchData = useCallback(async () => {
    try {
      const [backupsRes, statsRes] = await Promise.all([
        api.get('/api/system/backups'),
        api.get('/api/system/backup-stats')
      ]);
      setBackups(backupsRes.data);
      setStats(statsRes.data);
    } catch (err) {
      console.error('Failed to fetch backups:', err);
      showMessage('error', 'Failed to load backups');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCreateBackup = async () => {
    setActionLoading('create');
    try {
      const res = await api.post('/api/system/backup');
      showMessage('success', `Backup created: ${res.data.backup.filename}`);
      fetchData();
    } catch (err) {
      showMessage('error', err.response?.data?.error || 'Backup failed');
    } finally {
      setActionLoading('');
    }
  };

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.name.endsWith('.sqlite3') && !file.name.endsWith('.json')) {
      showMessage('error', 'Invalid file. Only .sqlite3 and .json backup files are accepted.');
      e.target.value = '';
      return;
    }

    setActionLoading('upload');
    try {
      // Read file as base64
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = reader.result.split(',')[1];
        try {
          const res = await api.post('/api/system/backups/upload', {
            filename: file.name,
            data: base64
          });
          showMessage('success', `Backup uploaded: ${res.data.backup.filename}`);
          fetchData();
        } catch (err) {
          showMessage('error', err.response?.data?.error || 'Upload failed');
        } finally {
          setActionLoading('');
          e.target.value = '';
        }
      };
      reader.onerror = () => {
        showMessage('error', 'Failed to read file');
        setActionLoading('');
        e.target.value = '';
      };
      reader.readAsDataURL(file);
    } catch (err) {
      showMessage('error', 'Upload failed');
      setActionLoading('');
      e.target.value = '';
    }
  };

  const handleDownload = (filename) => {
    const userString = localStorage.getItem('pgms_user');
    const userId = userString ? JSON.parse(userString).user_id : '';
    // Create a temporary link for download
    const link = document.createElement('a');
    link.href = `/api/system/backups/${filename}/download`;
    link.download = filename;
    // Add auth header via fetch + blob
    api.get(`/api/system/backups/${filename}/download`, { responseType: 'blob' })
      .then(res => {
        const url = window.URL.createObjectURL(new Blob([res.data]));
        link.href = url;
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
      })
      .catch(() => showMessage('error', 'Download failed'));
  };


  const handleRestore = async (filename) => {
    if (!window.confirm(
      `⚠️ RESTORE WARNING\n\nThis will REPLACE your current database with the backup "${filename}".\n\nA safety backup will be created automatically before restoring.\n\nAre you absolutely sure?`
    )) return;
    setActionLoading(`restore-${filename}`);
    try {
      const res = await api.post(`/api/system/backups/${filename}/restore`);
      showMessage('success', `Database restored from ${filename}. ${res.data.note || ''}`);
      fetchData();
    } catch (err) {
      showMessage('error', err.response?.data?.error || 'Restore failed');
    } finally {
      setActionLoading('');
    }
  };

  const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit', hour12: true
    });
  };

  const getRelativeTime = (dateStr) => {
    const now = new Date();
    const d = new Date(dateStr);
    const diffMs = now - d;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return `${Math.floor(diffDays / 7)}w ago`;
  };

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)', padding: '10px', borderRadius: '12px', display: 'flex' }}>
              <Database size={24} color="white" />
            </div>
            Database Backups
          </h1>
          <p style={{ color: 'var(--text-muted)', margin: '0.5rem 0 0', fontSize: '0.9rem' }}>
            Manage and schedule automatic database backups to your local computer
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            className="btn"
            onClick={fetchData}
            disabled={loading}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <RefreshCw size={16} className={loading ? 'spin' : ''} /> Refresh
          </button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleUpload}
            accept=".sqlite3,.json"
            style={{ display: 'none' }}
          />
          <button
            className="btn"
            onClick={() => fileInputRef.current?.click()}
            disabled={actionLoading === 'upload'}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', borderColor: 'rgba(16, 185, 129, 0.3)', color: '#34d399' }}
          >
            {actionLoading === 'upload'
              ? <><Loader size={16} className="spin" /> Uploading...</>
              : <><Upload size={16} /> Upload Backup</>
            }
          </button>
          <button
            className="btn btn-primary"
            onClick={handleCreateBackup}
            disabled={actionLoading === 'create'}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            {actionLoading === 'create'
              ? <><Loader size={16} className="spin" /> Backing up...</>
              : <><Plus size={18} /> Create Backup Now</>
            }
          </button>
        </div>
      </div>

      {/* Toast Message */}
      {message.text && (
        <div style={{
          padding: '0.875rem 1.25rem',
          borderRadius: '0.75rem',
          marginBottom: '1.5rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          fontSize: '0.875rem',
          fontWeight: 500,
          animation: 'fadeIn 0.3s ease',
          ...(message.type === 'success'
            ? { background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.2)', color: '#34d399' }
            : { background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', color: '#f87171' }
          )
        }}>
          {message.type === 'success' ? <CheckCircle size={18} /> : <AlertTriangle size={18} />}
          {message.text}
        </div>
      )}

      {/* Stats Cards */}
      {stats && (
        <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
          <div className="stat-card" style={{
            background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(99, 102, 241, 0.02) 100%)',
            border: '1px solid rgba(99, 102, 241, 0.2)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
              <Database size={16} style={{ color: '#818cf8' }} />
              <span className="stat-label" style={{ fontSize: '0.75rem' }}>Total Backups</span>
            </div>
            <div className="stat-value" style={{ color: '#818cf8', fontSize: '1.75rem' }}>{stats.total_backups}</div>
          </div>

          <div className="stat-card" style={{
            background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(16, 185, 129, 0.02) 100%)',
            border: '1px solid rgba(16, 185, 129, 0.2)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
              <HardDrive size={16} style={{ color: '#34d399' }} />
              <span className="stat-label" style={{ fontSize: '0.75rem' }}>Storage Used</span>
            </div>
            <div className="stat-value" style={{ color: '#34d399', fontSize: '1.75rem' }}>{stats.total_size_formatted}</div>
          </div>

          <div className="stat-card" style={{
            background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.1) 0%, rgba(245, 158, 11, 0.02) 100%)',
            border: '1px solid rgba(245, 158, 11, 0.2)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
              <Clock size={16} style={{ color: '#fbbf24' }} />
              <span className="stat-label" style={{ fontSize: '0.75rem' }}>Last Backup</span>
            </div>
            <div className="stat-value" style={{ color: '#fbbf24', fontSize: '1.25rem' }}>
              {stats.last_backup ? getRelativeTime(stats.last_backup.created_at) : 'Never'}
            </div>
          </div>

          <div className="stat-card" style={{
            background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.1) 0%, rgba(139, 92, 246, 0.02) 100%)',
            border: '1px solid rgba(139, 92, 246, 0.2)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
              <Shield size={16} style={{ color: '#a78bfa' }} />
              <span className="stat-label" style={{ fontSize: '0.75rem' }}>Database Type</span>
            </div>
            <div className="stat-value" style={{ color: '#a78bfa', fontSize: '1.25rem', textTransform: 'capitalize' }}>
              {stats.db_type}
            </div>
          </div>
        </div>
      )}

      {/* Backup Directory Info */}
      {stats && (
        <div style={{
          background: 'var(--card-bg)',
          border: '1px solid var(--border)',
          borderRadius: '0.75rem',
          padding: '0.875rem 1.25rem',
          marginBottom: '1.5rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          fontSize: '0.85rem',
          color: 'var(--text-muted)'
        }}>
          <FolderOpen size={16} />
          <span>Backup location: <strong style={{ color: 'var(--text-main)' }}>{stats.backup_directory}</strong></span>
        </div>
      )}

      {/* Backups Table */}
      <div className="data-table-container">
        <table>
          <thead>
            <tr>
              <th>Backup File</th>
              <th>Type</th>
              <th>Size</th>
              <th>Created</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="5" style={{ textAlign: 'center', padding: '3rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', color: 'var(--text-muted)' }}>
                    <Loader size={20} className="spin" /> Loading backups...
                  </div>
                </td>
              </tr>
            ) : backups.length > 0 ? (
              backups.map((backup, idx) => (
                <tr key={backup.filename} style={{
                  animation: `fadeIn 0.3s ease ${idx * 0.05}s both`
                }}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div style={{
                        width: '36px', height: '36px', borderRadius: '8px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: backup.type === 'sqlite'
                          ? 'rgba(16, 185, 129, 0.1)'
                          : 'rgba(99, 102, 241, 0.1)',
                        color: backup.type === 'sqlite' ? '#34d399' : '#818cf8',
                        flexShrink: 0
                      }}>
                        <Database size={16} />
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{backup.filename}</div>
                        {idx === 0 && (
                          <span style={{
                            fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase',
                            background: 'rgba(16, 185, 129, 0.1)', color: '#34d399',
                            padding: '2px 8px', borderRadius: '4px', marginTop: '2px',
                            display: 'inline-block', letterSpacing: '0.05em'
                          }}>
                            Latest
                          </span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td>
                    <span style={{
                      padding: '0.25rem 0.75rem',
                      borderRadius: '2rem',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      background: backup.type === 'sqlite'
                        ? 'rgba(16, 185, 129, 0.1)'
                        : 'rgba(99, 102, 241, 0.1)',
                      color: backup.type === 'sqlite' ? '#34d399' : '#818cf8',
                      textTransform: 'uppercase'
                    }}>
                      {backup.type}
                    </span>
                  </td>
                  <td style={{ fontWeight: 500 }}>{backup.size_formatted}</td>
                  <td>
                    <div style={{ fontSize: '0.875rem' }}>{formatDate(backup.created_at)}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                      {getRelativeTime(backup.created_at)}
                    </div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                      <button
                        className="btn-icon-only"
                        title="Download"
                        onClick={() => handleDownload(backup.filename)}
                        style={{ color: '#34d399' }}
                      >
                        <Download size={16} />
                      </button>
                      <button
                        className="btn-icon-only"
                        title="Restore from this backup"
                        onClick={() => handleRestore(backup.filename)}
                        disabled={actionLoading === `restore-${backup.filename}`}
                        style={{ color: '#fbbf24' }}
                      >
                        {actionLoading === `restore-${backup.filename}`
                          ? <Loader size={16} className="spin" />
                          : <RotateCcw size={16} />
                        }
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="5" style={{ textAlign: 'center', padding: '4rem' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                    <div style={{
                      width: '64px', height: '64px', borderRadius: '16px',
                      background: 'rgba(99, 102, 241, 0.1)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                      <Database size={28} style={{ color: '#818cf8' }} />
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '1rem', marginBottom: '0.25rem' }}>No backups yet</div>
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                        Click "Create Backup Now" to create your first backup
                      </div>
                    </div>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Footer info */}
      <div style={{
        marginTop: '1.5rem',
        padding: '1rem 1.25rem',
        borderRadius: '0.75rem',
        background: 'rgba(99, 102, 241, 0.05)',
        border: '1px solid rgba(99, 102, 241, 0.1)',
        display: 'flex',
        alignItems: 'flex-start',
        gap: '0.75rem',
        fontSize: '0.8rem',
        color: 'var(--text-muted)',
        lineHeight: 1.6
      }}>
        <Shield size={16} style={{ color: '#818cf8', flexShrink: 0, marginTop: '2px' }} />
        <div>
          <strong style={{ color: '#818cf8' }}>Auto-backup enabled</strong> — Your database is automatically backed up every 24 hours.
          All backups are stored on your local computer. You can set <code style={{
            background: 'rgba(99, 102, 241, 0.1)', padding: '1px 6px', borderRadius: '4px', fontSize: '0.75rem'
          }}>BACKUP_INTERVAL_HOURS</code> in your <code style={{
            background: 'rgba(99, 102, 241, 0.1)', padding: '1px 6px', borderRadius: '4px', fontSize: '0.75rem'
          }}>.env</code> file to change the frequency (e.g., <code style={{
            background: 'rgba(99, 102, 241, 0.1)', padding: '1px 6px', borderRadius: '4px', fontSize: '0.75rem'
          }}>168</code> for weekly).
        </div>
      </div>
    </div>
  );
};

export default Backups;
