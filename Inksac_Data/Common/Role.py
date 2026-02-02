from enum import Enum

class Role(str, Enum):
    """Roles a user can have"""
    ADMIN = 'admin'
    USER = 'user'
    GUEST = 'guest'