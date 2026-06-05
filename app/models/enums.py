from enum import StrEnum


class KioskId(StrEnum):
    POPOVA = "Popova"
    LOBACHEVSKY = "Lobachevsky"
    ROBOT = "robot"
    RAMEEVA = "Rameeva"


class GuideAgency(StrEnum):
    TRAVELTECH = "traveltech"
    UMATOUR = "umatour"
    INNOTRAVEL = "innotravel"


class AppType(StrEnum):
    NEURO_ARTIST = "neuro_artist"
    NEUROBOX = "neurobox"
    VIDEO_MAGIC = "video_magic"
    STICKER_PACK = "sticker_pack"


class TaskStatus(StrEnum):
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"
