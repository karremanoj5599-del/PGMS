import React, { useEffect, useRef, useState } from 'react';
import ReactPlayer from 'react-player';

const LiveView = ({ cameraId }) => {
  const [streamUrl, setStreamUrl] = useState('');
  const [isError, setIsError] = useState(false);

  useEffect(() => {
    // In production, the backend FFmpeg converts RTSP to HLS and serves the .m3u8 file
    // The url would look something like /hls/{cameraId}/index.m3u8
    setStreamUrl(`http://localhost:3000/hls/${cameraId}/index.m3u8`);
  }, [cameraId]);

  return (
    <div className="cctv-live-view">
      <div className="cctv-live-header">
        <h3 className="cctv-live-title">Live Camera Feed</h3>
        <div className="cctv-live-indicator">
          <div className="cctv-dot-wrapper">
            <div className="cctv-dot-pulse"></div>
            <div className="cctv-dot-solid"></div>
          </div>
          <span className="cctv-live-text">LIVE</span>
        </div>
      </div>
      <div className="cctv-video-container">
        {streamUrl && !isError ? (
          <ReactPlayer
            url={streamUrl}
            playing={true}
            muted={true}
            width="100%"
            height="100%"
            controls={true}
            onError={() => setIsError(true)}
            config={{
              file: {
                forceHLS: true,
              }
            }}
          />
        ) : (
          <div className="cctv-loading-text">
            {isError ? 'Stream offline or initializing...' : 'Loading stream...'}
          </div>
        )}
      </div>
      <div className="cctv-live-actions">
        <button className="cctv-action-btn">
          Snapshot
        </button>
        <button className="cctv-action-btn primary">
          Full Screen
        </button>
      </div>
    </div>
  );
};

export default LiveView;
