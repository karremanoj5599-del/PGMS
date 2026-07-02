import React, { useState, useEffect } from 'react';
import api from '../services/api';
import DashboardStats from '../components/CCTV/DashboardStats';
import LiveView from '../components/CCTV/LiveView';
import RecentEvents from '../components/CCTV/RecentEvents';
import UnknownGallery from '../components/CCTV/UnknownGallery';
import './CCTVDashboard.css';

const CCTVDashboard = () => {
  const [stats, setStats] = useState({ known: 0, unknown: 0, rent_expired: 0, cameras_online: 0, total_cameras: 0 });
  const [events, setEvents] = useState([]);
  const [unknownVisitors, setUnknownVisitors] = useState([]);
  const [cameras, setCameras] = useState([]);
  const [selectedCamera, setSelectedCamera] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAddCamera, setShowAddCamera] = useState(false);
  const [newCamera, setNewCamera] = useState({ name: '', location: '', rtsp_url: '' });

  useEffect(() => {
    fetchCCTVData();
  }, []);

  const fetchCCTVData = async () => {
    try {
      setLoading(true);
      const statsRes = await api.get('/api/face/stats');
      setStats(statsRes.data);
      
      const eventsRes = await api.get('/api/face/events?limit=10');
      setEvents(eventsRes.data);

      const visitorsRes = await api.get('/api/face/unknown');
      setUnknownVisitors(visitorsRes.data);

      const camerasRes = await api.get('/api/cameras');
      setCameras(camerasRes.data);
      if (camerasRes.data.length > 0) {
        setSelectedCamera(camerasRes.data[0].id);
      }
    } catch (error) {
      console.error('Error fetching CCTV data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddCamera = async (e) => {
    e.preventDefault();
    try {
      await api.post('/api/cameras', newCamera);
      setShowAddCamera(false);
      setNewCamera({ name: '', location: '', rtsp_url: '' });
      fetchCCTVData();
    } catch (error) {
      console.error('Error adding camera:', error);
      alert('Failed to add camera');
    }
  };

  if (loading) {
    return (
      <div className="cctv-loader-wrapper">
        <div className="cctv-loader"></div>
      </div>
    );
  }

  return (
    <div className="cctv-dashboard">
      <div className="cctv-header">
        <h1>CCTV & AI Security</h1>
        <button 
          onClick={() => setShowAddCamera(true)}
          className="cctv-add-btn"
        >
          Add Camera
        </button>
      </div>

      <DashboardStats stats={stats} />

      <div className="cctv-main-grid">
        <div>
          <div className="cctv-camera-select-wrapper">
            <select 
              className="cctv-camera-select"
              value={selectedCamera || ''}
              onChange={(e) => setSelectedCamera(e.target.value)}
            >
              {cameras.map(cam => (
                <option key={cam.id} value={cam.id}>{cam.name} ({cam.location})</option>
              ))}
              {cameras.length === 0 && <option value="">No cameras available</option>}
            </select>
          </div>
          {selectedCamera ? (
            <LiveView cameraId={selectedCamera} />
          ) : (
            <div className="cctv-no-camera">
              No Camera Selected
            </div>
          )}
        </div>
        
        <div>
          <RecentEvents events={events} />
        </div>
      </div>

      <div>
        <h2 className="cctv-section-title">Action Required: Unknown Visitors</h2>
        <UnknownGallery visitors={unknownVisitors} />
      </div>

      {showAddCamera && (
        <div className="cctv-modal-overlay">
          <div className="cctv-modal">
            <div className="cctv-modal-header">
              <h3>Add New Camera</h3>
              <button onClick={() => setShowAddCamera(false)} className="cctv-modal-close">&times;</button>
            </div>
            <form onSubmit={handleAddCamera}>
              <div className="cctv-form-group">
                <label>Camera Name</label>
                <input 
                  type="text" required 
                  value={newCamera.name} onChange={e => setNewCamera({...newCamera, name: e.target.value})}
                />
              </div>
              <div className="cctv-form-group">
                <label>Location</label>
                <input 
                  type="text" required 
                  value={newCamera.location} onChange={e => setNewCamera({...newCamera, location: e.target.value})}
                />
              </div>
              <div className="cctv-form-group">
                <label>RTSP URL</label>
                <input 
                  type="text" required placeholder="rtsp://admin:pass@192.168.1.10:554/stream"
                  value={newCamera.rtsp_url} onChange={e => setNewCamera({...newCamera, rtsp_url: e.target.value})}
                />
              </div>
              <div className="cctv-modal-actions">
                <button type="button" onClick={() => setShowAddCamera(false)} className="cctv-gallery-btn">Cancel</button>
                <button type="submit" className="cctv-gallery-btn primary">Save Camera</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CCTVDashboard;
