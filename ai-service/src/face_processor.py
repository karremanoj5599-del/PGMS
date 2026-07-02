import cv2
import numpy as np

class FaceProcessor:
    def __init__(self):
        # Placeholder for InsightFace initialization
        # In a real setup, we would initialize the FaceAnalysis app from insightface
        # app = FaceAnalysis(name='buffalo_l', providers=['CPUExecutionProvider'])
        # app.prepare(ctx_id=0, det_size=(640, 640))
        # self.app = app
        pass

    def process_frame(self, frame):
        """
        Detects faces and computes embeddings.
        Returns a list of dicts: {'bbox': [...], 'embedding': [...], 'cropped_img': [...]}
        """
        # Placeholder for actual face detection and recognition.
        # faces = self.app.get(frame)
        faces = [] # Simulating empty face list for now
        
        results = []
        for face in faces:
            bbox = face.bbox.astype(int)
            x1, y1, x2, y2 = bbox
            # Ensure within bounds
            x1, y1 = max(0, x1), max(0, y1)
            x2, y2 = min(frame.shape[1], x2), min(frame.shape[0], y2)
            cropped = frame[y1:y2, x1:x2]
            
            results.append({
                'bbox': bbox,
                'embedding': face.embedding,
                'cropped_img': cropped
            })
            
        return results

    def compare_embedding(self, query_embedding, db_embeddings, threshold=0.5):
        """
        Compares query embedding with a database of embeddings (cosine similarity).
        Returns (best_match_tenant_id, confidence) or (None, 0)
        """
        best_match = None
        highest_score = -1
        
        # db_embeddings is assumed to be a list of dicts: {'tenant_id': 'uuid', 'embedding': np.array}
        for entry in db_embeddings:
            score = self._cosine_similarity(query_embedding, entry['embedding'])
            if score > highest_score and score > threshold:
                highest_score = score
                best_match = entry['tenant_id']
                
        return best_match, highest_score
        
    def _cosine_similarity(self, a, b):
        return np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b))
