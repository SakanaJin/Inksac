from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from Inksac_Data.database import Base, engine, ALLOWORIGINSLIST

from Inksac_Data.Common.Response import HttpException

#table classes go here
from Inksac_Data.Entities.Users import User
from Inksac_Data.Entities.Auth import UserAuth

#controller routers go here
from Inksac_Data.Controllers import AuthController, UsersController

@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    yield

app = FastAPI(lifespan=lifespan, redirect_slashes=False)

#app.include_router(controller.router) goes here
app.include_router(AuthController.router)
app.include_router(UsersController.router)

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