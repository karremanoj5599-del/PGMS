import React from 'react';
import api from '../../services/api';

const UnknownGallery = ({ visitors = [] }) => {

  const handleReview = async (id, status) => {
    try {
      await api.patch(`/api/face/unknown/${id}`, { review_status: status });
    } catch (err) {
      console.error('Failed to update review status', err);
    }
  };

  if (visitors.length === 0) {
    return (
      <div style={{ color: 'var(--text-muted)' }}>
        No unknown visitors today.
      </div>
    );
  }

  return (
    <div className="cctv-gallery-grid">
      {visitors.map((visitor) => (
        <div key={visitor.id} className="cctv-gallery-card">
          <div className="cctv-gallery-img-wrapper">
            {visitor.face_events?.face_image ? (
              <img 
                src={`http://localhost:5000/api/images/${visitor.face_events.face_image}`}
                alt="Unknown face"
                className="cctv-gallery-img"
                onError={(e) => { e.target.src = 'https://via.placeholder.com/150?text=No+Image'; }}
              />
            ) : (
              <div className="cctv-gallery-no-img">No Image Available</div>
            )}
          </div>
          <div className="cctv-gallery-content">
            <div className="cctv-gallery-info">
              <p>Camera: <span>{visitor.face_events?.cameras?.name || 'Unknown'}</span></p>
              <p>Time: <span>{new Date(visitor.face_events?.created_at).toLocaleTimeString()}</span></p>
            </div>
            <div className="cctv-gallery-actions">
              <button 
                onClick={() => handleReview(visitor.id, 'IGNORED')}
                className="cctv-gallery-btn"
              >
                Ignore
              </button>
              <button 
                onClick={async () => {
                  const tenantId = window.prompt("Enter Tenant ID to assign this face to:");
                  if (tenantId) {
                    try {
                      await api.post('/api/face/assign-unknown', {
                        eventId: visitor.event_id,
                        tenantId: parseInt(tenantId, 10)
                      });
                      alert("Face assigned successfully!");
                      handleReview(visitor.id, 'ASSIGNED');
                    } catch (err) {
                      alert("Failed to assign face");
                    }
                  }
                }}
                className="cctv-gallery-btn"
              >
                Assign to Tenant
              </button>
              <button 
                onClick={() => handleReview(visitor.id, 'FLAGGED')}
                className="cctv-gallery-btn primary"
              >
                Flag Alert
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default UnknownGallery;
