import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Clock, Plus, Trash2, ShieldCheck, AlertCircle, Users, CheckCircle, XCircle, RefreshCw } from 'lucide-react';

const AccessSchedules = () => {
  const [schedules, setSchedules] = useState([]);
  const [groups, setGroups] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [newSchedule, setNewSchedule] = useState({ 
    name: '', 
    valid_days: [1, 1, 1, 1, 1, 1, 1],
    timings: {
      sun: { start: '08:00', end: '20:00' },
      mon: { start: '08:00', end: '20:00' },
      tue: { start: '08:00', end: '20:00' },
      wed: { start: '08:00', end: '20:00' },
      thu: { start: '08:00', end: '20:00' },
      fri: { start: '08:00', end: '20:00' },
      sat: { start: '08:00', end: '20:00' }
    }
  });
  const [useSameTimeAllDays, setUseSameTimeAllDays] = useState(true);
  const [newGroup, setNewGroup] = useState({ name: '', timezone1_id: '', timezone2_id: '', timezone3_id: '' });
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    fetchSchedules();
    fetchGroups();
    fetchTenants();
  }, []);

  const fetchGroups = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/access-groups');
      setGroups(res.data);
    } catch (err) { console.error(err); }
  };

  const fetchSchedules = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/access-schedules');
      setSchedules(res.data);
    } catch (err) { console.error(err); }
  };

  const fetchTenants = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/payments/status');
      setTenants(res.data);
    } catch (err) { console.error(err); }
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = { 
        name: newSchedule.name, 
        valid_days: newSchedule.valid_days.join(''),
        timings: newSchedule.timings
      };
      await axios.post('http://localhost:5000/api/access-schedules', payload);
      setShowAddModal(false);
      // Reset state
      setNewSchedule({ 
        name: '', 
        valid_days: [1, 1, 1, 1, 1, 1, 1],
        timings: {
          sun: { start: '08:00', end: '20:00' },
          mon: { start: '08:00', end: '20:00' },
          tue: { start: '08:00', end: '20:00' },
          wed: { start: '08:00', end: '20:00' },
          thu: { start: '08:00', end: '20:00' },
          fri: { start: '08:00', end: '20:00' },
          sat: { start: '08:00', end: '20:00' }
        }
      });
      fetchSchedules();
    } catch (err) { alert('Failed to create schedule'); }
    finally { setLoading(false); }
  };

  const handleDelete = async (id) => {
    if (id === 1) return alert('Cannot delete default schedule');
    if (!window.confirm('Are you sure? Tenants using this schedule will default to Full Access.')) return;
    try {
      await axios.delete(`http://localhost:5000/api/access-schedules/${id}`);
      fetchSchedules();
    } catch (err) { console.error(err); }
  };

  const handleAddGroup = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await axios.post('http://localhost:5000/api/access-groups', newGroup);
      setShowGroupModal(false);
      setNewGroup({ name: '', timezone1_id: '', timezone2_id: '', timezone3_id: '' });
      fetchGroups();
    } catch (err) { alert('Failed to create access group'); }
    finally { setLoading(false); }
  };

  const handleDeleteGroup = async (id) => {
    if (!window.confirm('Are you sure you want to delete this group?')) return;
    try {
      await axios.delete(`http://localhost:5000/api/access-groups/${id}`);
      fetchGroups();
    } catch (err) { console.error(err); }
  };

  const toggleAccess = async (tenant_id, currentAccess) => {
    try {
      await axios.put(`http://localhost:5000/api/access-control/${tenant_id}`, { access_granted: !currentAccess });
      fetchTenants();
    } catch (err) { console.error(err); }
  };

  const updateGroup = async (tenant_id, access_group_id) => {
    try {
      await axios.put(`http://localhost:5000/api/access-control/${tenant_id}/group`, { access_group_id: access_group_id === 'none' ? null : access_group_id });
      fetchTenants();
    } catch (err) { console.error(err); }
  };

  const resyncAll = async () => {
    setSyncing(true);
    try {
      const res = await axios.post('http://localhost:5000/api/access-schedules/resync-all');
      alert(res.data.message || 'Re-synced successfully!');
    } catch (err) { alert('Failed to re-sync schedules to devices'); }
    finally { setSyncing(false); }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1>Access Management</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Control building entry rules and individual tenant permissions.</p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn" onClick={resyncAll} disabled={syncing} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: syncing ? 'var(--text-muted)' : 'var(--success)', color: 'white', border: 'none', padding: '0.6rem 1.2rem', borderRadius: '8px', cursor: syncing ? 'not-allowed' : 'pointer', fontWeight: 600 }}>
            <RefreshCw size={18} className={syncing ? 'spin' : ''} /> {syncing ? 'Syncing...' : 'Re-Sync to Device'}
          </button>
          <button className="btn" onClick={() => setShowGroupModal(true)} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--accent)', color: 'white' }}>
            <Users size={18} /> New Access Group
          </button>
          <button className="btn btn-primary" onClick={() => setShowAddModal(true)} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Plus size={18} /> New Schedule
          </button>
        </div>
      </div>

      {/* Schedule Definitions */}
      <div className="grid-container" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem', marginBottom: '3rem' }}>
        {schedules.map(s => (
          <div key={s.id} className="card" style={{ border: s.id === 1 ? '1px solid var(--accent)' : '1px solid rgba(255,255,255,0.05)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ background: 'rgba(79, 70, 229, 0.1)', padding: '10px', borderRadius: '10px' }}>
                  <Clock size={20} color="var(--accent)" />
                </div>
                <h3 style={{ margin: 0 }}>{s.name}</h3>
              </div>
              {s.id !== 1 && (
                <button onClick={() => handleDelete(s.id)} style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer' }}>
                  <Trash2 size={16} />
                </button>
              )}
            </div>
            <div style={{ fontWeight: 600, fontSize: '1.2rem', padding: '0.8rem', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', textAlign: 'center' }}>
              {s.start_time} — {s.end_time}
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem', fontWeight: 500 }}>
                {s.valid_days ? ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].filter((_, i) => s.valid_days[i] === '1').join(' • ') : 'Everyday'}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Access Group Definitions */}
      <div style={{ marginBottom: '3rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1.5rem' }}>
          <ShieldCheck size={20} color="var(--accent)" />
          <h2 style={{ margin: 0 }}>Access Groups</h2>
        </div>
        <div className="grid-container" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
          {groups.map(g => (
            <div key={g.id} className="card" style={{ border: '1px solid rgba(59, 130, 246, 0.2)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ background: 'rgba(59, 130, 246, 0.1)', padding: '10px', borderRadius: '10px' }}>
                    <Users size={20} color="#3b82f6" />
                  </div>
                  <h3 style={{ margin: 0 }}>{g.name}</h3>
                </div>
                <button onClick={() => handleDeleteGroup(g.id)} style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer' }}>
                  <Trash2 size={16} />
                </button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {[g.timezone1_id, g.timezone2_id, g.timezone3_id].map((tid, idx) => {
                  const s = schedules.find(sched => sched.id === tid);
                  return s ? (
                    <div key={idx} style={{ fontSize: '0.85rem', background: 'rgba(255,255,255,0.03)', padding: '8px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.05)' }}>
                       <span style={{ fontWeight: 600, color: 'var(--accent)' }}>T{idx+1}:</span> {s.name} ({s.start_time}-{s.end_time})
                    </div>
                  ) : null;
                })}
                {![g.timezone1_id, g.timezone2_id, g.timezone3_id].some(t=>t) && (
                  <div style={{ textAlign: 'center', padding: '10px', color: 'var(--text-muted)', fontSize: '0.8rem' }}>No schedules assigned</div>
                )}
              </div>
            </div>
          ))}
          {groups.length === 0 && (
            <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', gridColumn: '1/-1', textAlign: 'center', padding: '2rem', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px dashed rgba(255,255,255,0.1)' }}>
              No access groups defined yet. Create one to bundle multiple time schedules.
            </div>
          )}
        </div>
      </div>

      {/* Tenant Access List */}
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1.5rem' }}>
          <Users size={20} color="var(--accent)" />
          <h2 style={{ margin: 0 }}>Tenant Access Control</h2>
        </div>
        
        <div className="data-table-container">
          <table>
            <thead>
              <tr>
                <th>Tenant Name</th>
                <th>Room</th>
                <th>Access Status</th>
                <th>Assigned Access Group</th>
              </tr>
            </thead>
            <tbody>
              {tenants.map(t => (
                <tr key={t.tenant_id}>
                  <td>
                    <div style={{ fontWeight: 600 }}>{t.name}</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>ID: {t.tenant_id}</div>
                  </td>
                  <td>Room {t.room_number || 'N/A'}</td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ display: 'flex', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', padding: '4px', border: '1px solid rgba(255,255,255,0.1)' }}>
                        <button 
                          onClick={() => !t.access_granted && toggleAccess(t.tenant_id, false)}
                          style={{ 
                            padding: '6px 12px', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 700,
                            background: t.access_granted ? 'var(--success)' : 'transparent',
                            color: t.access_granted ? 'white' : 'var(--text-muted)',
                            transition: '0.2s', display: 'flex', alignItems: 'center', gap: '4px'
                          }}
                        >
                          <CheckCircle size={14} /> Allowed
                        </button>
                        <button 
                          onClick={() => t.access_granted && toggleAccess(t.tenant_id, true)}
                          style={{ 
                            padding: '6px 12px', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 700,
                            background: !t.access_granted ? 'var(--danger)' : 'transparent',
                            color: !t.access_granted ? 'white' : 'var(--text-muted)',
                            transition: '0.2s', display: 'flex', alignItems: 'center', gap: '4px'
                          }}
                        >
                          <XCircle size={14} /> Restricted
                        </button>
                      </div>
                      
                      {/* Auto-Blocked Warning */}
                      {!t.access_granted && t.pending_balance >= (t.bed_cost * 1.2) && t.bed_cost > 0 && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--danger)', fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase' }}>
                          <AlertCircle size={12} /> Overdue lock
                        </div>
                      )}
                    </div>
                  </td>
                  <td>
                    <select 
                      value={t.access_group_id || 'none'}
                      onChange={(e) => updateGroup(t.tenant_id, e.target.value)}
                      style={{ padding: '0.5rem', borderRadius: '6px', background: '#2d3748', color: 'white', border: '1px solid rgba(255,255,255,0.1)', width: '100%' }}
                    >
                      <option value="none" style={{ background: '#2d3748' }}>No Group (Default)</option>
                      {groups.map(g => (
                        <option key={g.id} value={g.id} style={{ background: '#2d3748', color: 'white' }}>
                          {g.name}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <h2>New Schedule</h2>
            <form onSubmit={handleAdd}>
              <div className="form-group">
                <label>Schedule Name</label>
                <input type="text" required placeholder="e.g. Day Shift" value={newSchedule.name} onChange={e => setNewSchedule({...newSchedule, name: e.target.value})} />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', background: 'rgba(255,255,255,0.03)', padding: '10px', borderRadius: '8px' }}>
                <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>Same timings for all days?</span>
                <input 
                  type="checkbox" 
                  checked={useSameTimeAllDays} 
                  onChange={(e) => setUseSameTimeAllDays(e.target.checked)} 
                  style={{ width: '20px', height: '20px', cursor: 'pointer' }}
                />
              </div>

              {useSameTimeAllDays ? (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                  <div className="form-group">
                    <label>Start (24H)</label>
                    <input 
                      type="text" 
                      placeholder="08:00" 
                      pattern="^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$" 
                      required 
                      value={newSchedule.timings.sun.start} 
                      onChange={e => {
                        const t = e.target.value;
                        const newTimings = {...newSchedule.timings};
                        ['sun','mon','tue','wed','thu','fri','sat'].forEach(d => newTimings[d].start = t);
                        setNewSchedule({...newSchedule, timings: newTimings});
                      }} 
                    />
                  </div>
                  <div className="form-group">
                    <label>End (24H)</label>
                    <input 
                      type="text" 
                      placeholder="20:00" 
                      pattern="^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$" 
                      required 
                      value={newSchedule.timings.sun.end} 
                      onChange={e => {
                        const t = e.target.value;
                        const newTimings = {...newSchedule.timings};
                        ['sun','mon','tue','wed','thu','fri','sat'].forEach(d => newTimings[d].end = t);
                        setNewSchedule({...newSchedule, timings: newTimings});
                      }} 
                    />
                  </div>
                </div>
              ) : (
                <div style={{ maxHeight: '300px', overflowY: 'auto', paddingRight: '10px', marginBottom: '1rem' }}>
                   {['sun','mon','tue','wed','thu','fri','sat'].map((day, idx) => (
                     <div key={day} style={{ display: 'grid', gridTemplateColumns: '80px 1fr 1fr', gap: '10px', alignItems: 'center', marginBottom: '8px', padding: '8px', background: newSchedule.valid_days[idx] ? 'rgba(255,255,255,0.05)' : 'transparent', borderRadius: '6px' }}>
                        <span style={{ fontWeight: 600, textTransform: 'uppercase', fontSize: '0.8rem' }}>{day}</span>
                        <input 
                          type="text" 
                          placeholder="08:00" 
                          pattern="^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$" 
                          value={newSchedule.timings[day].start} 
                          onChange={e => {
                            const newTimings = {...newSchedule.timings};
                            newTimings[day].start = e.target.value;
                            setNewSchedule({...newSchedule, timings: newTimings});
                          }} 
                          style={{ padding: '4px 8px', fontSize: '0.85rem' }}
                        />
                        <input 
                          type="text" 
                          placeholder="20:00" 
                          pattern="^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$" 
                          value={newSchedule.timings[day].end} 
                          onChange={e => {
                            const newTimings = {...newSchedule.timings};
                            newTimings[day].end = e.target.value;
                            setNewSchedule({...newSchedule, timings: newTimings});
                          }} 
                          style={{ padding: '4px 8px', fontSize: '0.85rem' }}
                        />
                     </div>
                   ))}
                </div>
              )}

              <div className="form-group">
                <label>Valid Days (Active Days)</label>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '4px' }}>
                  {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, idx) => (
                    <div 
                      key={idx} 
                      onClick={() => {
                        const newDays = [...newSchedule.valid_days];
                        newDays[idx] = newDays[idx] ? 0 : 1;
                        setNewSchedule({...newSchedule, valid_days: newDays});
                      }}
                      style={{
                        padding: '8px 0', flex: 1, textAlign: 'center', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600,
                        background: newSchedule.valid_days[idx] ? 'var(--primary)' : 'rgba(255,255,255,0.1)',
                        color: newSchedule.valid_days[idx] ? 'white' : 'var(--text-muted)',
                        transition: '0.2s'
                      }}
                    >
                      {day}
                    </div>
                  ))}
                </div>
              </div>

              <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '1rem' }} disabled={loading}>
                {loading ? 'Creating...' : 'Create & Sync'}
              </button>
            </form>
          </div>
        </div>
      )}

      {showGroupModal && (
        <div className="modal-overlay" onClick={() => setShowGroupModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '400px' }}>
            <h2>New Access Group</h2>
            <form onSubmit={handleAddGroup}>
              <div className="form-group">
                <label>Group Name</label>
                <input type="text" required placeholder="e.g. Staff Access" value={newGroup.name} onChange={e => setNewGroup({...newGroup, name: e.target.value})} />
              </div>
              
              {[1, 2, 3].map(i => (
                <div className="form-group" key={i}>
                  <label>Time Schedule {i}</label>
                  <select 
                    value={newGroup[`timezone${i}_id`]} 
                    onChange={e => setNewGroup({...newGroup, [`timezone${i}_id`]: e.target.value})}
                    style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', background: '#2d3748', color: 'white', border: '1px solid rgba(255,255,255,0.1)' }}
                  >
                    <option value="" style={{ background: '#2d3748', color: 'white' }}>None</option>
                    {schedules.map(s => (
                      <option key={s.id} value={s.id} style={{ background: '#2d3748', color: 'white' }}>{s.name} ({s.start_time}-{s.end_time})</option>
                    ))}
                  </select>
                </div>
              ))}
              
              <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '1.5rem', background: 'var(--accent)' }} disabled={loading}>
                {loading ? 'Creating...' : 'Create Access Group'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AccessSchedules;
