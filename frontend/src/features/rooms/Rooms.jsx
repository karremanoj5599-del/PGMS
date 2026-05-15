import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { LayoutGrid, Bed, Plus, Trash2, X, Pencil, Building2, Map as MapIcon, Users } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';

const Rooms = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('map'); // floors, rooms, beds, map
  
  useEffect(() => {
    if (location.state?.tab) {
      setActiveTab(location.state.tab);
    }
  }, [location.state]);
  const [rooms, setRooms] = useState([]);
  const [beds, setBeds] = useState([]);
  const [floors, setFloors] = useState([]);
  const [showRoomModal, setShowRoomModal] = useState(false);
  const [showBedModal, setShowBedModal] = useState(false);
  const [showFloorModal, setShowFloorModal] = useState(false);
  const [showEditRoomModal, setShowEditRoomModal] = useState(false);
  const [showEditFloorModal, setShowEditFloorModal] = useState(false);
  const [showEditBedModal, setShowEditBedModal] = useState(false);
  const [bedError, setBedError] = useState('');
  const [newRoom, setNewRoom] = useState({ room_number: '', floor_id: '', sharing_capacity: '' });
  const [newBed, setNewBed] = useState({ room_id: '', bed_number: '', bed_cost: '', daily_cost: '', weekly_cost: '', advance_amount: '' });
  const [newFloor, setNewFloor] = useState({ floor_name: '' });
  const [editingRoom, setEditingRoom] = useState(null);
  const [editingFloor, setEditingFloor] = useState(null);
  const [editingBed, setEditingBed] = useState(null);
  const [showTenantModal, setShowTenantModal] = useState(false);

  useEffect(() => {
    fetchData();
    fetchFloors();
  }, []);

  const fetchData = async () => {
    try {
      const [rRes, bRes] = await Promise.all([
        axios.get('/api/rooms'),
        axios.get('/api/beds')
      ]);
      setRooms(rRes.data);
      setBeds(bRes.data);
    } catch (err) {
      console.error('Failed to fetch rooms/beds');
    }
  };

  const fetchFloors = async () => {
    try {
      const res = await axios.get('/api/floors');
      setFloors(res.data);
    } catch (err) {
      console.error('Failed to fetch floors');
    }
  };

  // Handlers
  const handleAddRoom = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post('/api/rooms', newRoom);
      setShowRoomModal(false);
      fetchData();
      alert(res.data.message || 'Room added successfully');
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to add room(s)');
    }
  };

  const handleAddBed = async (e) => {
    e.preventDefault();
    setBedError('');
    try {
      const res = await axios.post('/api/beds', newBed);
      setShowBedModal(false);
      fetchData();
      alert(res.data.message || 'Bed added successfully');
    } catch (err) {
      setBedError(err.response?.data?.error || 'Failed to add bed(s)');
    }
  };

  const handleAddFloor = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post('/api/floors', newFloor);
      setShowFloorModal(false);
      fetchFloors();
      alert(res.data.message || 'Floor added successfully');
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to add floor(s)');
    }
  };

  const handleEditRoom = async (e) => {
    e.preventDefault();
    try {
      await axios.put(`/api/rooms/${editingRoom.room_id}`, editingRoom);
      setShowEditRoomModal(false);
      fetchData();
      alert('Room updated successfully');
    } catch (err) {
      alert(err.response?.data?.error || err.message || 'Failed to update room');
    }
  };

  const handleEditFloor = async (e) => {
    e.preventDefault();
    try {
      await axios.put(`/api/floors/${editingFloor.floor_id}`, editingFloor);
      setShowEditFloorModal(false);
      fetchFloors();
      fetchData();
      alert('Floor updated successfully');
    } catch (err) {
      alert(err.response?.data?.error || err.message || 'Failed to update floor');
    }
  };

  const handleEditBed = async (e) => {
    e.preventDefault();
    try {
      await axios.put(`/api/beds/${editingBed.bed_id}`, editingBed);
      setShowEditBedModal(false);
      fetchData();
      alert('Bed updated successfully');
    } catch (err) {
      alert(err.response?.data?.error || err.message || 'Failed to update bed');
    }
  };

  const handleDeleteRoom = async (id) => {
    if (!window.confirm('Delete this room? Use with caution.')) return;
    try {
      await axios.delete(`/api/rooms/${id}`);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.error || err.message || 'Failed to delete room');
    }
  };

  const handleDeleteBed = async (id) => {
    if (!window.confirm('Delete this bed?')) return;
    try {
      await axios.delete(`/api/beds/${id}`);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.error || err.message || 'Failed to delete bed');
    }
  };

  const handleDeleteFloor = async (id) => {
    if (!window.confirm('Delete this floor? It must be empty of rooms first.')) return;
    try {
      await axios.delete(`/api/floors/${id}`);
      fetchFloors();
    } catch (err) {
      alert(err.response?.data?.error || err.message || 'Failed to delete floor');
    }
  };

  const filteredBeds = beds.sort((a, b) => a.bed_number.localeCompare(b.bed_number, undefined, { numeric: true }));
  const filteredRooms = rooms.sort((a, b) => a.room_number.localeCompare(b.room_number, undefined, { numeric: true }));

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1>Rooms & Beds Setup</h1>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button className="btn" style={{ background: 'var(--card-bg)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '0.5rem' }} onClick={() => setShowFloorModal(true)}>
            <Building2 size={18} /> Add Floor
          </button>
          <button className="btn" style={{ background: 'var(--card-bg)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '0.5rem' }} onClick={() => setShowRoomModal(true)}>
            <Plus size={18} /> Add Room
          </button>
          <button className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }} onClick={() => { setBedError(''); setShowBedModal(true); }}>
            <Bed size={18} /> Add Bed
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
        {['map', 'floors', 'rooms', 'beds'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: '0.5rem 1.5rem',
              background: 'transparent',
              border: 'none',
              borderBottom: activeTab === tab ? '2px solid var(--primary)' : '2px solid transparent',
              color: activeTab === tab ? 'var(--primary)' : 'var(--text-muted)',
              cursor: 'pointer',
              fontWeight: 600,
              textTransform: 'capitalize',
              fontSize: '1rem',
              transition: 'all 0.2s',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            {tab === 'map' && <MapIcon size={16} />}
            {tab}
          </button>
        ))}
      </div>

      {/* Legend for Map */}
      {activeTab === 'map' && (
        <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '1.5rem', background: 'var(--card-bg)', padding: '1rem', borderRadius: '0.75rem', border: '1px solid var(--border)', fontSize: '0.85rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#10b981' }}></div>
            <span>Vacant Bed</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#ef4444' }}></div>
            <span>Occupied Bed</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#f59e0b' }}></div>
            <span>Maintenance</span>
          </div>
        </div>
      )}

      {/* Content Rendering */}
      <div style={{ background: activeTab === 'map' ? 'transparent' : 'var(--card-bg)', border: activeTab === 'map' ? 'none' : '1px solid var(--border)', borderRadius: '1rem', padding: activeTab === 'map' ? 0 : '1.5rem' }}>
        
        {activeTab === 'map' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            {floors.map(floor => (
              <div key={floor.floor_id} style={{ background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: '1.5rem', padding: '1.5rem' }}>
                <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h2 style={{ margin: 0, fontSize: '1.25rem', color: 'var(--primary)' }}>{floor.floor_name}</h2>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{rooms.filter(r => r.floor_id === floor.floor_id).length} Rooms</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1.5rem' }}>
                  {rooms.filter(r => r.floor_id === floor.floor_id).map(room => (
                    <div key={room.room_id} style={{ 
                      background: 'rgba(255,255,255,0.02)', 
                      border: '1px solid var(--border)', 
                      borderRadius: '1rem', 
                      padding: '1rem',
                      position: 'relative',
                      minHeight: '120px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                        <span style={{ fontWeight: 700, fontSize: '1rem' }}>Room {room.room_number}</span>
                        <Pencil size={14} style={{ cursor: 'pointer', color: 'var(--text-muted)' }} onClick={() => { setEditingRoom(room); setShowEditRoomModal(true); }} />
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                        {beds.filter(b => b.room_id === room.room_id).map(bed => (
                          <div 
                            key={bed.bed_id} 
                            title={`Bed ${bed.bed_number} - ₹${bed.bed_cost}`}
                            style={{ 
                              width: '42px', 
                              height: '42px', 
                              borderRadius: '10px', 
                              background: bed.status === 'Occupied' ? '#ef4444' : bed.status === 'Maintenance' ? '#f59e0b' : '#10b981',
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: 'white',
                              cursor: 'pointer',
                              boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
                              transition: 'transform 0.2s',
                              gap: '2px'
                            }}
                            onMouseOver={e => e.currentTarget.style.transform = 'scale(1.1)'}
                            onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'}
                            onClick={() => { 
                              setEditingBed(bed); 
                              if (bed.status === 'Occupied') {
                                setShowTenantModal(true);
                              } else {
                                setShowEditBedModal(true);
                              }
                            }}
                          >
                            <Bed size={16} />
                            <span style={{ fontSize: '0.7rem', fontWeight: 800 }}>{bed.bed_number.split('-').pop()}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'floors' && (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)', textAlign: 'left' }}>
                  <th style={{ padding: '1rem' }}>Floor Name</th>
                  <th style={{ padding: '1rem' }}>Total Rooms</th>
                  <th style={{ padding: '1rem', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {floors.map(floor => (
                  <tr key={floor.floor_id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '1rem', fontWeight: 600 }}>{floor.floor_name}</td>
                    <td style={{ padding: '1rem' }}>{rooms.filter(r => r.floor_id === floor.floor_id).length} rooms</td>
                    <td style={{ padding: '1rem', textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                        <button onClick={() => { setEditingFloor(floor); setShowEditFloorModal(true); }} className="btn-icon" style={{ color: 'var(--primary)' }}><Pencil size={16} /></button>
                        <button onClick={() => handleDeleteFloor(floor.floor_id)} className="btn-icon" style={{ color: 'var(--danger)' }}><Trash2 size={16} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'rooms' && (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)', textAlign: 'left' }}>
                  <th style={{ padding: '1rem' }}>Room Number</th>
                  <th style={{ padding: '1rem' }}>Floor</th>
                  <th style={{ padding: '1rem' }}>Capacity</th>
                  <th style={{ padding: '1rem' }}>Beds</th>
                  <th style={{ padding: '1rem', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredRooms.map(room => {
                  const roomBeds = beds.filter(b => b.room_id === room.room_id);
                  return (
                    <tr key={room.room_id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '1rem', fontWeight: 600 }}>Room {room.room_number}</td>
                      <td style={{ padding: '1rem' }}>{room.floor_name}</td>
                      <td style={{ padding: '1rem' }}>{room.sharing_capacity} sharing</td>
                      <td style={{ padding: '1rem' }}>
                        <span style={{ color: roomBeds.length >= room.sharing_capacity ? 'var(--accent)' : 'var(--text-muted)' }}>
                          {roomBeds.length} / {room.sharing_capacity} beds
                        </span>
                      </td>
                      <td style={{ padding: '1rem', textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                          <button onClick={() => { setEditingRoom(room); setShowEditRoomModal(true); }} className="btn-icon" style={{ color: 'var(--primary)' }}><Pencil size={16} /></button>
                          <button onClick={() => handleDeleteRoom(room.room_id)} className="btn-icon" style={{ color: 'var(--danger)' }}><Trash2 size={16} /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'beds' && (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)', textAlign: 'left' }}>
                  <th style={{ padding: '1rem' }}>Bed ID</th>
                  <th style={{ padding: '1rem' }}>Room</th>
                  <th style={{ padding: '1rem' }}>Monthly Rent</th>
                  <th style={{ padding: '1rem' }}>Status</th>
                  <th style={{ padding: '1rem', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredBeds.map(bed => (
                  <tr key={bed.bed_id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '1rem', fontWeight: 600 }}>{bed.bed_number}</td>
                    <td style={{ padding: '1rem' }}>Room {bed.room_number}</td>
                    <td style={{ padding: '1rem' }}>₹{bed.bed_cost?.toLocaleString()}</td>
                    <td style={{ padding: '1rem' }}>
                      <span style={{ 
                        padding: '4px 12px', borderRadius: '1rem', fontSize: '0.75rem', fontWeight: 700,
                        background: bed.status === 'Occupied' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                        color: bed.status === 'Occupied' ? '#ef4444' : '#10b981'
                      }}>{bed.status}</span>
                    </td>
                    <td style={{ padding: '1rem', textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                        <button onClick={() => { setEditingBed(bed); setShowEditBedModal(true); }} className="btn-icon" style={{ color: 'var(--primary)' }}><Pencil size={16} /></button>
                        <button onClick={() => handleDeleteBed(bed.bed_id)} className="btn-icon" style={{ color: 'var(--danger)' }}><Trash2 size={16} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

      </div>

      {/* Modals */}
      {showRoomModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>Add New Room</h2>
            <form onSubmit={handleAddRoom} style={{ marginTop: '1.5rem' }}>
              <div className="form-group">
                <label>Room Number / Range</label>
                <input type="text" required placeholder="e.g. 101-105 or 201, 203" onChange={e => setNewRoom({...newRoom, room_number: e.target.value})} />
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.4rem' }}>Enter a single number, a list (101, 102), or a range (101-110).</p>
              </div>
              <div className="form-group">
                <label>Floor</label>
                <select required onChange={e => setNewRoom({...newRoom, floor_id: e.target.value})}>
                  <option value="">Select Floor</option>
                  {floors.map(f => <option key={f.floor_id} value={f.floor_id}>{f.floor_name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Sharing Capacity</label>
                <input type="number" required onChange={e => setNewRoom({...newRoom, sharing_capacity: e.target.value})} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '2rem' }}>
                <button type="button" className="btn" onClick={() => setShowRoomModal(false)} style={{ background: 'transparent' }}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Room</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showBedModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>Add New Bed</h2>
            {bedError && <div style={{ color: 'var(--danger)', padding: '0.75rem', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '0.5rem', marginBottom: '1rem' }}>{bedError}</div>}
            <form onSubmit={handleAddBed}>
              <div className="form-group">
                <label>Room</label>
                <select required onChange={e => setNewBed({...newBed, room_id: e.target.value})}>
                  <option value="">Select Room</option>
                  {rooms.map(r => <option key={r.room_id} value={r.room_id}>Room {r.room_number}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Bed Number / Range / Count</label>
                <input type="text" required placeholder="e.g. A-D or 1, 2 or simply 6" onChange={e => setNewBed({...newBed, bed_number: e.target.value})} />
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.4rem' }}>Enter a count (e.g. 6), a list (A, B), or a range (A-D or 1-6).</p>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label>Monthly Cost</label>
                  <input type="number" required onChange={e => setNewBed({...newBed, bed_cost: e.target.value})} />
                </div>
                <div className="form-group">
                  <label>Advance Amount</label>
                  <input type="number" required onChange={e => setNewBed({...newBed, advance_amount: e.target.value})} />
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem' }}>
                <button type="button" className="btn" onClick={() => setShowBedModal(false)} style={{ background: 'transparent' }}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Bed</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showFloorModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>Add New Floor</h2>
            <form onSubmit={handleAddFloor} style={{ marginTop: '1.5rem' }}>
              <div className="form-group">
                <label>Floor Name(s)</label>
                <input type="text" required placeholder="e.g. 1st Floor, 2nd Floor" onChange={e => setNewFloor({...newFloor, floor_name: e.target.value})} />
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.4rem' }}>Enter multiple floors separated by commas.</p>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '2rem' }}>
                <button type="button" className="btn" onClick={() => setShowFloorModal(false)} style={{ background: 'transparent' }}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Floor</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showEditFloorModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>Edit Floor</h2>
            <form onSubmit={handleEditFloor} style={{ marginTop: '1.5rem' }}>
              <div className="form-group">
                <label>Floor Name</label>
                <input 
                  type="text" 
                  required 
                  value={editingFloor?.floor_name || ''} 
                  onChange={e => setEditingFloor({...editingFloor, floor_name: e.target.value})} 
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '2rem' }}>
                <button type="button" className="btn" onClick={() => setShowEditFloorModal(false)} style={{ background: 'transparent' }}>Cancel</button>
                <button type="submit" className="btn btn-primary">Update Floor</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showEditRoomModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>Edit Room</h2>
            <form onSubmit={handleEditRoom} style={{ marginTop: '1.5rem' }}>
              <div className="form-group">
                <label>Room Number</label>
                <input 
                  type="text" 
                  required 
                  value={editingRoom?.room_number || ''} 
                  onChange={e => setEditingRoom({...editingRoom, room_number: e.target.value})} 
                />
              </div>
              <div className="form-group">
                <label>Floor</label>
                <select 
                  required 
                  value={editingRoom?.floor_id || ''} 
                  onChange={e => setEditingRoom({...editingRoom, floor_id: e.target.value})}
                >
                  <option value="">Select Floor</option>
                  {floors.map(f => <option key={f.floor_id} value={f.floor_id}>{f.floor_name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Sharing Capacity</label>
                <input 
                  type="number" 
                  required 
                  value={editingRoom?.sharing_capacity || ''} 
                  onChange={e => setEditingRoom({...editingRoom, sharing_capacity: e.target.value})} 
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '2rem' }}>
                <button type="button" className="btn" onClick={() => setShowEditRoomModal(false)} style={{ background: 'transparent' }}>Cancel</button>
                <button type="submit" className="btn btn-primary">Update Room</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showEditBedModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>Edit Bed Details</h2>
            <form onSubmit={handleEditBed} style={{ marginTop: '1.5rem' }}>
              <div className="form-group">
                <label>Bed Number / Label</label>
                <input 
                  type="text" 
                  required 
                  value={editingBed?.bed_number || ''} 
                  onChange={e => setEditingBed({...editingBed, bed_number: e.target.value})} 
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label>Monthly Rent (₹)</label>
                  <input 
                    type="number" 
                    required 
                    value={editingBed?.bed_cost || 0} 
                    onChange={e => setEditingBed({...editingBed, bed_cost: e.target.value})} 
                  />
                </div>
                <div className="form-group">
                  <label>Advance Dep. (₹)</label>
                  <input 
                    type="number" 
                    required 
                    value={editingBed?.advance_amount || 0} 
                    onChange={e => setEditingBed({...editingBed, advance_amount: e.target.value})} 
                  />
                </div>
              </div>
              <div className="form-group">
                <label>Status</label>
                <select 
                  value={editingBed?.status || 'Vacant'} 
                  onChange={e => setEditingBed({...editingBed, status: e.target.value})}
                >
                  <option value="Vacant">Vacant</option>
                  <option value="Occupied">Occupied</option>
                  <option value="Maintenance">Maintenance</option>
                </select>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '2rem' }}>
                <button type="button" className="btn" onClick={() => setShowEditBedModal(false)} style={{ background: 'transparent' }}>Cancel</button>
                <button type="submit" className="btn btn-primary">Update Bed</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showTenantModal && (
        <div className="modal-overlay" style={{ zIndex: 1100 }}>
          <div className="modal-content" style={{ textAlign: 'center', maxWidth: '420px', padding: '0' }}>
            {/* Header / Banner */}
            <div style={{ 
              height: '100px', 
              background: 'linear-gradient(135deg, var(--primary), #6366f1)', 
              borderRadius: '1.5rem 1.5rem 0 0',
              position: 'relative',
              marginBottom: '3rem'
            }}>
              <div style={{ 
                position: 'absolute', bottom: '-40px', left: '50%', transform: 'translateX(-50%)',
                width: '80px', height: '80px', borderRadius: '20px', border: '4px solid #1e293b',
                background: '#1e293b', overflow: 'hidden', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.3)'
              }}>
                {editingBed?.tenant_photo ? (
                  <img src={editingBed.tenant_photo} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.05)', color: 'var(--primary)' }}>
                    <Users size={40} />
                  </div>
                )}
              </div>
            </div>

            <div style={{ padding: '0 2rem 2rem' }}>
              <h2 style={{ marginBottom: '0.25rem', fontSize: '1.5rem' }}>{editingBed?.tenant_name || 'N/A'}</h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>{editingBed?.tenant_mobile || 'N/A'}</p>

              <div style={{ 
                display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', 
                background: 'rgba(0,0,0,0.2)', padding: '1.5rem', borderRadius: '1.25rem', textAlign: 'left',
                border: '1px solid rgba(255,255,255,0.05)'
              }}>
                <div>
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 800, textTransform: 'uppercase', marginBottom: '0.3rem' }}>Bed & Room</div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 700 }}>{editingBed?.bed_number} (Room {editingBed?.room_number})</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 800, textTransform: 'uppercase', marginBottom: '0.3rem' }}>Joined Date</div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 700 }}>{editingBed?.tenant_joining_date ? new Date(editingBed.tenant_joining_date).toLocaleDateString() : 'N/A'}</div>
                </div>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '2rem' }}>
                <button 
                  className="btn btn-primary" 
                  style={{ width: '100%', padding: '0.8rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                  onClick={() => navigate('/tenants', { state: { searchName: editingBed.tenant_name } })}
                >
                  <Users size={18} /> View Full Profile
                </button>
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <button className="btn" style={{ flex: 1, background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)' }} onClick={() => { setShowTenantModal(false); setShowEditBedModal(true); }}>
                    Edit Bed
                  </button>
                  <button className="btn" style={{ flex: 1, background: 'transparent' }} onClick={() => setShowTenantModal(false)}>
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{ __html: `
        .btn-icon {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 8px;
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s;
        }
        .btn-icon:hover {
          background: rgba(255, 255, 255, 0.1);
          transform: translateY(-1px);
        }
        .modal-overlay {
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(15, 23, 42, 0.7);
          backdrop-filter: blur(8px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }
        .modal-content {
          background: #1e293b;
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 1.5rem;
          padding: 2rem;
          width: 100%;
          max-width: 500px;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
        }
        th { font-size: 0.85rem; text-transform: uppercase; letter-spacing: 0.05em; font-weight: 700; border-bottom: 2px solid var(--border) !important; color: var(--text-muted); }
        td { font-size: 0.95rem; }
      ` }} />
    </div>
  );
};

export default Rooms;
