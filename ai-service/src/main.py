import os
import time
import json
import threading
import requests
import numpy as np
from stream_reader import StreamReader
from face_processor import FaceProcessor
from api_client import post_recognized_face, post_unknown_face, API_URL
from utils import save_image
from server import run_server, reload_flag

# Cache to avoid duplicate events within 30 seconds
# { "tenant_uuid": timestamp, "unknown_signature": timestamp }
recent_events_cache = {}
CACHE_TIMEOUT = 30

def cleanup_cache():
    current_time = time.time()
    expired_keys = [k for k, v in recent_events_cache.items() if current_time - v > CACHE_TIMEOUT]
    for k in expired_keys:
        del recent_events_cache[k]

def fetch_embeddings():
    """Fetch known embeddings from the Node.js backend"""
    try:
        response = requests.get(f"{API_URL}/face/embeddings")
        if response.status_code == 200:
            data = response.json()
            db_embeddings = []
            for row in data:
                try:
                    # embedding comes as a JSON string or list from DB
                    emb_list = json.loads(row['embedding']) if isinstance(row['embedding'], str) else row['embedding']
                    db_embeddings.append({
                        'tenant_id': row['tenant_id'],
                        'embedding': np.array(emb_list)
                    })
                except Exception as e:
                    print(f"Error parsing embedding for tenant {row.get('tenant_id')}: {e}")
            return db_embeddings
    except Exception as e:
        print(f"Error fetching embeddings from backend: {e}")
    return []

def main():
    # Start the API server in a background thread
    server_thread = threading.Thread(target=run_server, args=(8000,), daemon=True)
    server_thread.start()
    
    camera_id = os.environ.get('CAMERA_ID', 'test-camera-1')
    rtsp_url = os.environ.get('RTSP_URL', 'rtsp://localhost:8554/stream')
    
    print(f"Starting AI Service for camera {camera_id}")
    
    stream = StreamReader(camera_id, rtsp_url, fps_limit=1)
    processor = FaceProcessor()
    
    db_embeddings = fetch_embeddings()
    print(f"Loaded {len(db_embeddings)} known faces from database.")
    
    for frame in stream.read_frames():
        # Check if we need to reload embeddings
        if reload_flag.is_set():
            print("Reload flag set. Fetching latest embeddings...")
            db_embeddings = fetch_embeddings()
            print(f"Reloaded {len(db_embeddings)} known faces from database.")
            reload_flag.clear()
            
        cleanup_cache()
        faces = processor.process_frame(frame)
        
        for face in faces:
            embedding = face['embedding']
            tenant_id, confidence = processor.compare_embedding(embedding, db_embeddings, threshold=0.6)
            
            if tenant_id:
                # Known Tenant
                if tenant_id not in recent_events_cache:
                    print(f"Detected known tenant {tenant_id} ({confidence})")
                    post_recognized_face(tenant_id, confidence, camera_id)
                    recent_events_cache[tenant_id] = time.time()
            else:
                # Unknown Person
                unknown_key = 'unknown_recent'
                if unknown_key not in recent_events_cache:
                    print("Detected unknown person!")
                    
                    # Save images
                    face_path = save_image('unknown_face', 'face', face['cropped_img'])
                    frame_path = save_image('unknown_frame', 'frame', frame)
                    
                    # Call API
                    post_unknown_face(camera_id, 0.0, face_path, frame_path)
                    
                    recent_events_cache[unknown_key] = time.time()

if __name__ == "__main__":
    main()
