from fastapi import WebSocket
from typing import List, Dict

class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, List[WebSocket]] = {}

    async def connect(self, sn: str, websocket: WebSocket):
        await websocket.accept()
        if sn not in self.active_connections:
            self.active_connections[sn] = []
        self.active_connections[sn].append(websocket)

    def disconnect(self, sn: str, websocket: WebSocket):
        if sn in self.active_connections:
            self.active_connections[sn].remove(websocket)

    async def broadcast(self, sn: str, message: dict):
        if sn in self.active_connections:
            for connection in self.active_connections[sn]:
                await connection.send_json(message)

manager = ConnectionManager()
