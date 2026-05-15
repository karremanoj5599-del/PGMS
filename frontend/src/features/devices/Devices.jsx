import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Tablet, Wifi, WifiOff, Settings, ShieldCheck, X, CheckCircle, AlertCircle, Loader2, Server, Info, Fingerprint, RotateCcw, Trash2, Clock, Lock, Unlock, DoorOpen, BellOff, Cpu, UserMinus, AlertTriangle, Volume2, Sliders } from 'lucide-react';

const API = '';

const Devices = () => {
  const [devices, setDevices] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showHwSettingsModal, setShowHwSettingsModal] = useState(false);
  const [showDeleteUserModal, setShowDeleteUserModal] = useState(false);
  const [showFactoryResetModal, setShowFactoryResetModal] = useState(false);
  const [syncHistory, setSyncHistory] = useState([]);
  const [configDevice, setConfigDevice] = useState(null);
  const [targetDevice, setTargetDevice] = useState(null);
  const [testResult, setTestResult] = useState(null);
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newDevice, setNewDevice] = useState({ device_name: '', ip_address: '', port: 4370, machine_id: 1, adms_status: false });
  const [liveEvents, setLiveEvents] = useState([]);
  const [deletePin, setDeletePin] = useState('');
  const [resetConfirm, setResetConfirm] = useState('');
  const [hwSettings, setHwSettings] = useState({
    Volume: 5, DateFormat: 0, Language: 0, DoorSensorType: 0,
    AntiPassback: 0, LockDelay: 5, ComPwd: '', FaceFunOn: 1, FingerFunOn: 1
  });

  useEffect(() => {
    fetchDevices();
    const userString = localStorage.getItem('pgms_user');
    const user = userString ? JSON.parse(userString) : null;
    const user_id = user?.user_id;
    const url = user_id ? `${API}/api/events?user_id=${user_id}` : `${API}/api/events`;
    const es = new EventSource(url);
    es.onmessage = (e) => {
       const data = JSON.parse(e.data);
       setLiveEvents(prev => [data, ...prev].slice(0, 50));
    };
    return () => es.close();
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

  const triggerControl = async (id, action) => {
    try {
      const res = await axios.post(`${API}/api/devices/${id}/control`, { action });
      alert(res.data.message);
    } catch (err) {
       alert(err.response?.data?.error || 'Failed to send command');
    }
  };

  const rebootDevice = async (id) => {
    if (!window.confirm('Are you sure you want to reboot this device?')) return;
    try {
      const res = await axios.post(`${API}/api/devices/${id}/reboot`);
      alert(res.data.message || 'Reboot command queued');
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to queue reboot');
    }
  };

  const clearLogs = async (id) => {
    if (!window.confirm('Are you sure you want to clear ALL attendance logs from this device? This cannot be undone.')) return;
    try {
      const res = await axios.post(`${API}/api/devices/${id}/clear-logs`);
      alert(res.data.message || 'Clear logs command queued');
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to queue clear logs');
    }
  };

  const syncTime = async (id) => {
    try {
      const res = await axios.post(`${API}/api/devices/${id}/sync-time`);
      alert(res.data.message || 'Time sync command queued');
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to queue time sync');
    }
  };

  const queryDeviceInfo = async (id) => {
    try {
      const res = await axios.post(`${API}/api/devices/${id}/query-info`);
      alert(res.data.message);
      setTimeout(fetchDevices, 5000);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to query device info');
    }
  };

  const handleDeleteUser = async () => {
    if (!targetDevice || !deletePin) return;
    try {
      const res = await axios.post(`${API}/api/devices/${targetDevice.device_id}/delete-user`, { pin: deletePin });
      alert(res.data.message);
      setShowDeleteUserModal(false);
      setDeletePin('');
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete user');
    }
  };

  const handleFactoryReset = async () => {
    if (!targetDevice || resetConfirm !== 'RESET') return;
    try {
      const res = await axios.post(`${API}/api/devices/${targetDevice.device_id}/clear-all-data`, { confirmToken: 'RESET' });
      alert(res.data.message);
      setShowFactoryResetModal(false);
      setResetConfirm('');
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to queue factory reset');
    }
  };

  const handleSetOptions = async () => {
    if (!targetDevice) return;
    try {
      const res = await axios.post(`${API}/api/devices/${targetDevice.device_id}/set-options`, hwSettings);
      alert(res.data.message);
      setShowHwSettingsModal(false);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to set options');
    }
  };

  const openConfigModal = async (device) => {
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

  const getADMSUrl = () => `http://<YOUR_PC_IP>:5000`;

  const fetchSyncHistory = async () => {
    try {
      const res = await axios.get(`${API}/api/devices/sync-history`);
      setSyncHistory(res.data);
      setShowHistoryModal(true);
    } catch (err) {
      alert('Failed to fetch sync history');
    }
  };

  const broadcastTemplates = async (id, deviceName) => {
    if (!window.confirm(`Broadcast all saved biometric templates to "${deviceName}"?\n\nThis will push all fingerprints, face, and palm data to this device.`)) return;
    try {
      const res = await axios.post(`${API}/api/devices/${id}/broadcast-templates`);
      alert(res.data.message || 'Templates broadcast queued');
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to broadcast templates');
    }
  };

  // Capacity bar component
  const CapacityBar = ({ label, count, capacity, color }) => {
    const pct = capacity > 0 ? Math.min((count / capacity) * 100, 100) : 0;
    return (
      <div style={{ flex: 1, minWidth: '80px' }}>
        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '2px' }}>{label}</div>
        <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '4px', height: '6px', overflow: 'hidden' }}>
          <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: '4px', transition: 'width 0.3s' }} />
        </div>
        <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '1px' }}>
          {count || 0}{capacity > 0 ? `/${capacity}` : ''}
        </div>
      </div>
    );
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

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: '1.5rem' }}>
        {devices.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: '1rem', gridColumn: '1 / -1' }}>
            <Tablet size={48} style={{ opacity: 0.2, margin: '0 auto 1.5rem' }} />
            <h3 style={{ color: 'var(--text-muted)' }}>No devices configured</h3>
            <p style={{ color: 'var(--text-muted)', marginTop: '0.5rem' }}>Add your eSSL biometric devices to start syncing access control.</p>
          </div>
        ) : (
          devices.map(device => (
            <div key={device.device_id} style={{ background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: '1rem', padding: '1.5rem' }}>
              {/* Header */}
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
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                  {device.adms_status ? <Wifi color="var(--accent)" size={20} /> : <WifiOff color="var(--danger)" size={20} />}
                  {device.firmware_ver && (
                    <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.05)', padding: '2px 6px', borderRadius: '4px' }}>
                      FW: {device.firmware_ver}
                    </span>
                  )}
                </div>
              </div>

              {/* Capacity Bars (show if device has reported info) */}
              {(device.user_count > 0 || device.fp_count > 0 || device.face_count > 0) && (
                <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.75rem', padding: '0.5rem', background: 'rgba(255,255,255,0.02)', borderRadius: '0.5rem' }}>
                  <CapacityBar label="Users" count={device.user_count} capacity={device.user_capacity} color="#3b82f6" />
                  <CapacityBar label="FP" count={device.fp_count} capacity={device.fp_capacity} color="#10b981" />
                  <CapacityBar label="Faces" count={device.face_count} capacity={device.face_capacity} color="#a855f7" />
                  <CapacityBar label="Logs" count={device.att_log_count} capacity={device.att_log_capacity} color="#f59e0b" />
                </div>
              )}
              
              {/* Row 1: Primary Actions */}
              <div style={{ display: 'flex', gap: '0.4rem', marginTop: '1rem', flexWrap: 'wrap' }}>
                <button onClick={() => downloadUsers(device.device_id)} className="btn" title="Download all users from device"
                  style={{ flex: 1, minWidth: '80px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', fontSize: '0.8rem', padding: '0.5rem' }}>
                  Get Users
                </button>
                <button onClick={() => broadcastTemplates(device.device_id, device.device_name)} className="btn" title="Push all biometrics to device"
                  style={{ flex: 1, minWidth: '80px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', background: 'rgba(168, 85, 247, 0.1)', color: '#a855f7', fontSize: '0.8rem', padding: '0.5rem' }}>
                  <Fingerprint size={14} /> Sync Bio
                </button>
                <button onClick={() => queryDeviceInfo(device.device_id)} className="btn" title="Query firmware & capacity info"
                  style={{ flex: 1, minWidth: '70px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', background: 'rgba(99, 102, 241, 0.1)', color: '#6366f1', fontSize: '0.8rem', padding: '0.5rem' }}>
                  <Cpu size={14} /> Info
                </button>
              </div>

              {/* Row 2: Door Controls */}
              <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.4rem', flexWrap: 'wrap' }}>
                <button onClick={() => triggerControl(device.device_id, 'unlock')} className="btn" title="Unlock door for 5 seconds"
                  style={{ flex: 1, minWidth: '70px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.3rem', background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', fontSize: '0.8rem', padding: '0.5rem' }}>
                  <Unlock size={14} /> Unlock
                </button>
                <button onClick={() => triggerControl(device.device_id, 'lock')} className="btn" title="Force lock door"
                  style={{ flex: 1, minWidth: '60px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.3rem', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', fontSize: '0.8rem', padding: '0.5rem' }}>
                  <Lock size={14} /> Lock
                </button>
                <button onClick={() => triggerControl(device.device_id, 'hold_open')} className="btn" title="Hold door open indefinitely"
                  style={{ flex: 1, minWidth: '80px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.3rem', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', fontSize: '0.8rem', padding: '0.5rem' }}>
                  <DoorOpen size={14} /> Hold Open
                </button>
                <button onClick={() => triggerControl(device.device_id, 'alarm_cancel')} className="btn" title="Cancel active alarm"
                  style={{ flex: 1, minWidth: '70px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.3rem', background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b', fontSize: '0.8rem', padding: '0.5rem' }}>
                  <BellOff size={14} /> Alarm
                </button>
              </div>

              {/* Row 3: Maintenance */}
              <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.4rem', flexWrap: 'wrap' }}>
                <button onClick={() => syncTime(device.device_id)} className="btn" title="Sync device clock"
                  style={{ flex: 1, minWidth: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.05)', fontSize: '0.8rem', padding: '0.5rem' }}>
                  <Clock size={14} />
                </button>
                <button onClick={() => rebootDevice(device.device_id)} className="btn" title="Reboot Device"
                  style={{ flex: 1, minWidth: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.05)', fontSize: '0.8rem', padding: '0.5rem' }}>
                  <RotateCcw size={14} />
                </button>
                <button onClick={() => clearLogs(device.device_id)} className="btn" title="Clear Device Logs"
                  style={{ flex: 1, minWidth: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.05)', color: '#f59e0b', fontSize: '0.8rem', padding: '0.5rem' }}>
                  <Trash2 size={14} />
                </button>
                <button onClick={() => { setTargetDevice(device); setShowHwSettingsModal(true); }} className="btn" title="Hardware Settings"
                  style={{ flex: 1, minWidth: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(99, 102, 241, 0.1)', color: '#6366f1', fontSize: '0.8rem', padding: '0.5rem' }}>
                  <Sliders size={14} />
                </button>
                <button onClick={() => openConfigModal(device)} className="btn" title="Device Configuration"
                  style={{ flex: 1, minWidth: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.05)', fontSize: '0.8rem', padding: '0.5rem' }}>
                  <Settings size={14} />
                </button>
                <button onClick={() => { setTargetDevice(device); setDeletePin(''); setShowDeleteUserModal(true); }} className="btn" title="Delete User from Device"
                  style={{ flex: 1, minWidth: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(239, 68, 68, 0.08)', color: '#ef4444', fontSize: '0.8rem', padding: '0.5rem' }}>
                  <UserMinus size={14} />
                </button>
                <button onClick={() => { setTargetDevice(device); setResetConfirm(''); setShowFactoryResetModal(true); }} className="btn" title="Factory Reset (DANGEROUS)"
                  style={{ flex: 1, minWidth: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(239, 68, 68, 0.08)', color: '#ef4444', fontSize: '0.8rem', padding: '0.5rem' }}>
                  <AlertTriangle size={14} />
                </button>
                <button onClick={() => deleteDevice(device.device_id)} className="btn" title="Remove Device from Software"
                  style={{ flex: 1, minWidth: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', fontSize: '0.8rem', padding: '0.5rem' }}>
                  <X size={14} />
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
                <input type="text" required placeholder="e.g. Main Entrance" value={newDevice.device_name}
                  onChange={e => setNewDevice({...newDevice, device_name: e.target.value})} />
              </div>
              <div className="form-group">
                <label>IP Address / URL</label>
                <input type="text" required placeholder="e.g. 192.168.1.100" value={newDevice.ip_address}
                  onChange={e => setNewDevice({...newDevice, ip_address: e.target.value})} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label>Comm Port</label>
                  <input type="number" placeholder="4370" value={newDevice.port}
                    onChange={e => setNewDevice({...newDevice, port: parseInt(e.target.value)})} />
                </div>
                <div className="form-group">
                  <label>Machine ID</label>
                  <input type="number" placeholder="1" value={newDevice.machine_id}
                    onChange={e => setNewDevice({...newDevice, machine_id: parseInt(e.target.value)})} />
                </div>
              </div>
              <div className="form-group">
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                  <input type="checkbox" checked={newDevice.adms_status}
                    onChange={e => setNewDevice({...newDevice, adms_status: e.target.checked})} />
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
              <button className="btn" onClick={() => setShowConfigModal(false)} style={{ background: 'transparent', padding: '0.25rem' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleConfigSave}>
              <div className="form-group">
                <label>Device Name</label>
                <input type="text" required value={configDevice.device_name || ''}
                  onChange={e => setConfigDevice({...configDevice, device_name: e.target.value})} />
              </div>
              <div className="form-group">
                <label>IP Address</label>
                <input type="text" required placeholder="e.g. 192.168.1.100" value={configDevice.ip_address || ''}
                  onChange={e => setConfigDevice({...configDevice, ip_address: e.target.value})} />
              </div>
              <div className="form-group">
                <label>Serial Number (SN)</label>
                <input type="text" placeholder="Device serial number (found in device menu)" value={configDevice.sn || ''}
                  onChange={e => setConfigDevice({...configDevice, sn: e.target.value})} />
                <small style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '0.25rem', display: 'block' }}>
                  Find this in Device Menu → System Info → Serial Number
                </small>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label>Comm Port</label>
                  <input type="number" value={configDevice.port || 4370}
                    onChange={e => setConfigDevice({...configDevice, port: parseInt(e.target.value)})} />
                </div>
                <div className="form-group">
                  <label>Machine ID</label>
                  <input type="number" value={configDevice.machine_id || 1}
                    onChange={e => setConfigDevice({...configDevice, machine_id: parseInt(e.target.value)})} />
                </div>
              </div>
              <div className="form-group">
                <label>Communication Key</label>
                <input type="text" placeholder="Default: 0" value={configDevice.comm_key || ''}
                  onChange={e => setConfigDevice({...configDevice, comm_key: e.target.value})} />
                <small style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '0.25rem', display: 'block' }}>
                  Must match the CommKey set on the physical device (default is 0)
                </small>
              </div>
              <div className="form-group">
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                  <input type="checkbox" checked={!!configDevice.adms_status}
                    onChange={e => setConfigDevice({...configDevice, adms_status: e.target.checked})} />
                  Enable ADMS Push Protocol
                </label>
              </div>

              {/* ADMS Setup Instructions */}
              <div style={{ background: 'rgba(99, 102, 241, 0.08)', border: '1px solid rgba(99, 102, 241, 0.25)', borderRadius: '0.75rem', padding: '1rem', marginTop: '1rem', marginBottom: '1rem' }}>
                <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: 'var(--primary)', marginBottom: '0.75rem' }}>
                  <Server size={16} /> Connection Guidelines
                </h4>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: '1.7' }}>
                  <p style={{ marginBottom: '0.5rem' }}><strong>Option 1: ADMS (Recommended)</strong></p>
                  <ol style={{ margin: '0 0 1rem', paddingLeft: '1.25rem' }}>
                    <li>Go to <strong>Comm. → Cloud Server Setting</strong> on the device</li>
                    <li>Set <strong>Server Address</strong> to: <code style={{ background: 'rgba(255,255,255,0.1)', padding: '0.15rem 0.4rem', borderRadius: '4px' }}>{getADMSUrl()}</code></li>
                    <li>Set <strong>Server Port</strong> to: <code style={{ background: 'rgba(255,255,255,0.1)', padding: '0.15rem 0.4rem', borderRadius: '4px' }}>5000</code></li>
                  </ol>
                  <p style={{ marginBottom: '0.5rem' }}><strong>Option 2: Standalone SDK (Direct)</strong></p>
                  <ul style={{ margin: 0, paddingLeft: '1.25rem', listStyle: 'disc' }}>
                    <li>Ensure <strong>PC and Device</strong> are on the same network</li>
                    <li><strong>Comm Port</strong> default is 4370</li>
                    <li><strong>Machine ID</strong> default is 1</li>
                  </ul>
                </div>
              </div>

              {/* Test Connection */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', background: 'rgba(255,255,255,0.02)', borderRadius: '0.75rem', border: '1px solid var(--border)', marginBottom: '1rem' }}>
                <button type="button" className="btn" onClick={testConnection} disabled={testing}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', fontSize: '0.85rem', whiteSpace: 'nowrap' }}>
                  {testing ? <Loader2 size={16} className="spin" /> : <Wifi size={16} />}
                  {testing ? 'Testing...' : 'Test Connection'}
                </button>
                {testResult && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem' }}>
                    {testResult.status === 'online' ? (
                      <><CheckCircle size={16} color="#10b981" /><span style={{ color: '#10b981' }}>{testResult.message}</span></>
                    ) : (
                      <><AlertCircle size={16} color="#ef4444" /><span style={{ color: '#ef4444' }}>{testResult.message}</span></>
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

      {/* Hardware Settings Modal */}
      {showHwSettingsModal && targetDevice && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '550px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
                <Sliders size={22} /> Hardware Settings — {targetDevice.device_name}
              </h2>
              <button className="btn" onClick={() => setShowHwSettingsModal(false)} style={{ background: 'transparent', padding: '0.25rem' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label><Volume2 size={14} style={{ marginRight: '4px' }} />Volume (0–10)</label>
                <input type="number" min="0" max="10" value={hwSettings.Volume}
                  onChange={e => setHwSettings({...hwSettings, Volume: parseInt(e.target.value)})} />
              </div>
              <div className="form-group">
                <label>Lock Delay (seconds)</label>
                <input type="number" min="1" max="60" value={hwSettings.LockDelay}
                  onChange={e => setHwSettings({...hwSettings, LockDelay: parseInt(e.target.value)})} />
              </div>
              <div className="form-group">
                <label>Date Format</label>
                <select value={hwSettings.DateFormat} onChange={e => setHwSettings({...hwSettings, DateFormat: parseInt(e.target.value)})}>
                  <option value={0}>YYYY-MM-DD</option>
                  <option value={1}>YY-MM-DD</option>
                  <option value={2}>MM-DD-YY</option>
                  <option value={3}>DD-MM-YY</option>
                </select>
              </div>
              <div className="form-group">
                <label>Language</label>
                <select value={hwSettings.Language} onChange={e => setHwSettings({...hwSettings, Language: parseInt(e.target.value)})}>
                  <option value={0}>English</option>
                  <option value={1}>Chinese</option>
                  <option value={69}>Arabic</option>
                  <option value={97}>Hindi</option>
                </select>
              </div>
              <div className="form-group">
                <label>Door Sensor</label>
                <select value={hwSettings.DoorSensorType} onChange={e => setHwSettings({...hwSettings, DoorSensorType: parseInt(e.target.value)})}>
                  <option value={0}>None</option>
                  <option value={1}>Normally Closed (NC)</option>
                  <option value={2}>Normally Open (NO)</option>
                </select>
              </div>
              <div className="form-group">
                <label>Anti-Passback</label>
                <select value={hwSettings.AntiPassback} onChange={e => setHwSettings({...hwSettings, AntiPassback: parseInt(e.target.value)})}>
                  <option value={0}>Disabled</option>
                  <option value={1}>Enabled</option>
                </select>
              </div>
              <div className="form-group">
                <label>Face Recognition</label>
                <select value={hwSettings.FaceFunOn} onChange={e => setHwSettings({...hwSettings, FaceFunOn: parseInt(e.target.value)})}>
                  <option value={1}>Enabled</option>
                  <option value={0}>Disabled</option>
                </select>
              </div>
              <div className="form-group">
                <label>Fingerprint</label>
                <select value={hwSettings.FingerFunOn} onChange={e => setHwSettings({...hwSettings, FingerFunOn: parseInt(e.target.value)})}>
                  <option value={1}>Enabled</option>
                  <option value={0}>Disabled</option>
                </select>
              </div>
            </div>
            <div className="form-group" style={{ marginTop: '0.5rem' }}>
              <label>Communication Password</label>
              <input type="text" placeholder="Leave blank to keep current" value={hwSettings.ComPwd}
                onChange={e => setHwSettings({...hwSettings, ComPwd: e.target.value})} />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1.5rem' }}>
              <button type="button" className="btn" onClick={() => setShowHwSettingsModal(false)} style={{ background: 'transparent' }}>Cancel</button>
              <button type="button" className="btn btn-primary" onClick={handleSetOptions}>
                Apply to Device
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete User Modal */}
      {showDeleteUserModal && targetDevice && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '420px' }}>
            <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <UserMinus size={22} color="#ef4444" /> Delete User from Device
            </h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: '1rem 0' }}>
              This will remove the user and ALL their biometrics (fingerprints, face) from <strong>{targetDevice.device_name}</strong>.
            </p>
            <div className="form-group">
              <label>User PIN (Hardware ID)</label>
              <input type="text" placeholder="e.g. 101" value={deletePin}
                onChange={e => setDeletePin(e.target.value)} autoFocus />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1.5rem' }}>
              <button className="btn" onClick={() => setShowDeleteUserModal(false)} style={{ background: 'transparent' }}>Cancel</button>
              <button className="btn" onClick={handleDeleteUser} disabled={!deletePin}
                style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444' }}>
                Delete User
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Factory Reset Modal (Two-step confirmation) */}
      {showFactoryResetModal && targetDevice && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '450px' }}>
            <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#ef4444' }}>
              <AlertTriangle size={22} /> Factory Reset — {targetDevice.device_name}
            </h2>
            <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '0.75rem', padding: '1rem', margin: '1rem 0' }}>
              <p style={{ fontSize: '0.85rem', color: '#ef4444', fontWeight: 600, margin: 0 }}>
                ⚠️ This will PERMANENTLY erase ALL data from the device:
              </p>
              <ul style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '0.5rem 0 0', paddingLeft: '1.25rem' }}>
                <li>All registered users</li>
                <li>All fingerprint templates</li>
                <li>All face templates</li>
                <li>All attendance logs</li>
                <li>All access control settings</li>
              </ul>
            </div>
            <div className="form-group">
              <label>Type <strong style={{ color: '#ef4444' }}>RESET</strong> to confirm</label>
              <input type="text" placeholder="Type RESET" value={resetConfirm}
                onChange={e => setResetConfirm(e.target.value)} autoFocus
                style={{ borderColor: resetConfirm === 'RESET' ? '#ef4444' : undefined }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1.5rem' }}>
              <button className="btn" onClick={() => setShowFactoryResetModal(false)} style={{ background: 'transparent' }}>Cancel</button>
              <button className="btn" onClick={handleFactoryReset} disabled={resetConfirm !== 'RESET'}
                style={{ background: resetConfirm === 'RESET' ? '#ef4444' : 'rgba(239, 68, 68, 0.15)', color: 'white', fontWeight: 600 }}>
                ⚠️ Erase All Data
              </button>
            </div>
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
                        <div style={{ fontSize: '0.8rem', color: 'var(--primary)', background: 'rgba(99, 102, 241, 0.1)', padding: '4px 8px', borderRadius: '4px', wordBreak: 'break-all', fontFamily: 'monospace' }}>
                          {h.command}
                        </div>
                      </td>
                      <td>
                        <span style={{ fontSize: '0.75rem', fontWeight: 600, padding: '0.2rem 0.5rem', borderRadius: '4px', whiteSpace: 'nowrap',
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

      <div style={{ marginTop: '3rem' }}>
        <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
          <ShieldCheck size={20} color="var(--primary)" /> Live Monitoring Feed
        </h3>
        <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: '1rem', padding: '1.5rem', height: '300px', overflowY: 'auto' }}>
          {liveEvents.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', textAlign: 'center', marginTop: '4rem' }}>No recent activity. Waiting for events...</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {liveEvents.map((ev, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px' }}>
                   <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                     <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: ev.punch_time?.includes('AUTO-LOCKED') ? '#ef4444' : '#10b981' }}></div>
                     <span style={{ fontWeight: 'bold' }}>{ev.user_id || 'Unknown User'}</span> 
                     <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>• {ev.device_sn}</span>
                   </div>
                   <div style={{ color: 'var(--primary)', fontSize: '0.85rem' }}>{ev.punch_time}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

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
