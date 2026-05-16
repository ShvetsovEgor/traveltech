from sqlalchemy.ext.asyncio import AsyncSession

from app.core.timezone import now_msk
from app.models.sqlalchemy_models import AuditLog


async def write_audit(
    db: AsyncSession,
    event_type: str,
    *,
    kiosk_id: str | None = None,
    interaction_token: str | None = None,
    task_id: str | None = None,
    message: str | None = None,
) -> None:
    db.add(
        AuditLog(
            event_type=event_type,
            kiosk_id=kiosk_id,
            interaction_token=interaction_token,
            task_id=task_id,
            message=message,
            created_at_msk=now_msk(),
        )
    )
    await db.commit()
