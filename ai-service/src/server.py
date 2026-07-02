import json
import urllib.request
import cv2
import numpy as np
import threading
from http.server import BaseHTTPRequestHandler, HTTPServer
from face_processor import FaceProcessor

processor = FaceProcessor()
reload_flag = threading.Event()

class RequestHandler(BaseHTTPRequestHandler):
    def do_POST(self):
        if self.path == '/generate-embedding-from-url':
            content_length = int(self.headers.get('Content-Length', 0))
            post_data = self.rfile.read(content_length)
            
            try:
                data = json.loads(post_data.decode('utf-8'))
                image_url = data.get('imageUrl')
                
                if not image_url:
                    self.send_error(400, "Missing imageUrl")
                    return
                
                # Fetch image from URL
                req = urllib.request.Request(image_url, headers={'User-Agent': 'Mozilla/5.0'})
                resp = urllib.request.urlopen(req)
                image_bytes = np.asarray(bytearray(resp.read()), dtype="uint8")
                frame = cv2.imdecode(image_bytes, cv2.IMREAD_COLOR)
                
                if frame is None:
                    self.send_error(400, "Invalid image")
                    return
                
                # Process frame
                faces = processor.process_frame(frame)
                if not faces:
                    # For prototype: return a mock embedding if no face detected
                    embedding = np.random.rand(512).tolist()
                else:
                    embedding_data = faces[0]['embedding']
                    if isinstance(embedding_data, np.ndarray):
                        embedding = embedding_data.tolist()
                    else:
                        embedding = list(embedding_data)
                
                self.send_response(200)
                self.send_header('Content-type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({'embedding': embedding}).encode('utf-8'))
                
            except Exception as e:
                self.send_error(500, f"Server error: {str(e)}")
        
        elif self.path == '/reload-embeddings':
            reload_flag.set()
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({'message': 'Reload triggered'}).encode('utf-8'))
            
        else:
            self.send_error(404, "Not Found")

def run_server(port=8000):
    server_address = ('', port)
    httpd = HTTPServer(server_address, RequestHandler)
    print(f"Starting API server on port {port}...")
    httpd.serve_forever()

if __name__ == '__main__':
    run_server()
