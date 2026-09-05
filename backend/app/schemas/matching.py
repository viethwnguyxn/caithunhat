from pydantic import BaseModel, ConfigDict


class MatchUserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    username: str
    display_name: str | None = None
    avatar_url: str | None = None
    bio: str | None = None
    age_group: str | None = None
    current_status: str | None = None
    interests: list[str] = []
    goals: list[str] = []
    desired_connection_types: list[str] = []


class MatchItem(BaseModel):
    user: MatchUserResponse
    match_score: int
    common_interests: list[str]
    match_reasons: list[str]


class MatchListResponse(BaseModel):
    matches: list[MatchItem]
