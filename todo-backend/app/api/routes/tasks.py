from fastapi import APIRouter, HTTPException, Query, Response, status

from app.api.dependencies import CurrentUser, DbSession
from app.models.task import Task
from app.schemas.task import TaskCreate, TaskRead, TaskReorder, TaskUpdate
from app.services import tasks as task_service

router = APIRouter(prefix="/tasks", tags=["Tasks"])


@router.get("", response_model=list[TaskRead])
def get_tasks(
    db: DbSession,
    current_user: CurrentUser,
    search: str | None = Query(default=None, max_length=200),
    completed: bool | None = None,
    limit: int | None = Query(default=None, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
) -> list[Task]:
    return task_service.list_tasks(db, current_user.id, search, completed, limit, offset)


@router.post("", response_model=TaskRead, status_code=status.HTTP_201_CREATED)
def create_task(payload: TaskCreate, db: DbSession, current_user: CurrentUser) -> Task:
    return task_service.create_task(db, current_user.id, payload)


@router.put("/reorder", response_model=list[TaskRead])
def reorder_tasks(payload: TaskReorder, db: DbSession, current_user: CurrentUser) -> list[Task]:
    try:
        return task_service.reorder_tasks(db, current_user.id, payload.task_ids)
    except ValueError as error:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(error)) from error


@router.get("/{task_id}", response_model=TaskRead)
def get_task(task_id: int, db: DbSession, current_user: CurrentUser) -> Task:
    task = task_service.get_owned_task(db, current_user.id, task_id)
    if task is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")
    return task


@router.patch("/{task_id}", response_model=TaskRead)
def update_task(
    task_id: int, payload: TaskUpdate, db: DbSession, current_user: CurrentUser
) -> Task:
    task = task_service.get_owned_task(db, current_user.id, task_id)
    if task is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")
    return task_service.update_task(db, task, payload)


@router.delete("/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_task(task_id: int, db: DbSession, current_user: CurrentUser) -> Response:
    task = task_service.get_owned_task(db, current_user.id, task_id)
    if task is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")
    task_service.delete_task(db, task)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
