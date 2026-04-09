import React, { useState, useEffect } from 'react';
import { UserPlus, Cloud, CloudOff, UserCheck } from 'lucide-react';

const BiometricControl = ({ deviceSn }) => {
  const [status, setStatus] = useState('offline');
  const [logs, setLogs] = useState([]);
  const [formData, setFormData] = useState({
    user_id: '',
    name: '',
    expiry_date: '',
    allowed_start_time: '06:00',
    allowed_end_time: '22:00'
  });

  useEffect(() => {
    // Connect to specific device WebSocket
    const ws = new WebSocket(`ws://localhost:8000/ws/${deviceSn}`);
    
    ws.onopen = () => setStatus('online');
    ws.onclose = () => setStatus('offline');
    
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.event === 'punch') {
        setLogs(prev => [data, ...prev].slice(0, 10));
      }
    };

    return () => ws.close();
  }, [deviceSn]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch('http://localhost:8000/api/pg/add-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          expiry_date: `${formData.expiry_date} 23:59:59`
        })
      });
      const res = await response.json();
      alert(res.message);
    } catch (err) {
      alert('Error connecting to biometric service');
    }
  };

  return (
    <div className="card" style={{ padding: '1.5rem', background: 'var(--card-bg)', borderRadius: '1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <UserPlus size={20} /> Biometric Sync
        </h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem' }}>
          {status === 'online' ? <Cloud size={16} color="var(--success)" /> : <CloudOff size={16} color="var(--danger)" />}
          <span style={{ color: status === 'online' ? 'var(--success)' : 'var(--danger)' }}>
            {status.toUpperCase()}
          </span>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
          <div className="form-group">
            <label>Device ID (Pin)</label>
            <input 
              type="text" 
              required 
              value={formData.user_id}
              onChange={e => setFormData({...formData, user_id: e.target.value})} 
            />
          </div>
          <div className="form-group">
            <label>Full Name</label>
            <input 
              type="text" 
              required 
              value={formData.name}
              onChange={e => setFormData({...formData, name: e.target.value})}
            />
          </div>
        </div>

        <div className="form-group">
          <label>Expiry Date</label>
          <input 
            type="date" 
            required 
            value={formData.expiry_date}
            onChange={e => setFormData({...formData, expiry_date: e.target.value})}
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
          <div className="form-group">
            <label>Access From</label>
            <input 
              type="time" 
              value={formData.allowed_start_time}
              onChange={e => setFormData({...formData, allowed_start_time: e.target.value})}
            />
          </div>
          <div className="form-group">
            <label>Access To</label>
            <input 
              type="time" 
              value={formData.allowed_end_time}
              onChange={e => setFormData({...formData, allowed_end_time: e.target.value})}
            />
          </div>
        </div>

        <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
          Sync User to Device
        </button>
      </form>

      {logs.length > 0 && (
        <div style={{ marginTop: '2rem' }}>
          <h4 style={{ fontSize: '0.9rem', marginBottom: '1rem' }}>Live Attendance</h4>
          {logs.map((log, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem', borderBottom: '1px solid var(--border)', fontSize: '0.85rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <UserCheck size={14} color="var(--primary)" />
                <span>User {log.user_id}</span>
              </div>
              <span style={{ color: 'var(--text-muted)' }}>{log.timestamp}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default BiometricControl;
