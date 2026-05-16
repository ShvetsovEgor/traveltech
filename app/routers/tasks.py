from fastapi import APIRouter, HTTPException, status

from app.dependencies import DbSession, RedisDep
from app.models.enums import TaskStatus
from app.models.pydantic_schemas import TaskStatusResponse
from app.models.sqlalchemy_models import GenerationTaskRecord
from sqlalchemy import select

router = APIRouter()


@router.get("/{task_id}/status", response_model=TaskStatusResponse)
async def get_task_status(
    task_id: str,
    redis: RedisDep,
    db: DbSession,
) -> TaskStatusResponse:
    from app.services.task_manager import TaskManager

    manager = TaskManager(redis)
    state = await manager.get_task_status(task_id)

    if not state:
        result = await db.execute(
            select(GenerationTaskRecord).where(GenerationTaskRecord.task_id == task_id)
        )
        record = result.scalar_one_or_none()
        if not record:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Task not found",
            )
        from app.core.storage import result_url
        from app.core.timezone import msk_iso

        url = None
        if record.status == TaskStatus.COMPLETED.value and record.result_path:
            from pathlib import Path

            url = result_url(task_id, Path(record.result_path).suffix)
        return TaskStatusResponse(
            task_id=task_id,
            status=TaskStatus(record.status),
            result_url=url,
            error_message=record.error_message,
            updated_at_msk=msk_iso(record.updated_at_msk),
        )

    return TaskStatusResponse(
        task_id=task_id,
        status=TaskStatus(state["status"]),
        result_url=state.get("result_url"),
        error_message=state.get("error_message"),
        updated_at_msk=state.get("updated_at_msk"),
    )
