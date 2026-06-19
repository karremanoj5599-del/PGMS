import React, { useState, useEffect } from 'react';
import axios from '../../services/api';
import { CreditCard, CheckCircle, XCircle, Search, AlertCircle } from 'lucide-react';
import { useLocation } from 'react-router-dom';

const Payments = () => {
  const [tenants, setTenants] = useState([]);
  const location = useLocation();
  const [searchTerm, setSearchTerm] = useState(location.state?.searchTerm || '');
  const [filterFloor, setFilterFloor] = useState('All');
  const [filterRoom, setFilterRoom] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All'); // All | Pending | Balance | Completed | Advances
  const [advanceSubTab, setAdvanceSubTab] = useState('paid'); // paid | pending | returnable
  const [showPayModal, setShowPayModal] = useState(false);
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState(null);
  const [paymentData, setPaymentData] = useState({ 
    rent_charged: '', 
    amount_paid: '', 
    payment_type: 'Rent', 
    balance: 0, 
    utr_number: '', 
    payment_via: 'Cash' 
  });
  const [refundData, setRefundData] = useState({ deduction: 0, remarks: '', payment_via: 'UPI', utr_number: '' });
  const [loading, setLoading] = useState(false);

  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const now = new Date();
  const currentMonth = monthNames[now.getMonth()];
  const prevMonth = monthNames[now.getMonth() === 0 ? 11 : now.getMonth() - 1];


  useEffect(() => {
    fetchStatus();
  }, []);

  const fetchStatus = async () => {
    try {
      const res = await axios.get('/api/payments/status');
      setTenants(res.data);
    } catch (err) { console.error(err); }
  };

  const handlePayment = async (e) => {
    e.preventDefault();
    try {
      const { rent_charged, ...payload } = paymentData;
      await axios.post('/api/payments', {
        tenant_id: selectedTenant.tenant_id,
        payment_date: new Date().toISOString().split('T')[0],
        ...payload,
        balance: (selectedTenant.computed_balance || 0) + (parseFloat(paymentData.balance) || 0)
      });
      setShowPayModal(false);
      fetchStatus();
    } catch (err) { console.error(err); }
  };

  const processedTenants = tenants.map(t => ({
    ...t,
    computed_balance: !t.last_payment_date ? 0 : (t.pending_balance || 0),
    total_pending: !t.last_payment_date ? (t.bed_cost || 0) : (t.pending_balance || 0)
  }));

  const uniqueFloors = [...new Set(processedTenants.map(t => t.floor_name).filter(Boolean))].sort();
  const availableRooms = filterFloor === 'All' ? processedTenants : processedTenants.filter(t => t.floor_name === filterFloor);
  const uniqueRooms = [...new Set(availableRooms.map(t => String(t.room_number)).filter(Boolean))].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

  const filtered = processedTenants.filter(t => {
    const searchMatch = t.name.toLowerCase().includes(searchTerm.toLowerCase()) || (t.room_number?.toString() || '').includes(searchTerm);
    if (!searchMatch) return false;

    if (filterFloor !== 'All' && t.floor_name !== filterFloor) return false;
    if (filterRoom !== 'All' && String(t.room_number) !== filterRoom) return false;

    if (filterStatus === 'All') return true;
    
    const balance = t.total_pending;
    const rent = t.bed_cost || 0;
    
    let status = 'Completed';
    if (balance >= rent && rent > 0) status = 'Pending';
    else if (balance > 0) status = 'Balance';

    if (filterStatus === 'Upcoming') {
      if (!t.expiry_date) return false;
      const expiry = new Date(t.expiry_date);
      const today = new Date();
      const nextWeek = new Date();
      nextWeek.setDate(today.getDate() + 7);
      return expiry >= today && expiry <= nextWeek;
    }

    return status === filterStatus;
  });

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1>Payments Management</h1>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <select 
            value={filterFloor} 
            onChange={e => { setFilterFloor(e.target.value); setFilterRoom('All'); }}
            style={{ padding: '0.4rem 0.8rem', borderRadius: '4px', background: 'var(--bg-dark)', color: 'var(--text-main)', border: '1px solid var(--border)', outline: 'none' }}
          >
            <option value="All">All Floors</option>
            {uniqueFloors.map(f => <option key={f} value={f}>{f}</option>)}
          </select>
          <select 
            value={filterRoom} 
            onChange={e => setFilterRoom(e.target.value)}
            style={{ padding: '0.4rem 0.8rem', borderRadius: '4px', background: 'var(--bg-dark)', color: 'var(--text-main)', border: '1px solid var(--border)', outline: 'none' }}
          >
            <option value="All">All Rooms</option>
            {uniqueRooms.map(r => <option key={r} value={r}>Room {r}</option>)}
          </select>
          <div style={{ position: 'relative' }}>
            <Search size={18} style={{ position: 'absolute', left: '10px', top: '10px', color: 'var(--text-muted)' }} />
            <input 
              type="text" 
              placeholder="Search tenant or room..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              style={{ paddingLeft: '2.5rem', width: '250px' }}
            />
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        <button className={`btn ${filterStatus === 'All' ? 'btn-primary' : ''}`} onClick={() => setFilterStatus('All')} style={{ fontSize: '0.8rem', padding: '0.4rem 1rem' }}>All Tenants</button>
        <button className={`btn ${filterStatus === 'Pending' ? 'btn-primary' : ''}`} onClick={() => setFilterStatus('Pending')} style={{ fontSize: '0.8rem', padding: '0.4rem 1rem' }}>Pending Rent</button>
        <button className={`btn ${filterStatus === 'Balance' ? 'btn-primary' : ''}`} onClick={() => setFilterStatus('Balance')} style={{ fontSize: '0.8rem', padding: '0.4rem 1rem' }}>Balance Due</button>
        <button className={`btn ${filterStatus === 'Upcoming' ? 'btn-primary' : ''}`} onClick={() => setFilterStatus('Upcoming')} style={{ fontSize: '0.8rem', padding: '0.4rem 1rem', background: filterStatus === 'Upcoming' ? 'var(--primary)' : 'var(--accent)', color: 'var(--text-main)' }}>Upcoming Rent</button>
        <button className={`btn ${filterStatus === 'Completed' ? 'btn-primary' : ''}`} onClick={() => setFilterStatus('Completed')} style={{ fontSize: '0.8rem', padding: '0.4rem 1rem' }}>Completed</button>
        <button className={`btn ${filterStatus === 'Advances' ? 'btn-primary' : ''}`} onClick={() => setFilterStatus('Advances')} style={{ fontSize: '0.8rem', padding: '0.4rem 1rem', background: filterStatus === 'Advances' ? '#6366f1' : '', color: 'var(--text-main)' }}>Advances</button>
      </div>

      {filterStatus === 'Advances' && (
        <div style={{ 
          display: 'flex', 
          gap: '2.5rem', 
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)', 
          marginBottom: '2rem', 
          paddingBottom: '0.1rem',
          alignItems: 'center'
        }}>
          {[
            { id: 'paid', label: 'Paid Advance' },
            { id: 'pending', label: 'Pending Advance' },
            { id: 'returnable', label: 'Returnable Advance' }
          ].map(subTab => {
            const isActive = advanceSubTab === subTab.id;
            return (
              <button
                key={subTab.id}
                onClick={() => setAdvanceSubTab(subTab.id)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: isActive ? '#6366f1' : 'rgba(255, 255, 255, 0.5)',
                  fontSize: '0.95rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  padding: '0.8rem 0',
                  position: 'relative',
                  transition: 'color 0.2s',
                  outline: 'none'
                }}
              >
                {subTab.label}
                {isActive && (
                  <div style={{
                    position: 'absolute',
                    bottom: '-2px',
                    left: 0,
                    right: 0,
                    height: '2px',
                    background: '#6366f1',
                    borderRadius: '2px'
                  }} />
                )}
              </button>
            );
          })}
        </div>
      )}

      {filterStatus === 'Advances' ? (
        <div className="data-table-container">
          <table>
            <thead>
              <tr>
                <th style={{ width: '60px' }}>ID</th>
                <th>Room & Bed</th>
                <th>Tenant Name</th>
                {advanceSubTab === 'paid' && <th>Date Paid</th>}
                {advanceSubTab === 'pending' && <th>Joining Date</th>}
                {advanceSubTab === 'returnable' && <th>Date Paid</th>}
                <th>Advance Amount</th>
                <th>Status</th>
                {advanceSubTab !== 'paid' && <th>Advance Action</th>}
              </tr>
            </thead>
            <tbody>
              {(() => {
                const list = processedTenants.filter(t => {
                  const searchMatch = t.name.toLowerCase().includes(searchTerm.toLowerCase()) || (t.room_number?.toString() || '').includes(searchTerm);
                  if (!searchMatch) return false;

                  if (filterFloor !== 'All' && t.floor_name !== filterFloor) return false;
                  if (filterRoom !== 'All' && String(t.room_number) !== filterRoom) return false;

                  if (t.advance_amount <= 0 || !t.advance_amount) return false;

                  if (advanceSubTab === 'paid') {
                    return t.last_payment_date !== null;
                  } else if (advanceSubTab === 'pending') {
                    return t.last_payment_date === null;
                  } else if (advanceSubTab === 'returnable') {
                    return t.last_payment_date !== null && t.status === 'Staying';
                  }
                  return true;
                });

                return (
                  <>
                    {list.map(t => (
                      <tr key={t.tenant_id}>
                        <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>#{t.tenant_id}</td>
                        <td>
                          <div style={{ fontWeight: 600 }}>Room {t.room_number || 'N/A'}</div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Bed {t.bed_number || 'N/A'}</div>
                        </td>
                        <td>
                          <div style={{ fontWeight: 600 }}>{t.name}</div>
                        </td>
                        {advanceSubTab === 'paid' && <td>{t.last_payment_date ? new Date(t.last_payment_date).toLocaleDateString() : 'N/A'}</td>}
                        {advanceSubTab === 'pending' && <td>{t.joining_date ? new Date(t.joining_date).toLocaleDateString() : 'N/A'}</td>}
                        {advanceSubTab === 'returnable' && <td>{t.last_payment_date ? new Date(t.last_payment_date).toLocaleDateString() : 'N/A'}</td>}
                        <td style={{ fontWeight: 600 }}>
                          ₹{t.advance_amount.toLocaleString()}
                        </td>
                        <td>
                          {advanceSubTab === 'paid' && <span style={{ fontSize: '0.75rem', background: 'var(--success)', color: 'var(--text-main)', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>Paid</span>}
                          {advanceSubTab === 'pending' && <span style={{ fontSize: '0.75rem', background: 'var(--danger)', color: 'var(--text-main)', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>Pending</span>}
                          {advanceSubTab === 'returnable' && <span style={{ fontSize: '0.75rem', background: 'var(--accent)', color: 'var(--text-main)', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>Refundable</span>}
                        </td>
                        {advanceSubTab === 'pending' && (
                          <td>
                            <button className="btn btn-primary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }} onClick={() => { 
                              setSelectedTenant(t); 
                              setPaymentData({ 
                                rent_charged: t.advance_amount.toString(), 
                                amount_paid: t.advance_amount.toString(), 
                                payment_type: 'Advance', 
                                balance: 0, 
                                utr_number: '', 
                                payment_via: 'Cash' 
                              });
                              setShowPayModal(true); 
                            }}>
                              Record Advance Pay
                            </button>
                          </td>
                        )}
                        {advanceSubTab === 'returnable' && (
                          <td>
                            <button 
                              className="btn" 
                              style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', border: '1px solid rgba(239, 68, 68, 0.5)' }} 
                              onClick={() => { 
                                setSelectedTenant(t); 
                                setRefundData({ deduction: 0, remarks: '', payment_via: 'UPI', utr_number: '' });
                                setShowRefundModal(true); 
                              }}
                            >
                              Process Refund & Vacate
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                    {list.length === 0 && (
                      <tr>
                        <td colSpan={advanceSubTab === 'paid' ? "7" : "8"} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                          No advances found.
                        </td>
                      </tr>
                    )}
                  </>
                );
              })()}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="data-table-container">
          <table>
            <thead>
              <tr>
                <th style={{ width: '60px' }}>ID</th>
                <th>Room & Bed</th>
                <th>Tenant Name</th>
                <th>Last Paid Date</th>
                <th>Monthly Rent</th>
                <th>Total Pending</th>
                <th>Status</th>
                {filterStatus !== 'All' && filterStatus !== 'Completed' && <th>Payment Action</th>}
              </tr>
            </thead>
            <tbody>
              {filtered.map(t => (
                <tr key={t.tenant_id}>
                  <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>#{t.tenant_id}</td>
                  <td>
                    <div style={{ fontWeight: 600 }}>Room {t.room_number || 'N/A'}</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Bed {t.bed_number || 'N/A'}</div>
                  </td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{t.name}</div>
                    {t.expiry_date && (
                      <div style={{ fontSize: '0.7rem', color: new Date(t.expiry_date) < new Date() ? 'var(--danger)' : 'var(--text-muted)' }}>
                        Expires: {new Date(t.expiry_date).toLocaleDateString()}
                      </div>
                    )}
                  </td>
                  <td>{t.last_payment_date ? new Date(t.last_payment_date).toLocaleDateString() : 'Never'}</td>
                  <td>
                    ₹{t.bed_cost ? t.bed_cost.toLocaleString() : 0}
                  </td>
                  <td style={{ fontWeight: 600, color: t.total_pending > 0 ? 'var(--danger)' : 'var(--success)' }}>
                    ₹{(t.total_pending).toLocaleString()}
                  </td>
                  <td>
                    {(t.total_pending === 0) ? (
                      <span style={{ fontSize: '0.75rem', background: 'var(--success)', color: 'var(--text-main)', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>Completed</span>
                    ) : t.total_pending >= (t.bed_cost || 0) && t.bed_cost > 0 ? (
                      <span style={{ fontSize: '0.75rem', background: 'var(--danger)', color: 'var(--text-main)', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>Pending</span>
                    ) : (
                      <span style={{ fontSize: '0.75rem', background: 'var(--accent)', color: 'var(--text-main)', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>Balance</span>
                    )}
                  </td>
                  {filterStatus !== 'All' && filterStatus !== 'Completed' && (
                    <td>
                      <button className="btn btn-primary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }} onClick={() => { 
                        setSelectedTenant(t); 
                        const rent = (t.bed_cost || 0);
                        setPaymentData({ 
                          rent_charged: rent.toString(), 
                          amount_paid: rent.toString(), 
                          payment_type: 'Rent', 
                          balance: 0, 
                          utr_number: '', 
                          payment_via: 'Cash' 
                        });
                        setShowPayModal(true); 
                      }}>
                        Record Pay
                      </button>
                    </td>
                  )}
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={filterStatus !== 'All' && filterStatus !== 'Completed' ? "8" : "7"} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>No tenants found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {showPayModal && selectedTenant && (
        <div className="modal-overlay" onClick={() => setShowPayModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2>Record Payment</h2>
              <button className="btn" onClick={() => setShowPayModal(false)}>Close</button>
            </div>
            <div style={{ marginBottom: '1.5rem', padding: '1rem', background: 'rgba(0,0,0,0.2)', borderRadius: '0.5rem' }}>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Tenant</div>
              <div style={{ fontWeight: 600, fontSize: '1.1rem' }}>{selectedTenant.name} (Room {selectedTenant.room_number})</div>
              <div style={{ marginTop: '0.5rem', color: 'var(--accent)', fontSize: '0.9rem', fontWeight: 600 }}>
                Balance from {prevMonth}: ₹{(selectedTenant.computed_balance).toLocaleString()}
              </div>
            </div>
            <form onSubmit={handlePayment}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label>{paymentData.payment_type === 'Rent + Advance' ? 'Rent + Advance' : 'Fixed Rent'}</label>
                  <input 
                    type="number" 
                    step="any"
                    value={paymentData.rent_charged} 
                    onChange={e => {
                      const val = e.target.value;
                      const charged = parseFloat(val) || 0;
                      const paid = parseFloat(paymentData.amount_paid) || 0;
                      setPaymentData({...paymentData, rent_charged: val, balance: (charged - paid)});
                    }} 
                    onFocus={e => e.target.select()}
                    placeholder="0"
                  />
                  <small style={{ color: 'var(--text-muted)' }}>{paymentData.payment_type === 'Rent + Advance' ? 'First month rent + advance' : 'Rent for bed'}</small>
                </div>
                <div className="form-group">
                  <label>Amount Paid</label>
                  <input 
                    type="number"
                    step="any"
                    required 
                    value={paymentData.amount_paid} 
                    onChange={e => {
                      const val = e.target.value;
                      const paid = parseFloat(val) || 0;
                      const charged = parseFloat(paymentData.rent_charged) || 0;
                      setPaymentData({...paymentData, amount_paid: val, balance: (charged - paid)});
                    }} 
                    onFocus={e => e.target.select()}
                    placeholder="0"
                  />
                  <small style={{ color: 'var(--text-muted)' }}>Amount paid this month</small>
                </div>
              </div>

              <div style={{ marginBottom: '1rem', padding: '0.8rem', border: '1px solid var(--border)', borderRadius: '4px' }}>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Calculation:</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.4rem' }}>
                  <span>{paymentData.payment_type === 'Rent + Advance' ? 'Charges' : 'Fixed Rent'} + Balance from {prevMonth}</span>
                  <span>₹{((parseFloat(paymentData.rent_charged) || 0) + (selectedTenant.computed_balance || 0)).toLocaleString()}</span>
                </div>
              </div>

              <div className="form-group" style={{ background: 'rgba(128,128,128,0.1)', padding: '1rem', borderRadius: '4px' }}>
                <div style={{ fontSize: '1rem' }}>
                  Balance for {currentMonth} will be:{' '}
                  <strong style={{ color: ((selectedTenant.computed_balance) + (parseFloat(paymentData.balance) || 0)) > 0 ? 'var(--danger)' : 'var(--success)', fontSize: '1.2rem' }}>
                    ₹{((selectedTenant.computed_balance) + (parseFloat(paymentData.balance) || 0)).toLocaleString()}
                  </strong>
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                  (Rent + Previous Balance) - Amount Paid
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label>Payment Via</label>
                  <select value={paymentData.payment_via} onChange={e => setPaymentData({...paymentData, payment_via: e.target.value})}>
                    <option value="Cash">Cash</option>
                    <option value="UPI">UPI</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="Card">Card</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Payment Type</label>
                  <select value={paymentData.payment_type} onChange={e => setPaymentData({...paymentData, payment_type: e.target.value})}>
                    <option value="Rent">Rent</option>
                    <option value="Rent + Advance">Rent + Advance</option>
                    <option value="Advance">Advance</option>
                    <option value="Maintenance">Maintenance</option>
                  </select>
                </div>
              </div>
              {paymentData.payment_via !== 'Cash' && (
                <div className="form-group">
                  <label>UTR / Transaction Number</label>
                  <input type="text" value={paymentData.utr_number} onChange={e => setPaymentData({...paymentData, utr_number: e.target.value})} placeholder="Enter transaction ID" />
                </div>
              )}
              <button type="submit" className="btn btn-primary" style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem' }}>
                <CheckCircle size={18} /> Submit Payment & Auto-Approve Access
              </button>
            </form>
          </div>
        </div>
      )}

      {showRefundModal && selectedTenant && (
        <div className="modal-overlay" onClick={() => setShowRefundModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ color: 'var(--danger)', margin: 0 }}>Process Refund & Vacate</h2>
              <button className="btn" onClick={() => setShowRefundModal(false)}>Close</button>
            </div>
            
            <div style={{ marginBottom: '1.5rem', padding: '1rem', background: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.15)', borderRadius: '0.5rem' }}>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Tenant</div>
              <div style={{ fontWeight: 600, fontSize: '1.1rem' }}>{selectedTenant.name} (Room {selectedTenant.room_number})</div>
              <div style={{ marginTop: '0.5rem', color: 'var(--text-main)', fontSize: '0.9rem' }}>
                Paid Advance Amount: <strong>₹{(selectedTenant.advance_amount || 0).toLocaleString()}</strong>
              </div>
            </div>

            <form onSubmit={async (e) => {
              e.preventDefault();
              setLoading(true);
              try {
                const originalAdvance = selectedTenant.advance_amount || 0;
                const deduction = parseFloat(refundData.deduction) || 0;
                const refundAmount = Math.max(0, originalAdvance - deduction);

                // 1. Record refund in payments (negative amount)
                await axios.post('/api/payments', {
                  tenant_id: selectedTenant.tenant_id,
                  payment_date: new Date().toISOString().split('T')[0],
                  amount_paid: -refundAmount,
                  payment_type: 'Advance Refund',
                  payment_via: refundData.payment_via,
                  utr_number: refundData.utr_number,
                  balance: 0,
                  remarks: refundData.remarks || `Advance return with ₹${deduction} deductions`
                });

                // 2. Vacate tenant and free bed
                await axios.post(`/api/tenants/${selectedTenant.tenant_id}/revoke`);

                alert('Advance refund processed and tenant vacated successfully!');
                setShowRefundModal(false);
                setRefundData({ deduction: 0, remarks: '', payment_via: 'UPI', utr_number: '' });
                fetchStatus();
              } catch (err) {
                console.error(err);
                alert('Failed to process refund');
              } finally {
                setLoading(false);
              }
            }}>
              <div className="form-group">
                <label>Deduction Amount (₹)</label>
                <input 
                  type="number" 
                  value={refundData.deduction} 
                  onChange={e => setRefundData({...refundData, deduction: e.target.value})} 
                  placeholder="0"
                  min="0"
                  max={selectedTenant.advance_amount || 0}
                  onFocus={e => e.target.select()}
                />
              </div>

              <div className="form-group">
                <label>Deduction Remarks</label>
                <textarea 
                  value={refundData.remarks} 
                  onChange={e => setRefundData({...refundData, remarks: e.target.value})} 
                  placeholder="e.g. Room damage repairs or outstanding dues"
                  style={{
                    width: '100%',
                    padding: '0.6rem 0.8rem',
                    borderRadius: '6px',
                    background: 'var(--bg-dark)',
                    border: '1px solid var(--border)',
                    color: 'var(--text-main)',
                    minHeight: '80px',
                    outline: 'none',
                    fontFamily: 'inherit'
                  }}
                />
              </div>

              <div style={{ background: 'rgba(128,128,128,0.1)', padding: '1rem', borderRadius: '4px', marginBottom: '1.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.1rem', fontWeight: 'bold' }}>
                  <span>Net Refund Amount:</span>
                  <span style={{ color: 'var(--success)' }}>
                    ₹{(Math.max(0, (selectedTenant.advance_amount || 0) - (parseFloat(refundData.deduction) || 0))).toLocaleString()}
                  </span>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label>Refund Paid Via</label>
                  <select value={refundData.payment_via} onChange={e => setRefundData({...refundData, payment_via: e.target.value})}>
                    <option value="UPI">UPI</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="Cash">Cash</option>
                    <option value="Card">Card</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>UTR / URN Transaction #</label>
                  <input 
                    type="text" 
                    value={refundData.utr_number} 
                    onChange={e => setRefundData({...refundData, utr_number: e.target.value})} 
                    placeholder="Reference ID" 
                  />
                </div>
              </div>

              <button 
                type="submit" 
                className="btn btn-primary" 
                style={{ width: '100%', background: 'var(--danger)', borderColor: 'var(--danger)', color: 'var(--text-main)', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem' }}
                disabled={loading}
              >
                Confirm Refund & Vacate Tenant
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Payments;
