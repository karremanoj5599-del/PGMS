import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { UserPlus, Search, Filter, Smartphone, Fingerprint, Server, RefreshCw, X, ShieldCheck, ShieldAlert, Users, AlertTriangle } from 'lucide-react';
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
  
  const [devices, setDevices] = useState([]);
  const [syncModal, setSyncModal] = useState(false);
  const [syncTargetTenant, setSyncTargetTenant] = useState(null);
  const [targetDeviceSn, setTargetDeviceSn] = useState('');
  const [syncUserInfo, setSyncUserInfo] = useState(true);
  const [syncBiometrics, setSyncBiometrics] = useState(true);
  const [filters, setFilters] = useState({
    floor: '',
    room: '',
    status: location.state?.status || '', // Staying, Vacated
    payment: '' // Paid, Pending
  });
  const [newTenant, setNewTenant] = useState({
    tenant_id: '', name: '', mobile: '', gender: 'Male', joining_date: new Date().toISOString().split('T')[0], 
    expiry_date: '', access_expiry_date: '', punch_limit: '', bed_id: '', status: 'Staying', initial_payment: 'Pending', tenant_type: 'Permanent',
    expiry_date: '', access_expiry_date: '', punch_limit: '', bed_id: '', status: 'Staying', initial_payment: 'Pending', tenant_type: 'Permanent',
    custom_rent: '', custom_advance: '', discount_amount: '', photo: '', email: ''
  });
  const [toast, setToast] = useState(null);
  const [showPinModal, setShowPinModal] = useState(false);
  const [pinTenant, setPinTenant] = useState(null);
  const [newPin, setNewPin] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [countryCode, setCountryCode] = useState('+91');

  useEffect(() => {
    fetchTenants();
    fetchRooms();
    fetchFloors();
    fetchVacantBeds();
    fetchDevices();

    // SSE for Real-time Punches
    const userString = localStorage.getItem('pgms_user');
    const user = userString ? JSON.parse(userString) : null;
    const url = user && user.user_id ? `/api/events?user_id=${user.user_id}` : '/api/events';
    
    let eventSource = null;

    const connectSSE = () => {
      if (eventSource) {
        eventSource.close();
      }

      eventSource = new EventSource(url);

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          setToast(`Punch Alert: Tenant ${data.user_id} at ${data.punch_time} (Device: ${data.device_sn})`);
          setTimeout(() => setToast(null), 8000);
        } catch (err) {
          console.error('Error parsing SSE data', err);
        }
      };

      eventSource.onerror = (err) => {
        console.warn('SSE connection error, browser will automatically retry.');
      };
    };

    if (navigator.onLine) {
      connectSSE();
    }

    const handleOnline = () => {
      console.log('[SSE] Browser online. Reconnecting...');
      connectSSE();
    };

    const handleOffline = () => {
      console.log('[SSE] Browser offline. Closing connection...');
      if (eventSource) {
        eventSource.close();
        eventSource = null;
      }
    };

    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && navigator.onLine) {
        console.log('[SSE] Page visible. Reconnecting...');
        connectSSE();
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      if (eventSource) {
        eventSource.close();
      }
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []);

  const fetchTenants = async () => {
    try {
      const res = await api.get('/api/tenants');
      setTenants(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error('Failed to fetch tenants');
    }
  };

  const fetchDevices = async () => {
    try {
      const res = await api.get('/api/devices');
      const data = Array.isArray(res.data) ? res.data : [];
      setDevices(data.filter(d => d.adms_status));
    } catch (err) {
      console.error('Failed to fetch devices');
    }
  };

  const fetchRooms = async () => {
    try {
      const res = await api.get('/api/rooms');
      setRooms(res.data);
    } catch (err) {
      console.error('Failed to fetch rooms');
    }
  };

  const fetchVacantBeds = async () => {
    try {
      const res = await api.get('/api/beds/vacant');
      setVacantBeds(res.data);
    } catch (err) {
      console.error('Failed to fetch vacant beds');
    }
  };

  const fetchFloors = async () => {
    try {
      const res = await api.get('/api/floors');
      setFloors(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error('Failed to fetch floors');
    }
  };

  const handleDeleteTenant = async (id) => {
    if (!window.confirm('Are you sure you want to delete this tenant? This will also mark their bed as vacant.')) return;
    try {
      await api.delete(`/api/tenants/${id}`);
      fetchTenants();
      fetchVacantBeds(); // Refresh bed availability
    } catch (err) {
      alert('Failed to delete tenant');
    }
  };

  const handleSyncTenant = async (id) => {
    try {
      const res = await api.post('/api/devices/sync-user', { tenant_id: id });
      setToast(res.data.message || 'Sync command queued successfully');
      setTimeout(() => setToast(null), 5000);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to queue sync command');
    }
  };

  const handleResyncBiometrics = async (id, name) => {
    try {
      const res = await api.post(`/api/tenants/${id}/resync-biometrics`);
      setToast(res.data.message || `Biometrics resynced for ${name}`);
      setTimeout(() => setToast(null), 6000);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to resync biometrics');
    }
  };

  const handleToggleAccess = async (tenantId, currentStatus) => {
    const newStatus = currentStatus === false; // Toggle
    try {
      const res = await api.put(`/api/access-control/${tenantId}`, { access_granted: newStatus });
      setToast(res.data.message || 'Access rule updated successfully');
      setTimeout(() => setToast(null), 5000);
      fetchTenants();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to update biometric access');
    }
  };

  const handleExecuteSync = async () => {
    if (!targetDeviceSn && targetDeviceSn !== 'ALL') {
      alert('Please select a target device.');
      return;
    }
    const targetPayload = targetDeviceSn === 'ALL' ? {} : { target_device_sn: targetDeviceSn };
    try {
      if (syncUserInfo) {
        await api.post('/api/devices/sync-user', { 
          tenant_id: syncTargetTenant.tenant_id, 
          ...targetPayload 
        });
      }
      if (syncBiometrics && syncTargetTenant.biometric_count > 0) {
        await api.post(`/api/tenants/${syncTargetTenant.tenant_id}/resync-biometrics`, targetPayload);
      }
      setToast(`Sync commands queued for ${syncTargetTenant.name}`);
      setTimeout(() => setToast(null), 5000);
      setSyncModal(false);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to sync');
    }
  };

  const openSyncModal = (tenant) => {
    setSyncTargetTenant(tenant);
    setTargetDeviceSn('ALL');
    setSyncUserInfo(true);
    setSyncBiometrics(tenant.biometric_count > 0);
    setSyncModal(true);
  };

  const handleEditClick = (tenant) => {
    let cCode = '+91';
    let mob = tenant.mobile || '';
    if (mob.startsWith('+91')) {
      cCode = '+91';
      mob = mob.substring(3).trim();
    } else if (mob.startsWith('+1')) {
      cCode = '+1';
      mob = mob.substring(2).trim();
    }
    
    setCountryCode(cCode);
    setEditId(tenant.tenant_id);
    setNewTenant({
      name: tenant.name,
      mobile: mob,
      email: tenant.email || '',
      occupation: tenant.occupation || '',
      gender: tenant.gender || 'Male',
      joining_date: tenant.joining_date.split('T')[0],
      expiry_date: tenant.expiry_date ? tenant.expiry_date.split('T')[0] : '',
      access_expiry_date: tenant.access_expiry_date ? tenant.access_expiry_date.split('T')[0] : '',
      punch_limit: tenant.punch_limit || '',
      bed_id: tenant.bed_id || '',
      status: tenant.status || 'Staying',
      initial_payment: 'Pending',
      tenant_type: tenant.tenant_type || 'Permanent',
      biometric_pin: tenant.biometric_pin || '',
      custom_rent: tenant.custom_rent !== null && tenant.custom_rent !== undefined ? tenant.custom_rent.toString() : '',
      custom_advance: tenant.custom_advance !== null && tenant.custom_advance !== undefined ? tenant.custom_advance.toString() : '',
      discount_amount: tenant.discount_amount !== null && tenant.discount_amount !== undefined ? tenant.discount_amount.toString() : '',
      photo: tenant.photo || ''
    });
    setIsEditing(true);
    setShowModal(true);
  };

  const handleAddTenant = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...newTenant };
      payload.mobile = `${countryCode}${payload.mobile}`;
      
      if (isEditing) {
        await api.put(`/api/tenants/${editId}`, payload);
      } else {
        await api.post('/api/tenants', payload);
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

  const handleConvertToStaff = async (id) => {
    if (!window.confirm('Are you sure you want to convert this tenant into a Staff member? They will be removed from Tenants and their bed will be vacated.')) return;
    try {
      await api.post(`/api/tenants/${id}/convert-to-staff`);
      setShowModal(false);
      setIsEditing(false);
      setEditId(null);
      fetchTenants();
      fetchVacantBeds();
      setToast('Successfully converted to Staff!');
      setTimeout(() => setToast(null), 5000);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to convert to staff');
    }
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert('File size exceeds the 5MB limit');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewTenant(prev => ({ ...prev, photo: reader.result }));
      };
      reader.readAsDataURL(file);
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

    const matchesSearch = !searchTerm || 
      (t.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
       t.mobile?.includes(searchTerm) || 
       t.tenant_id?.toString().includes(searchTerm));

    return matchesFloor && matchesRoom && matchesStatus && matchesPayment && matchesSearch;
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
      const res = await api.post('/api/devices/bulk-sync', { tenant_ids: selectedTenants });
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
      const res = await api.post('/api/tenants/bulk-delete', { ids: selectedTenants });
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
          <button className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }} onClick={() => { setIsEditing(false); setCountryCode('+91'); setNewTenant({ name: '', mobile: '', email: '', occupation: '', gender: 'Male', joining_date: new Date().toISOString().split('T')[0], expiry_date: '', access_expiry_date: '', punch_limit: '', bed_id: '', status: 'Staying', initial_payment: 'Pending', tenant_type: 'Permanent', biometric_pin: '', custom_rent: '', custom_advance: '', discount_amount: '', photo: '' }); setShowModal(true); }}>
            <UserPlus size={18} /> Add Tenant
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <div style={{ position: 'relative' }}>
          <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input 
            type="text" 
            placeholder="Search..." 
            style={{ paddingLeft: '3rem' }} 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
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
                <td style={{ fontWeight: 600 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      overflow: 'hidden',
                      background: 'rgba(255,255,255,0.05)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: '1px solid var(--border)',
                      flexShrink: 0
                    }}>
                      {t.photo ? (
                        <img src={t.photo} alt={t.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <Users size={16} style={{ color: 'var(--text-muted)' }} />
                      )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      {t.name}
                      {Number(t.biometric_count) > 0 ? (
                        <span title={`${t.biometric_count} biometric template(s) saved`} style={{ color: '#10b981', display: 'flex', alignItems: 'center' }}>
                          <Fingerprint size={16} />
                        </span>
                      ) : (
                        <span title="No biometric templates saved" style={{ color: 'var(--text-muted)', opacity: 0.5, display: 'flex', alignItems: 'center' }}>
                          <Fingerprint size={16} />
                        </span>
                      )}
                    </div>
                  </div>
                </td>
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
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span className={`badge badge-${t.status?.toLowerCase() === 'staying' ? 'vacant' : 'occupied'}`}>
                      {t.status}
                    </span>
                    {(t.is_expired || (t.expiry_date && new Date(t.expiry_date) < new Date())) && t.status === 'Staying' && (
                      <span style={{
                        fontSize: '0.65rem', fontWeight: 700, padding: '2px 6px', borderRadius: '4px',
                        background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.3)',
                        display: 'flex', alignItems: 'center', gap: '3px', whiteSpace: 'nowrap'
                      }}>
                        <AlertTriangle size={11} /> EXPIRED
                      </span>
                    )}
                  </div>
                </td>
                <td>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button onClick={() => handleEditClick(t)} className="btn btn-icon-only" title="Edit">Edit</button>
                    <button onClick={() => { setPinTenant(t); setNewPin(t.biometric_pin || ''); setShowPinModal(true); }} className="btn btn-icon-only" style={{ color: 'var(--primary)' }} title="Mobile App Access">
                      <Smartphone size={16} />
                    </button>
                    <button
                      onClick={() => handleToggleAccess(t.tenant_id, t.access_granted)}
                      className="btn btn-icon-only" 
                      style={{ 
                        color: t.access_granted === false 
                          ? '#ef4444' 
                          : (Number(t.biometric_count) > 0 ? '#10b981' : '#f59e0b') 
                      }}
                      title={
                        t.access_granted === false
                          ? "Intended Device Access: Restricted (Click to Allow)"
                          : (Number(t.biometric_count) > 0 
                              ? "Intended Device Access: Active (Click to Restrict)" 
                              : "Intended Device Access: Allowed but no biometric templates saved (Click to Restrict)")
                      }
                    >
                      {t.access_granted !== false && Number(t.biometric_count) > 0 ? <ShieldCheck size={16} /> : <ShieldAlert size={16} />}
                    </button>
                    <button
                      onClick={() => openSyncModal(t)}
                      className="btn btn-icon-only" style={{ color: 'var(--success)' }}
                      title="Sync Configuration to Device"
                    >
                      <RefreshCw size={16} />
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
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                {isEditing && (
                  <button 
                    type="button" 
                    onClick={() => handleConvertToStaff(editId)}
                    className="btn" 
                    style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.3)', padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
                  >
                    Convert to Staff
                  </button>
                )}
                {isEditing && <span style={{ background: 'var(--accent)', color: 'white', padding: '0.2rem 0.6rem', borderRadius: '4px', fontSize: '0.8rem' }}>ID: #{newTenant.tenant_id}</span>}
                <button onClick={() => setShowModal(false)} className="btn btn-icon-only"><X size={20} /></button>
              </div>
            </div>
            <form onSubmit={handleAddTenant} style={{ marginTop: '1.5rem' }}>
              <div className="form-group">
                <label>System ID / Biometric PIN {isEditing ? '(Locked)' : '(Optional)'}</label>
                <input 
                  type="number" 
                  placeholder="Auto-increment if empty"
                  value={newTenant.tenant_id} 
                  disabled={isEditing}
                  onChange={e => setNewTenant({ ...newTenant, tenant_id: e.target.value })} 
                />
                <small style={{ color: 'var(--text-muted)' }}>
                  {isEditing ? 'System ID cannot be changed after creation' : 'The user ID that will reflect on the biometric device'}
                </small>
              </div>

              <div className="form-group" style={{ 
                background: 'rgba(245, 158, 11, 0.05)', 
                padding: '1rem', 
                borderRadius: '8px', 
                border: '1px solid rgba(245, 158, 11, 0.2)',
                marginBottom: '1.5rem'
              }}>
                <label style={{ color: '#f59e0b', fontSize: '0.85rem', fontWeight: 600 }}>Device Biometric PIN / Machine ID (Optional)</label>
                <input 
                  type="text" 
                  placeholder={isEditing ? newTenant.tenant_id : "Enter machine ID (e.g. 69 or HY0069)"}
                  value={newTenant.biometric_pin || ''} 
                  onChange={e => setNewTenant({ ...newTenant, biometric_pin: e.target.value })} 
                />
                <small style={{ color: 'var(--text-muted)', display: 'block', marginTop: '0.5rem' }}>
                  If the tenant is already registered on the machine with a custom ID (like 69 or HY0069), enter it here. Otherwise, leave blank to use the standard Software ID.
                </small>
              </div>

              <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Profile Photo</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                  <div style={{ 
                    width: '70px', 
                    height: '70px', 
                    borderRadius: '50%', 
                    border: '2px dashed var(--border)',
                    background: 'rgba(0,0,0,0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden',
                    position: 'relative'
                  }}>
                    {newTenant.photo ? (
                      <img src={newTenant.photo} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <Users size={32} style={{ color: 'var(--text-muted)' }} />
                    )}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <input 
                      type="file" 
                      accept="image/*" 
                      id="tenant-photo-upload" 
                      style={{ display: 'none' }} 
                      onChange={handlePhotoChange}
                    />
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <label 
                        htmlFor="tenant-photo-upload" 
                        className="btn" 
                        style={{ 
                          padding: '0.5rem 1rem', 
                          fontSize: '0.85rem', 
                          background: 'var(--primary)', 
                          color: 'white', 
                          cursor: 'pointer',
                          borderRadius: '0.5rem',
                          textAlign: 'center'
                        }}
                      >
                        Choose Photo
                      </label>
                      {newTenant.photo && (
                        <button 
                          type="button" 
                          className="btn" 
                          style={{ 
                            padding: '0.5rem 1rem', 
                            fontSize: '0.85rem', 
                            background: 'rgba(239, 68, 68, 0.1)', 
                            color: '#ef4444',
                            borderRadius: '0.5rem'
                          }}
                          onClick={() => setNewTenant({ ...newTenant, photo: '' })}
                        >
                          Remove
                        </button>
                      )}
                    </div>
                    <small style={{ color: 'var(--text-muted)' }}>Supported formats: JPG, PNG, WEBP. Max size: 5MB.</small>
                  </div>
                </div>
              </div>

              <div className="form-group">
                <label>Full Name</label>
                <input type="text" required value={newTenant.name} onChange={e => setNewTenant({ ...newTenant, name: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Mobile Number</label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <select 
                    value={countryCode} 
                    onChange={e => setCountryCode(e.target.value)}
                    style={{ width: '120px', flexShrink: 0 }}
                  >
                    <option value="+91">+91 (India)</option>
                    <option value="+1">+1 (US/Canada)</option>
                    <option value="+44">+44 (UK)</option>
                    <option value="+61">+61 (Australia)</option>
                  </select>
                  <input type="text" required value={newTenant.mobile} onChange={e => setNewTenant({ ...newTenant, mobile: e.target.value })} style={{ flex: 1 }} />
                </div>
              </div>
              <div className="form-group">
                <label>Email Address (Optional)</label>
                <input type="email" value={newTenant.email} onChange={e => setNewTenant({ ...newTenant, email: e.target.value })} placeholder="tenant@example.com" />
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
                    Stay Expiry Date (Rent)
                    <span
                      onClick={() => {
                        const baseDate = newTenant.expiry_date ? new Date(newTenant.expiry_date) : new Date(newTenant.joining_date);
                        baseDate.setMonth(baseDate.getMonth() + 1);
                        if (isEditing) {
                          if (!confirm('⚠️ You are extending the rent period by +1 month. Make sure a payment has been recorded for this extension.')) return;
                        }
                        setNewTenant({ ...newTenant, expiry_date: baseDate.toISOString().split('T')[0] });
                      }}
                      style={{ color: 'var(--primary)', cursor: 'pointer', fontSize: '0.7rem', fontWeight: 600 }}
                    >
                      +1 Month
                    </span>
                  </label>
                  <input type="date" value={newTenant.expiry_date} onChange={e => setNewTenant({ ...newTenant, expiry_date: e.target.value })} />
                </div>
              </div>

              <div style={{ padding: '1rem', background: 'rgba(99, 102, 241, 0.05)', borderRadius: '8px', border: '1px solid rgba(99, 102, 241, 0.2)', marginBottom: '1rem' }}>
                <h4 style={{ marginBottom: '0.75rem', color: 'var(--primary)', fontSize: '0.85rem' }}>Biometric Hardware Limits (Optional)</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label>Hardware Expiry Date</label>
                    <input type="date" value={newTenant.access_expiry_date || ''} onChange={e => setNewTenant({ ...newTenant, access_expiry_date: e.target.value })} />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label>Entry / Punch Limit</label>
                    <input type="number" placeholder="e.g. 10" value={newTenant.punch_limit || ''} onChange={e => setNewTenant({ ...newTenant, punch_limit: parseInt(e.target.value) || '' })} />
                  </div>
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
                      const baseRent = bed.bed_cost || 0;
                      const baseAdvance = bed.advance_amount || 0;

                      // Use custom overrides if provided, otherwise default to base values
                      const monthlyRent = newTenant.custom_rent !== '' ? parseFloat(newTenant.custom_rent) || 0 : baseRent;
                      const advance = newTenant.custom_advance !== '' ? parseFloat(newTenant.custom_advance) || 0 : baseAdvance;
                      const discount = newTenant.discount_amount !== '' ? parseFloat(newTenant.discount_amount) || 0 : 0;

                      const hasExpiry = newTenant.joining_date && newTenant.expiry_date;
                      let months = 1;
                      if (hasExpiry) {
                        const start = new Date(newTenant.joining_date);
                        const end = new Date(newTenant.expiry_date);
                        months = Math.max(1, (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth()));
                      }
                      const totalRent = months * monthlyRent;
                      const totalInitial = Math.max(0, totalRent + advance - discount);

                      return (
                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                          <span title={`₹${monthlyRent.toLocaleString()} x ${months} months`} style={{ color: 'var(--text-muted)', fontSize: '0.75rem', background: 'rgba(0, 0, 0, 0.2)', padding: '2px 8px', borderRadius: '4px' }}>
                            Rent: ₹{totalRent.toLocaleString()}
                          </span>
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', background: 'rgba(0, 0, 0, 0.2)', padding: '2px 8px', borderRadius: '4px' }}>
                            Adv: ₹{advance.toLocaleString()}
                          </span>
                          {discount > 0 && (
                            <span style={{ color: '#ef4444', fontSize: '0.75rem', background: 'rgba(239, 68, 68, 0.1)', padding: '2px 8px', borderRadius: '4px' }}>
                              Disc: -₹{discount.toLocaleString()}
                            </span>
                          )}
                          <span style={{ color: 'var(--success)', fontWeight: 600, fontSize: '0.8rem', background: 'rgba(16, 185, 129, 0.1)', padding: '2px 8px', borderRadius: '4px' }}>
                            Total: ₹{totalInitial.toLocaleString()}
                          </span>
                        </div>
                      );
                    })()
                  )}
                </label>
                <div style={{ maxHeight: '300px', overflowY: 'auto', padding: '10px', background: 'rgba(0,0,0,0.2)', borderRadius: '1rem', marginTop: '0.5rem' }}>
                  {rooms.length === 0 ? (
                    <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>
                      No rooms or beds found. Please add them in the Rooms & Beds section first.
                    </div>
                  ) : (
                    (() => {
                      // Group rooms by floor, sort floors, sort rooms within each floor
                      const sortedRooms = [...rooms].sort((a, b) => {
                        const floorA = (a.floor_name || '').toLowerCase();
                        const floorB = (b.floor_name || '').toLowerCase();
                        if (floorA !== floorB) return floorA.localeCompare(floorB, undefined, { numeric: true });
                        return String(a.room_number).localeCompare(String(b.room_number), undefined, { numeric: true });
                      });

                      const floorGroups = [];
                      let currentFloor = null;
                      sortedRooms.forEach(room => {
                        const floorKey = room.floor_id || 'unassigned';
                        if (currentFloor?.key !== floorKey) {
                          currentFloor = { key: floorKey, name: room.floor_name || 'Unassigned Floor', rooms: [] };
                          floorGroups.push(currentFloor);
                        }
                        currentFloor.rooms.push(room);
                      });

                      return floorGroups.map((floor, floorIdx) => (
                        <div key={floor.key} style={{ marginBottom: floorIdx < floorGroups.length - 1 ? '0.75rem' : 0 }}>
                          {/* Floor Header */}
                          <div style={{
                            display: 'flex', alignItems: 'center', gap: '0.5rem',
                            marginBottom: '0.5rem', paddingBottom: '0.35rem',
                            borderBottom: '1px solid rgba(16, 185, 129, 0.15)'
                          }}>
                            <div style={{
                              width: '3px', height: '14px', borderRadius: '2px',
                              background: 'linear-gradient(180deg, #10b981, #059669)'
                            }} />
                            <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#10b981', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                              {floor.name}
                            </span>
                            <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                              ({floor.rooms.length} room{floor.rooms.length !== 1 ? 's' : ''})
                            </span>
                          </div>

                          {/* Rooms in sequence within this floor */}
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                            {floor.rooms.map(room => (
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
                      ));
                    })()
                  )}
                </div>
              </div>

              <div style={{ padding: '1rem', background: 'rgba(16, 185, 129, 0.05)', borderRadius: '8px', border: '1px solid rgba(16, 185, 129, 0.2)', marginBottom: '1.5rem', marginTop: '1rem' }}>
                <h4 style={{ marginBottom: '0.75rem', color: '#10b981', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  Custom Pricing & Discounts (Optional)
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label>Custom Rent (₹)</label>
                    <input 
                      type="number" 
                      placeholder="e.g. 7000" 
                      value={newTenant.custom_rent || ''} 
                      onChange={e => setNewTenant({ ...newTenant, custom_rent: e.target.value })} 
                      onFocus={e => e.target.select()}
                    />
                    <small style={{ color: 'var(--text-muted)' }}>Overrides default monthly cost</small>
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label>Custom Advance (₹)</label>
                    <input 
                      type="number" 
                      placeholder="e.g. 2000" 
                      value={newTenant.custom_advance || ''} 
                      onChange={e => setNewTenant({ ...newTenant, custom_advance: e.target.value })} 
                      onFocus={e => e.target.select()}
                    />
                    <small style={{ color: 'var(--text-muted)' }}>Overrides default deposit</small>
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label>First-month Discount (₹)</label>
                    <input 
                      type="number" 
                      placeholder="e.g. 500" 
                      value={newTenant.discount_amount || ''} 
                      onChange={e => setNewTenant({ ...newTenant, discount_amount: e.target.value })} 
                      onFocus={e => e.target.select()}
                    />
                    <small style={{ color: 'var(--text-muted)' }}>Single-time initial reduction</small>
                  </div>
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
                    await api.post(`/api/tenants/${pinTenant.tenant_id}/set-pin`, { pin: newPin });
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

      {/* Sync Configuration to Device Modal */}
      {syncModal && (
        <div className="modal-overlay">
          <div className="modal form-card" style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h2>Sync Identity/Biometrics</h2>
              <button className="btn-icon" onClick={() => setSyncModal(false)}><X size={20} /></button>
            </div>
            <div className="modal-body">
              <p style={{ marginBottom: '1rem', color: 'var(--text-muted)' }}>
                Target: <strong style={{ color: 'var(--text)' }}>{syncTargetTenant?.name}</strong>
              </p>
              
              <div className="form-group">
                <label>Target Device</label>
                <select 
                  className="input" 
                  value={targetDeviceSn} 
                  onChange={(e) => setTargetDeviceSn(e.target.value)}
                >
                  <option value="ALL">All Active Devices</option>
                  {devices.map(d => (
                    <option key={d.device_id} value={d.sn}>{d.device_name} ({d.sn})</option>
                  ))}
                </select>
              </div>

              <div style={{ marginTop: '1.5rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', cursor: 'pointer' }}>
                  <input type="checkbox" checked={syncUserInfo} onChange={(e) => setSyncUserInfo(e.target.checked)} />
                  <span style={{ fontWeight: 600 }}>Sync User Identity & Access Rules</span>
                </label>
                <small style={{ display: 'block', marginLeft: '1.5rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                  Updates name, PIN, timezone, and holidays on the device.
                </small>

                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', cursor: syncTargetTenant?.biometric_count > 0 ? 'pointer' : 'not-allowed' }}>
                  <input 
                    type="checkbox" 
                    checked={syncBiometrics} 
                    onChange={(e) => setSyncBiometrics(e.target.checked)} 
                    disabled={!syncTargetTenant?.biometric_count}
                  />
                  <span style={{ fontWeight: 600, opacity: syncTargetTenant?.biometric_count > 0 ? 1 : 0.5 }}>Sync Biometric Templates</span>
                </label>
                {syncTargetTenant?.biometric_count > 0 ? (
                  <small style={{ display: 'block', marginLeft: '1.5rem', color: '#10b981' }}>
                    Push {syncTargetTenant.biometric_count} saved fingerprint/face/palm templates.
                  </small>
                ) : (
                  <small style={{ display: 'block', marginLeft: '1.5rem', color: 'var(--danger)' }}>
                    No biometric templates registered for this tenant. Enroll on a device first, then download it to software.
                  </small>
                )}
              </div>
            </div>
            <div className="modal-footer" style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
              <button className="btn btn-outline" onClick={() => setSyncModal(false)}>Cancel</button>
              <button 
                className="btn btn-primary" 
                onClick={handleExecuteSync}
                disabled={!syncUserInfo && !syncBiometrics}
              >
                Execute Sync
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
