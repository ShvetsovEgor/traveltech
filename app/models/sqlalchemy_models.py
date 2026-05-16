"""SQLAlchemy models for audit logs and task persistence."""

from datetime import datetime

from sqlalchemy import DateTime, String, Text
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column

from app.core.timezone import MSK


class Base(DeclarativeBase):
    pass


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    event_type: Mapped[str] = mapped_column(String(64), index=True)
    kiosk_id: Mapped[str | None] = mapped_column(String(32), nullable=True)
    interaction_token: Mapped[str | None] = mapped_column(String(128), nullable=True, index=True)
    task_id: Mapped[str | None] = mapped_column(String(64), nullable=True, index=True)
    message: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at_msk: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(MSK),
        index=True,
    )


class GenerationTaskRecord(Base):
    __tablename__ = "generation_tasks"

    task_id: Mapped[str] = mapped_column(String(64), primary_key=True)
    interaction_token: Mapped[str] = mapped_column(String(128), index=True)
    app_type: Mapped[str] = mapped_column(String(32))
    status: Mapped[str] = mapped_column(String(32), index=True)
    result_path: Mapped[str | None] = mapped_column(String(512), nullable=True)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at_msk: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(MSK),
    )
    updated_at_msk: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(MSK),
        onupdate=lambda: datetime.now(MSK),
    )
