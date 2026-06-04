import React, { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import { Bed, Users, AlertCircle, Bell, BellOff, ChevronRight, Clock, AlertTriangle, CreditCard, Phone, MessageSquare, Mail } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const STORAGE_KEY = 'pgms_notifications_enabled';
const POLL_INTERVAL = 5 * 60 * 1000; // 5 minutes

const Dashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    occupied: 0,
    vacant: 0,
    maintenance: 0,
    totalTenants: 0
  });

  const [notificationsEnabled, setNotificationsEnabled] = useState(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === null ? true : stored === 'true';
  });
  const [notifications, setNotifications] = useState([]);
  const [notifLoading, setNotifLoading] = useState(false);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [bedsRes, tenantsRes] = await Promise.all([
          api.get('/api/beds'),
          api.get('/api/tenants')
        ]);
        
        const beds = Array.isArray(bedsRes.data) ? bedsRes.data : [];
        const tenants = Array.isArray(tenantsRes.data) ? tenantsRes.data : [];

        setStats({
          occupied: beds.filter(b => b.status === 'Occupied').length,
          vacant: beds.filter(b => b.status === 'Vacant').length,
          maintenance: beds.filter(b => b.status === 'Maintenance').length,
          totalTenants: tenants.length
        });
      } catch (err) {
        console.error('Failed to fetch stats', err);
      }
    };
    fetchStats();
  }, []);

  const fetchNotifications = useCallback(async () => {
    if (!notificationsEnabled) return;
    setNotifLoading(true);
    try {
      const res = await api.get('/api/notifications');
      setNotifications(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error('Failed to fetch notifications', err);
    } finally {
      setNotifLoading(false);
    }
  }, [notificationsEnabled]);

  // Fetch notifications on mount and poll every 5 minutes
  useEffect(() => {
    if (notificationsEnabled) {
      fetchNotifications();
      const interval = setInterval(fetchNotifications, POLL_INTERVAL);
      return () => clearInterval(interval);
    } else {
      setNotifications([]);
    }
  }, [notificationsEnabled, fetchNotifications]);

  const handleToggle = () => {
    const newVal = !notificationsEnabled;
    setNotificationsEnabled(newVal);
    localStorage.setItem(STORAGE_KEY, String(newVal));
  };

  const warningCount = notifications.filter(n => n.type === 'warning').length;
  const reminderCount = notifications.filter(n => n.type === 'reminder').length;
  const totalCount = notifications.length;

  const renderQuickActions = (tenant) => (
    <div style={{ display: 'flex', gap: '0.4rem', marginLeft: 'auto', marginRight: '1rem', alignItems: 'center' }}>
      {tenant.mobile && (
        <>
          <a
            href={`tel:${tenant.mobile}`}
            onClick={(e) => e.stopPropagation()}
            className="quick-action-btn"
            style={{ padding: '6px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: 'var(--text)', display: 'flex', transition: 'all 0.2s' }}
            onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.15)'; e.currentTarget.style.color = '#3b82f6'; }}
            onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = 'var(--text)'; }}
            title="Call Tenant"
          >
            <Phone size={14} />
          </a>
          <a
            href={`sms:${tenant.mobile}`}
            onClick={(e) => e.stopPropagation()}
            className="quick-action-btn"
            style={{ padding: '6px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: 'var(--text)', display: 'flex', transition: 'all 0.2s' }}
            onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.15)'; e.currentTarget.style.color = '#10b981'; }}
            onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = 'var(--text)'; }}
            title="SMS Tenant"
          >
            <MessageSquare size={14} />
          </a>
        </>
      )}
      {tenant.email && (
        <a
          href={`mailto:${tenant.email}`}
          onClick={(e) => e.stopPropagation()}
          className="quick-action-btn"
          style={{ padding: '6px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: 'var(--text)', display: 'flex', transition: 'all 0.2s' }}
          onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.15)'; e.currentTarget.style.color = '#f59e0b'; }}
          onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = 'var(--text)'; }}
          title="Email Tenant"
        >
          <Mail size={14} />
        </a>
      )}
    </div>
  );

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1>Dashboard Overview</h1>

        {/* Notification Toggle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {notificationsEnabled && totalCount > 0 && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: '0.5rem',
              fontSize: '0.8rem', color: 'var(--text-muted)'
            }}>
              {warningCount > 0 && (
                <span style={{
                  background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444',
                  padding: '2px 8px', borderRadius: '10px', fontWeight: 600, fontSize: '0.75rem'
                }}>
                  {warningCount} overdue
                </span>
              )}
              {reminderCount > 0 && (
                <span style={{
                  background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b',
                  padding: '2px 8px', borderRadius: '10px', fontWeight: 600, fontSize: '0.75rem'
                }}>
                  {reminderCount} upcoming
                </span>
              )}
            </div>
          )}

          <button
            onClick={handleToggle}
            title={notificationsEnabled ? 'Disable payment reminders' : 'Enable payment reminders'}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.5rem',
              background: notificationsEnabled ? 'rgba(16, 185, 129, 0.1)' : 'rgba(255, 255, 255, 0.05)',
              border: `1px solid ${notificationsEnabled ? 'rgba(16, 185, 129, 0.3)' : 'var(--border)'}`,
              color: notificationsEnabled ? '#10b981' : 'var(--text-muted)',
              padding: '0.5rem 1rem',
              borderRadius: '0.75rem',
              cursor: 'pointer',
              fontSize: '0.85rem',
              fontWeight: 600,
              transition: 'all 0.2s'
            }}
          >
            {notificationsEnabled ? <Bell size={16} /> : <BellOff size={16} />}
            {notificationsEnabled ? 'Reminders ON' : 'Reminders OFF'}
          </button>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card" onClick={() => navigate('/rooms', { state: { tab: 'beds', statusFilter: 'Occupied' }})} style={{ cursor: 'pointer', transition: 'transform 0.2s' }} onMouseOver={e => e.currentTarget.style.transform = 'translateY(-5px)'} onMouseOut={e => e.currentTarget.style.transform = 'translateY(0)'}>
          <div className="stat-label">Occupied Beds</div>
          <div className="stat-value" style={{ color: 'var(--danger)' }}>{stats.occupied}</div>
          <Users size={24} style={{ position: 'absolute', bottom: '1.5rem', right: '1.5rem', opacity: 0.2 }} />
        </div>
        <div className="stat-card" onClick={() => navigate('/rooms', { state: { tab: 'beds', statusFilter: 'Vacant' }})} style={{ cursor: 'pointer', transition: 'transform 0.2s' }} onMouseOver={e => e.currentTarget.style.transform = 'translateY(-5px)'} onMouseOut={e => e.currentTarget.style.transform = 'translateY(0)'}>
          <div className="stat-label">Vacant Beds</div>
          <div className="stat-value" style={{ color: 'var(--accent)' }}>{stats.vacant}</div>
          <Bed size={24} style={{ position: 'absolute', bottom: '1.5rem', right: '1.5rem', opacity: 0.2 }} />
        </div>
        <div className="stat-card" onClick={() => navigate('/rooms', { state: { tab: 'beds', statusFilter: 'Maintenance' }})} style={{ cursor: 'pointer', transition: 'transform 0.2s' }} onMouseOver={e => e.currentTarget.style.transform = 'translateY(-5px)'} onMouseOut={e => e.currentTarget.style.transform = 'translateY(0)'}>
          <div className="stat-label">Maintenance</div>
          <div className="stat-value" style={{ color: '#f59e0b' }}>{stats.maintenance}</div>
          <AlertCircle size={24} style={{ position: 'absolute', bottom: '1.5rem', right: '1.5rem', opacity: 0.2 }} />
        </div>
        <div className="stat-card" onClick={() => navigate('/tenants')} style={{ cursor: 'pointer', transition: 'transform 0.2s' }} onMouseOver={e => e.currentTarget.style.transform = 'translateY(-5px)'} onMouseOut={e => e.currentTarget.style.transform = 'translateY(0)'}>
          <div className="stat-label">Total Tenants</div>
          <div className="stat-value" style={{ color: 'var(--primary)' }}>{stats.totalTenants}</div>
          <Users size={24} style={{ position: 'absolute', bottom: '1.5rem', right: '1.5rem', opacity: 0.2 }} />
        </div>
      </div>
      
      {/* Payment Notifications Panel */}
      <div style={{ marginTop: '2rem', background: 'var(--card-bg)', borderRadius: '1rem', border: '1px solid var(--border)', overflow: 'hidden' }}>
        {/* Panel Header */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '1.25rem 1.5rem',
          borderBottom: '1px solid var(--border)',
          background: 'rgba(0, 0, 0, 0.15)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{
              position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <Bell size={20} style={{ color: notificationsEnabled && totalCount > 0 ? '#f59e0b' : 'var(--text-muted)' }} />
              {notificationsEnabled && totalCount > 0 && (
                <span style={{
                  position: 'absolute', top: '-6px', right: '-8px',
                  background: warningCount > 0 ? '#ef4444' : '#f59e0b',
                  color: 'white', fontSize: '0.65rem', fontWeight: 700,
                  width: '18px', height: '18px', borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: `0 0 8px ${warningCount > 0 ? 'rgba(239, 68, 68, 0.5)' : 'rgba(245, 158, 11, 0.5)'}`,
                  animation: 'pulse 2s infinite'
                }}>
                  {totalCount > 99 ? '99+' : totalCount}
                </span>
              )}
            </div>
            <h3 style={{ margin: 0, fontSize: '1rem' }}>Payment Reminders</h3>
          </div>
          {notificationsEnabled && totalCount > 0 && (
            <button
              onClick={() => navigate('/payments', { state: { filterStatus: 'Upcoming' } })}
              style={{
                display: 'flex', alignItems: 'center', gap: '4px',
                background: 'none', border: 'none', color: 'var(--primary)',
                cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600
              }}
            >
              View Payments <ChevronRight size={14} />
            </button>
          )}
        </div>

        {/* Panel Body */}
        <div style={{ padding: '1rem 1.5rem' }}>
          {!notificationsEnabled ? (
            <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--text-muted)' }}>
              <BellOff size={32} style={{ opacity: 0.3, marginBottom: '0.75rem' }} />
              <p style={{ margin: 0, fontSize: '0.9rem' }}>Payment reminders are disabled.</p>
              <p style={{ margin: '0.5rem 0 0', fontSize: '0.8rem', opacity: 0.7 }}>Turn on reminders to see upcoming and overdue payments.</p>
            </div>
          ) : notifLoading && notifications.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
              <p style={{ margin: 0 }}>Loading notifications...</p>
            </div>
          ) : notifications.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--text-muted)' }}>
              <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>✅</div>
              <p style={{ margin: 0, fontSize: '0.9rem', color: '#10b981' }}>All payments are up to date!</p>
              <p style={{ margin: '0.5rem 0 0', fontSize: '0.8rem', opacity: 0.7 }}>No upcoming or overdue payments in the next 7 days.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '400px', overflowY: 'auto' }}>
              {/* Warning Section */}
              {warningCount > 0 && (
                <>
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: '0.5rem',
                    padding: '0.4rem 0', marginBottom: '0.25rem'
                  }}>
                    <AlertTriangle size={14} style={{ color: '#ef4444' }} />
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#ef4444', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Overdue ({warningCount})
                    </span>
                  </div>
                  {notifications.filter(n => n.type === 'warning').map(n => (
                    <div
                      key={`warn-${n.tenant_id}`}
                      onClick={() => navigate('/payments', { state: { searchTerm: n.name } })}
                      style={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        padding: '0.85rem 1rem', borderRadius: '0.75rem',
                        background: 'rgba(239, 68, 68, 0.06)',
                        border: '1px solid rgba(239, 68, 68, 0.15)',
                        cursor: 'pointer', transition: 'all 0.2s'
                      }}
                      onMouseOver={e => { e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'; e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.3)'; }}
                      onMouseOut={e => { e.currentTarget.style.background = 'rgba(239, 68, 68, 0.06)'; e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.15)'; }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1 }}>
                        <div style={{
                          width: '36px', height: '36px', borderRadius: '10px',
                          background: 'rgba(239, 68, 68, 0.15)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                        }}>
                          <AlertTriangle size={18} style={{ color: '#ef4444' }} />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                            <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{n.name}</span>
                            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', background: 'rgba(0,0,0,0.2)', padding: '1px 6px', borderRadius: '4px' }}>
                              Room {n.room_number} · {n.bed_number}
                            </span>
                          </div>
                          <div style={{ fontSize: '0.75rem', color: '#ef4444', marginTop: '2px' }}>
                            {n.message}
                          </div>
                        </div>
                      </div>
                      {renderQuickActions(n)}
                      <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: '1rem' }}>
                        <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#ef4444' }}>
                          ₹{(n.monthly_rent || 0).toLocaleString()}
                        </div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                          {new Date(n.expiry_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                        </div>
                      </div>
                    </div>
                  ))}
                </>
              )}

              {/* Reminder Section */}
              {reminderCount > 0 && (
                <>
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: '0.5rem',
                    padding: '0.4rem 0', marginTop: warningCount > 0 ? '0.5rem' : 0, marginBottom: '0.25rem'
                  }}>
                    <Clock size={14} style={{ color: '#f59e0b' }} />
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#f59e0b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Upcoming ({reminderCount})
                    </span>
                  </div>
                  {notifications.filter(n => n.type === 'reminder').map(n => (
                    <div
                      key={`rem-${n.tenant_id}`}
                      onClick={() => navigate('/payments', { state: { searchTerm: n.name } })}
                      style={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        padding: '0.85rem 1rem', borderRadius: '0.75rem',
                        background: 'rgba(245, 158, 11, 0.04)',
                        border: '1px solid rgba(245, 158, 11, 0.12)',
                        cursor: 'pointer', transition: 'all 0.2s'
                      }}
                      onMouseOver={e => { e.currentTarget.style.background = 'rgba(245, 158, 11, 0.08)'; e.currentTarget.style.borderColor = 'rgba(245, 158, 11, 0.25)'; }}
                      onMouseOut={e => { e.currentTarget.style.background = 'rgba(245, 158, 11, 0.04)'; e.currentTarget.style.borderColor = 'rgba(245, 158, 11, 0.12)'; }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1 }}>
                        <div style={{
                          width: '36px', height: '36px', borderRadius: '10px',
                          background: 'rgba(245, 158, 11, 0.12)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                        }}>
                          <Clock size={18} style={{ color: '#f59e0b' }} />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                            <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{n.name}</span>
                            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', background: 'rgba(0,0,0,0.2)', padding: '1px 6px', borderRadius: '4px' }}>
                              Room {n.room_number} · {n.bed_number}
                            </span>
                          </div>
                          <div style={{ fontSize: '0.75rem', color: '#f59e0b', marginTop: '2px' }}>
                            {n.message}
                          </div>
                        </div>
                      </div>
                      {renderQuickActions(n)}
                      <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: '1rem' }}>
                        <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#f59e0b' }}>
                          ₹{(n.monthly_rent || 0).toLocaleString()}
                        </div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                          {n.days_remaining === 1 ? 'Tomorrow' : `in ${n.days_remaining} days`}
                        </div>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Pulse animation for notification badge */}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.15); }
        }
      `}} />
    </div>
  );
};

export default Dashboard;
