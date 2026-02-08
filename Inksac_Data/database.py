import os
from pathlib import Path
import json
from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from contextlib import contextmanager

load_dotenv()
DBSTRING = os.getenv("DBSTRING")
SECRET_KEY = os.getenv("SECRET_KEY")
ALLOWORIGINS = os.getenv("ALLOWORIGINS")
ALLOWORIGINSLIST = json.loads(ALLOWORIGINS)

ROOT = Path(__file__).resolve().parents[1] # /Inksac

engine = create_engine(DBSTRING, echo=True, future=True)
Base = declarative_base()
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    """
    For use in fastapi headers that use 'Depends()'.
    Returns db session and automatically closes it after used.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@contextmanager
def db_session():
    """
    For use outside of fastapi headers.
    Does the same as get_db, but with contextlib's manager instead of fastapi's.
    """
    db = SessionLocal()
    try: 
        yield db
    finally:
        db.close()