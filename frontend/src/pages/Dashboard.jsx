import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { Bed, Users, Clock, TrendingUp, PieChart, Activity, CreditCard, AlertTriangle, ArrowUpRight, ArrowDownRight, DollarSign, Calendar } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart as RechartsPie, Pie, Cell, Legend
} from 'recharts';

const CHART_COLORS = {
  occupied: '#6366f1',
  vacant: '#10b981',
  maintenance: '#f59e0b',
  paid: '#10b981',
  pending: '#f59e0b',
  overdue: '#ef4444',
  revenue: '#818cf8'
};

const Dashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalBeds: 0, occupied: 0, vacant: 0, maintenance: 0,
    totalTenants: 0, staffPresent: 0, totalStaff: 0
  });
  const [chartData, setChartData] = useState(null);
  const [chartLoading, setChartLoading] = useState(true);

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
          totalBeds: beds.length,
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

    const fetchChartData = async () => {
      setChartLoading(true);
      try {
        const res = await api.get('/api/reports/dashboard-charts');
        setChartData(res.data);
      } catch (err) {
        console.error('Failed to fetch chart data', err);
      } finally {
        setChartLoading(false);
      }
    };

    fetchStats();
    fetchChartData();
  }, []);

  const occupancyData = chartData ? [
    { name: 'Occupied', value: chartData.occupancy.Occupied, color: CHART_COLORS.occupied },
    { name: 'Vacant', value: chartData.occupancy.Vacant, color: CHART_COLORS.vacant },
    { name: 'Maintenance', value: chartData.occupancy.Maintenance, color: CHART_COLORS.maintenance }
  ].filter(d => d.value > 0) : [];

  const paymentData = chartData ? [
    { name: 'Paid', value: chartData.paymentDistribution.paid, color: CHART_COLORS.paid },
    { name: 'Pending', value: chartData.paymentDistribution.pending, color: CHART_COLORS.pending },
    { name: 'Overdue', value: chartData.paymentDistribution.overdue, color: CHART_COLORS.overdue }
  ].filter(d => d.value > 0) : [];

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div style={{
          background: 'var(--card-bg)',
          border: '1px solid var(--border)',
          borderRadius: '0.75rem',
          padding: '0.75rem 1rem',
          boxShadow: '0 10px 25px rgba(0,0,0,0.3)'
        }}>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', margin: 0 }}>{label}</p>
          <p style={{ color: '#818cf8', fontWeight: 700, fontSize: '1rem', margin: '4px 0 0' }}>
            ₹{payload[0].value.toLocaleString()}
          </p>
        </div>
      );
    }
    return null;
  };

  const PieLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
    if (percent < 0.05) return null;
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);
    return (
      <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" style={{ fontSize: '0.75rem', fontWeight: 700 }}>
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  const getActivityIcon = (type) => {
    if (type === 'payment') return <CreditCard size={16} />;
    if (type === 'tenant') return <Users size={16} />;
    if (type === 'vacate') return <AlertTriangle size={16} />;
    return <Activity size={16} />;
  };

  const getActivityColor = (iconType) => {
    if (iconType === 'payment') return '#10b981';
    if (iconType === 'tenant') return '#6366f1';
    if (iconType === 'vacate') return '#ef4444';
    return '#94a3b8';
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ margin: 0 }}>Dashboard Overview</h1>
          <p style={{ color: 'var(--text-muted)', margin: '0.25rem 0 0', fontSize: '0.9rem' }}>
            Welcome back — here's your PG at a glance
          </p>
        </div>
      </div>

      {/* ── Quick Stats Row ──────────────────────────────────────────────── */}
      <div className="stats-grid">
        <div className="stat-card" onClick={() => navigate('/beds')} style={{ cursor: 'pointer', transition: 'transform 0.2s', background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(99, 102, 241, 0.02) 100%)', border: '1px solid rgba(99, 102, 241, 0.2)' }} onMouseOver={e => e.currentTarget.style.transform = 'translateY(-5px)'} onMouseOut={e => e.currentTarget.style.transform = 'translateY(0)'}>
          <div className="stat-label">Total Beds</div>
          <div className="stat-value" style={{ color: '#6366f1' }}>{stats.totalBeds}</div>
          <Bed size={24} style={{ position: 'absolute', bottom: '1.5rem', right: '1.5rem', opacity: 0.2, color: '#6366f1' }} />
        </div>
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

      {/* ── Collection Metrics Row ────────────────────────────────────────── */}
      {chartData && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
          <div style={{
            background: 'linear-gradient(135deg, #1e293b 0%, rgba(99, 102, 241, 0.08) 100%)',
            border: '1px solid rgba(99, 102, 241, 0.2)',
            borderRadius: '1rem', padding: '1.25rem', position: 'relative', overflow: 'hidden'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <DollarSign size={16} style={{ color: '#818cf8' }} />
              <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Revenue This Month</span>
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#818cf8' }}>
              ₹{(chartData.metrics.revenueThisMonth || 0).toLocaleString()}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
              of ₹{(chartData.metrics.expectedRent || 0).toLocaleString()} expected
            </div>
          </div>

          <div style={{
            background: 'linear-gradient(135deg, #1e293b 0%, rgba(16, 185, 129, 0.08) 100%)',
            border: '1px solid rgba(16, 185, 129, 0.2)',
            borderRadius: '1rem', padding: '1.25rem', position: 'relative'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <TrendingUp size={16} style={{ color: '#10b981' }} />
              <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Collection Rate</span>
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: 700, color: chartData.metrics.collectionRate >= 80 ? '#10b981' : chartData.metrics.collectionRate >= 50 ? '#f59e0b' : '#ef4444' }}>
              {chartData.metrics.collectionRate}%
            </div>
            <div style={{
              marginTop: '0.5rem', height: '4px', background: 'rgba(128,128,128,0.2)', borderRadius: '2px', overflow: 'hidden'
            }}>
              <div style={{
                width: `${Math.min(100, chartData.metrics.collectionRate)}%`,
                height: '100%',
                background: chartData.metrics.collectionRate >= 80 ? '#10b981' : chartData.metrics.collectionRate >= 50 ? '#f59e0b' : '#ef4444',
                borderRadius: '2px',
                transition: 'width 1s ease-out'
              }} />
            </div>
          </div>

          <div style={{
            background: 'linear-gradient(135deg, #1e293b 0%, rgba(245, 158, 11, 0.08) 100%)',
            border: '1px solid rgba(245, 158, 11, 0.2)',
            borderRadius: '1rem', padding: '1.25rem', position: 'relative'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <Calendar size={16} style={{ color: '#f59e0b' }} />
              <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Upcoming Due</span>
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#f59e0b' }}>
              {chartData.metrics.upcomingDueCount}
              <span style={{ fontSize: '0.9rem', fontWeight: 400, color: 'var(--text-muted)', marginLeft: '0.25rem' }}>tenants</span>
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
              rent due within 7 days
            </div>
          </div>

          <div style={{
            background: 'linear-gradient(135deg, #1e293b 0%, rgba(239, 68, 68, 0.08) 100%)',
            border: `1px solid ${chartData.metrics.overdueCount > 0 ? 'rgba(239, 68, 68, 0.3)' : 'rgba(16, 185, 129, 0.2)'}`,
            borderRadius: '1rem', padding: '1.25rem', position: 'relative'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <AlertTriangle size={16} style={{ color: chartData.metrics.overdueCount > 0 ? '#ef4444' : '#10b981' }} />
              <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Overdue</span>
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: 700, color: chartData.metrics.overdueCount > 0 ? '#ef4444' : '#10b981' }}>
              {chartData.metrics.overdueCount > 0 ? chartData.metrics.overdueCount : '✓'}
              {chartData.metrics.overdueCount > 0 && <span style={{ fontSize: '0.9rem', fontWeight: 400, color: 'var(--text-muted)', marginLeft: '0.25rem' }}>tenants</span>}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
              {chartData.metrics.overdueCount > 0 ? 'have overdue payments' : 'all payments up to date'}
            </div>
          </div>
        </div>
      )}

      {/* ── Charts Row: Revenue Trend + Occupancy + Payment Status ─────── */}
      {!chartLoading && chartData && (
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem', marginBottom: '2rem' }}>
          {/* Revenue Trend Chart */}
          <div style={{
            background: 'var(--card-bg)', borderRadius: '1rem', border: '1px solid var(--border)',
            padding: '1.5rem', position: 'relative'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>Revenue Trend</h3>
                <p style={{ margin: '0.25rem 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>Last 6 months collection</p>
              </div>
              <TrendingUp size={20} style={{ color: '#818cf8', opacity: 0.5 }} />
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={chartData.revenueTrend} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#818cf8" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#818cf8" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.1)" vertical={false} />
                <XAxis dataKey="month" tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={v => v >= 1000 ? `₹${(v / 1000).toFixed(0)}k` : `₹${v}`} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="revenue" stroke="#818cf8" strokeWidth={2.5} fill="url(#revenueGradient)" dot={{ r: 4, fill: '#818cf8', strokeWidth: 2, stroke: '#1e293b' }} activeDot={{ r: 6, fill: '#818cf8', stroke: '#1e293b', strokeWidth: 2 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Occupancy & Payment Donut Charts */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* Occupancy Donut */}
            <div style={{
              background: 'var(--card-bg)', borderRadius: '1rem', border: '1px solid var(--border)',
              padding: '1.25rem', flex: 1
            }}>
              <h3 style={{ margin: '0 0 0.5rem', fontSize: '0.9rem', fontWeight: 700 }}>Bed Occupancy</h3>
              {occupancyData.length > 0 ? (
                <ResponsiveContainer width="100%" height={130}>
                  <RechartsPie>
                    <Pie data={occupancyData} cx="50%" cy="50%" innerRadius={35} outerRadius={55} paddingAngle={3} dataKey="value" labelLine={false} label={PieLabel}>
                      {occupancyData.map((entry, i) => <Cell key={i} fill={entry.color} stroke="transparent" />)}
                    </Pie>
                    <Legend iconSize={8} wrapperStyle={{ fontSize: '0.7rem', color: '#94a3b8' }} formatter={(v, e) => `${v} (${e.payload.value})`} />
                  </RechartsPie>
                </ResponsiveContainer>
              ) : (
                <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>No bed data</div>
              )}
            </div>

            {/* Payment Status Donut */}
            <div style={{
              background: 'var(--card-bg)', borderRadius: '1rem', border: '1px solid var(--border)',
              padding: '1.25rem', flex: 1
            }}>
              <h3 style={{ margin: '0 0 0.5rem', fontSize: '0.9rem', fontWeight: 700 }}>Payment Status</h3>
              {paymentData.length > 0 ? (
                <ResponsiveContainer width="100%" height={130}>
                  <RechartsPie>
                    <Pie data={paymentData} cx="50%" cy="50%" innerRadius={35} outerRadius={55} paddingAngle={3} dataKey="value" labelLine={false} label={PieLabel}>
                      {paymentData.map((entry, i) => <Cell key={i} fill={entry.color} stroke="transparent" />)}
                    </Pie>
                    <Legend iconSize={8} wrapperStyle={{ fontSize: '0.7rem', color: '#94a3b8' }} formatter={(v, e) => `${v} (${e.payload.value})`} />
                  </RechartsPie>
                </ResponsiveContainer>
              ) : (
                <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>No payment data</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Recent Activity Feed ─────────────────────────────────────────── */}
      {chartData && chartData.recentActivity?.length > 0 && (
        <div style={{
          background: 'var(--card-bg)', borderRadius: '1rem', border: '1px solid var(--border)',
          padding: '1.5rem'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>Recent Activity</h3>
              <p style={{ margin: '0.25rem 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>Latest events across your PG</p>
            </div>
            <Activity size={20} style={{ color: 'var(--text-muted)', opacity: 0.3 }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
            {chartData.recentActivity.map((item, idx) => (
              <div
                key={item.id}
                style={{
                  display: 'flex', alignItems: 'center', gap: '1rem',
                  padding: '0.75rem 0',
                  borderTop: idx > 0 ? '1px solid rgba(128,128,128,0.08)' : 'none',
                  transition: 'background 0.15s',
                  borderRadius: '0.5rem'
                }}
              >
                <div style={{
                  width: '36px', height: '36px', borderRadius: '10px',
                  background: `${getActivityColor(item.icon)}15`,
                  color: getActivityColor(item.icon),
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                }}>
                  {getActivityIcon(item.icon)}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--text-main)' }}>{item.title}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {item.description}
                  </div>
                </div>
                {item.detail && (
                  <div style={{
                    fontSize: '0.7rem', padding: '2px 8px', borderRadius: '4px',
                    background: 'rgba(128,128,128,0.1)', color: 'var(--text-muted)', whiteSpace: 'nowrap'
                  }}>
                    {item.detail}
                  </div>
                )}
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                  {item.date ? new Date(item.date).toLocaleDateString() : ''}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Loading skeleton for charts */}
      {chartLoading && (
        <div style={{
          display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem', marginBottom: '2rem'
        }}>
          <div style={{
            background: 'var(--card-bg)', borderRadius: '1rem', border: '1px solid var(--border)',
            padding: '1.5rem', height: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <TrendingUp size={18} className="spin" /> Loading charts...
            </div>
          </div>
          <div style={{
            background: 'var(--card-bg)', borderRadius: '1rem', border: '1px solid var(--border)',
            padding: '1.5rem', height: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <PieChart size={18} className="spin" /> Loading...
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
