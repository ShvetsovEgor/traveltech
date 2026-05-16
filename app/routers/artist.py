from fastapi import APIRouter, File, Form, HTTPException, UploadFile, status

from app.core.prompt_engine import PromptEngine
from app.core.storage import save_upload
from app.database import get_session_factory
from app.dependencies import DbSession, SecurityDep
from app.models.enums import AppType
from app.models.pydantic_schemas import GenerateTaskResponse
from app.services.audit import write_audit
from app.services.task_manager import TaskManager

router = APIRouter()


@router.post("/generate", response_model=GenerateTaskResponse)
async def generate_artist(
    security: SecurityDep,
    db: DbSession,
    sketch: UploadFile = File(...),
    style_id: str = Form(...),
    interaction_token: str = Form(...),
) -> GenerateTaskResponse:
    session = await security.get_app_session(interaction_token)
    if session.app_type != AppType.NEURO_ARTIST:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="interaction_token is not for neuro_artist",
        )

    try:
        prompt = PromptEngine.build_artist_prompt(style_id)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    input_path = await save_upload(interaction_token, sketch, suffix="_sketch")
    task_manager = TaskManager(security.redis)
    task_id = await task_manager.create_task(
        db,
        interaction_token=interaction_token,
        app_type=AppType.NEURO_ARTIST,
    )
    await security.register_task_for_interaction(interaction_token, task_id)
    await write_audit(
        db,
        "artist_generate",
        interaction_token=interaction_token,
        task_id=task_id,
        message=f"style_id={style_id}",
    )

    factory = get_session_factory()
    task_manager.schedule_image_generation(
        task_id=task_id,
        interaction_token=interaction_token,
        input_path=input_path,
        prompt=prompt,
        db_factory=factory,
    )
    return GenerateTaskResponse(task_id=task_id)
