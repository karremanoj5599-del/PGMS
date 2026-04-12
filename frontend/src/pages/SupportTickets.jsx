import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { MessageSquare, Clock, CheckCircle, AlertCircle, Search, Filter, Save, X } from 'lucide-react';

const SupportTickets = () => {
  const [tickets, setTickets] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchTickets();
  }, []);

  const fetchTickets = async () => {
    setIsLoading(true);
    try {
      const res = await axios.get('/api/admin/tickets');
      setTickets(res.data);
    } catch (err) {
      console.error('Failed to fetch tickets');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateTicket = async (id, status) => {
    try {
      await axios.put(`/api/admin/tickets/${id}`, {
        status,
        admin_notes: adminNotes
      });
      setSelectedTicket(null);
      setAdminNotes('');
      fetchTickets();
    } catch (err) {
      alert('Failed to update ticket');
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'Resolved': return <CheckCircle size={18} color="#10b981" />;
      case 'In Progress': return <Clock size={18} color="#f59e0b" />;
      default: return <AlertCircle size={18} color="#ef4444" />;
    }
  };

  const filteredTickets = tickets.filter(t => {
    const matchesStatus = !statusFilter || t.status === statusFilter;
    const matchesSearch = !searchQuery || 
      t.tenant_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.category?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.description?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  return (
    <div className="page-container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 800, background: 'linear-gradient(to right, #fff, #94a3b8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Support Tickets
          </h1>
          <p style={{ color: '#94a3b8', marginTop: '0.25rem' }}>Manage and resolve tenant maintenance requests</p>
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
           <div className="stat-card-mini" style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
              <span style={{ color: '#f87171', fontWeight: 600 }}>{tickets.filter(t => t.status === 'Pending').length} Pending</span>
           </div>
           <div className="stat-card-mini" style={{ background: 'rgba(52, 211, 153, 0.1)', border: '1px solid rgba(52, 211, 153, 0.2)' }}>
              <span style={{ color: '#34d399', fontWeight: 600 }}>{tickets.filter(t => t.status === 'Resolved').length} Resolved</span>
           </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
          <input 
            type="text" 
            placeholder="Search tickets, tenants, descriptions..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ 
              width: '100%', padding: '0.75rem 1rem 0.75rem 3rem', 
              background: 'rgba(15, 23, 42, 0.6)', 
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '12px', color: 'white'
            }} 
          />
        </div>
        <select 
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          style={{ 
            padding: '0.75rem 1.5rem', 
            background: 'rgba(15, 23, 42, 0.6)', 
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '12px', color: 'white',
            cursor: 'pointer'
          }}
        >
          <option value="">All Status</option>
          <option value="Pending">Pending</option>
          <option value="In Progress">In Progress</option>
          <option value="Resolved">Resolved</option>
        </select>
      </div>

      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '4rem', color: '#64748b' }}>Loading tickets...</div>
      ) : filteredTickets.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '4rem', background: 'rgba(255,255,255,0.02)', borderRadius: '24px', border: '1px dashed rgba(255,255,255,0.1)' }}>
          <MessageSquare size={48} color="#1e293b" style={{ marginBottom: '1rem' }} />
          <h3 style={{ color: '#94a3b8' }}>No tickets found</h3>
          <p style={{ color: '#64748b' }}>{searchQuery || statusFilter ? 'Try clearing your filters' : 'Tenants haven\'t submitted any requests yet'}</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.25rem' }}>
          {filteredTickets.map(ticket => (
            <div 
              key={ticket.id} 
              className="ticket-card"
              onClick={() => { setSelectedTicket(ticket); setAdminNotes(ticket.admin_notes || ''); }}
              style={{
                background: 'rgba(30, 41, 59, 0.7)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255, 255, 255, 0.05)',
                borderRadius: '20px',
                padding: '1.5rem',
                cursor: 'pointer',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                position: 'relative',
                overflow: 'hidden'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <span style={{ 
                  fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em',
                  background: 'rgba(79, 70, 229, 0.15)', color: '#818cf8', padding: '4px 10px', borderRadius: '6px'
                }}>
                  {ticket.category}
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  {getStatusIcon(ticket.status)}
                  <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#e2e8f0' }}>{ticket.status}</span>
                </div>
              </div>

              <h4 style={{ color: 'white', fontSize: '1.1rem', marginBottom: '0.5rem', fontWeight: 600 }}>{ticket.tenant_name}</h4>
              <p style={{ color: '#94a3b8', fontSize: '0.9rem', lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                {ticket.description}
              </p>

              <div style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid rgba(255, 255, 255, 0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                  {new Date(ticket.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                </span>
                <button className="btn-text" style={{ color: '#4f46e5', fontWeight: 600, fontSize: '0.85rem' }}>View Details →</button>
              </div>

              {/* Decorative gradient corner */}
              <div style={{ position: 'absolute', top: 0, right: 0, width: '40px', height: '40px', background: 'linear-gradient(135deg, transparent 50%, rgba(79, 70, 229, 0.05) 50%)' }}></div>
            </div>
          ))}
        </div>
      )}

      {/* Ticket Management Modal */}
      {selectedTicket && (
        <div className="modal-overlay" style={{ background: 'rgba(15, 23, 42, 0.8)', backdropFilter: 'blur(12px)', zIndex: 9999 }}>
          <div className="modal-content" style={{ maxWidth: '600px', background: '#0f172a', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '28px', padding: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
              <div>
                <span style={{ color: '#64748b', fontSize: '0.8rem', fontWeight: 600 }}>TICKET #{selectedTicket.id}</span>
                <h2 style={{ color: 'white', marginTop: '0.25rem' }}>Resolve Request</h2>
              </div>
              <button 
                onClick={() => setSelectedTicket(null)}
                style={{ background: 'rgba(255,255,255,0.05)', border: 'none', color: 'white', borderRadius: '50%', width: '40px', height: '40px', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '2rem' }}>
              <div className="info-block">
                <label style={{ display: 'block', color: '#64748b', fontSize: '0.75rem', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Tenant</label>
                <div style={{ color: 'white', fontWeight: 600 }}>{selectedTicket.tenant_name}</div>
                <div style={{ color: '#94a3b8', fontSize: '0.85rem' }}>{selectedTicket.tenant_mobile}</div>
              </div>
              <div className="info-block">
                <label style={{ display: 'block', color: '#64748b', fontSize: '0.75rem', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Category</label>
                <span style={{ background: 'rgba(79, 70, 229, 0.15)', color: '#818cf8', padding: '4px 10px', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 600 }}>
                  {selectedTicket.category}
                </span>
              </div>
            </div>

            <div style={{ marginBottom: '2rem' }}>
              <label style={{ display: 'block', color: '#64748b', fontSize: '0.75rem', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Description</label>
              <div style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.05)', borderRadius: '16px', padding: '1.25rem', color: '#e2e8f0', lineHeight: 1.6 }}>
                {selectedTicket.description}
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: '2rem' }}>
              <label style={{ display: 'block', color: '#64748b', fontSize: '0.75rem', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Admin Action Notes</label>
              <textarea 
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                placeholder="Ex: Electrician scheduled for tomorrow morning..."
                style={{ 
                  width: '100%', height: '120px', padding: '1rem', 
                  background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255, 255, 255, 0.1)', 
                  borderRadius: '16px', color: 'white', fontSize: '0.95rem' 
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: '1rem' }}>
              <button 
                onClick={() => handleUpdateTicket(selectedTicket.id, 'Resolved')}
                className="btn btn-primary" 
                style={{ flex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem' }}
              >
                <CheckCircle size={18} /> Mark as Resolved
              </button>
              <button 
                onClick={() => handleUpdateTicket(selectedTicket.id, 'In Progress')}
                className="btn" 
                style={{ flex: 1, border: '1px solid var(--primary)', color: 'var(--primary)', background: 'transparent' }}
              >
                Start Work
              </button>
            </div>
          </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{ __html: `
        .ticket-card:hover {
          transform: translateY(-5px);
          border-color: rgba(79, 70, 229, 0.3);
          background: rgba(30, 41, 59, 0.9);
          box-shadow: 0 20px 40px -15px rgba(0, 0, 0, 0.5);
        }
        .stat-card-mini {
          padding: 8px 16px;
          border-radius: 12px;
          font-size: 0.85rem;
        }
        .btn-text:hover {
          text-decoration: underline;
        }
      `}} />
    </div>
  );
};

export default SupportTickets;
