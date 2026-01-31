from typing import List, Optional
from pydantic import BaseModel, Field

class Error(BaseModel):
    """Standardized api error. (This is mostly for form validation)"""
    property: str
    message: str

class Response(BaseModel):
    """Standardized api response."""
    errors: List[Error] = Field(default_factory=list)
    has_errors: bool = False
    data: Optional[object] = None

    def add_error(self, property: str, message: str):
        self.errors.append(Error(property=property, message=message))
        self.has_errors = True

class HttpException(Exception):
    """Standardized api http exception."""
    def __init__(self, status_code: int, response: Response):
        self.status_code = status_code
        self.response = response