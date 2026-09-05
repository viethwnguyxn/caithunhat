from typing import Any
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..models.profile import Profile
from ..models.survey import SurveyAnswer
from ..models.user import User
from ..schemas.matching import MatchItem, MatchListResponse, MatchUserResponse


def build_user_text_representation(survey: SurveyAnswer, profile: Profile | None = None) -> str:
    """Tạo chuỗi văn bản đại diện tổng hợp cho người dùng từ Survey và Profile."""
    parts: list[str] = []

    if survey.age_group:
        parts.append(f"tuổi_{survey.age_group}")
    if survey.current_status:
        parts.append(f"tình_trạng_{survey.current_status}")
    if survey.life_situation:
        parts.append(f"hoàn_cảnh_{survey.life_situation}")
    if survey.recent_feelings:
        parts.extend([f"cảm_xúc_{f}" for f in survey.recent_feelings])
    if survey.goals:
        parts.extend([f"mục_tiêu_{g}" for g in survey.goals])
    if survey.community_expectations:
        parts.extend([f"kỳ_vọng_{e}" for e in survey.community_expectations])
    if survey.topics:
        parts.extend([f"chủ_đề_{t}" for t in survey.topics])
    if survey.free_time_activities:
        parts.extend([f"hoạt_động_{a}" for a in survey.free_time_activities])
    if survey.desired_connection_types:
        parts.extend([f"kết_nối_{c}" for c in survey.desired_connection_types])
    if survey.preferred_mode:
        parts.append(f"nhịp_điệu_{survey.preferred_mode}")
    if survey.discovery_preference:
        parts.append(f"khám_phá_{survey.discovery_preference}")

    if survey.story:
        parts.append(survey.story)
    if survey.what_you_want_others_to_understand:
        parts.append(survey.what_you_want_others_to_understand)

    if profile and profile.bio:
        parts.append(profile.bio)

    return " ".join(parts).lower()


def find_common_interests(survey_a: SurveyAnswer, survey_b: SurveyAnswer) -> list[str]:
    """Tìm danh sách sở thích và chủ đề chung giữa 2 người dùng."""
    topics_a = set(survey_a.topics or [])
    topics_b = set(survey_b.topics or [])
    common_topics = list(topics_a.intersection(topics_b))

    acts_a = set(survey_a.free_time_activities or [])
    acts_b = set(survey_b.free_time_activities or [])
    common_acts = list(acts_a.intersection(acts_b))

    return common_topics + common_acts


def generate_match_reasons(
    survey_a: SurveyAnswer,
    survey_b: SurveyAnswer,
    common_interests: list[str],
) -> list[str]:
    """Tạo các lý do ghép đôi dễ hiểu (rule-based explanation)."""
    reasons: list[str] = []

    if survey_a.life_situation and survey_a.life_situation == survey_b.life_situation:
        reasons.append(f"Cùng hoàn cảnh: {survey_a.life_situation}")

    if survey_a.age_group and survey_a.age_group == survey_b.age_group:
        reasons.append(f"Cùng nhóm độ tuổi ({survey_a.age_group})")

    if survey_a.current_status and survey_a.current_status == survey_b.current_status:
        reasons.append(f"Cùng tình trạng hiện tại ({survey_a.current_status})")

    if common_interests:
        reasons.append(f"Chung {len(common_interests)} chủ đề & sở thích")

    goals_a = set(survey_a.goals or [])
    goals_b = set(survey_b.goals or [])
    common_goals = list(goals_a.intersection(goals_b))
    if common_goals:
        reasons.append("Có mục tiêu đồng điệu trong cộng đồng")

    feelings_a = set(survey_a.recent_feelings or [])
    feelings_b = set(survey_b.recent_feelings or [])
    if feelings_a.intersection(feelings_b):
        reasons.append("Đang trải qua những cảm xúc tương đồng")

    if survey_a.preferred_mode and survey_a.preferred_mode == survey_b.preferred_mode:
        reasons.append("Cùng phong cách trò chuyện ưu tiên")

    if not reasons:
        reasons.append("Có sự tương đồng về góc nhìn và mục tiêu kết nối")

    return reasons


def get_user_matches(
    db: Session,
    current_user: User,
    limit: int = 20,
) -> MatchListResponse:
    """Thuật toán tìm kiếm người phù hợp dựa trên TF-IDF và Cosine Similarity."""
    stmt_my_survey = select(SurveyAnswer).where(SurveyAnswer.user_id == current_user.id)
    my_survey = db.execute(stmt_my_survey).scalar_one_or_none()

    if not my_survey:
        return MatchListResponse(matches=[])

    stmt_my_profile = select(Profile).where(Profile.user_id == current_user.id)
    my_profile = db.execute(stmt_my_profile).scalar_one_or_none()

    stmt_others = (
        select(User, Profile, SurveyAnswer)
        .join(SurveyAnswer, User.id == SurveyAnswer.user_id)
        .outerjoin(Profile, User.id == Profile.user_id)
        .where(User.id != current_user.id, User.is_active == True)
    )
    results = db.execute(stmt_others).all()

    if not results:
        return MatchListResponse(matches=[])

    candidate_users: list[User] = []
    candidate_profiles: list[Profile | None] = []
    candidate_surveys: list[SurveyAnswer] = []
    corpus: list[str] = []

    my_text = build_user_text_representation(my_survey, my_profile)
    corpus.append(my_text)

    for row in results:
        u, p, s = row
        candidate_users.append(u)
        candidate_profiles.append(p)
        candidate_surveys.append(s)
        corpus.append(build_user_text_representation(s, p))

    vectorizer = TfidfVectorizer()
    tfidf_matrix = vectorizer.fit_transform(corpus)
    similarities = cosine_similarity(tfidf_matrix[0:1], tfidf_matrix[1:])[0]

    matches: list[MatchItem] = []
    for idx, sim_score in enumerate(similarities):
        cand_user = candidate_users[idx]
        cand_profile = candidate_profiles[idx]
        cand_survey = candidate_surveys[idx]

        score_percent = int(round(float(sim_score) * 100))
        score_percent = max(0, min(100, score_percent))

        common_interests = find_common_interests(my_survey, cand_survey)
        reasons = generate_match_reasons(my_survey, cand_survey, common_interests)

        user_interests = list(dict.fromkeys((cand_survey.topics or []) + (cand_survey.free_time_activities or [])))

        match_item = MatchItem(
            user=MatchUserResponse(
                id=cand_user.id,
                username=cand_user.username,
                display_name=cand_profile.display_name if cand_profile else cand_user.username,
                avatar_url=cand_profile.avatar_url if cand_profile else cand_user.avatar_url,
                bio=cand_profile.bio if cand_profile else None,
                age_group=cand_survey.age_group,
                current_status=cand_survey.current_status,
                interests=user_interests,
                goals=cand_survey.goals or [],
                desired_connection_types=cand_survey.desired_connection_types or [],
            ),
            match_score=score_percent,
            common_interests=common_interests,
            match_reasons=reasons,
        )
        matches.append(match_item)

    matches.sort(key=lambda item: item.match_score, reverse=True)
    return MatchListResponse(matches=matches[:limit])
