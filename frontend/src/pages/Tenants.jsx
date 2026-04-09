import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { UserPlus, Search, Filter, Smartphone } from 'lucide-react';
import { useLocation } from 'react-router-dom';

const Tenants = () => {
  const location = useLocation();
  const [tenants, setTenants] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [floors, setFloors] = useState([]);
  const [vacantBeds, setVacantBeds] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState(null);
  const [filters, setFilters] = useState({
    floor: '',
    room: '',
    status: location.state?.status || '', // Staying, Vacated
    payment: '' // Paid, Pending
  });
  const [newTenant, setNewTenant] = useState({
    tenant_id: '', name: '', mobile: '', gender: 'Male', joining_date: new Date().toISOString().split('T')[0], 
    expiry_date: '', bed_id: '', status: 'Staying', initial_payment: 'Pending', tenant_type: 'Permanent'
  });
  const [toast, setToast] = useState(null);
  const [showPinModal, setShowPinModal] = useState(false);
  const [pinTenant, setPinTenant] = useState(null);
  const [newPin, setNewPin] = useState('');

  useEffect(() => {
    fetchTenants();
    fetchRooms();
    fetchFloors();
    fetchVacantBeds();

    // SSE for Real-time Punches
    const userString = localStorage.getItem('pgms_user');
    const user = userString ? JSON.parse(userString) : null;
    const url = user && user.user_id ? `http://localhost:5000/api/events?user_id=${user.user_id}` : 'http://localhost:5000/api/events';
    
    const eventSource = new EventSource(url);
    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        setToast(`Punch Alert: Tenant ${data.user_id} at ${data.punch_time} (Device: ${data.device_sn})`);
        setTimeout(() => setToast(null), 8000);
      } catch (err) {
        console.error('Error parsing SSE data', err);
      }
    };

    return () => {
      eventSource.close();
    };
  }, []);

  const fetchTenants = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/tenants');
      setTenants(res.data);
    } catch (err) {
      console.error('Failed to fetch tenants');
    }
  };

  const fetchRooms = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/rooms');
      setRooms(res.data);
    } catch (err) {
      console.error('Failed to fetch rooms');
    }
  };

  const fetchVacantBeds = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/beds/vacant');
      setVacantBeds(res.data);
    } catch (err) {
      console.error('Failed to fetch vacant beds');
    }
  };

  const fetchFloors = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/floors');
      setFloors(res.data);
    } catch (err) {
      console.error('Failed to fetch floors');
    }
  };

  const handleDeleteTenant = async (id) => {
    if (!window.confirm('Are you sure you want to delete this tenant? This will also mark their bed as vacant.')) return;
    try {
      await axios.delete(`http://localhost:5000/api/tenants/${id}`);
      fetchTenants();
      fetchVacantBeds(); // Refresh bed availability
    } catch (err) {
      alert('Failed to delete tenant');
    }
  };

  const handleSyncTenant = async (id) => {
    try {
      const res = await axios.post('http://localhost:5000/api/devices/sync-user', { tenant_id: id });
      setToast(res.data.message || 'Sync command queued successfully');
      setTimeout(() => setToast(null), 5000);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to queue sync command');
    }
  };

  const handleEditClick = (tenant) => {
    setEditId(tenant.tenant_id);
    setNewTenant({
      name: tenant.name,
      mobile: tenant.mobile,
      occupation: tenant.occupation || '',
      gender: tenant.gender || 'Male',
      joining_date: tenant.joining_date.split('T')[0],
      expiry_date: tenant.expiry_date ? tenant.expiry_date.split('T')[0] : '',
      bed_id: tenant.bed_id || '',
      status: tenant.status || 'Staying',
      initial_payment: 'Pending',
      tenant_type: tenant.tenant_type || 'Permanent'
    });
    setIsEditing(true);
    setShowModal(true);
  };

  const handleAddTenant = async (e) => {
    e.preventDefault();
    try {
      if (isEditing) {
        await axios.put(`http://localhost:5000/api/tenants/${editId}`, newTenant);
      } else {
        await axios.post('http://localhost:5000/api/tenants', newTenant);
      }
      setShowModal(false);
      setIsEditing(false);
      setEditId(null);
      fetchTenants();
      fetchVacantBeds();
      alert(isEditing ? 'Tenant updated successfully' : 'Tenant added successfully');
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to save tenant');
    }
  };

  const filteredTenants = tenants.filter(t => {
    const matchesFloor = !filters.floor || t.floor_id == filters.floor;
    const matchesRoom = !filters.room || t.room_id == filters.room;
    const matchesStatus = !filters.status || t.status?.toLowerCase() === filters.status.toLowerCase();

    // Mock payment status logic since we don't have real billing yet
    // In a real app, this would check if (pending_balance <= 0)
    const matchesPayment = !filters.payment ||
      (filters.payment === 'Paid' ? (t.payment_status === 'Paid') : (t.payment_status !== 'Paid'));

    return matchesFloor && matchesRoom && matchesStatus && matchesPayment;
  });

  const [selectedTenants, setSelectedTenants] = useState([]);
  const [selectionMode, setSelectionMode] = useState(null); // 'sync' or 'delete' or null

  const toggleSelectionMode = (mode) => {
    if (selectionMode === mode) {
      setSelectionMode(null);
      setSelectedTenants([]);
    } else {
      setSelectionMode(mode);
      setSelectedTenants([]);
    }
  };

  const toggleSelectAll = () => {
    if (!selectionMode) return;
    if (selectedTenants.length === filteredTenants.length) {
      setSelectedTenants([]);
    } else {
      setSelectedTenants(filteredTenants.map(t => t.tenant_id));
    }
  };

  const toggleSelectTenant = (id) => {
    if (selectedTenants.includes(id)) {
      setSelectedTenants(selectedTenants.filter(tid => tid !== id));
    } else {
      setSelectedTenants([...selectedTenants, id]);
    }
  };

  const handleBulkSync = async () => {
    try {
      const res = await axios.post('http://localhost:5000/api/devices/bulk-sync', { tenant_ids: selectedTenants });
      setToast(res.data.message || 'Bulk sync queued successfully');
      setSelectedTenants([]);
      setTimeout(() => setToast(null), 5000);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to queue bulk sync');
    }
  };

  const handleBulkDelete = async () => {
    if (!window.confirm(`Are you sure you want to delete ${selectedTenants.length} tenants?`)) return;
    try {
      const res = await axios.post('http://localhost:5000/api/tenants/bulk-delete', { ids: selectedTenants });
      setToast(res.data.message || 'Bulk delete successful');
      setSelectedTenants([]);
      fetchTenants();
      fetchVacantBeds();
      setTimeout(() => setToast(null), 5000);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to perform bulk delete');
    }
  };

  return (
    <div style={{ paddingBottom: selectedTenants.length > 0 ? '100px' : '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1>Tenant Management</h1>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button 
            className="btn"
            style={{ 
              display: 'flex', alignItems: 'center', gap: '0.5rem', 
              background: selectionMode === 'sync' ? 'rgba(16, 185, 129, 0.1)' : 'transparent',
              border: selectionMode === 'sync' ? '1px solid var(--accent)' : '1px solid var(--border)',
              color: selectionMode === 'sync' ? 'var(--accent)' : 'var(--text-muted)',
              fontSize: '0.85rem'
            }} 
            onClick={() => toggleSelectionMode('sync')}
          >
            {selectionMode === 'sync' ? 'Exit Sync Mode' : 'Select & Sync'}
          </button>
          <button 
            className="btn"
            style={{ 
              display: 'flex', alignItems: 'center', gap: '0.5rem', 
              background: selectionMode === 'delete' ? 'rgba(239, 68, 68, 0.1)' : 'transparent',
              border: selectionMode === 'delete' ? '1px solid var(--danger)' : '1px solid var(--border)',
              color: selectionMode === 'delete' ? 'var(--danger)' : 'var(--text-muted)',
              fontSize: '0.85rem'
            }} 
            onClick={() => toggleSelectionMode('delete')}
          >
            {selectionMode === 'delete' ? 'Exit Delete Mode' : 'Select & Delete'}
          </button>
          <button className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }} onClick={() => { setIsEditing(false); setNewTenant({ name: '', mobile: '', occupation: '', gender: 'Male', joining_date: new Date().toISOString().split('T')[0], expiry_date: '', bed_id: '', status: 'Staying', initial_payment: 'Pending', tenant_type: 'Permanent' }); setShowModal(true); }}>
            <UserPlus size={18} /> Add Tenant
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <div style={{ position: 'relative' }}>
          <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input type="text" placeholder="Search..." style={{ paddingLeft: '3rem' }} />
        </div>
        <select onChange={e => setFilters({ ...filters, floor: e.target.value })}>
          <option value="">All Floors</option>
          {floors.map(f => <option key={f.floor_id} value={f.floor_id}>{f.floor_name}</option>)}
        </select>
        <select onChange={e => setFilters({ ...filters, room: e.target.value })}>
          <option value="">All Rooms</option>
          {rooms.map(r => <option key={r.room_id} value={r.room_id}>Room {r.room_number}</option>)}
        </select>
        <select onChange={e => setFilters({ ...filters, status: e.target.value })}>
          <option value="">All Status</option>
          <option value="Staying">Staying</option>
          <option value="Vacated">Vacated</option>
        </select>
        <select onChange={e => setFilters({ ...filters, payment: e.target.value })}>
          <option value="">All Payments</option>
          <option value="Paid">Rent Paid</option>
          <option value="Pending">Rent Pending</option>
        </select>
      </div>

      <div className="data-table-container">
        <table>
          <thead>
            <tr>
              {selectionMode && (
                <th style={{ width: '40px' }}>
                  <input 
                    type="checkbox" 
                    checked={selectedTenants.length === filteredTenants.length && filteredTenants.length > 0} 
                    onChange={toggleSelectAll} 
                  />
                </th>
              )}
              <th style={{ width: '60px' }}>ID</th>
              <th>Name</th>
              <th>Mobile</th>
              <th>Type</th>
              <th>Joining Date</th>
              <th>Bed</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredTenants.map(t => (
              <tr key={t.tenant_id} className={selectedTenants.includes(t.tenant_id) ? 'selected-row' : ''}>
                {selectionMode && (
                  <td>
                    <input 
                      type="checkbox" 
                      checked={selectedTenants.includes(t.tenant_id)} 
                      onChange={() => toggleSelectTenant(t.tenant_id)} 
                    />
                  </td>
                )}
                <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>#{t.tenant_id}</td>
                <td style={{ fontWeight: 600 }}>{t.name}</td>
                <td>{t.mobile}</td>
                <td>
                  <span style={{
                    fontSize: '0.75rem', fontWeight: 600, padding: '0.2rem 0.5rem', borderRadius: '4px',
                    background: t.tenant_type === 'Guest' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(99, 102, 241, 0.15)',
                    color: t.tenant_type === 'Guest' ? '#f59e0b' : '#6366f1'
                  }}>
                    {t.tenant_type || 'Permanent'}
                  </span>
                </td>
                <td>{new Date(t.joining_date).toLocaleDateString()}</td>
                <td>
                  <span style={{ fontSize: '0.8rem' }}>
                    {t.room_number ? `${t.room_number} (${t.bed_number})` : 'Unassigned'}
                  </span>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{t.floor_name}</div>
                </td>
                <td>
                  <span className={`badge badge-${t.status?.toLowerCase() === 'staying' ? 'vacant' : 'occupied'}`}>
                    {t.status}
                  </span>
                </td>
                <td>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button onClick={() => handleEditClick(t)} className="btn btn-icon-only" title="Edit">Edit</button>
                    <button onClick={() => { setPinTenant(t); setNewPin(t.biometric_pin || ''); setShowPinModal(true); }} className="btn btn-icon-only" style={{ color: 'var(--primary)' }} title="Mobile App Access">
                      <Smartphone size={16} />
                    </button>
                    <button
                      onClick={() => handleSyncTenant(t.tenant_id)}
                      className="btn btn-icon-only" style={{ color: 'var(--success)' }}
                      title="Sync"
                    >
                      Sync
                    </button>
                    <button
                      onClick={() => handleDeleteTenant(t.tenant_id)}
                      className="btn btn-icon-only" style={{ color: 'var(--danger)' }}
                      title="Delete"
                    >
                      Del
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Action Specific Floating Bar */}
      {selectedTenants.length > 0 && (
        <div style={{
          position: 'fixed', bottom: '2rem', left: '50%', transform: 'translateX(-50%)',
          background: selectionMode === 'delete' ? 'var(--danger)' : 'var(--primary)', 
          color: 'white', padding: '1rem 2rem',
          borderRadius: '1rem', boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
          display: 'flex', alignItems: 'center', gap: '2rem', zIndex: 1000,
          animation: 'slideUp 0.3s ease-out'
        }}>
          <div style={{ fontWeight: 600 }}>{selectedTenants.length} Tenants Selected</div>
          <div style={{ display: 'flex', gap: '1rem' }}>
            {selectionMode === 'sync' && (
              <button className="btn" style={{ background: 'rgba(255,255,255,0.2)', color: 'white' }} onClick={handleBulkSync}>Confirm Bulk Sync</button>
            )}
            {selectionMode === 'delete' && (
              <button className="btn" style={{ background: 'rgba(255,255,255,0.2)', color: 'white' }} onClick={handleBulkDelete}>Confirm Bulk Delete</button>
            )}
            <button className="btn" style={{ background: 'transparent', color: 'white' }} onClick={() => { setSelectedTenants([]); setSelectionMode(null); }}>Cancel</button>
          </div>
        </div>
      )}

      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2>{isEditing ? 'Edit Tenant' : 'Add New Tenant'}</h2>
              {isEditing && <span style={{ background: 'var(--accent)', color: 'white', padding: '0.2rem 0.6rem', borderRadius: '4px', fontSize: '0.8rem' }}>ID: #{newTenant.tenant_id}</span>}
            </div>
            <form onSubmit={handleAddTenant} style={{ marginTop: '1.5rem' }}>
              {!isEditing && (
                <div className="form-group">
                  <label>System ID / Biometric ID (Optional)</label>
                  <input 
                    type="number" 
                    placeholder="Auto-increment if empty"
                    value={newTenant.tenant_id} 
                    onChange={e => setNewTenant({ ...newTenant, tenant_id: e.target.value })} 
                  />
                  <small style={{ color: 'var(--text-muted)' }}>Useful for matching existing RFID card IDs</small>
                </div>
              )}
              <div className="form-group">
                <label>Full Name</label>
                <input type="text" required value={newTenant.name} onChange={e => setNewTenant({ ...newTenant, name: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Mobile Number</label>
                <input type="text" required value={newTenant.mobile} onChange={e => setNewTenant({ ...newTenant, mobile: e.target.value })} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label>Gender</label>
                  <select value={newTenant.gender} onChange={e => setNewTenant({ ...newTenant, gender: e.target.value })}>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Joining Date</label>
                  <input type="date" required value={newTenant.joining_date} onChange={e => setNewTenant({ ...newTenant, joining_date: e.target.value })} />
                </div>
                <div className="form-group">
                  <label style={{ display: 'flex', justifyContent: 'space-between' }}>
                    Expiry Date
                    <span
                      onClick={() => {
                        const d = new Date(newTenant.joining_date);
                        d.setMonth(d.getMonth() + 1);
                        setNewTenant({ ...newTenant, expiry_date: d.toISOString().split('T')[0] });
                      }}
                      style={{ color: 'var(--primary)', cursor: 'pointer', fontSize: '0.7rem', fontWeight: 600 }}
                    >
                      +1 Month
                    </span>
                  </label>
                  <input type="date" value={newTenant.expiry_date} onChange={e => setNewTenant({ ...newTenant, expiry_date: e.target.value })} />
                </div>
              </div>
              <div className="form-group">
                <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                  <span>Select Bed (Visual Map)</span>
                  {newTenant.bed_id && vacantBeds.find(b => b.bed_id === newTenant.bed_id) && (
                    newTenant.tenant_type === 'Guest' ? (() => {
                      const bed = vacantBeds.find(b => b.bed_id === newTenant.bed_id);
                      const daily = bed.daily_cost || 0;
                      const weekly = bed.weekly_cost || 0;
                      const hasExpiry = newTenant.joining_date && newTenant.expiry_date;
                      let totalDays = 0, totalWeeks = 0, remainDays = 0, totalCost = 0;
                      if (hasExpiry) {
                        const start = new Date(newTenant.joining_date);
                        const end = new Date(newTenant.expiry_date);
                        totalDays = Math.max(0, Math.ceil((end - start) / (1000 * 60 * 60 * 24)));
                        totalWeeks = Math.floor(totalDays / 7);
                        remainDays = totalDays % 7;
                        if (weekly > 0 && totalWeeks >= 1) {
                          totalCost = (totalWeeks * weekly) + (remainDays * daily);
                        } else {
                          totalCost = totalDays * daily;
                        }
                      }
                      return (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                          <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <span style={{ color: '#f59e0b', fontSize: '0.75rem', background: 'rgba(245, 158, 11, 0.1)', padding: '2px 8px', borderRadius: '4px' }}>
                              Daily: ₹{daily.toLocaleString()}
                            </span>
                            <span style={{ color: '#f59e0b', fontSize: '0.75rem', background: 'rgba(245, 158, 11, 0.1)', padding: '2px 8px', borderRadius: '4px' }}>
                              Weekly: ₹{weekly.toLocaleString()}
                            </span>
                          </div>
                          {hasExpiry && totalDays > 0 && (
                            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                              <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>
                                {totalWeeks > 0 && weekly > 0
                                  ? `${totalWeeks}w ${remainDays > 0 ? `+ ${remainDays}d` : ''} = ${totalDays} days`
                                  : `${totalDays} days`}
                              </span>
                              <span style={{ color: 'var(--success)', fontWeight: 600, fontSize: '0.8rem', background: 'rgba(16, 185, 129, 0.1)', padding: '2px 8px', borderRadius: '4px' }}>
                                Total: ₹{totalCost.toLocaleString()}
                              </span>
                            </div>
                          )}
                          {!hasExpiry && (
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem', fontStyle: 'italic' }}>Set expiry date to see total</span>
                          )}
                        </div>
                      );
                    })() : (() => {
                      const bed = vacantBeds.find(b => b.bed_id === newTenant.bed_id);
                      if (!bed) return null;
                      const monthlyRent = bed.bed_cost || 0;
                      const advance = bed.advance_amount || 0;
                      const hasExpiry = newTenant.joining_date && newTenant.expiry_date;
                      let months = 1;
                      if (hasExpiry) {
                        const start = new Date(newTenant.joining_date);
                        const end = new Date(newTenant.expiry_date);
                        months = Math.max(1, (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth()));
                      }
                      const totalRent = months * monthlyRent;
                      return (
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <span title={`₹${monthlyRent.toLocaleString()} x ${months} months`} style={{ color: 'var(--text-muted)', fontSize: '0.75rem', background: 'rgba(0, 0, 0, 0.2)', padding: '2px 8px', borderRadius: '4px' }}>
                            Rent: ₹{totalRent.toLocaleString()}
                          </span>
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', background: 'rgba(0, 0, 0, 0.2)', padding: '2px 8px', borderRadius: '4px' }}>
                            Adv: ₹{advance.toLocaleString()}
                          </span>
                          <span style={{ color: 'var(--success)', fontWeight: 600, fontSize: '0.8rem', background: 'rgba(16, 185, 129, 0.1)', padding: '2px 8px', borderRadius: '4px' }}>
                            Total: ₹{(totalRent + advance).toLocaleString()}
                          </span>
                        </div>
                      );
                    })()
                  )}
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', maxHeight: '250px', overflowY: 'auto', padding: '10px', background: 'rgba(0,0,0,0.2)', borderRadius: '1rem', marginTop: '0.5rem' }}>
                  {rooms.map(room => (
                    <div key={room.room_id} style={{ background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: '0.75rem', padding: '0.75rem' }}>
                      <div style={{ fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.5rem' }}>Room {room.room_number}</div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                        {vacantBeds.filter(b => b.room_id === room.room_id).length === 0 ? (
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>No vacant beds</span>
                        ) : (
                          vacantBeds.filter(b => b.room_id === room.room_id).map(bed => (
                            <div
                              key={bed.bed_id}
                              onClick={() => setNewTenant({ ...newTenant, bed_id: bed.bed_id })}
                              style={{
                                padding: '6px 10px',
                                borderRadius: '6px',
                                border: `2px solid ${newTenant.bed_id == bed.bed_id ? 'var(--primary)' : 'var(--border)'}`,
                                background: newTenant.bed_id == bed.bed_id ? 'rgba(99, 102, 241, 0.2)' : 'rgba(16, 185, 129, 0.1)',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                textAlign: 'center',
                                minWidth: '50px'
                              }}
                            >
                              <div style={{ fontSize: '0.7rem', fontWeight: 700, color: newTenant.bed_id == bed.bed_id ? 'var(--primary)' : '#10b981' }}>{bed.bed_number}</div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label>Occupation</label>
                  <input type="text" value={newTenant.occupation} onChange={e => setNewTenant({ ...newTenant, occupation: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Tenant Type</label>
                  <select value={newTenant.tenant_type} onChange={e => setNewTenant({ ...newTenant, tenant_type: e.target.value })}>
                    <option value="Permanent">Permanent</option>
                    <option value="Guest">Guest</option>
                  </select>
                </div>
                {!isEditing && (
                  <div className="form-group">
                    <label>Initial Payment Status</label>
                    <select value={newTenant.initial_payment} onChange={e => setNewTenant({ ...newTenant, initial_payment: e.target.value })}>
                      <option value="Pending">Pending (Unpaid)</option>
                      <option value="Paid">Paid (Full Rent)</option>
                    </select>
                  </div>
                )}
                <div className="form-group">
                  <label>Status</label>
                  <select value={newTenant.status} onChange={e => setNewTenant({ ...newTenant, status: e.target.value })}>
                    <option value="Staying">Staying</option>
                    <option value="Vacated">Vacated</option>
                  </select>
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '2rem' }}>
                <button type="button" className="btn" onClick={() => setShowModal(false)} style={{ background: 'transparent' }}>Cancel</button>
                <button type="submit" className="btn btn-primary">{isEditing ? 'Update Tenant' : 'Save Tenant'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PIN / Mobile App Modal */}
      {showPinModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '400px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ margin: 0 }}>Enable Mobile Access</h2>
              <button 
                onClick={() => setShowPinModal(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                ×
              </button>
            </div>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
              Set a 4-digit PIN for <strong>{pinTenant?.name}</strong> to allow login to the Tenant PGMS mobile app.
            </p>
            <div className="form-group">
              <label>Set 4-Digit PIN</label>
              <input 
                type="text" 
                maxLength={4} 
                placeholder="1234"
                value={newPin}
                onChange={e => setNewPin(e.target.value.replace(/\D/g, ''))}
                style={{ fontSize: '1.5rem', textAlign: 'center', letterSpacing: '0.5rem', fontWeight: 700 }}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '2rem' }}>
              <button className="btn" onClick={() => setShowPinModal(false)} style={{ background: 'transparent' }}>Cancel</button>
              <button 
                className="btn btn-primary"
                disabled={newPin.length < 4}
                onClick={async () => {
                  try {
                    await axios.post(`http://localhost:5000/api/tenants/${pinTenant.tenant_id}/set-pin`, { pin: newPin });
                    setToast(`Mobile access enabled for ${pinTenant.name}`);
                    setShowPinModal(false);
                    fetchTenants();
                    setTimeout(() => setToast(null), 5000);
                  } catch (err) {
                    alert('Failed to set PIN');
                  }
                }}
              >
                Save & Enable
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Toast Notification */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: '2rem', right: '2rem',
          background: 'var(--card-bg)', border: '1px solid var(--border)',
          borderRadius: '0.5rem', padding: '1rem 1.5rem',
          boxShadow: '0 10px 25px rgba(0,0,0,0.5)', zIndex: 9999,
          display: 'flex', alignItems: 'center', gap: '0.75rem',
          color: 'var(--text)', fontWeight: 500,
          animation: 'slideIn 0.3s ease-out forwards'
        }}>
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--success)' }}></div>
          {toast}
          <button
            onClick={() => setToast(null)}
            style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', marginLeft: '1rem' }}
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
};

export default Tenants;
