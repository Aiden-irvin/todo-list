from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.task import Task
from app.models.user import User
from app.schemas.task import TaskCreate, TaskUpdate


def _contains_pattern(term: str) -> str:
    escaped = term.strip().replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
    return f"%{escaped}%"


def _lock_owner(db: Session, owner_id: int) -> None:
    """Serialise position changes per user on PostgreSQL (SQLite ignores FOR UPDATE)."""
    db.execute(select(User.id).where(User.id == owner_id).with_for_update())


def list_tasks(
    db: Session,
    owner_id: int,
    search: str | None = None,
    completed: bool | None = None,
    limit: int | None = None,
    offset: int = 0,
) -> list[Task]:
    statement = select(Task).where(Task.owner_id == owner_id)
    if search and search.strip():
        statement = statement.where(Task.title.ilike(_contains_pattern(search), escape="\\"))
    if completed is not None:
        statement = statement.where(Task.completed.is_(completed))
    statement = statement.order_by(Task.position, Task.created_at.desc()).offset(offset)
    if limit is not None:
        statement = statement.limit(limit)
    return list(db.scalars(statement).all())


def create_task(db: Session, owner_id: int, payload: TaskCreate) -> Task:
    _lock_owner(db, owner_id)
    highest = db.scalar(select(func.max(Task.position)).where(Task.owner_id == owner_id))
    next_position = 0 if highest is None else highest + 1
    task = Task(owner_id=owner_id, position=next_position, **payload.model_dump())
    db.add(task)
    db.commit()
    db.refresh(task)
    return task


def get_owned_task(db: Session, owner_id: int, task_id: int) -> Task | None:
    return db.scalar(select(Task).where(Task.id == task_id, Task.owner_id == owner_id))


def update_task(db: Session, task: Task, payload: TaskUpdate) -> Task:
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(task, field, value)
    db.commit()
    db.refresh(task)
    return task


def delete_task(db: Session, task: Task) -> None:
    db.delete(task)
    db.commit()


def reorder_tasks(db: Session, owner_id: int, task_ids: list[int]) -> list[Task]:
    if len(task_ids) != len(set(task_ids)):
        raise ValueError("Task IDs must be unique")
    _lock_owner(db, owner_id)
    tasks = list(db.scalars(select(Task).where(Task.owner_id == owner_id)).all())
    task_by_id = {task.id: task for task in tasks}
    if set(task_ids) != set(task_by_id):
        raise ValueError("Provide every task ID belonging to your account exactly once")
    for position, task_id in enumerate(task_ids):
        task_by_id[task_id].position = position
    db.commit()
    return list(
        db.scalars(select(Task).where(Task.owner_id == owner_id).order_by(Task.position)).all()
    )
