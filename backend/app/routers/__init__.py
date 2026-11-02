from .admin import router as admin_router
from .auth import router as auth_router
from .chat import router as chat_router
from .connections import router as connections_router
from .matching import router as matching_router
from .notifications import router as notifications_router
from .posts import router as posts_router
from .profile import router as profile_router
from .reports import router as reports_router
from .survey import router as survey_router
from .users import router as users_router

__all__ = [
    "auth_router",
    "users_router",
    "profile_router",
    "survey_router",
    "matching_router",
    "connections_router",
    "chat_router",
    "notifications_router",
    "reports_router",
    "admin_router",
    "posts_router",
]
