from fastapi import WebSocket, WebSocketException
from pydantic import BaseModel
from typing import Dict, Callable, Optional
from enum import Enum

class WSMTypes(str, Enum):
    READY = "ready"
    STROKE = "stroke"

class WSMessage(BaseModel):
    Mtype: WSMTypes
    data: Optional[object] = None

class MessageHandler():
    """Do not use this class use WSMHandler"""
    def __init__(self):
        self.handlers: Dict[WSMTypes, Callable] = {}

    def register(self, type: WSMTypes):
        def decorator(func):
            self.handlers[type] = func
            return func
        return decorator

class ConnectionManager:
    """Do not use this class use WSManager"""
    def __init__(self):
        self.rooms: Dict[int, Dict[int, WebSocket]] = {}

    async def connect(self, roomid: int, userid: int, websocket: WebSocket):
        await websocket.accept()
        if self.user_in_room(userid=userid, roomid=roomid):
            raise WebSocketException(code=1008, reason="user already in room")
        self.rooms.setdefault(roomid, dict())[userid] = websocket

    def disconnect(self, roomid: int, userid: int):
        if self.user_in_room(userid=userid, roomid=roomid):
            del self.rooms[roomid][userid]
            if not self.rooms[roomid]: del self.rooms[roomid]

    async def broadcast(self, roomid: int, message: WSMessage, websocket: WebSocket):
        if roomid in self.rooms:
            for connection in self.rooms[roomid].values():
                if connection == websocket:
                    continue
                await connection.send_json(message.model_dump())

    def user_in_room(self, userid: int, roomid: int) -> bool:
        if roomid in self.rooms and userid in self.rooms[roomid]:
            return True
        return False
    
WSManager = ConnectionManager()
WSMHandler = MessageHandler()