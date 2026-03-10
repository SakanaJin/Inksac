from enum import Enum

class BrushType(str, Enum):
    USER = "user"
    SYSTEM = "system"