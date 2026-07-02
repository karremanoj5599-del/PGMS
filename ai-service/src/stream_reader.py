import cv2
import time

class StreamReader:
    def __init__(self, camera_id, rtsp_url, fps_limit=1):
        self.camera_id = camera_id
        self.rtsp_url = rtsp_url
        self.fps_limit = fps_limit
        self.cap = None

    def start(self):
        self.cap = cv2.VideoCapture(self.rtsp_url)

    def read_frames(self):
        """
        Generator that yields frames at the specified fps_limit.
        """
        if not self.cap or not self.cap.isOpened():
            self.start()

        frame_interval = 1.0 / self.fps_limit
        last_frame_time = time.time()

        while True:
            ret, frame = self.cap.read()
            if not ret:
                print(f"Error reading stream from camera {self.camera_id}. Reconnecting...")
                time.sleep(2)
                self.start()
                continue

            current_time = time.time()
            if (current_time - last_frame_time) >= frame_interval:
                last_frame_time = current_time
                yield frame

    def stop(self):
        if self.cap:
            self.cap.release()
