import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Bed, Users, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Dashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    occupied: 0,
    vacant: 0,
    maintenance: 0,
    totalTenants: 0
  });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [bedsRes, tenantsRes] = await Promise.all([
          axios.get('/api/beds'),
          axios.get('/api/tenants')
        ]);
        
        const beds = bedsRes.data;
        setStats({
          occupied: beds.filter(b => b.status === 'Occupied').length,
          vacant: beds.filter(b => b.status === 'Vacant').length,
          maintenance: beds.filter(b => b.status === 'Maintenance').length,
          totalTenants: tenantsRes.data.length
        });
      } catch (err) {
        console.error('Failed to fetch stats', err);
      }
    };
    fetchStats();
  }, []);

  return (
    <div>
      <h1 style={{ marginBottom: '2rem' }}>Dashboard Overview</h1>
      <div className="stats-grid">
        <div className="stat-card" onClick={() => navigate('/tenants', { state: { status: 'Staying' }})} style={{ cursor: 'pointer', transition: 'transform 0.2s' }} onMouseOver={e => e.currentTarget.style.transform = 'translateY(-5px)'} onMouseOut={e => e.currentTarget.style.transform = 'translateY(0)'}>
          <div className="stat-label">Occupied Beds</div>
          <div className="stat-value" style={{ color: 'var(--danger)' }}>{stats.occupied}</div>
          <Users size={24} style={{ position: 'absolute', bottom: '1.5rem', right: '1.5rem', opacity: 0.2 }} />
        </div>
        <div className="stat-card" onClick={() => navigate('/rooms', { state: { tab: 'map' }})} style={{ cursor: 'pointer', transition: 'transform 0.2s' }} onMouseOver={e => e.currentTarget.style.transform = 'translateY(-5px)'} onMouseOut={e => e.currentTarget.style.transform = 'translateY(0)'}>
          <div className="stat-label">Vacant Beds</div>
          <div className="stat-value" style={{ color: 'var(--accent)' }}>{stats.vacant}</div>
          <Bed size={24} style={{ position: 'absolute', bottom: '1.5rem', right: '1.5rem', opacity: 0.2 }} />
        </div>
        <div className="stat-card" onClick={() => navigate('/rooms', { state: { tab: 'beds' }})} style={{ cursor: 'pointer', transition: 'transform 0.2s' }} onMouseOver={e => e.currentTarget.style.transform = 'translateY(-5px)'} onMouseOut={e => e.currentTarget.style.transform = 'translateY(0)'}>
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
      
      {/* Quick Actions or charts could go here */}
      <div style={{ marginTop: '2rem', background: 'var(--card-bg)', padding: '2rem', borderRadius: '1rem', border: '1px solid var(--border)' }}>
        <h3>Recent Activity</h3>
        <p style={{ color: 'var(--text-muted)', marginTop: '1rem' }}>Activity logs will appear here...</p>
      </div>
    </div>
  );
};

export default Dashboard;
