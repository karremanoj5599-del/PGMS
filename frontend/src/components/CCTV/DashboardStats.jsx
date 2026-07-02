import React from 'react';

const DashboardStats = ({ stats }) => {
  return (
    <div className="cctv-stats-grid">
      <div className="cctv-stat-card">
        <div className="cctv-icon-container blue">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>
        </div>
        <div className="cctv-stat-info">
          <p>Known Today</p>
          <p>{stats?.known || 0}</p>
        </div>
      </div>

      <div className="cctv-stat-card">
        <div className="cctv-icon-container red">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
        </div>
        <div className="cctv-stat-info">
          <p>Unknown Today</p>
          <p>{stats?.unknown || 0}</p>
        </div>
      </div>

      <div className="cctv-stat-card">
        <div className="cctv-icon-container yellow">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
        </div>
        <div className="cctv-stat-info">
          <p>Rent Expired</p>
          <p>{stats?.rent_expired || 0}</p>
        </div>
      </div>

      <div className="cctv-stat-card">
        <div className="cctv-icon-container green">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg>
        </div>
        <div className="cctv-stat-info">
          <p>Cameras Online</p>
          <p>{stats?.cameras_online || 0} / {stats?.total_cameras || 0}</p>
        </div>
      </div>
    </div>
  );
};

export default DashboardStats;
