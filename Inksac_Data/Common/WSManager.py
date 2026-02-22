from fastapi import WebSocket, WebSocketException
from pydantic import BaseModel
from typing import Dict, Callable, Optional
from enum import Enum, IntEnum
from sqlalchemy import select

from Inksac_Data.database import db_session
from Inksac_Data.Entities.Rooms import Room

class WSMTypes(str, Enum):
    READY = "ready"
    STROKE = "stroke"
    UNDO = "undo"
    REDO = "redo"

class WSCodes(IntEnum):
    NORMAL_CLOSURE = 1000
    GOING_AWAY = 1001
    POLICY_VIOLATION = 1008
    INTERNAL_SERVER_ERROR = 1011
    UNEXPECTED_CLOSURE = 1006
    FORCE_DC = 4001

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
        with db_session() as db:
            rooms = db.execute(
                select(Room)
            ).scalars().all()
        if roomid not in [room.id for room in rooms]:
            raise WebSocketException(code=WSCodes.POLICY_VIOLATION, reason="room doesn't exist")
        if self.user_in_room(userid=userid, roomid=roomid):
            raise WebSocketException(code=WSCodes.POLICY_VIOLATION, reason="user already in room")
        self.rooms.setdefault(roomid, dict())[userid] = websocket

    def disconnect(self, roomid: int, userid: int):
        if self.user_in_room(userid=userid, roomid=roomid):
            del self.rooms[roomid][userid]
            if not self.rooms[roomid]: del self.rooms[roomid]

    async def disconnect_user(self, roomid: int, userid: int, reason: str):
        if self.user_in_room(userid=userid, roomid=roomid):
            await self.rooms[roomid][userid].close(code=WSCodes.FORCE_DC, reason=reason)
            del self.rooms[roomid][userid]
            if not self.rooms[roomid]: del self.rooms[roomid]

    async def disconnect_room(self, roomid: int):
        if roomid not in self.rooms:
            return
        for connection in self.rooms[roomid].values():
            await connection.close(code=WSCodes.FORCE_DC, reason="room closing")
        del self.rooms[roomid]

    async def broadcast(self, roomid: int, message: WSMessage):
        if roomid in self.rooms:
            for connection in self.rooms[roomid].values():
                await connection.send_json(message.model_dump(mode="json"))

    def user_in_room(self, userid: int, roomid: int) -> bool:
        if roomid in self.rooms and userid in self.rooms[roomid]:
            return True
        return False
    
WSManager = ConnectionManager()
WSMHandler = MessageHandler()