from fastapi import WebSocket
from typing import Dict, Set

class ConnectionManager:
    """Do not use this class use WSManager"""
    def __init__(self):
        self.rooms: Dict[int, Set[WebSocket]] = {}

    async def connect(self, roomid: int, websocket: WebSocket):
        await websocket.accept()
        self.rooms.setdefault(roomid, set()).add(websocket)
        # send room / stroke data to client here for stroke in strokes: ws.send_json(stroke)
        # this is also probably where the bg image would be sent as well before the strokes probs.

    def disconnect(self, roomid: int, websocket: WebSocket):
        if roomid in self.rooms:
            self.rooms[roomid].remove(websocket)
            if not self.rooms[roomid]: del self.rooms[roomid]

    async def broadcast(self, roomid: int, data: dict, websocket: WebSocket):
        if roomid in self.rooms:
            for connection in self.rooms[roomid]:
                if connection == websocket:
                    continue
                await connection.send_json(data)
    
WSManager = ConnectionManager()