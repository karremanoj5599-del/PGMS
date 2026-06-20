import React, { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import { useNavigate } from 'react-router-dom';
import { Bell, CreditCard, ShieldAlert, Users, Bed, Tablet, AlertTriangle, Clock, RefreshCw, MessageCircle, Activity } from 'lucide-react';

const Notifications = () => {
  const navigate = useNavigate();
  const [alerts, setAlerts] = useState({
    payments: [],
    access: [],
    staff: [],
    capacity: [],
    system: []
  });
  const [activityLogs, setActivityLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchAlerts = useCallback(async () => {
    setLoading(true);
    try {
      const [alertRes, logRes] = await Promise.all([
        api.get('/api/notifications'),
        api.get('/api/system/activity?limit=20')
      ]);
      setAlerts(alertRes.data);
      setActivityLogs(logRes.data);
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

  const handleSendReminder = async (e, item) => {
    e.stopPropagation(); // prevent navigation
    if (!item.mobile) {
      alert('Tenant does not have a mobile number saved.');
      return;
    }
    
    try {
      const defaultMessage = `Hi ${item.name}, your rent of Rs.${item.amount} for PGMS is due on ${new Date().toLocaleDateString()}. Please clear the dues.`;
      const res = await api.post('/api/notifications/send-reminder', {
        tenant_id: item.tenant_id,
        recipient: item.mobile,
        message: defaultMessage,
        channel: 'whatsapp'
      });
      
      if (res.data.whatsapp_url) {
        window.open(res.data.whatsapp_url, '_blank');
      }
    } catch (err) {
      console.error('Failed to send reminder', err);
      alert('Failed to process reminder.');
    }
  };

  const renderSection = (title, items, icon, emptyMsg, clickAction) => {
    if (!items || items.length === 0) return null;
    return (
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', paddingBottom: '0.5rem', borderBottom: '1px solid var(--border)' }}>
          {icon}
          <h2 style={{ margin: 0, fontSize: '1.25rem' }}>{title} <span style={{ background: 'var(--border)', padding: '2px 8px', borderRadius: '12px', fontSize: '0.8rem', marginLeft: '0.5rem' }}>{items.length}</span></h2>
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
                  <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', background: 'rgba(128,128,128,0.1)', display: 'inline-block', padding: '2px 8px', borderRadius: '4px' }}>
                    Location: {item.location}
                  </div>
                )}
                {title === 'Payment Reminders' && (
                  <div style={{ marginTop: '0.75rem' }}>
                    <button 
                      className="btn btn-secondary" 
                      style={{ padding: '4px 12px', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#25D366', color: 'white', border: 'none' }}
                      onClick={(e) => handleSendReminder(e, item)}
                    >
                      <MessageCircle size={14} /> Send WhatsApp Reminder
                    </button>
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
          
          {/* Activity Logs Section */}
          <div style={{ marginTop: '3rem', paddingTop: '2rem', borderTop: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
              <Activity size={24} color="#8b5cf6" />
              <h2 style={{ margin: 0, fontSize: '1.25rem' }}>Recent System Activity</h2>
            </div>
            
            {activityLogs.length === 0 ? (
              <p style={{ color: 'var(--text-muted)' }}>No recent activity.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {activityLogs.map(log => (
                  <div key={log.log_id} style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', padding: '1rem', background: 'rgba(128,128,128,0.02)', borderRadius: '0.75rem', border: '1px solid var(--border)' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600 }}>{log.title}</h4>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {new Date(log.created_at).toLocaleString()}
                        </span>
                      </div>
                      <p style={{ margin: '0.25rem 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>{log.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
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
