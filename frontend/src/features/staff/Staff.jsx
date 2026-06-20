import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { UserPlus, Search, RefreshCw, X, ShieldAlert, ShieldCheck, Users, Fingerprint, Calendar, Activity, CheckSquare, Trash2, Edit } from 'lucide-react';

const Staff = () => {
  const [staffList, setStaffList] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState(null);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  
  const [newStaff, setNewStaff] = useState({
    name: '', mobile: '', role: '', joining_date: new Date().toISOString().split('T')[0], 
    status: 'Active', biometric_pin: '', shift_start_time: '', shift_end_time: '', shift_grace_time: 15
  });
  
  const [toast, setToast] = useState(null);
  const [attendanceModal, setAttendanceModal] = useState(null);

  // Bulk selection state
  const [bulkMode, setBulkMode] = useState(null); // null | 'sync' | 'delete'
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [bulkLoading, setBulkLoading] = useState(false);

  useEffect(() => {
    fetchStaff();
  }, []);

  const fetchStaff = async () => {
    try {
      const res = await api.get('/api/staff');
      setStaffList(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error('Failed to fetch staff');
    }
  };

  const handleEditClick = (staff) => {
    setEditId(staff.staff_id);
    setNewStaff({
      name: staff.name,
      mobile: staff.mobile,
      role: staff.role || '',
      joining_date: staff.joining_date.split('T')[0],
      status: staff.status,
      biometric_pin: staff.biometric_pin || '',
      shift_start_time: staff.shift_start_time || '',
      shift_end_time: staff.shift_end_time || '',
      shift_grace_time: staff.shift_grace_time !== null && staff.shift_grace_time !== undefined ? staff.shift_grace_time : 15
    });
    setIsEditing(true);
    setShowModal(true);
  };

  const handleDeleteStaff = async (id) => {
    if (!window.confirm('Are you sure you want to delete this staff member?')) return;
    try {
      await api.delete(`/api/staff/${id}`);
      fetchStaff();
    } catch (err) {
      alert('Failed to delete staff');
    }
  };

  const handleSaveStaff = async (e) => {
    e.preventDefault();
    try {
      if (isEditing) {
        await api.put(`/api/staff/${editId}`, newStaff);
      } else {
        await api.post('/api/staff', newStaff);
      }
      setShowModal(false);
      setIsEditing(false);
      setEditId(null);
      fetchStaff();
      setToast(isEditing ? 'Staff updated successfully' : 'Staff added successfully');
      setTimeout(() => setToast(null), 3000);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to save staff');
    }
  };

  const viewAttendance = async (staffId, name) => {
    try {
      const res = await api.get(`/api/staff/${staffId}/attendance`);
      setAttendanceModal({ name, logs: res.data });
    } catch (err) {
      alert('Failed to fetch attendance');
    }
  };

  const handleSyncStaff = async (staff) => {
    try {
      if (!staff.biometric_pin) {
        alert('Staff must have a Biometric PIN to sync with devices');
        return;
      }
      // Assuming a generic sync user endpoint that relies on the tenant_id/pin logic
      // Alternatively, we use the standard sync-user logic with the staff ID
      // If the backend devices logic specifically needs tenant_id, we just pass the ID as tenant_id 
      // but ADMS service was modified to check both, so we can just send tenant_id: pinNum
      await api.post('/api/devices/sync-user', { tenant_id: parseInt(staff.biometric_pin) || staff.staff_id, is_staff: true });
      setToast('Sync command queued successfully');
      setTimeout(() => setToast(null), 5000);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to queue sync command');
    }
  };

  const handleToggleAccess = async (staffId, currentStatus) => {
    const newStatus = currentStatus === false; // Toggle
    try {
      const res = await api.put(`/api/staff/${staffId}/access`, { access_granted: newStatus });
      setToast(res.data.message || 'Access rule updated successfully');
      setTimeout(() => setToast(null), 5000);
      fetchStaff();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to update biometric access');
    }
  };

  const filteredStaff = staffList.filter(s => {
    const matchesSearch = !searchTerm || s.name.toLowerCase().includes(searchTerm.toLowerCase()) || s.mobile.includes(searchTerm);
    const matchesStatus = !statusFilter || s.status === statusFilter;
    const matchesRole = !roleFilter || (s.role && s.role.toLowerCase() === roleFilter.toLowerCase());
    return matchesSearch && matchesStatus && matchesRole;
  });

  const roles = [...new Set(staffList.map(s => s.role).filter(Boolean))];

  // Bulk selection helpers
  const toggleSelect = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredStaff.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredStaff.map(s => s.staff_id)));
    }
  };

  const exitBulkMode = () => {
    setBulkMode(null);
    setSelectedIds(new Set());
  };

  const handleBulkSync = async () => {
    const selected = staffList.filter(s => selectedIds.has(s.staff_id));
    const withPin = selected.filter(s => s.biometric_pin);
    if (withPin.length === 0) {
      alert('None of the selected staff have a Biometric PIN.');
      return;
    }
    if (!window.confirm(`Sync ${withPin.length} staff member(s) to devices?`)) return;
    setBulkLoading(true);
    let success = 0;
    let failed = 0;
    for (const s of withPin) {
      try {
        await api.post('/api/devices/sync-user', { tenant_id: parseInt(s.biometric_pin) || s.staff_id, is_staff: true });
        success++;
      } catch {
        failed++;
      }
    }
    setBulkLoading(false);
    setToast(`Sync queued for ${success} staff${failed ? `, ${failed} failed` : ''}`);
    setTimeout(() => setToast(null), 5000);
    exitBulkMode();
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!window.confirm(`Are you sure you want to delete ${selectedIds.size} staff member(s)? This cannot be undone.`)) return;
    setBulkLoading(true);
    try {
      await api.post('/api/staff/bulk-delete', { ids: [...selectedIds] });
      setToast(`${selectedIds.size} staff member(s) deleted`);
      setTimeout(() => setToast(null), 5000);
      fetchStaff();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete staff');
    }
    setBulkLoading(false);
    exitBulkMode();
  };

  return (
    <div style={{ paddingBottom: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1>Staff Management</h1>
        <div style={{ display: 'flex', gap: '1rem' }}>
          {!bulkMode && (
            <>
              <button className="btn" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--card-bg)', border: '1px solid var(--border)' }} onClick={() => { setBulkMode('sync'); setSelectedIds(new Set()); }}>
                <CheckSquare size={18} /> Select & Sync
              </button>
              <button className="btn" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--card-bg)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444' }} onClick={() => { setBulkMode('delete'); setSelectedIds(new Set()); }}>
                <Trash2 size={18} /> Select & Delete
              </button>
            </>
          )}
          <button className="btn" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--card-bg)', border: '1px solid var(--border)' }} onClick={() => { 
            window.location.href = '/reports?tab=staff_attendance';
          }}>
            <Calendar size={18} /> Attendance Reports
          </button>
          <button className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }} onClick={() => { 
            setIsEditing(false); 
            setNewStaff({ name: '', mobile: '', role: '', joining_date: new Date().toISOString().split('T')[0], status: 'Active', biometric_pin: '', shift_start_time: '', shift_end_time: '', shift_grace_time: 15 }); 
            setShowModal(true); 
          }}>
            <UserPlus size={18} /> Add Staff
          </button>
        </div>
      </div>

      {toast && (
        <div style={{ background: 'var(--success)', color: 'var(--text-main)', padding: '1rem', borderRadius: '0.5rem', marginBottom: '1rem' }}>
          {toast}
        </div>
      )}

      {/* Stats Widgets */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        <div className="stat-card" style={{ background: 'rgba(79, 70, 229, 0.1)', border: '1px solid rgba(79, 70, 229, 0.2)', padding: '1.5rem', borderRadius: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ background: '#4f46e5', color: 'var(--text-main)', padding: '0.75rem', borderRadius: '0.75rem' }}>
              <Users size={24} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.5rem', color: 'var(--text)' }}>{staffList.filter(s => s.status === 'Active').length}</h3>
              <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.85rem' }}>Active Staff</p>
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <div style={{ position: 'relative' }}>
          <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input 
            type="text" 
            placeholder="Search staff..." 
            style={{ paddingLeft: '3rem' }} 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <select onChange={e => setStatusFilter(e.target.value)} value={statusFilter}>
          <option value="">All Statuses</option>
          <option value="Active">Active</option>
          <option value="Inactive">Inactive</option>
        </select>
        <select onChange={e => setRoleFilter(e.target.value)} value={roleFilter}>
          <option value="">All Roles</option>
          {roles.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
      </div>

      {/* Bulk Action Toolbar */}
      {bulkMode && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0.75rem 1.25rem', marginBottom: '1rem', borderRadius: '0.75rem',
          background: bulkMode === 'delete' ? 'rgba(239,68,68,0.08)' : 'rgba(16,185,129,0.08)',
          border: `1px solid ${bulkMode === 'delete' ? 'rgba(239,68,68,0.25)' : 'rgba(16,185,129,0.25)'}`,
          animation: 'fadeIn 0.2s ease'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>
              {selectedIds.size} selected
            </span>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              {bulkMode === 'sync' ? 'Select staff to sync with devices' : 'Select staff to delete'}
            </span>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            {bulkMode === 'sync' && (
              <button
                className="btn btn-primary"
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', fontSize: '0.85rem', background: '#10b981' }}
                disabled={selectedIds.size === 0 || bulkLoading}
                onClick={handleBulkSync}
              >
                <RefreshCw size={16} className={bulkLoading ? 'spin' : ''} /> Sync {selectedIds.size > 0 ? `(${selectedIds.size})` : ''}
              </button>
            )}
            {bulkMode === 'delete' && (
              <button
                className="btn"
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', fontSize: '0.85rem', background: '#ef4444', color: '#fff', border: 'none' }}
                disabled={selectedIds.size === 0 || bulkLoading}
                onClick={handleBulkDelete}
              >
                <Trash2 size={16} /> Delete {selectedIds.size > 0 ? `(${selectedIds.size})` : ''}
              </button>
            )}
            <button className="btn" style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }} onClick={exitBulkMode}>
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="data-table-container">
        <table>
          <thead>
            <tr>
              {bulkMode && (
                <th style={{ width: '40px' }}>
                  <input
                    type="checkbox"
                    checked={filteredStaff.length > 0 && selectedIds.size === filteredStaff.length}
                    onChange={toggleSelectAll}
                    style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: bulkMode === 'delete' ? '#ef4444' : '#10b981' }}
                  />
                </th>
              )}
              <th style={{ width: '60px' }}>ID</th>
              <th>Name</th>
              <th>Role</th>
              <th>Mobile</th>
              <th>Joining Date</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredStaff.map(s => (
              <tr key={s.staff_id} style={selectedIds.has(s.staff_id) ? { background: bulkMode === 'delete' ? 'rgba(239,68,68,0.06)' : 'rgba(16,185,129,0.06)' } : {}}>
                {bulkMode && (
                  <td>
                    <input
                      type="checkbox"
                      checked={selectedIds.has(s.staff_id)}
                      onChange={() => toggleSelect(s.staff_id)}
                      style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: bulkMode === 'delete' ? '#ef4444' : '#10b981' }}
                    />
                  </td>
                )}
                <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>#{s.staff_id}</td>
                <td style={{ fontWeight: 600 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {s.name}
                    {Number(s.biometric_count) > 0 && (
                      <span title={`Biometric PIN: ${s.biometric_pin} (${s.biometric_count} templates)`} style={{ color: '#10b981', display: 'flex', alignItems: 'center' }}>
                        <Fingerprint size={16} />
                      </span>
                    )}
                  </div>
                </td>
                <td>
                  <span style={{
                    fontSize: '0.75rem', fontWeight: 600, padding: '0.2rem 0.5rem', borderRadius: '4px',
                    background: 'rgba(99, 102, 241, 0.15)', color: '#6366f1'
                  }}>
                    {s.role || 'Unspecified'}
                  </span>
                </td>
                <td>{s.mobile}</td>
                <td>{new Date(s.joining_date).toLocaleDateString()}</td>
                <td>
                  <span className={`badge badge-${s.status === 'Inactive' ? 'vacant' : 'occupied'}`}>
                    {s.status}
                  </span>
                </td>
                <td>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <button onClick={() => viewAttendance(s.staff_id, s.name)} className="btn btn-icon-only" style={{ color: 'var(--accent)' }} title="View Attendance">
                      <Calendar size={16} />
                    </button>
                    <button onClick={() => handleEditClick(s)} className="btn btn-icon-only" style={{ color: 'var(--text-muted)' }} title="Edit">
                      <Edit size={16} />
                    </button>
                    <button
                      onClick={() => handleToggleAccess(s.staff_id, s.access_granted)}
                      className="btn btn-icon-only" 
                      style={{ 
                        color: s.access_granted === false 
                          ? '#ef4444' 
                          : (Number(s.biometric_count) > 0 ? '#10b981' : '#f59e0b') 
                      }}
                      title={
                        s.access_granted === false
                          ? "Intended Device Access: Restricted (Click to Allow)"
                          : (Number(s.biometric_count) > 0 
                              ? "Intended Device Access: Active (Click to Restrict)" 
                              : "Intended Device Access: Allowed but no biometric templates saved (Click to Restrict)")
                      }
                    >
                      {s.access_granted !== false && Number(s.biometric_count) > 0 ? <ShieldCheck size={16} /> : <ShieldAlert size={16} />}
                    </button>
                    <button onClick={() => handleSyncStaff(s)} className="btn btn-icon-only" style={{ color: 'var(--success)' }} title="Sync Device">
                      <RefreshCw size={16} />
                    </button>
                    <button onClick={() => handleDeleteStaff(s.staff_id)} className="btn btn-icon-only" style={{ color: 'var(--danger)' }} title="Delete">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Staff Edit Modal */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2>{isEditing ? 'Edit Staff' : 'Add New Staff'}</h2>
              <button onClick={() => setShowModal(false)} className="btn btn-icon-only"><X size={20} /></button>
            </div>
            <form onSubmit={handleSaveStaff} style={{ marginTop: '1.5rem' }}>
              <div className="form-group">
                <label>Full Name</label>
                <input type="text" required value={newStaff.name} onChange={e => setNewStaff({ ...newStaff, name: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Mobile Number</label>
                <input type="text" required value={newStaff.mobile} onChange={e => setNewStaff({ ...newStaff, mobile: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Role / Designation</label>
                <input type="text" placeholder="e.g., Cleaning, Security, Manager" value={newStaff.role} onChange={e => setNewStaff({ ...newStaff, role: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Biometric PIN (Device ID)</label>
                <input type="text" placeholder="e.g., 1001" value={newStaff.biometric_pin} onChange={e => setNewStaff({ ...newStaff, biometric_pin: e.target.value })} />
                <small style={{ color: 'var(--text-muted)' }}>Required for attendance tracking.</small>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label>Joining Date</label>
                  <input type="date" required value={newStaff.joining_date} onChange={e => setNewStaff({ ...newStaff, joining_date: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Status</label>
                  <select value={newStaff.status} onChange={e => setNewStaff({ ...newStaff, status: e.target.value })}>
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
              </div>
              
              <div style={{ marginTop: '1rem' }}>
                <h3 style={{ fontSize: '1rem', marginBottom: '0.5rem' }}>Shift Details</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', background: 'rgba(128,128,128,0.1)', padding: '1rem', borderRadius: '8px', border: '1px solid rgba(128,128,128,0.1)' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label>Start Time</label>
                    <input type="time" value={newStaff.shift_start_time || ''} onChange={e => setNewStaff({ ...newStaff, shift_start_time: e.target.value })} />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label>End Time</label>
                    <input type="time" value={newStaff.shift_end_time || ''} onChange={e => setNewStaff({ ...newStaff, shift_end_time: e.target.value })} />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label>Grace Time (mins)</label>
                    <input type="number" min="0" value={newStaff.shift_grace_time} onChange={e => setNewStaff({ ...newStaff, shift_grace_time: parseInt(e.target.value) || 0 })} />
                  </div>
                </div>
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '2rem' }}>
                <button type="button" className="btn" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">{isEditing ? 'Update Staff' : 'Add Staff'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Attendance Modal */}
      {attendanceModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '600px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h2>Attendance: {attendanceModal.name}</h2>
              <button onClick={() => setAttendanceModal(null)} className="btn btn-icon-only"><X size={20} /></button>
            </div>
            
            {attendanceModal.logs.length > 0 && (
              <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', background: 'rgba(128,128,128,0.1)', padding: '1rem', borderRadius: '8px' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Total Punches</div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 600 }}>{attendanceModal.logs.length}</div>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Late Check-Ins</div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 600, color: '#f59e0b' }}>{attendanceModal.logs.filter(l => l.is_late).length}</div>
                </div>
              </div>
            )}
            
            {attendanceModal.logs.length === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                No attendance logs found for this staff member.
              </div>
            ) : (
              <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: 'rgba(128,128,128,0.1)' }}>
                      <th style={{ padding: '10px', textAlign: 'left' }}>Date & Time</th>
                      <th style={{ padding: '10px', textAlign: 'left' }}>Status</th>
                      <th style={{ padding: '10px', textAlign: 'left' }}>Device SN</th>
                    </tr>
                  </thead>
                  <tbody>
                    {attendanceModal.logs.map(log => (
                      <tr key={log.log_id} style={{ borderBottom: '1px solid rgba(128,128,128,0.1)' }}>
                        <td style={{ padding: '10px' }}>{new Date(log.punch_time).toLocaleString()}</td>
                        <td style={{ padding: '10px', display: 'flex', gap: '8px', alignItems: 'center' }}>
                          <span style={{ 
                            padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem',
                            background: log.status === 0 || log.status === '0' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                            color: log.status === 0 || log.status === '0' ? '#10b981' : '#ef4444'
                          }}>
                            {log.status === 0 || log.status === '0' ? 'Check In' : 'Check Out'}
                          </span>
                          {log.is_late && (
                            <span style={{ 
                              padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem',
                              background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b', fontWeight: 600
                            }}>
                              Late
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '10px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>{log.device_sn}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Staff;
