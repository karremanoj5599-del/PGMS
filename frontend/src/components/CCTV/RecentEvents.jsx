import React from 'react';

const RecentEvents = ({ events = [] }) => {
  const getEventBadge = (type) => {
    switch (type) {
      case 'KNOWN':
        return <span className="cctv-badge known">Known</span>;
      case 'UNKNOWN':
        return <span className="cctv-badge unknown">Unknown</span>;
      case 'RENT_EXPIRED':
        return <span className="cctv-badge expired">Rent Expired</span>;
      default:
        return <span className="cctv-badge">{type}</span>;
    }
  };

  return (
    <div className="cctv-recent-events">
      <div className="cctv-recent-header">
        <h3 className="cctv-recent-title">Recent Face Events</h3>
        <button className="cctv-recent-view-all">View All</button>
      </div>
      <div className="cctv-recent-table-wrapper">
        <table className="cctv-recent-table">
          <thead>
            <tr>
              <th scope="col">Time</th>
              <th scope="col">Camera</th>
              <th scope="col">Event Type</th>
              <th scope="col">Tenant / Details</th>
              <th scope="col">Confidence</th>
            </tr>
          </thead>
          <tbody>
            {events.length === 0 ? (
              <tr>
                <td colSpan="5" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                  No recent events found.
                </td>
              </tr>
            ) : (
              events.map((event) => (
                <tr key={event.id}>
                  <td>
                    {new Date(event.created_at).toLocaleString()}
                  </td>
                  <td style={{ fontWeight: 600 }}>
                    {event.camera_name || 'Front Gate'}
                  </td>
                  <td>
                    {getEventBadge(event.event_type)}
                  </td>
                  <td>
                    {event.tenant_name || 'N/A'}
                  </td>
                  <td>
                    {event.confidence ? `${(event.confidence * 100).toFixed(1)}%` : '-'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default RecentEvents;
