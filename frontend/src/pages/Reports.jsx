import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FileText, Download, Printer, Filter, Calendar, Search } from 'lucide-react';

class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { hasError: false, error: null }; }
  static getDerivedStateFromError(error) { return { hasError: true, error }; }
  render() { 
    if (this.state.hasError) return <div style={{color:'red', padding:'2rem', background:'black'}}><pre>{this.state.error.toString()}\n{this.state.error.stack}</pre></div>; 
    return this.props.children; 
  }
}

const Reports = () => {
  const [reportType, setReportType] = useState('summary'); // summary | tenant
  const [startDate, setStartDate] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [transactions, setTransactions] = useState([]);
  const [tenantData, setTenantData] = useState([]);
  const [attendanceData, setAttendanceData] = useState([]);
  const [stats, setStats] = useState({ revenue: 0, pending: 0, advance: 0, occupancy: { Vacant: 0, Occupied: 0, Maintenance: 0 } });
  const [floors, setFloors] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [filters, setFilters] = useState({ floor_id: '', room_id: '', status: '', payment_via: '' });
  const [searchTerm, setSearchTerm] = useState('');
  const [renderError, setRenderError] = useState(null);

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const d = new Date(dateString);
    return isNaN(d) ? 'N/A' : d.toLocaleDateString();
  };

  useEffect(() => {
    fetchStats();
    fetchFloors();
    fetchRooms();
  }, [startDate, endDate]);

  useEffect(() => {
    if (reportType === 'summary') fetchTransactions();
    else if (reportType === 'tenant') fetchTenantWise();
    else if (reportType === 'attendance') fetchAttendance();
  }, [reportType, startDate, endDate, filters]);

  const fetchStats = async () => {
    try {
      const res = await axios.get(`/api/reports/stats?startDate=${startDate}&endDate=${endDate}`);
      setStats(res.data);
    } catch (err) { console.error(err); }
  };

  const fetchTransactions = async () => {
    try {
      const q = new URLSearchParams({ startDate, endDate, payment_via: filters.payment_via }).toString();
      const res = await axios.get(`/api/reports/transactions?${q}`);
      setTransactions(res.data);
    } catch (err) { console.error(err); }
  };

  const fetchTenantWise = async () => {
    try {
      const q = new URLSearchParams({ startDate, endDate, ...filters }).toString();
      const res = await axios.get(`/api/reports/tenant-wise?${q}`);
      setTenantData(res.data);
    } catch (err) { console.error(err); }
  };

  const fetchAttendance = async () => {
    try {
      const q = new URLSearchParams({ startDate, endDate, ...filters }).toString();
      const res = await axios.get(`/api/reports/tenant-attendance?${q}`);
      setAttendanceData(res.data);
    } catch (err) { console.error(err); }
  };

  const fetchFloors = async () => {
    try {
      const res = await axios.get('/api/floors');
      setFloors(res.data);
    } catch (err) { console.error(err); }
  };

  const fetchRooms = async () => {
    try {
      const res = await axios.get('/api/rooms');
      setRooms(res.data);
    } catch (err) { console.error(err); }
  };

  const handleExportExcel = () => {
    let data = [];
    if (reportType === 'summary') data = transactions;
    else if (reportType === 'tenant') data = tenantData;
    else if (reportType === 'attendance') data = attendanceData;
    
    if (!data.length) return;
    
    const csv = [
      Object.keys(data[0] || {}).join(','),
      ...data.map(row => Object.values(row).join(','))
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `report_${reportType}_${new Date().toISOString()}.csv`;
    a.click();
  };

  let filteredTransactions = [];
  let filteredTenantData = [];
  let filteredAttendanceData = [];
  
  try {
    filteredTransactions = transactions.filter(t => 
      (t.tenant_name || '').toLowerCase().includes((searchTerm || '').toLowerCase()) || 
      (t.room_number?.toString() || '').includes(searchTerm) ||
      (t.utr_number?.toString() || '').includes(searchTerm)
    );

    filteredTenantData = tenantData.filter(t =>
      (t.name || '').toLowerCase().includes((searchTerm || '').toLowerCase()) ||
      (t.room_number?.toString() || '').includes(searchTerm) ||
      (t.mobile?.toString() || '').includes(searchTerm)
    );

    filteredAttendanceData = attendanceData.filter(t =>
      (t.tenant_name || '').toLowerCase().includes((searchTerm || '').toLowerCase()) ||
      (t.room_number?.toString() || '').includes(searchTerm)
    );
  } catch (err) {
    if (!renderError) setRenderError(err);
  }

  if (renderError) {
    return (
      <div style={{color:'red', padding:'2rem', background:'black'}}>
        <h2>Render Error Caught</h2>
        <pre>{renderError.toString()}\n{renderError.stack}</pre>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1>Reports & Analytics</h1>
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
            <button className={`btn ${reportType === 'summary' ? 'btn-primary' : ''}`} onClick={() => setReportType('summary')} style={{ fontSize: '0.8rem', padding: '0.5rem 1rem' }}>Financial Summary</button>
            <button className={`btn ${reportType === 'tenant' ? 'btn-primary' : ''}`} onClick={() => setReportType('tenant')} style={{ fontSize: '0.8rem', padding: '0.5rem 1rem' }}>Tenant-wise Details</button>
            <button className={`btn ${reportType === 'attendance' ? 'btn-primary' : ''}`} onClick={() => setReportType('attendance')} style={{ fontSize: '0.8rem', padding: '0.5rem 1rem' }}>Tenant Attendance</button>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <div style={{ position: 'relative' }}>
            <Search size={18} style={{ position: 'absolute', left: '10px', top: '10px', color: 'var(--text-muted)' }} />
            <input 
              type="text" 
              placeholder="Search reports..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              style={{ paddingLeft: '2.5rem', width: '250px' }}
            />
          </div>
          <button className="btn" onClick={handleExportExcel} style={{ background: 'var(--card-bg)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Download size={18} /> Export Excel
          </button>
          <button className="btn btn-primary" onClick={() => window.print()} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Printer size={18} /> Print / PDF
          </button>
        </div>
      </div>

      <div style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', display: 'grid', gap: '1.5rem', marginBottom: '2rem' }}>
        <div className="stat-card" style={{ padding: '1.25rem', position: 'relative' }}>
          <div className="stat-label">Revenue</div>
          <div className="stat-value" style={{ fontSize: '1.5rem', marginTop: '0.5rem' }}>₹{(stats.revenue || 0).toLocaleString()}</div>
          <Calendar size={20} style={{ position: 'absolute', bottom: '1rem', right: '1rem', opacity: 0.1, color: 'var(--primary)' }} />
        </div>
        <div className="stat-card" style={{ padding: '1.25rem', position: 'relative' }}>
          <div className="stat-label">Pending Rent</div>
          <div className="stat-value" style={{ fontSize: '1.5rem', marginTop: '0.5rem', color: 'var(--danger)' }}>₹{(stats.pending || 0).toLocaleString()}</div>
          <FileText size={20} style={{ position: 'absolute', bottom: '1rem', right: '1rem', opacity: 0.1, color: 'var(--danger)' }} />
        </div>
        <div className="stat-card" style={{ padding: '1.25rem', position: 'relative' }}>
          <div className="stat-label">Advance</div>
          <div className="stat-value" style={{ fontSize: '1.5rem', marginTop: '0.5rem', color: 'var(--accent)' }}>₹{(stats.advance || 0).toLocaleString()}</div>
          <Download size={20} style={{ position: 'absolute', bottom: '1rem', right: '1rem', opacity: 0.1, color: 'var(--accent)' }} />
        </div>
        <div className="stat-card" style={{ padding: '1.25rem', borderLeft: '4px solid #10b981' }}>
          <div className="stat-label">Occupied</div>
          <div className="stat-value" style={{ fontSize: '1.5rem', marginTop: '0.5rem' }}>{stats.occupancy?.Occupied || 0}</div>
        </div>
        <div className="stat-card" style={{ padding: '1.25rem', borderLeft: '4px solid var(--text-muted)' }}>
          <div className="stat-label">Vacant</div>
          <div className="stat-value" style={{ fontSize: '1.5rem', marginTop: '0.5rem' }}>{stats.occupancy?.Vacant || 0}</div>
        </div>
      </div>

      <div className="data-table-container">
        <div style={{ padding: '1.25rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1.5rem' }}>
          <h3 style={{ fontSize: '1rem', margin: 0 }}>
            {reportType === 'summary' ? 'Transaction History' : reportType === 'tenant' ? 'Tenant-wise Statement' : 'Tenant Attendance Reports'}
          </h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem' }}>
              <span style={{ color: 'var(--text-muted)' }}>From:</span>
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} style={{ padding: '4px 8px', borderRadius: '4px', border: '1px solid var(--border)', background: 'rgba(0,0,0,0.2)', color: 'white' }} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem' }}>
              <span style={{ color: 'var(--text-muted)' }}>To:</span>
              <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} style={{ padding: '4px 8px', borderRadius: '4px', border: '1px solid var(--border)', background: 'rgba(0,0,0,0.2)', color: 'white' }} />
            </div>
            {reportType !== 'attendance' && (
              <select style={{ fontSize: '0.8rem', padding: '4px' }} value={filters.payment_via} onChange={e => setFilters({...filters, payment_via: e.target.value})}>
                <option value="">All Payment Methods</option>
                <option value="Cash">Cash</option>
                <option value="UPI">UPI</option>
                <option value="Bank Transfer">Bank Transfer</option>
                <option value="Card">Card</option>
              </select>
            )}
            {(reportType === 'tenant' || reportType === 'attendance') && (
              <>
                <select style={{ fontSize: '0.8rem', padding: '4px' }} onChange={e => setFilters({...filters, floor_id: e.target.value})}>
                  <option value="">All Floors</option>
                  {floors.map(f => <option key={f.floor_id} value={f.floor_id}>{f.floor_name}</option>)}
                </select>
                <select style={{ fontSize: '0.8rem', padding: '4px' }} onChange={e => setFilters({...filters, room_id: e.target.value})}>
                  <option value="">All Rooms</option>
                  {rooms.map(r => <option key={r.room_id} value={r.room_id}>Room {r.room_number}</option>)}
                </select>
                <select style={{ fontSize: '0.8rem', padding: '4px' }} onChange={e => setFilters({...filters, status: e.target.value})}>
                  <option value="">All Status</option>
                  <option value="Staying">Staying</option>
                  <option value="Vacated">Vacated</option>
                </select>
              </>
            )}
          </div>
        </div>

        {reportType === 'summary' ? (
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Tenant Name</th>
                <th>Room</th>
                <th>Type</th>
                <th>Payment Method</th>
                <th>Amount</th>
                <th>Balance</th>
              </tr>
            </thead>
            <tbody>
              {filteredTransactions.length > 0 ? (
                filteredTransactions.map(t => (
                  <tr key={t.payment_id}>
                    <td>{formatDate(t.payment_date)}</td>
                    <td>{t.tenant_name}</td>
                    <td>Room {t.room_number || 'N/A'}</td>
                    <td>
                      <span style={{ fontSize: '0.75rem', fontWeight: 600, color: t.payment_type === 'Rent' ? 'var(--primary)' : 'var(--accent)' }}>
                        {t.payment_type}
                      </span>
                    </td>
                    <td>
                      <div style={{ fontSize: '0.8rem' }}>{t.payment_via || 'Cash'}</div>
                      {t.utr_number && <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>UTR: {t.utr_number}</div>}
                    </td>
                    <td>₹{(t.amount_paid || 0).toLocaleString()}</td>
                    <td style={{ color: t.balance > 0 ? 'var(--danger)' : 'var(--success)' }}>₹{(t.balance || 0).toLocaleString()}</td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan="7" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>No records found.</td></tr>
              )}
            </tbody>
          </table>
        ) : reportType === 'tenant' ? (
          <table>
            <thead>
              <tr>
                <th>Room No</th>
                <th>Sharing</th>
                <th>Tenant Name</th>
                <th>Phone Number</th>
                <th>Joining Date</th>
                <th>Fixed Rent</th>
                <th>Advance</th>
                <th>Total Balance</th>
                <th>Present Month Rent</th>
                <th>Present Month Balance</th>
                <th>Payment Type</th>
                <th>Payment Date</th>
              </tr>
            </thead>
            <tbody>
              {filteredTenantData.length > 0 ? (
                filteredTenantData.map(t => (
                  <tr key={t.tenant_id}>
                    <td><div style={{ fontWeight: 600 }}>{t.room_number}</div><div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{t.floor_name}</div></td>
                    <td>{t.sharing_capacity} Share</td>
                    <td><div style={{ fontWeight: 600 }}>{t.name}</div><div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Bed {t.bed_number}</div></td>
                    <td>{t.mobile}</td>
                    <td>{formatDate(t.joining_date)}</td>
                    <td>₹{t.bed_cost ? t.bed_cost.toLocaleString() : 0}</td>
                    <td>₹{t.advance_amount ? t.advance_amount.toLocaleString() : 0}</td>
                    <td style={{ fontWeight: 600, color: t.total_balance > 0 ? 'var(--danger)' : 'var(--success)' }}>₹{(t.total_balance || 0).toLocaleString()}</td>
                    <td>₹{t.bed_cost ? t.bed_cost.toLocaleString() : 0}</td>
                    <td style={{ color: t.present_month_balance > 0 ? 'var(--danger)' : 'var(--text-muted)' }}>₹{(t.present_month_balance || 0).toLocaleString()}</td>
                    <td><span style={{ fontSize: '0.8rem', background: 'rgba(255,255,255,0.1)', padding: '2px 6px', borderRadius: '4px' }}>{t.last_payment_type}</span></td>
                    <td>{formatDate(t.last_payment_date)}</td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan="12" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>No tenant data found.</td></tr>
              )}
            </tbody>
          </table>
        ) : reportType === 'attendance' ? (
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Tenant Name</th>
                <th>Room No</th>
                <th>Floor</th>
                <th>First Punch In</th>
                <th>Last Punch Out</th>
                <th>Total Punches</th>
              </tr>
            </thead>
            <tbody>
              {filteredAttendanceData.length > 0 ? (
                filteredAttendanceData.map((t, idx) => (
                  <tr key={idx}>
                    <td><div style={{ fontWeight: 600 }}>{formatDate(t.date)}</div></td>
                    <td><div style={{ fontWeight: 600 }}>{t.tenant_name}</div></td>
                    <td>{t.room_number}</td>
                    <td>{t.floor_name}</td>
                    <td><span style={{ color: 'var(--success)' }}>{new Date(t.first_punch).toLocaleTimeString()}</span></td>
                    <td>{t.last_punch ? <span style={{ color: 'var(--danger)' }}>{new Date(t.last_punch).toLocaleTimeString()}</span> : <span style={{ color: 'var(--text-muted)' }}>-</span>}</td>
                    <td>
                      <div style={{ position: 'relative', display: 'inline-block' }}>
                        <span 
                          style={{ fontSize: '0.8rem', background: 'rgba(99, 102, 241, 0.2)', color: '#818cf8', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', border: '1px solid rgba(99, 102, 241, 0.5)' }} 
                          onClick={(e) => {
                            const popup = e.currentTarget.nextElementSibling;
                            popup.style.display = popup.style.display === 'none' ? 'block' : 'none';
                          }}
                        >
                          {t.punch_count} punches ▾
                        </span>
                        <div style={{ display: 'none', position: 'absolute', right: 0, top: '100%', marginTop: '5px', background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: '6px', padding: '0.5rem', zIndex: 10, minWidth: '120px', boxShadow: '0 4px 12px rgba(0,0,0,0.5)' }}>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '4px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '4px' }}>All Logs</div>
                          <div style={{ maxHeight: '150px', overflowY: 'auto' }}>
                            {t.all_punches?.map((p, i) => (
                              <div key={i} style={{ fontSize: '0.8rem', padding: '3px 0', fontFamily: 'monospace', color: 'var(--text)' }}>
                                {new Date(p).toLocaleTimeString()}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan="7" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>No attendance data found.</td></tr>
              )}
            </tbody>
          </table>
        ) : null}
      </div>
    </div>
    </ErrorBoundary>
  );
};

export default Reports;
