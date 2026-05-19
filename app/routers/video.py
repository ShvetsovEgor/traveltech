import json
import logging

from fastapi import APIRouter, File, Form, HTTPException, UploadFile, status

from app.core.image_validation import validate_portrait_image
from app.core.prompt_engine import PromptEngine
from app.core.storage import cleanup_upload_file, save_upload
from app.database import get_session_factory
from app.dependencies import DbSession, SecurityDep
from app.models.enums import AppType
from app.models.pydantic_schemas import GenerateTaskResponse
from app.services.audit import write_audit
from app.services.task_manager import TaskManager

router = APIRouter()
logger = logging.getLogger(__name__)


@router.post("/generate", response_model=GenerateTaskResponse)
async def generate_video(
    security: SecurityDep,
    db: DbSession,
    photo: UploadFile = File(...),
    scenario_id: str = Form(...),
    interaction_token: str = Form(...),
    options: str = Form(default="[]"),
) -> GenerateTaskResponse:
    session = await security.get_app_session(interaction_token)
    if session.app_type != AppType.VIDEO_MAGIC:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="interaction_token is not for video_magic",
        )

    try:
        parsed_options: list[str] = json.loads(options) if options else []
        if not isinstance(parsed_options, list):
            raise ValueError("options must be a JSON array")
        prompt = PromptEngine.build_video_prompt(scenario_id, parsed_options)
    except (ValueError, json.JSONDecodeError) as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    input_path = await save_upload(interaction_token, photo, suffix="_photo")
    try:
        validate_portrait_image(input_path)
    except ValueError as exc:
        cleanup_upload_file(input_path)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc

    logger.info(
        "Video photo saved: %s (%d bytes)",
        input_path,
        input_path.stat().st_size,
    )

    task_manager = TaskManager(security.redis)
    task_id = await task_manager.create_task(
        db,
        interaction_token=interaction_token,
        app_type=AppType.VIDEO_MAGIC,
    )
    await security.register_task_for_interaction(interaction_token, task_id)
    await write_audit(
        db,
        "video_generate",
        interaction_token=interaction_token,
        task_id=task_id,
        message=f"scenario_id={scenario_id}",
    )

    factory = get_session_factory()
    task_manager.schedule_video_generation(
        task_id=task_id,
        interaction_token=interaction_token,
        input_path=input_path,
        prompt=prompt,
        db_factory=factory,
    )
    return GenerateTaskResponse(task_id=task_id)
