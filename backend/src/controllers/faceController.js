const supabase = require('../utils/supabaseClient');

// Helper to determine rent status (Mock logic, integrate with your actual tenants model)
const getTenantRentStatus = async (tenantId) => {
    // This assumes there's a 'tenants' table with 'rent_status'
    // For this implementation, we query it.
    try {
        const { data, error } = await supabase
            .from('tenants')
            .select('rent_status')
            .eq('id', tenantId)
            .single();
            
        if (error || !data) return 'UNKNOWN';
        return data.rent_status; // e.g., 'ACTIVE', 'EXPIRED'
    } catch (e) {
        return 'UNKNOWN';
    }
};

const handleRecognizedFace = async (req, res) => {
    const { tenantId, confidence, cameraId, timestamp } = req.body;
    
    try {
        const rentStatus = await getTenantRentStatus(tenantId);
        
        let eventType = 'KNOWN';
        let action = 'IGNORE';
        
        if (rentStatus === 'EXPIRED') {
            eventType = 'RENT_EXPIRED';
            action = 'NOTIFY';
            // Here you would trigger push notifications or SMS to admin
        }
        
        // Save event to DB
        await supabase.from('face_events').insert([{
            camera_id: cameraId,
            tenant_id: tenantId,
            event_type: eventType,
            confidence: confidence,
            created_at: timestamp || new Date().toISOString()
        }]);
        
        res.status(200).json({ action });
    } catch (err) {
        console.error('Error handling recognized face:', err);
        res.status(500).json({ error: 'Server error' });
    }
};

const handleUnknownFace = async (req, res) => {
    const { cameraId, confidence, faceImage, frameImage, timestamp } = req.body;
    
    try {
        // 1. Insert face event
        const { data: eventData, error: eventError } = await supabase
            .from('face_events')
            .insert([{
                camera_id: cameraId,
                event_type: 'UNKNOWN',
                confidence: confidence,
                face_image: faceImage,
                frame_image: frameImage,
                created_at: timestamp || new Date().toISOString()
            }])
            .select();
            
        if (eventError) throw eventError;
        
        const eventId = eventData[0].id;
        
        // 2. Insert into unknown_visitors for review
        await supabase.from('unknown_visitors').insert([{
            event_id: eventId,
            review_status: 'PENDING'
        }]);
        
        // 3. Trigger Notification (e.g. Firebase, Socket.io) here
        
        res.status(201).json({ message: 'Event recorded successfully' });
    } catch (err) {
        console.error('Error handling unknown face:', err);
        res.status(500).json({ error: 'Server error' });
    }
};

const getStats = async (req, res) => {
    try {
        const today = new Date();
        today.setHours(0,0,0,0);
        
        const { count: known } = await supabase.from('face_events').select('*', { count: 'exact', head: true }).eq('event_type', 'KNOWN').gte('created_at', today.toISOString());
        const { count: unknown } = await supabase.from('face_events').select('*', { count: 'exact', head: true }).eq('event_type', 'UNKNOWN').gte('created_at', today.toISOString());
        const { count: rentExpired } = await supabase.from('face_events').select('*', { count: 'exact', head: true }).eq('event_type', 'RENT_EXPIRED').gte('created_at', today.toISOString());
        
        const { count: camerasOnline } = await supabase.from('cameras').select('*', { count: 'exact', head: true }).eq('status', 'online');
        const { count: totalCameras } = await supabase.from('cameras').select('*', { count: 'exact', head: true });

        res.json({
            known: known || 0,
            unknown: unknown || 0,
            rent_expired: rentExpired || 0,
            cameras_online: camerasOnline || 0,
            total_cameras: totalCameras || 0
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
};

const getEvents = async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('face_events')
            .select('*, cameras(name)')
            .order('created_at', { ascending: false })
            .limit(10);
            
        if (error) throw error;
        res.json(data);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
};

const getUnknown = async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('unknown_visitors')
            .select('*, face_events(*, cameras(name))')
            .eq('review_status', 'PENDING');
            
        if (error) throw error;
        
        // Sort in JS since unknown_visitors table lacks created_at
        const sortedData = (data || []).sort((a, b) => {
            const timeA = new Date(a.face_events?.created_at || 0).getTime();
            const timeB = new Date(b.face_events?.created_at || 0).getTime();
            return timeB - timeA;
        });
        
        res.json(sortedData);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
};

const getEmbeddings = async (req, res) => {
    const db = require('../config/database');
    try {
        const embeddings = await db('face_embeddings').select('*');
        res.json(embeddings);
    } catch (err) {
        console.error('Error fetching face embeddings:', err);
        res.status(500).json({ error: 'Server error' });
    }
};

const assignUnknown = async (req, res) => {
    const db = require('../config/database');
    const { eventId, tenantId } = req.body;
    
    try {
        // 1. Get the face image from the unknown event
        const { data: eventData, error: eventError } = await supabase
            .from('face_events')
            .select('face_image')
            .eq('id', eventId)
            .single();
            
        if (eventError || !eventData) {
            return res.status(404).json({ error: 'Event not found' });
        }
        
        // 2. Call Python AI Service to get embedding for this image
        const axios = require('axios');
        let embedding = null;
        try {
            // Assuming Python AI service is running on 8000
            const aiResponse = await axios.post('http://localhost:8000/generate-embedding-from-url', {
                imageUrl: eventData.face_image
            });
            embedding = aiResponse.data.embedding;
        } catch (aiErr) {
            console.error('Failed to generate embedding from AI service:', aiErr.message);
            return res.status(500).json({ error: 'Failed to generate face embedding' });
        }
        
        // 3. Store the embedding
        await db('face_embeddings').insert({
            tenant_id: tenantId,
            embedding: JSON.stringify(embedding)
        });
        
        // 4. Update unknown_visitors status
        await supabase
            .from('unknown_visitors')
            .update({ review_status: 'ASSIGNED' })
            .eq('event_id', eventId);
            
        // 5. Push update flag to AI service
        try {
            await axios.post('http://localhost:8000/reload-embeddings');
        } catch (e) {
            console.error('Failed to trigger AI service reload:', e.message);
        }
            
        res.json({ success: true, message: 'Face assigned to tenant successfully' });
    } catch (err) {
        console.error('Error assigning unknown face:', err);
        res.status(500).json({ error: 'Server error' });
    }
};

module.exports = {
    handleRecognizedFace,
    handleUnknownFace,
    getStats,
    getEvents,
    getUnknown,
    getEmbeddings,
    assignUnknown
};
