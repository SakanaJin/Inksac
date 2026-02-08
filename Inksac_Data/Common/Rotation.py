from enum import Enum

class RotationMode(str, Enum):
    NONE = "none"
    RANDOM = "random"
    FOLLOWSTROKE = "followstroke"