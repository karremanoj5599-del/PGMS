import os
import cv2
from datetime import datetime

UPLOAD_BASE = os.path.join(os.path.dirname(__file__), '../uploads')

def get_daily_path(category):
    """
    Returns a path like uploads/unknown/2026/06/26
    """
    now = datetime.now()
    path = os.path.join(UPLOAD_BASE, category, now.strftime('%Y'), now.strftime('%m'), now.strftime('%d'))
    os.makedirs(path, exist_ok=True)
    return path

def save_image(category, image_prefix, image_data):
    """
    Saves an image and returns the relative path from the uploads directory.
    """
    now = datetime.now()
    path_dir = get_daily_path(category)
    filename = f"{image_prefix}_{now.strftime('%H%M%S')}.jpg"
    full_path = os.path.join(path_dir, filename)
    
    cv2.imwrite(full_path, image_data)
    
    # Return relative path for database storage
    rel_dir = os.path.join(category, now.strftime('%Y'), now.strftime('%m'), now.strftime('%d'))
    return os.path.join(rel_dir, filename).replace('\\', '/')
