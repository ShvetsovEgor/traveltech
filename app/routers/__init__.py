from fastapi import APIRouter

from app.routers import artist, auth, interaction, neurobox, tasks, video

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(interaction.router, prefix="/interaction", tags=["interaction"])
api_router.include_router(artist.router, prefix="/artist", tags=["artist"])
api_router.include_router(neurobox.router, prefix="/neurobox", tags=["neurobox"])
api_router.include_router(video.router, prefix="/video", tags=["video"])
api_router.include_router(tasks.router, prefix="/tasks", tags=["tasks"])
