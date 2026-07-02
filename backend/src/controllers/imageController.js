const path = require('path');
const fs = require('fs');
const supabase = require('../utils/supabaseClient');

const serveImage = async (req, res, type) => {
    const { id } = req.params;
    
    try {
        const { data, error } = await supabase
            .from('face_events')
            .select('face_image, frame_image')
            .eq('id', id)
            .single();
            
        if (error || !data) {
            return res.status(404).json({ error: 'Event not found' });
        }
        
        const relativePath = type === 'face' ? data.face_image : data.frame_image;
        if (!relativePath) {
            return res.status(404).json({ error: 'Image path not found in event' });
        }
        
        // Assuming AI service runs on same machine and uploads are in sibling folder
        // For production, this path resolution depends on deployment setup.
        const absolutePath = path.resolve(__dirname, '../../../../ai-service/uploads', relativePath);
        
        if (!fs.existsSync(absolutePath)) {
            return res.status(404).json({ error: 'Image file not found on disk' });
        }
        
        res.sendFile(absolutePath);
    } catch (err) {
        console.error('Error serving image:', err);
        res.status(500).json({ error: 'Server error' });
    }
};

const getFaceImage = (req, res) => serveImage(req, res, 'face');
const getFrameImage = (req, res) => serveImage(req, res, 'frame');

module.exports = {
    getFaceImage,
    getFrameImage
};
