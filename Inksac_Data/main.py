import json
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from sqlalchemy import delete, select, exists
from datetime import datetime, timedelta

from Inksac_Data.database import Base, engine, db_session, ALLOWORIGINSLIST

from Inksac_Data.Common.Response import HttpException
from Inksac_Data.Common.WSManager import WSManager
from Inksac_Data.Common.Role import Role
from Inksac_Data.Common.BrushType import BrushType

#table classes go here
from Inksac_Data.Entities.Users import User
from Inksac_Data.Entities.Auth import UserAuth
from Inksac_Data.Entities.Brushes import Brush
from Inksac_Data.Entities.Rooms import Room
from Inksac_Data.Entities.Strokes import Stroke
from Inksac_Data.Entities.UsedBrushes import UsedBrushes

#controller routers go here
from Inksac_Data.Controllers import (
    AuthController,
    UsersController, 
    BrushesController,
    RoomsController,
    StrokesController,
    RoomsWSController,
)

GUEST_GRACE = timedelta(days=1)

scheduler = AsyncIOScheduler()

@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    seed_brushes()
    scheduler.start()
    yield

app = FastAPI(lifespan=lifespan, redirect_slashes=False)

#app.include_router(controller.router) goes here
app.include_router(AuthController.router)
app.include_router(UsersController.router)
app.include_router(BrushesController.router)
app.include_router(RoomsController.router)
app.include_router(StrokesController.router)
app.include_router(RoomsWSController.router)

#this exposes the files in media for our image hosting
#accessed via http://<ip>:<port>/media/path/to/file.png or with a domain
app.mount("/media", StaticFiles(directory="media"), name="media")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWORIGINSLIST,
    allow_credentials=True, 
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.exception_handler(HttpException)
def HttpExceptionHandler(request: Request, exception: HttpException):
    return JSONResponse(
        exception.response.model_dump(),
        status_code=exception.status_code
    )

@scheduler.scheduled_job(CronTrigger(minute=0)) # every hour
async def expired_room_cleanup():
    with db_session() as db:
        rooms = db.execute(
            select(Room).where(Room.expiration <= datetime.now())
        ).scalars().all()
        for room in rooms:
            await WSManager.disconnect_room(roomid=room.id)
            db.delete(room)
        db.commit()

@scheduler.scheduled_job(CronTrigger(hour=00)) # everyday at 00:00 (12:00 am)
async def expired_guest_cleanup():
    currtime = datetime.now()
    with db_session() as db:
        db.execute(
            delete(User)
            .where(User.role == Role.GUEST)
            .where(currtime - User.created_at >= GUEST_GRACE)
            .where(~exists(
                select(Stroke.id)
                .where(Stroke.creator_id == User.id)
            ))
        )
        db.commit()

def seed_brushes():
    with open("./Inksac_Data/Brushes.json") as f:
        seed_brushes = json.load(f)
    with db_session() as db:
        system_brush_names = db.execute(
            select(Brush.name)
            .where(Brush.brush_type == BrushType.SYSTEM)
        ).scalars()
        for seed_brush in seed_brushes:
            if seed_brush['name'] in system_brush_names:
                continue
            brush = Brush(
                name=seed_brush['name'],
                spacing=seed_brush['spacing'],
                scale=seed_brush['scale'],
                rotation_mode=seed_brush['rotation_mode'],
                brush_type=BrushType.SYSTEM,
                imgurl=seed_brush['imgurl']
            )
            db.add(brush)
        db.commit()