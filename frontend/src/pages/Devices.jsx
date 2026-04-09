import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Tablet, Wifi, WifiOff, Settings, ShieldCheck, X, CheckCircle, AlertCircle, Loader2, Server, Info } from 'lucide-react';

const API = 'http://localhost:5000';

const Devices = () => {
  const [devices, setDevices] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [syncHistory, setSyncHistory] = useState([]);
  const [configDevice, setConfigDevice] = useState(null);
  const [testResult, setTestResult] = useState(null);
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newDevice, setNewDevice] = useState({ device_name: '', ip_address: '', adms_status: false });

  useEffect(() => {
    fetchDevices();
  }, []);

  const fetchDevices = async () => {
    try {
      const res = await axios.get(`${API}/api/devices`);
      setDevices(res.data);
    } catch (err) {
      console.error('Failed to fetch devices');
    }
  };

  const handleAddDevice = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API}/api/devices`, newDevice);
      setShowAddModal(false);
      setNewDevice({ device_name: '', ip_address: '', adms_status: false });
      fetchDevices();
    } catch (err) {
      alert('Failed to add device');
    }
  };

  const deleteDevice = async (id) => {
    if (window.confirm('Are you sure you want to delete this device?')) {
      try {
        await axios.delete(`${API}/api/devices/${id}`);
        fetchDevices();
      } catch (err) {
        alert('Failed to delete device');
      }
    }
  };

  const downloadUsers = async (id) => {
    try {
      const res = await axios.post(`${API}/api/devices/${id}/download-users`);
      alert(res.data.message || 'Download users command queued');
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to queue download users command');
    }
  };

  const openConfigModal = (device) => {
    setConfigDevice({ ...device });
    setTestResult(null);
    setShowConfigModal(true);
  };

  const handleConfigSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await axios.put(`${API}/api/devices/${configDevice.device_id}`, configDevice);
      setShowConfigModal(false);
      fetchDevices();
    } catch (err) {
      alert('Failed to update device: ' + (err.response?.data?.error || err.message));
    } finally {
      setSaving(false);
    }
  };

  const testConnection = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await axios.get(`${API}/api/devices/${configDevice.device_id}/test`);
      setTestResult(res.data);
    } catch (err) {
      setTestResult({ status: 'error', message: err.response?.data?.error || 'Test failed' });
    } finally {
      setTesting(false);
    }
  };

  // Get local machine IP hint
  const getADMSUrl = () => {
    return `http://<YOUR_PC_IP>:5000`;
  };

  const fetchSyncHistory = async () => {
    try {
      const res = await axios.get(`${API}/api/devices/sync-history`);
      setSyncHistory(res.data);
      setShowHistoryModal(true);
    } catch (err) {
      alert('Failed to fetch sync history');
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1>Device Management (eSSL)</h1>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button 
            onClick={fetchSyncHistory}
            className="btn" 
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(255,255,255,0.05)', color: 'white' }}
          >
            <Server size={18} /> Sync History
          </button>
          <button 
            onClick={() => setShowAddModal(true)}
            className="btn btn-primary" 
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <Tablet size={18} /> Add Device
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '1.5rem' }}>
        {devices.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: '1rem', gridColumn: '1 / -1' }}>
            <Tablet size={48} style={{ opacity: 0.2, margin: '0 auto 1.5rem' }} />
            <h3 style={{ color: 'var(--text-muted)' }}>No devices configured</h3>
            <p style={{ color: 'var(--text-muted)', marginTop: '0.5rem' }}>Add your eSSL biometric devices to start syncing access control.</p>
          </div>
        ) : (
          devices.map(device => (
            <div key={device.device_id} style={{ background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: '1rem', padding: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <h3 style={{ margin: 0 }}>{device.device_name}</h3>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>IP: {device.ip_address} • ADMS: {device.adms_status ? 'ON' : 'OFF'}</p>
                  {device.sn && <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>SN: {device.sn}</p>}
                  {device.last_seen && (
                    <p style={{ fontSize: '0.75rem', color: 'var(--accent)', marginTop: '0.25rem', fontWeight: 500 }}>
                      Last Polled: {new Date(device.last_seen).toLocaleTimeString()}
                    </p>
                  )}
                </div>
                {device.adms_status ? <Wifi color="var(--accent)" size={20} /> : <WifiOff color="var(--danger)" size={20} />}
              </div>
              
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1.5rem', flexWrap: 'wrap' }}>
                <button 
                  onClick={() => downloadUsers(device.device_id)}
                  className="btn" 
                  style={{ flex: 1, minWidth: '100px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', fontSize: '0.85rem' }}
                >
                  Download Users
                </button>
                <button 
                  onClick={() => openConfigModal(device)}
                  className="btn" 
                  style={{ flex: 1, minWidth: '90px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', background: 'rgba(255,255,255,0.05)', fontSize: '0.85rem' }}
                >
                  <Settings size={16} /> Config
                </button>
                <button 
                  onClick={() => deleteDevice(device.device_id)}
                  className="btn" 
                  style={{ flex: 1, minWidth: '90px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', fontSize: '0.85rem' }}
                >
                  Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add Device Modal */}
      {showAddModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>Add New Device</h2>
            <form onSubmit={handleAddDevice} style={{ marginTop: '1.5rem' }}>
              <div className="form-group">
                <label>Device Name</label>
                <input 
                  type="text" 
                  required 
                  placeholder="e.g. Main Entrance" 
                  value={newDevice.device_name}
                  onChange={e => setNewDevice({...newDevice, device_name: e.target.value})} 
                />
              </div>
              <div className="form-group">
                <label>IP Address / URL</label>
                <input 
                  type="text" 
                  required 
                  placeholder="e.g. 192.168.1.100" 
                  value={newDevice.ip_address}
                  onChange={e => setNewDevice({...newDevice, ip_address: e.target.value})}
                />
              </div>
              <div className="form-group">
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                  <input 
                    type="checkbox" 
                    checked={newDevice.adms_status}
                    onChange={e => setNewDevice({...newDevice, adms_status: e.target.checked})}
                  />
                  Enable ADMS Push Protocol
                </label>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '2rem' }}>
                <button type="button" className="btn" onClick={() => setShowAddModal(false)} style={{ background: 'transparent' }}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Device</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Config Modal */}
      {showConfigModal && configDevice && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '600px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
                <Settings size={22} /> Device Configuration
              </h2>
              <button 
                className="btn" 
                onClick={() => setShowConfigModal(false)}
                style={{ background: 'transparent', padding: '0.25rem' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleConfigSave}>
              <div className="form-group">
                <label>Device Name</label>
                <input 
                  type="text" 
                  required 
                  value={configDevice.device_name || ''}
                  onChange={e => setConfigDevice({...configDevice, device_name: e.target.value})}
                />
              </div>

              <div className="form-group">
                <label>IP Address</label>
                <input 
                  type="text" 
                  required 
                  placeholder="e.g. 192.168.1.100"
                  value={configDevice.ip_address || ''}
                  onChange={e => setConfigDevice({...configDevice, ip_address: e.target.value})}
                />
              </div>

              <div className="form-group">
                <label>Serial Number (SN)</label>
                <input 
                  type="text" 
                  placeholder="Device serial number (found in device menu)" 
                  value={configDevice.sn || ''}
                  onChange={e => setConfigDevice({...configDevice, sn: e.target.value})}
                />
                <small style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '0.25rem', display: 'block' }}>
                  Find this in Device Menu → System Info → Serial Number
                </small>
              </div>

              <div className="form-group">
                <label>Communication Key</label>
                <input 
                  type="text" 
                  placeholder="Default: 0" 
                  value={configDevice.comm_key || ''}
                  onChange={e => setConfigDevice({...configDevice, comm_key: e.target.value})}
                />
                <small style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '0.25rem', display: 'block' }}>
                  Must match the CommKey set on the physical device (default is 0)
                </small>
              </div>

              <div className="form-group">
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                  <input 
                    type="checkbox" 
                    checked={!!configDevice.adms_status}
                    onChange={e => setConfigDevice({...configDevice, adms_status: e.target.checked})}
                  />
                  Enable ADMS Push Protocol
                </label>
              </div>

              {/* ADMS Setup Instructions */}
              <div style={{ 
                background: 'rgba(99, 102, 241, 0.08)', 
                border: '1px solid rgba(99, 102, 241, 0.25)', 
                borderRadius: '0.75rem', 
                padding: '1rem', 
                marginTop: '1rem',
                marginBottom: '1rem'
              }}>
                <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: 'var(--primary)', marginBottom: '0.75rem' }}>
                  <Server size={16} /> ADMS Device Setup
                </h4>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: '1.7' }}>
                  <p style={{ margin: '0 0 0.5rem' }}>Configure these settings on your <strong>eSSL biometric device</strong>:</p>
                  <ol style={{ margin: 0, paddingLeft: '1.25rem' }}>
                    <li>Go to <strong>Comm. → Cloud Server Setting</strong> on the device</li>
                    <li>Set <strong>Server Address</strong> to: <code style={{ background: 'rgba(255,255,255,0.1)', padding: '0.15rem 0.4rem', borderRadius: '4px' }}>{getADMSUrl()}</code></li>
                    <li>Set <strong>Enable Domain</strong>: No</li>
                    <li>Set <strong>Server Port</strong>: <code style={{ background: 'rgba(255,255,255,0.1)', padding: '0.15rem 0.4rem', borderRadius: '4px' }}>5000</code></li>
                    <li>Set <strong>Enable Proxy Server</strong>: No</li>
                  </ol>
                  <p style={{ margin: '0.75rem 0 0', display: 'flex', alignItems: 'flex-start', gap: '0.35rem' }}>
                    <Info size={14} style={{ marginTop: '2px', flexShrink: 0 }} /> 
                    Replace <code style={{ background: 'rgba(255,255,255,0.1)', padding: '0.15rem 0.4rem', borderRadius: '4px' }}>&lt;YOUR_PC_IP&gt;</code> with this machine's IP on the same network (e.g. 192.168.1.x)
                  </p>
                </div>
              </div>

              {/* Test Connection Button */}
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '1rem', 
                padding: '1rem', 
                background: 'rgba(255,255,255,0.02)', 
                borderRadius: '0.75rem', 
                border: '1px solid var(--border)',
                marginBottom: '1rem'
              }}>
                <button 
                  type="button" 
                  className="btn" 
                  onClick={testConnection}
                  disabled={testing}
                  style={{ 
                    display: 'flex', alignItems: 'center', gap: '0.5rem', 
                    background: 'rgba(16, 185, 129, 0.1)', color: '#10b981',
                    fontSize: '0.85rem', whiteSpace: 'nowrap'
                  }}
                >
                  {testing ? <Loader2 size={16} className="spin" /> : <Wifi size={16} />}
                  {testing ? 'Testing...' : 'Test Connection'}
                </button>

                {testResult && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem' }}>
                    {testResult.status === 'online' ? (
                      <>
                        <CheckCircle size={16} color="#10b981" />
                        <span style={{ color: '#10b981' }}>{testResult.message}</span>
                      </>
                    ) : (
                      <>
                        <AlertCircle size={16} color="#ef4444" />
                        <span style={{ color: '#ef4444' }}>{testResult.message}</span>
                      </>
                    )}
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1.5rem' }}>
                <button type="button" className="btn" onClick={() => setShowConfigModal(false)} style={{ background: 'transparent' }}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Saving...' : 'Save Configuration'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Sync History Modal */}
      {showHistoryModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '800px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2>Device Sync History</h2>
              <button className="btn" onClick={() => setShowHistoryModal(false)} style={{ background: 'transparent', padding: '0.25rem' }}>
                <X size={20} />
              </button>
            </div>
            
            <div className="data-table-container" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
              <table style={{ minWidth: '100%' }}>
                <thead style={{ position: 'sticky', top: 0, background: '#1e293b', zIndex: 10 }}>
                  <tr>
                    <th>Time</th>
                    <th>Device SN</th>
                    <th>Command / Instruction</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {syncHistory.length === 0 ? (
                    <tr>
                      <td colSpan="4" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                        No sync history found. Sync users from the Tenants page.
                      </td>
                    </tr>
                  ) : syncHistory.map(h => {
                    const utcTimeStr = h.created_at?.endsWith('Z') ? h.created_at : h.created_at?.replace(' ', 'T') + 'Z';
                    return (
                    <tr key={h.id}>
                      <td style={{ whiteSpace: 'nowrap' }}>{new Date(utcTimeStr).toLocaleString()}</td>
                      <td>{h.device_sn}</td>
                      <td>
                        <div style={{ 
                          fontSize: '0.8rem', color: 'var(--primary)', 
                          background: 'rgba(99, 102, 241, 0.1)', padding: '4px 8px', 
                          borderRadius: '4px', wordBreak: 'break-all', fontFamily: 'monospace' 
                        }}>
                          {h.command}
                        </div>
                      </td>
                      <td>
                        <span style={{ 
                          fontSize: '0.75rem', fontWeight: 600, padding: '0.2rem 0.5rem', borderRadius: '4px', whiteSpace: 'nowrap',
                          background: h.executed ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                          color: h.executed ? '#10b981' : '#f59e0b'
                        }}>
                          {h.executed ? 'Executed' : 'Pending Queue'}
                        </span>
                      </td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      <div style={{ marginTop: '3rem', background: 'rgba(99, 102, 241, 0.05)', border: '1px solid rgba(99, 102, 241, 0.2)', borderRadius: '1rem', padding: '2rem' }}>
        <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
          <ShieldCheck size={20} color="var(--primary)" /> Advanced Biometric System Features
        </h3>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
          <div style={{ background: 'var(--card-bg)', padding: '1.25rem', borderRadius: '0.75rem', border: '1px solid var(--border)' }}>
            <h4 style={{ fontSize: '0.9rem', color: 'var(--primary)', marginBottom: '0.75rem' }}>Automated User Sync</h4>
            <ul style={{ fontSize: '0.85rem', color: 'var(--text-muted)', paddingLeft: '1.25rem', margin: 0, lineHeight: '1.6' }}>
              <li>Auto-sync tenant data to hardware</li>
              <li>Instant activation on rent payment</li>
              <li>Batch command queuing (Redis support)</li>
            </ul>
          </div>
          
          <div style={{ background: 'var(--card-bg)', padding: '1.25rem', borderRadius: '0.75rem', border: '1px solid var(--border)' }}>
            <h4 style={{ fontSize: '0.9rem', color: 'var(--primary)', marginBottom: '0.75rem' }}>Real-time Monitoring</h4>
            <ul style={{ fontSize: '0.85rem', color: 'var(--text-muted)', paddingLeft: '1.25rem', margin: 0, lineHeight: '1.6' }}>
              <li>Live device status (Online/Offline)</li>
              <li>Instant punch-in notifications (WebSockets)</li>
              <li>Automatic attendance photo capture</li>
            </ul>
          </div>

          <div style={{ background: 'var(--card-bg)', padding: '1.25rem', borderRadius: '0.75rem', border: '1px solid var(--border)' }}>
            <h4 style={{ fontSize: '0.9rem', color: 'var(--primary)', marginBottom: '0.75rem' }}>Stay-Duration Management</h4>
            <ul style={{ fontSize: '0.85rem', color: 'var(--text-muted)', paddingLeft: '1.25rem', margin: 0, lineHeight: '1.6' }}>
              <li>Hardware-level automated expiry</li>
              <li>Custom access time-windows</li>
              <li>Smart data lifecycle cleanup</li>
            </ul>
          </div>
        </div>

        <div style={{ marginTop: '1.5rem', display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem' }}>
            <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#10b981' }}></span>
            <span style={{ color: 'var(--text-muted)' }}>Feature Enabled: Active Sync</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem' }}>
            <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'var(--primary)' }}></span>
            <span style={{ color: 'var(--text-muted)' }}>Premium: ADMS Cloud Push 2.0</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Devices;
