from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator


class TaskCreate(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    description: str = Field(default="", max_length=5000)
    due_date: datetime | None = None

    @field_validator("title")
    @classmethod
    def normalize_title(cls, value: str) -> str:
        normalized = value.strip()
        if not normalized:
            raise ValueError("Title cannot be blank")
        return normalized


class TaskUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=200)
    description: str | None = Field(default=None, max_length=5000)
    completed: bool | None = None
    due_date: datetime | None = None

    @model_validator(mode="after")
    def validate_non_nullable_fields(self) -> "TaskUpdate":
        if not self.model_fields_set:
            raise ValueError("Provide at least one field to update")
        for field in ("title", "description", "completed"):
            if field in self.model_fields_set and getattr(self, field) is None:
                raise ValueError(f"{field} cannot be null")
        if self.title is not None:
            normalized = self.title.strip()
            if not normalized:
                raise ValueError("Title cannot be blank")
            self.title = normalized
        return self


class TaskRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    description: str
    completed: bool
    position: int
    due_date: datetime | None
    created_at: datetime
    updated_at: datetime


class TaskReorder(BaseModel):
    task_ids: list[int] = Field(min_length=1, max_length=500)
