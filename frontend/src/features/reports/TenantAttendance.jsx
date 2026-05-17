import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { ArrowLeft, Clock, CalendarDays, LogIn, LogOut, Activity } from 'lucide-react';

const TenantAttendance = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [tenant, setTenant] = useState(null);
  const [attendanceData, setAttendanceData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    fetchTenant();
  }, [id]);

  useEffect(() => {
    if (tenant) fetchAttendance();
  }, [tenant, startDate, endDate]);

  const fetchTenant = async () => {
    try {
      const res = await api.get('/api/tenants');
      const tenants = Array.isArray(res.data) ? res.data : [];
      const found = tenants.find(t => t.tenant_id === parseInt(id));
      setTenant(found || null);
    } catch (err) {
      console.error('Failed to fetch tenant', err);
    }
  };

  const fetchAttendance = async () => {
    setLoading(true);
    try {
      const q = new URLSearchParams({ startDate, endDate, tenant_id: id }).toString();
      const res = await api.get(`/api/reports/tenant-attendance?${q}`);
      setAttendanceData(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error('Failed to fetch attendance', err);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (isoStr) => {
    if (!isoStr) return '-';
    return new Date(isoStr).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });
  };

  // Compute summary stats
  const totalDays = attendanceData.length;
  const totalPunches = attendanceData.reduce((sum, d) => sum + (d.punch_count || 0), 0);
  const avgPunchesPerDay = totalDays > 0 ? (totalPunches / totalDays).toFixed(1) : 0;

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
        <button
          onClick={() => navigate('/reports')}
          style={{
            background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)',
            borderRadius: '10px', padding: '0.6rem', cursor: 'pointer',
            color: 'var(--text-muted)', display: 'flex', alignItems: 'center',
            transition: 'all 0.2s'
          }}
          onMouseEnter={e => { e.target.style.background = 'rgba(99,102,241,0.15)'; e.target.style.color = 'var(--primary)'; }}
          onMouseLeave={e => { e.target.style.background = 'rgba(255,255,255,0.05)'; e.target.style.color = 'var(--text-muted)'; }}
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.5rem' }}>
            {tenant ? tenant.name : `Tenant #${id}`}
          </h1>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>
            {tenant ? (
              <>
                {tenant.room_number ? `Room ${tenant.room_number}` : 'No Room'} 
                {tenant.floor_name ? ` · ${tenant.floor_name}` : ''}
                {tenant.biometric_pin ? ` · PIN: ${tenant.biometric_pin}` : ''}
                {' · '}
                <span style={{ 
                  color: tenant.status === 'Staying' ? '#10b981' : '#ef4444',
                  fontWeight: 600
                }}>
                  {tenant.status}
                </span>
              </>
            ) : 'Loading...'}
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        <div style={{
          background: 'linear-gradient(135deg, rgba(99,102,241,0.12) 0%, rgba(99,102,241,0.04) 100%)',
          border: '1px solid rgba(99,102,241,0.2)', borderRadius: '12px', padding: '1.25rem',
          display: 'flex', alignItems: 'center', gap: '1rem'
        }}>
          <div style={{ background: 'rgba(99,102,241,0.2)', borderRadius: '10px', padding: '0.6rem', display: 'flex' }}>
            <CalendarDays size={22} color="#818cf8" />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Days Present</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text)' }}>{totalDays}</div>
          </div>
        </div>

        <div style={{
          background: 'linear-gradient(135deg, rgba(16,185,129,0.12) 0%, rgba(16,185,129,0.04) 100%)',
          border: '1px solid rgba(16,185,129,0.2)', borderRadius: '12px', padding: '1.25rem',
          display: 'flex', alignItems: 'center', gap: '1rem'
        }}>
          <div style={{ background: 'rgba(16,185,129,0.2)', borderRadius: '10px', padding: '0.6rem', display: 'flex' }}>
            <Activity size={22} color="#10b981" />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Punches</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text)' }}>{totalPunches}</div>
          </div>
        </div>

        <div style={{
          background: 'linear-gradient(135deg, rgba(245,158,11,0.12) 0%, rgba(245,158,11,0.04) 100%)',
          border: '1px solid rgba(245,158,11,0.2)', borderRadius: '12px', padding: '1.25rem',
          display: 'flex', alignItems: 'center', gap: '1rem'
        }}>
          <div style={{ background: 'rgba(245,158,11,0.2)', borderRadius: '10px', padding: '0.6rem', display: 'flex' }}>
            <Clock size={22} color="#f59e0b" />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Avg / Day</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text)' }}>{avgPunchesPerDay}</div>
          </div>
        </div>
      </div>

      {/* Date Range Picker */}
      <div className="data-table-container">
        <div style={{ 
          padding: '1rem 1.25rem', borderBottom: '1px solid var(--border)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem'
        }}>
          <h3 style={{ margin: 0, fontSize: '1rem' }}>Day-wise Attendance Log</h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem' }}>
              <span style={{ color: 'var(--text-muted)' }}>From:</span>
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
                style={{ padding: '4px 8px', borderRadius: '6px', border: '1px solid var(--border)', background: 'rgba(0,0,0,0.2)', color: 'white' }} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem' }}>
              <span style={{ color: 'var(--text-muted)' }}>To:</span>
              <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
                style={{ padding: '4px 8px', borderRadius: '6px', border: '1px solid var(--border)', background: 'rgba(0,0,0,0.2)', color: 'white' }} />
            </div>
          </div>
        </div>

        {/* Attendance Table */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>Loading attendance data...</div>
        ) : attendanceData.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>No attendance data found for this period.</div>
        ) : (
          <div>
            {attendanceData.map((day, idx) => (
              <div key={idx} style={{
                borderBottom: '1px solid var(--border)',
                padding: '1rem 1.25rem',
                transition: 'background 0.2s',
                cursor: 'default'
              }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                {/* Day header row */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{
                      background: 'rgba(99,102,241,0.15)', borderRadius: '8px',
                      padding: '0.4rem 0.75rem', minWidth: '60px', textAlign: 'center'
                    }}>
                      <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#818cf8' }}>
                        {new Date(day.date).getDate()}
                      </div>
                      <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                        {new Date(day.date).toLocaleDateString('en-IN', { month: 'short' })}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{formatDate(day.date)}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                        {day.punch_count} punch{day.punch_count !== 1 ? 'es' : ''}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '2px' }}>First In</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <LogIn size={14} color="#10b981" />
                        <span style={{ fontWeight: 600, color: '#10b981', fontFamily: 'monospace', fontSize: '0.9rem' }}>
                          {formatTime(day.first_punch)}
                        </span>
                      </div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '2px' }}>Last Out</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <LogOut size={14} color="#ef4444" />
                        <span style={{ fontWeight: 600, color: '#ef4444', fontFamily: 'monospace', fontSize: '0.9rem' }}>
                          {day.last_punch ? formatTime(day.last_punch) : '-'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* All punches timeline */}
                {day.all_punches && day.all_punches.length > 0 && (
                  <div style={{
                    display: 'flex', flexWrap: 'wrap', gap: '0.4rem', paddingLeft: '0.5rem',
                    borderLeft: '2px solid rgba(99,102,241,0.3)', marginLeft: '1.75rem'
                  }}>
                    {day.all_punches.map((punch, pIdx) => {
                      const isFirst = pIdx === 0;
                      const isLast = pIdx === day.all_punches.length - 1 && day.all_punches.length > 1;
                      let bgColor = 'rgba(255,255,255,0.05)';
                      let textColor = 'var(--text)';
                      let borderColor = 'var(--border)';
                      if (isFirst) { bgColor = 'rgba(16,185,129,0.1)'; textColor = '#10b981'; borderColor = 'rgba(16,185,129,0.3)'; }
                      else if (isLast) { bgColor = 'rgba(239,68,68,0.1)'; textColor = '#ef4444'; borderColor = 'rgba(239,68,68,0.3)'; }

                      return (
                        <span key={pIdx} style={{
                          fontSize: '0.75rem', fontFamily: 'monospace', fontWeight: 500,
                          padding: '3px 8px', borderRadius: '6px',
                          background: bgColor, color: textColor,
                          border: `1px solid ${borderColor}`,
                          transition: 'transform 0.15s',
                        }}>
                          {formatTime(punch)}
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default TenantAttendance;
