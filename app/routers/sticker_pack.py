from fastapi import APIRouter, File, Form, HTTPException, UploadFile, status

from app.core.image_validation import validate_portrait_image
from app.core.storage import cleanup_upload_file, save_upload
from app.config import get_settings
from app.database import get_session_factory
from app.dependencies import DbSession, SecurityDep
from app.models.enums import AppType
from app.models.pydantic_schemas import GenerateTaskResponse
from app.services.audit import write_audit
from app.services.sticker_telegram import StickerTelegramError, StickerTelegramService
from app.services.task_manager import TaskManager

router = APIRouter()


@router.post("/generate", response_model=GenerateTaskResponse)
async def generate_sticker_pack(
    security: SecurityDep,
    db: DbSession,
    photo: UploadFile = File(...),
    interaction_token: str = Form(...),
) -> GenerateTaskResponse:
    session = await security.get_app_session(interaction_token)
    if session.app_type != AppType.STICKER_PACK:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="interaction_token is not for sticker_pack",
        )

    settings = get_settings()
    if not settings.telegram_sticker_configured:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=(
                "Telegram не настроен: задайте TELEGRAM_BOT_TOKEN и "
                "TELEGRAM_STICKER_OWNER_ID в .env и перезапустите сервер"
            ),
        )
    try:
        StickerTelegramService(settings)
    except StickerTelegramError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(exc),
        ) from exc

    input_path = await save_upload(interaction_token, photo, suffix="_photo")
    try:
        validate_portrait_image(input_path)
    except ValueError as exc:
        cleanup_upload_file(input_path)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc

    task_manager = TaskManager(security.redis)
    task_id = await task_manager.create_task(
        db,
        interaction_token=interaction_token,
        app_type=AppType.STICKER_PACK,
        generation_style="sticker_pack",
    )
    await security.register_task_for_interaction(interaction_token, task_id)
    await write_audit(
        db,
        "sticker_pack_generate",
        interaction_token=interaction_token,
        task_id=task_id,
    )

    factory = get_session_factory()
    task_manager.schedule_sticker_pack_generation(
        task_id=task_id,
        interaction_token=interaction_token,
        input_path=input_path,
        db_factory=factory,
    )
    return GenerateTaskResponse(task_id=task_id)
