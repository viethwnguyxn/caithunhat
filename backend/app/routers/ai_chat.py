import logging
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from .deps import get_current_user
from ..db.database import get_db
from ..models.profile import Profile
from ..models.survey import SurveyAnswer
from ..models.user import User
from ..services.ai_service import (
    DEFAULT_MODEL,
    build_system_prompt,
    clear_chat_history,
    generate_gemini_response,
    get_chat_history,
    get_gemini_api_key,
    save_chat_message,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/ai", tags=["AI Companion - El Pulga"])


class ChatMessageRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=4000, description="Nội dung tâm sự của người dùng")


class ChatMessageItem(BaseModel):
    role: str
    content: str
    created_at: Optional[str] = None


class ChatHistoryResponse(BaseModel):
    display_name: str
    has_survey: bool
    messages: List[ChatMessageItem]


class ChatMessageResponse(BaseModel):
    reply: str
    model: str


@router.get("/history", response_model=ChatHistoryResponse)
def get_ai_chat_history(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Lấy toàn bộ lịch sử trò chuyện với trợ lý El Pulga."""
    profile = db.query(Profile).filter(Profile.user_id == current_user.id).first()
    survey = db.query(SurveyAnswer).filter(SurveyAnswer.user_id == current_user.id).first()

    display_name = profile.display_name if profile and profile.display_name else current_user.username
    history = get_chat_history(db, current_user.id, limit=60)

    return ChatHistoryResponse(
        display_name=display_name,
        has_survey=survey is not None,
        messages=history,
    )


@router.post("/chat", response_model=ChatMessageResponse)
def send_message_to_el_pulga(
    request: ChatMessageRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Gửi tin nhắn tâm sự tới trợ lý El Pulga và nhận phản hồi đồng cảm."""
    user_text = request.message.strip()
    if not user_text:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Tin nhắn không được để trống",
        )

    try:
        api_key = get_gemini_api_key()
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e),
        )

    # 1. Lưu tin nhắn của người dùng vào DB
    save_chat_message(db, current_user.id, role="user", content=user_text)

    # 2. Lấy 10 tin nhắn gần nhất làm ngữ cảnh
    history = get_chat_history(db, current_user.id, limit=12)
    # Bỏ tin nhắn mới nhất vừa thêm ra khỏi history vì nó sẽ được truyền vào user_message
    context_history = [h for h in history[:-1]]

    # 3. Tạo system prompt cá nhân hóa dựa trên SurveyAnswer
    system_prompt = build_system_prompt(current_user.id, db)

    # 4. Sinh phản hồi từ Gemini (ưu tiên model mới nhất và fallback thông minh)
    try:
        reply_text = generate_gemini_response(
            system_prompt=system_prompt,
            history=context_history,
            user_message=user_text,
            api_key=api_key,
            model_name=DEFAULT_MODEL,
        )
    except Exception as e:
        logger.exception("Lỗi khi trò chuyện với El Pulga: %s", e)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"El Pulga đang tạm thời bận hoặc gặp sự cố kết nối: {str(e)}",
        )

    # 5. Lưu tin nhắn phản hồi của El Pulga vào DB
    save_chat_message(db, current_user.id, role="assistant", content=reply_text, model=DEFAULT_MODEL)

    return ChatMessageResponse(
        reply=reply_text,
        model=DEFAULT_MODEL,
    )


@router.delete("/history")
def delete_ai_history(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Xóa sạch lịch sử hội thoại để bắt đầu lại cuộc trò chuyện mới."""
    deleted_count = clear_chat_history(db, current_user.id)
    return {"message": "Đã xóa lịch sử trò chuyện thành công", "deleted_count": deleted_count}


@router.get("/quick-prompts")
def get_quick_prompts(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Gợi ý các câu mở lời tâm sự nhanh dựa trên tâm trạng khảo sát của người dùng."""
    survey = db.query(SurveyAnswer).filter(SurveyAnswer.user_id == current_user.id).first()
    
    feelings = survey.recent_feelings if survey and isinstance(survey.recent_feelings, list) else []
    
    prompts = []
    if "Cô đơn" in feelings or "cô đơn" in feelings:
        prompts.append("Dạo này mình cảm thấy hơi lạc lõng và cô đơn...")
    if "Áp lực" in feelings or "áp lực" in feelings or "Căng thẳng" in feelings:
        prompts.append("Công việc và cuộc sống dạo này làm mình ngột ngạt quá...")
    if "Mất phương hướng" in feelings or "mất phương hướng" in feelings:
        prompts.append("Mình đang không biết con đường tiếp theo nên đi thế nào...")

    # Gợi ý mặc định phong phú nếu chưa có hoặc ít
    defaults = [
        "Hôm nay bạn thấy thế nào, El Pulga?",
        "Mình muốn tâm sự một chút về chuyện gần đây...",
        "Có những lúc mình thấy không ai thực sự hiểu mình.",
        "Làm sao để vơi bớt cảm giác lo lắng trong lòng?",
    ]
    for d in defaults:
        if d not in prompts and len(prompts) < 4:
            prompts.append(d)

    return {"prompts": prompts[:4]}
