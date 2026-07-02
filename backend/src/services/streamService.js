const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const activeStreams = new Map();

// Helper to ensure HLS output directory exists
const ensureHlsDir = (cameraId) => {
    const dir = path.join(__dirname, '../../public/hls', cameraId);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
    return dir;
};

const startStream = (cameraId, rtspUrl) => {
    if (activeStreams.has(cameraId)) {
        console.log(`Stream for camera ${cameraId} is already running.`);
        return;
    }

    const outputDir = ensureHlsDir(cameraId);
    const outputPath = path.join(outputDir, 'index.m3u8');

    // FFmpeg arguments for RTSP to HLS conversion
    const args = [
        '-i', rtspUrl,
        '-fflags', 'nobuffer',
        '-flags', 'low_delay',
        '-c:v', 'copy', // Copy video codec if supported, otherwise libx264
        '-f', 'hls',
        '-hls_time', '2',
        '-hls_list_size', '3',
        '-hls_flags', 'delete_segments',
        outputPath
    ];

    console.log(`Starting FFmpeg stream for camera ${cameraId}`);
    const ffmpeg = spawn('ffmpeg', args);

    ffmpeg.stderr.on('data', (data) => {
        // FFmpeg writes to stderr by default
        // console.log(`FFmpeg [${cameraId}]: ${data}`);
    });

    ffmpeg.on('close', (code) => {
        console.log(`FFmpeg stream for camera ${cameraId} exited with code ${code}`);
        activeStreams.delete(cameraId);
    });

    activeStreams.set(cameraId, ffmpeg);
};

const stopStream = (cameraId) => {
    const ffmpeg = activeStreams.get(cameraId);
    if (ffmpeg) {
        console.log(`Stopping FFmpeg stream for camera ${cameraId}`);
        ffmpeg.kill('SIGKILL');
        activeStreams.delete(cameraId);
    }
};

module.exports = {
    startStream,
    stopStream
};
