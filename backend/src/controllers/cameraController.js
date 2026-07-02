const supabase = require('../utils/supabaseClient');

// Get all cameras
const getCameras = async (req, res) => {
    try {
        const { data, error } = await supabase.from('cameras').select('*');
        if (error) throw error;
        res.status(200).json(data);
    } catch (err) {
        console.error('Error fetching cameras:', err);
        res.status(500).json({ error: 'Failed to fetch cameras' });
    }
};

// Add a camera
const addCamera = async (req, res) => {
    const { name, location, rtsp_url } = req.body;
    try {
        const { data, error } = await supabase
            .from('cameras')
            .insert([{ name, location, rtsp_url, status: 'offline' }])
            .select();
        
        if (error) throw error;
        res.status(201).json(data[0]);
    } catch (err) {
        console.error('Error adding camera:', err);
        res.status(500).json({ error: 'Failed to add camera' });
    }
};

// Edit a camera
const updateCamera = async (req, res) => {
    const { id } = req.params;
    const { name, location, rtsp_url, status } = req.body;
    try {
        const { data, error } = await supabase
            .from('cameras')
            .update({ name, location, rtsp_url, status })
            .eq('id', id)
            .select();
            
        if (error) throw error;
        if (data.length === 0) {
            return res.status(404).json({ error: 'Camera not found' });
        }
        res.status(200).json(data[0]);
    } catch (err) {
        console.error('Error updating camera:', err);
        res.status(500).json({ error: 'Failed to update camera' });
    }
};

// Delete a camera
const deleteCamera = async (req, res) => {
    const { id } = req.params;
    try {
        const { error } = await supabase
            .from('cameras')
            .delete()
            .eq('id', id);
            
        if (error) throw error;
        res.status(200).json({ message: 'Camera deleted successfully' });
    } catch (err) {
        console.error('Error deleting camera:', err);
        res.status(500).json({ error: 'Failed to delete camera' });
    }
};

module.exports = {
    getCameras,
    addCamera,
    updateCamera,
    deleteCamera
};
