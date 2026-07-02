import requests
import os
from datetime import datetime

API_URL = os.environ.get("NODE_API_URL", "http://localhost:3000/api")

def post_recognized_face(tenant_id, confidence, camera_id):
    """
    Send recognized tenant event to Node.js backend.
    """
    payload = {
        "tenantId": tenant_id,
        "confidence": confidence,
        "cameraId": camera_id,
        "timestamp": datetime.utcnow().isoformat() + "Z"
    }
    try:
        response = requests.post(f"{API_URL}/face/recognized", json=payload)
        return response.json()
    except Exception as e:
        print(f"Error posting recognized face: {e}")
        return None

def post_unknown_face(camera_id, confidence, face_image_path, frame_image_path):
    """
    Send unknown visitor event to Node.js backend.
    """
    payload = {
        "cameraId": camera_id,
        "confidence": confidence,
        "faceImage": face_image_path,
        "frameImage": frame_image_path,
        "timestamp": datetime.utcnow().isoformat() + "Z"
    }
    try:
        response = requests.post(f"{API_URL}/face/unknown", json=payload)
        return response.status_code == 201
    except Exception as e:
        print(f"Error posting unknown face: {e}")
        return False
