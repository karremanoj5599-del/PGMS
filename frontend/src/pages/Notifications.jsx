import React, { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import { useNavigate } from 'react-router-dom';
import { Bell, CreditCard, ShieldAlert, Users, Bed, Tablet, AlertTriangle, Clock, RefreshCw } from 'lucide-react';

const Notifications = () => {
  const navigate = useNavigate();
  const [alerts, setAlerts] = useState({
    payments: [],
    access: [],
    staff: [],
    capacity: [],
    system: []
  });
  const [loading, setLoading] = useState(true);

  const fetchAlerts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/notifications');
      setAlerts(res.data);
    } catch (err) {
      console.error('Failed to fetch notifications', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAlerts();
    const interval = setInterval(fetchAlerts, 5 * 60 * 1000); // Poll every 5 minutes
    return () => clearInterval(interval);
  }, [fetchAlerts]);

  const totalAlerts = 
    (alerts.payments?.length || 0) +
    (alerts.access?.length || 0) +
    (alerts.staff?.length || 0) +
    (alerts.capacity?.length || 0) +
    (alerts.system?.length || 0);

  const renderSection = (title, items, icon, emptyMsg, clickAction) => {
    if (!items || items.length === 0) return null;
    return (
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', paddingBottom: '0.5rem', borderBottom: '1px solid var(--border)' }}>
          {icon}
          <h2 style={{ margin: 0, fontSize: '1.25rem' }}>{title} <span style={{ background: 'rgba(255,255,255,0.1)', padding: '2px 8px', borderRadius: '12px', fontSize: '0.8rem', marginLeft: '0.5rem' }}>{items.length}</span></h2>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {items.map(item => (
            <div 
              key={item.id}
              onClick={() => clickAction && clickAction(item)}
              style={{
                display: 'flex', alignItems: 'flex-start', gap: '1rem',
                padding: '1rem', borderRadius: '0.75rem',
                background: item.type === 'warning' ? 'rgba(239, 68, 68, 0.05)' : item.type === 'info' ? 'rgba(59, 130, 246, 0.05)' : 'rgba(245, 158, 11, 0.05)',
                border: `1px solid ${item.type === 'warning' ? 'rgba(239, 68, 68, 0.2)' : item.type === 'info' ? 'rgba(59, 130, 246, 0.2)' : 'rgba(245, 158, 11, 0.2)'}`,
                cursor: clickAction ? 'pointer' : 'default',
                transition: 'all 0.2s'
              }}
              onMouseOver={e => {
                if (clickAction) e.currentTarget.style.transform = 'translateY(-2px)';
              }}
              onMouseOut={e => {
                if (clickAction) e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              <div style={{
                background: item.type === 'warning' ? 'rgba(239, 68, 68, 0.15)' : item.type === 'info' ? 'rgba(59, 130, 246, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                color: item.type === 'warning' ? '#ef4444' : item.type === 'info' ? '#3b82f6' : '#f59e0b',
                width: '40px', height: '40px', borderRadius: '10px',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
              }}>
                {item.type === 'warning' ? <AlertTriangle size={20} /> : item.type === 'info' ? <Bell size={20} /> : <Clock size={20} />}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 600, color: 'var(--text)' }}>
                    {item.title} {item.name && `- ${item.name}`}
                  </h4>
                  {item.amount && (
                    <span style={{ fontWeight: 700, color: item.type === 'warning' ? '#ef4444' : '#f59e0b' }}>
                      ₹{Number(item.amount).toLocaleString()}
                    </span>
                  )}
                </div>
                <p style={{ margin: '0.25rem 0 0', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                  {item.message}
                </p>
                {item.location && (
                  <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', background: 'rgba(255,255,255,0.05)', display: 'inline-block', padding: '2px 8px', borderRadius: '4px' }}>
                    Location: {item.location}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div style={{ padding: '1rem', maxWidth: '900px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
            <Bell size={28} style={{ color: 'var(--primary)' }} />
            Notification Center
          </h1>
          <p style={{ margin: '0.5rem 0 0', color: 'var(--text-muted)' }}>
            Overview of alerts, reminders, and system events.
          </p>
        </div>
        <button 
          onClick={fetchAlerts} 
          disabled={loading}
          className="btn btn-secondary"
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
        >
          <RefreshCw size={16} className={loading ? 'spin' : ''} />
          {loading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {!loading && totalAlerts === 0 ? (
        <div style={{ textAlign: 'center', padding: '4rem 2rem', background: 'var(--card-bg)', borderRadius: '1rem', border: '1px solid var(--border)' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🎉</div>
          <h3 style={{ margin: 0, color: '#10b981' }}>You're all caught up!</h3>
          <p style={{ color: 'var(--text-muted)', marginTop: '0.5rem' }}>No pending alerts, overdue payments, or system issues.</p>
        </div>
      ) : (
        <div style={{ background: 'var(--card-bg)', borderRadius: '1rem', padding: '2rem', border: '1px solid var(--border)' }}>
          {renderSection('Payment Reminders', alerts.payments, <CreditCard size={24} color="#f59e0b" />, 'No pending payments.', (item) => navigate('/payments', { state: { searchTerm: item.name } }))}
          {renderSection('Access Control Alerts', alerts.access, <ShieldAlert size={24} color="#ef4444" />, 'All access controls normal.', (item) => navigate('/tenants', { state: { status: 'Staying' } }))}
          {renderSection('Staff Alerts', alerts.staff, <Users size={24} color="#ef4444" />, 'All staff present.', () => navigate('/staff'))}
          {renderSection('Capacity Info', alerts.capacity, <Bed size={24} color="#3b82f6" />, 'Hostel is full.', () => navigate('/beds'))}
          {renderSection('System Alerts', alerts.system, <Tablet size={24} color="#ef4444" />, 'All systems operational.', () => navigate('/devices'))}
        </div>
      )}

      <style dangerouslySetInnerHTML={{ __html: `
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { 100% { transform: rotate(360deg); } }
      `}} />
    </div>
  );
};

export default Notifications;
