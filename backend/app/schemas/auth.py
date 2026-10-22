import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class UserRegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(
        ..., min_length=8, max_length=128, description="Password must be at least 8 characters"
    )

    model_config = ConfigDict(extra="forbid")


class UserLoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(
        ..., min_length=1, max_length=128, description="Password for authentication"
    )

    model_config = ConfigDict(extra="forbid")


class UserResponse(BaseModel):
    id: uuid.UUID
    email: EmailStr
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


class MessageResponse(BaseModel):
    message: str
