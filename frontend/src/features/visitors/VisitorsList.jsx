import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { User, Phone, Calendar, Search, MapPin, Key, UserCheck, LogOut, CheckCircle, AlertCircle, Link, Tag, Check } from 'lucide-react';

const VisitorsList = () => {
  const [visitors, setVisitors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [copied, setCopied] = useState(false);

  const fetchVisitors = async () => {
    try {
      setLoading(true);
      const res = await api.get('/api/visitors');
      setVisitors(res.data);
    } catch (err) {
      console.error(err);
      setError('Failed to load visitors.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVisitors();
  }, []);

  const handleUpdateStatus = async (id, status) => {
    try {
      await api.put(`/api/visitors/${id}`, { status });
      fetchVisitors();
    } catch (err) {
      console.error(err);
      alert('Failed to update status');
    }
  };

  const handleCopyLink = () => {
    // Determine base URL, normally window.location.origin but since it's an app, let's just construct it
    const baseUrl = window.location.origin;
    
    // Extract admin's user_id from localStorage
    let adminId = '';
    const userString = localStorage.getItem('pgms_user');
    if (userString) {
      try {
        const user = JSON.parse(userString);
        if (user.user_id) adminId = user.user_id;
      } catch (e) {}
    }
    
    const url = adminId ? `${baseUrl}/book-visit/${adminId}` : `${baseUrl}/book-visit`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const filteredVisitors = visitors.filter(v => 
    v.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    v.pass_code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div style={{ paddingBottom: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1>Visitor Tracking</h1>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <div className="stat-card" style={{ background: 'rgba(52, 211, 153, 0.1)', border: '1px solid rgba(52, 211, 153, 0.2)', padding: '0.5rem 1rem', borderRadius: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ color: '#34d399', fontWeight: 600 }}>{visitors.filter(v => v.status === 'Entered').length} Active</span>
          </div>
          <div className="stat-card" style={{ background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.2)', padding: '0.5rem 1rem', borderRadius: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ color: '#f59e0b', fontWeight: 600 }}>{visitors.filter(v => v.status === 'Pending').length} Pending</span>
          </div>
        </div>
      </div>

      {error && (
        <div style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', padding: '1rem', borderRadius: '0.5rem', marginBottom: '1rem', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
          {error}
        </div>
      )}

      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', justifyContent: 'space-between' }}>
        <div style={{ position: 'relative', width: '300px' }}>
          <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input 
            type="text" 
            placeholder="Search by name or PIN..." 
            style={{ paddingLeft: '3rem', width: '100%' }} 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <button className="btn btn-primary" onClick={handleCopyLink} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {copied ? <Check size={18} /> : <Link size={18} />} 
          {copied ? 'Copied!' : 'Copy Booking Link'}
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>Loading visitors...</div>
      ) : (
        <div className="data-table-container">
          <table>
            <thead>
              <tr>
                <th>Guest Name</th>
                <th>Phone</th>
                <th>Visit Date</th>
                <th>Purpose</th>
                <th>Type</th>
                <th>Pass Code (PIN)</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredVisitors.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '2rem' }}>No visitors found.</td>
                </tr>
              ) : (
                filteredVisitors.map(v => (
                  <tr key={v.id}>
                    <td style={{ fontWeight: 600 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <User size={16} color="var(--text-muted)" />
                        {v.name}
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Phone size={14} color="var(--text-muted)" />
                        {v.phone}
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Calendar size={14} color="var(--text-muted)" />
                        {new Date(v.visit_date).toLocaleDateString()}
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <MapPin size={14} color="var(--text-muted)" />
                        {v.purpose || 'N/A'}
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Tag size={14} color="var(--text-muted)" />
                        {v.visitor_type || 'Guest'}
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(255, 255, 255, 0.1)', padding: '4px 10px', borderRadius: '4px', letterSpacing: '2px', fontWeight: 'bold' }}>
                        <Key size={14} color="var(--accent)" />
                        {v.pass_code}
                      </div>
                    </td>
                    <td>
                      <span className={`badge ${v.status === 'Pending' ? 'badge-vacant' : v.status === 'Entered' ? 'badge-occupied' : ''}`} style={{ 
                        background: v.status === 'Pending' ? 'rgba(245, 158, 11, 0.15)' : v.status === 'Entered' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(100, 116, 139, 0.15)',
                        color: v.status === 'Pending' ? '#f59e0b' : v.status === 'Entered' ? '#10b981' : '#94a3b8'
                      }}>
                        {v.status === 'Entered' && <CheckCircle size={12} style={{ marginRight: '4px' }} />}
                        {v.status === 'Pending' && <AlertCircle size={12} style={{ marginRight: '4px' }} />}
                        {v.status}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        {v.status === 'Pending' && (
                          <button 
                            className="btn" 
                            style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.2)', padding: '0.4rem 0.8rem', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem' }} 
                            onClick={() => handleUpdateStatus(v.id, 'Entered')}
                          >
                            <UserCheck size={14} /> Mark Entered
                          </button>
                        )}
                        {v.status === 'Entered' && (
                          <button 
                            className="btn" 
                            style={{ background: 'rgba(100, 116, 139, 0.1)', color: '#94a3b8', border: '1px solid rgba(100, 116, 139, 0.2)', padding: '0.4rem 0.8rem', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem' }} 
                            onClick={() => handleUpdateStatus(v.id, 'Expired')}
                          >
                            <LogOut size={14} /> Mark Exited
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default VisitorsList;
