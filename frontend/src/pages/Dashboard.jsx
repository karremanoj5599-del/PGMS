import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { Bed, Users, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Dashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    occupied: 0,
    vacant: 0,
    maintenance: 0,
    totalTenants: 0,
    staffPresent: 0,
    totalStaff: 0
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
        const [bedsRes, tenantsRes, staffRes] = await Promise.all([
          api.get('/api/beds'),
          api.get('/api/tenants'),
          api.get('/api/staff/summary/today')
        ]);
        
        const beds = Array.isArray(bedsRes.data) ? bedsRes.data : [];
        const tenants = Array.isArray(tenantsRes.data) ? tenantsRes.data : [];
        const staffSummary = staffRes.data || { present_today: 0, total_staff: 0 };

        setStats({
          occupied: beds.filter(b => b.status === 'Occupied').length,
          vacant: beds.filter(b => b.status === 'Vacant').length,
          maintenance: beds.filter(b => b.status === 'Maintenance').length,
          totalTenants: tenants.length,
          staffPresent: staffSummary.present_today,
          totalStaff: staffSummary.total_staff
        });
      } catch (err) {
        console.error('Failed to fetch stats', err);
      }
    };
    fetchStats();
  }, []);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1>Dashboard Overview</h1>
      </div>

      <div className="stats-grid">
        <div className="stat-card" onClick={() => navigate('/beds')} style={{ cursor: 'pointer', transition: 'transform 0.2s' }} onMouseOver={e => e.currentTarget.style.transform = 'translateY(-5px)'} onMouseOut={e => e.currentTarget.style.transform = 'translateY(0)'}>
          <div className="stat-label">Occupied Beds</div>
          <div className="stat-value">{stats.occupied}</div>
          <Bed size={24} style={{ position: 'absolute', bottom: '1.5rem', right: '1.5rem', opacity: 0.2 }} />
        </div>
        <div className="stat-card" onClick={() => navigate('/beds')} style={{ cursor: 'pointer', transition: 'transform 0.2s' }} onMouseOver={e => e.currentTarget.style.transform = 'translateY(-5px)'} onMouseOut={e => e.currentTarget.style.transform = 'translateY(0)'}>
          <div className="stat-label">Vacant Beds</div>
          <div className="stat-value" style={{ color: 'var(--success)' }}>{stats.vacant}</div>
          <Bed size={24} style={{ position: 'absolute', bottom: '1.5rem', right: '1.5rem', opacity: 0.2 }} />
        </div>
        <div className="stat-card" onClick={() => navigate('/beds')} style={{ cursor: 'pointer', transition: 'transform 0.2s' }} onMouseOver={e => e.currentTarget.style.transform = 'translateY(-5px)'} onMouseOut={e => e.currentTarget.style.transform = 'translateY(0)'}>
          <div className="stat-label">Maintenance</div>
          <div className="stat-value" style={{ color: 'var(--danger)' }}>{stats.maintenance}</div>
          <Bed size={24} style={{ position: 'absolute', bottom: '1.5rem', right: '1.5rem', opacity: 0.2 }} />
        </div>
        <div className="stat-card" onClick={() => navigate('/tenants')} style={{ cursor: 'pointer', transition: 'transform 0.2s' }} onMouseOver={e => e.currentTarget.style.transform = 'translateY(-5px)'} onMouseOut={e => e.currentTarget.style.transform = 'translateY(0)'}>
          <div className="stat-label">Total Tenants</div>
          <div className="stat-value" style={{ color: 'var(--primary)' }}>{stats.totalTenants}</div>
          <Users size={24} style={{ position: 'absolute', bottom: '1.5rem', right: '1.5rem', opacity: 0.2 }} />
        </div>
        <div className="stat-card" onClick={() => navigate('/staff')} style={{ cursor: 'pointer', transition: 'transform 0.2s', background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(16, 185, 129, 0.02) 100%)', border: '1px solid rgba(16, 185, 129, 0.2)' }} onMouseOver={e => e.currentTarget.style.transform = 'translateY(-5px)'} onMouseOut={e => e.currentTarget.style.transform = 'translateY(0)'}>
          <div className="stat-label">Staff Present Today</div>
          <div className="stat-value" style={{ color: '#10b981' }}>{stats.staffPresent} <span style={{ fontSize: '1rem', color: 'var(--text-muted)' }}>/ {stats.totalStaff}</span></div>
          <Clock size={24} style={{ position: 'absolute', bottom: '1.5rem', right: '1.5rem', opacity: 0.2, color: '#10b981' }} />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
