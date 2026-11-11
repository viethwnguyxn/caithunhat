import glob
import json
import logging
import os
import urllib.request
from typing import AsyncGenerator, Dict, List, Optional

from sqlalchemy.orm import Session

from ..models.ai_chat import AIChatMessage
from ..models.profile import Profile
from ..models.survey import SurveyAnswer

logger = logging.getLogger(__name__)

# Default model configuration
DEFAULT_MODEL = os.getenv("GEMINI_MODEL", "gemini-flash-lite-latest")
FALLBACK_MODELS = ["gemini-flash-lite-latest", "gemini-3.1-flash-lite", "gemini-3.5-flash", "gemini-2.5-flash"]
KNOWLEDGE_DIR = os.path.join(os.path.dirname(__file__), "..", "knowledge")


def get_gemini_api_key() -> str:
    """Lấy API Key của Gemini từ biến môi trường."""
    api_key = os.getenv("GEMINI_API_KEY", "").strip()
    if not api_key:
        raise ValueError("Chưa cấu hình GEMINI_API_KEY trong file .env hoặc biến môi trường!")
    return api_key


def load_psychology_knowledge() -> str:
    """Đọc toàn bộ tài liệu tâm lý học / sách trong thư mục knowledge để nạp cho El Pulga."""
    if not os.path.exists(KNOWLEDGE_DIR):
        return ""

    knowledge_snippets = []
    # Tìm kiếm các file txt và md trong knowledge (bỏ qua README.md)
    for ext in ("*.txt", "*.md"):
        for filepath in glob.glob(os.path.join(KNOWLEDGE_DIR, ext)):
            filename = os.path.basename(filepath)
            if filename.lower() == "readme.md":
                continue
            try:
                with open(filepath, "r", encoding="utf-8") as f:
                    content = f.read().strip()
                    if content:
                        knowledge_snippets.append(f"--- [TÀI LIỆU: {filename}] ---\n{content}")
            except Exception as e:
                logger.warning("Không thể đọc tài liệu tâm lý %s: %s", filepath, e)

    if knowledge_snippets:
        return "\n\n[TRI THỨC & TÀI LIỆU TÂM LÝ HỌC THAM KHẢO]:\n" + "\n\n".join(knowledge_snippets)
    return ""


def build_system_prompt(user_id: int, db: Session) -> str:
    """Xây dựng System Prompt riêng biệt dựa trên hồ sơ và bài khảo sát của từng người dùng."""
    profile = db.query(Profile).filter(Profile.user_id == user_id).first()
    survey = db.query(SurveyAnswer).filter(SurveyAnswer.user_id == user_id).first()

    display_name = (profile.display_name if profile and profile.display_name else "bạn").strip()
    bio = (profile.bio if profile and profile.bio else "").strip()

    survey_context_lines = []
    if survey:
        if survey.age_group:
            survey_context_lines.append(f"- Nhóm độ tuổi: {survey.age_group}")
        if survey.current_status:
            survey_context_lines.append(f"- Tình trạng hiện tại: {survey.current_status}")
        if survey.life_situation:
            survey_context_lines.append(f"- Hoàn cảnh cuộc sống: {survey.life_situation}")
        if survey.recent_feelings:
            feelings_str = ", ".join(survey.recent_feelings) if isinstance(survey.recent_feelings, list) else str(survey.recent_feelings)
            survey_context_lines.append(f"- Những cảm xúc gần đây họ trải qua: {feelings_str}")
        if survey.goals:
            goals_str = ", ".join(survey.goals) if isinstance(survey.goals, list) else str(survey.goals)
            survey_context_lines.append(f"- Mục tiêu khi đến đây: {goals_str}")
        if survey.community_expectations:
            exp_str = ", ".join(survey.community_expectations) if isinstance(survey.community_expectations, list) else str(survey.community_expectations)
            survey_context_lines.append(f"- Kỳ vọng ở người lắng nghe / cộng đồng: {exp_str}")
        if survey.topics or survey.free_time_activities:
            topics = (survey.topics or []) + (survey.free_time_activities or [])
            survey_context_lines.append(f"- Sở thích & Chủ đề quan tâm: {', '.join(topics)}")
        if survey.story:
            survey_context_lines.append(f"- Câu chuyện / Tâm sự cá nhân của họ:\n  \"{survey.story}\"")
        if survey.what_you_want_others_to_understand:
            survey_context_lines.append(f"- Điều họ khao khát người khác thấu hiểu nhất:\n  \"{survey.what_you_want_others_to_understand}\"")

    if survey_context_lines:
        survey_section = "### THÔNG TIN TÂM LÝ & BỐI CẢNH CỦA NGƯỜI DÙNG (TỪ BÀI KHẢO SÁT):\n" + "\n".join(survey_context_lines)
    else:
        survey_section = f"Người dùng ({display_name}) chưa hoàn thành bài khảo sát chi tiết. Hãy lắng nghe và nhẹ nhàng tìm hiểu khi họ muốn chia sẻ."

    knowledge_section = load_psychology_knowledge()

    prompt = f"""Bạn là "El Pulga" — người bạn tâm giao, lắng nghe và đồng hành tâm lý ấm áp, sâu sắc trên nền tảng Kindred (La Pulga).

{survey_section}
{knowledge_section}

### NGUYÊN TẮC THAM VẤN & GIAO TIẾP TÂM LÝ:
1. THẤU CẢM & KHÔNG PHÁN XÉT (Carl Rogers - Liệu pháp Nhân văn):
   - Bạn ĐÃ HIỂU hoàn cảnh và những trăn trở của {display_name} qua thông tin khảo sát ở trên. Tuyệt đối KHÔNG hỏi lại những câu hỏi máy móc như "Bạn bao nhiêu tuổi?", "Bạn đang cảm thấy thế nào?" một cách hời hợt.
   - Hãy nhắc đến những trăn trở của họ một cách tự nhiên, dịu dàng khi thích hợp để họ cảm thấy mình thực sự được thấu suốt và đón nhận vô điều kiện.
   - Luôn hợp thức hóa (validate) cảm xúc của họ: Để họ cảm nhận rằng mọi nỗi buồn, sự cô đơn, mệt mỏi hay áp lực họ đang trải qua là hoàn toàn dễ hiểu và xứng đáng được chia sẻ.

2. PHONG CÁCH XƯNG HÔ & GIỌNG VĂN:
   - Xưng hô: Tự xưng là "El Pulga" (hoặc "mình", "tớ"), gọi người dùng là "{display_name}".
   - Giọng văn: Ấm áp, nhẹ nhàng, sâu lắng, tinh tế và chân thực như một người bạn tri kỷ, không sáo rỗng, không robot, không giáo điều đạo lý.
   - Tránh những lời khuyên nông cạn kiểu "Cố lên", "Hãy suy nghĩ tích cực". Thay vào đó, hãy đồng hành, đặt câu hỏi gợi mở để họ bộc bạch và tự tìm thấy sự bình an trong tâm hồn.

3. LIÊN KẾT HỘI THOẠI (CONTEXT & MEMORY):
   - Luôn kết nối mạch câu chuyện với những gì {display_name} đã tâm sự ở các câu trước.
   - Giữ các câu trả lời súc tích vừa phải, không dài lê thê làm người đang mệt mỏi cảm thấy quá tải đọc chữ. Tạo khoảng trống để họ phản hồi.

4. RANH GIỚI AN TOÀN TÂM LÝ:
   - Bạn là người bạn tâm giao và hỗ trợ cảm xúc, không thay thế bác sĩ tâm thần điều trị y khoa.
   - Nếu phát hiện người dùng có ý định tự hại bản thân hoặc khủng hoảng cực độ, hãy thể hiện sự yêu thương, kiên định ở bên họ và tha thiết khuyên họ gọi đường dây nóng hỗ trợ tâm lý khẩn cấp (như 1900 6233 hoặc các trung tâm y tế gần nhất).
"""
    return prompt.strip()


def get_chat_history(db: Session, user_id: int, limit: int = 50) -> List[Dict[str, str]]:
    """Lấy lịch sử tin nhắn gần đây của user với El Pulga."""
    messages = (
        db.query(AIChatMessage)
        .filter(AIChatMessage.user_id == user_id)
        .order_by(AIChatMessage.created_at.desc())
        .limit(limit)
        .all()
    )
    # Đảo ngược lại theo thứ tự thời gian tăng dần
    messages.reverse()
    return [{"role": msg.role, "content": msg.content, "created_at": msg.created_at.isoformat()} for msg in messages]


def save_chat_message(db: Session, user_id: int, role: str, content: str, model: Optional[str] = None) -> AIChatMessage:
    """Lưu tin nhắn vào database."""
    msg = AIChatMessage(
        user_id=user_id,
        role=role,
        content=content,
        model=model or DEFAULT_MODEL
    )
    db.add(msg)
    db.commit()
    db.refresh(msg)
    return msg


def clear_chat_history(db: Session, user_id: int) -> int:
    """Xóa toàn bộ lịch sử trò chuyện của user với El Pulga."""
    deleted_count = db.query(AIChatMessage).filter(AIChatMessage.user_id == user_id).delete()
    db.commit()
    return deleted_count


def generate_gemini_response(
    system_prompt: str,
    history: List[Dict[str, str]],
    user_message: str,
    api_key: str,
    model_name: str = DEFAULT_MODEL
) -> str:
    """Gọi Gemini API thông qua LangChain hoặc Direct REST API."""
    # 1. Thử gọi qua LangChain Google GenAI nếu khả dụng
    try:
        from langchain_google_genai import ChatGoogleGenerativeAI
        from langchain_core.messages import SystemMessage, HumanMessage, AIMessage

        llm = ChatGoogleGenerativeAI(
            model=model_name,
            google_api_key=api_key,
            temperature=0.7,
            max_output_tokens=1024,
        )

        langchain_messages = [SystemMessage(content=system_prompt)]
        for h in history[-10:]:  # Lấy 10 tin nhắn gần nhất làm ngữ cảnh
            if h.get("role") == "user":
                langchain_messages.append(HumanMessage(content=h["content"]))
            elif h.get("role") == "assistant":
                langchain_messages.append(AIMessage(content=h["content"]))

        langchain_messages.append(HumanMessage(content=user_message))

        response = llm.invoke(langchain_messages)
        if response and response.content:
            raw = response.content
            if isinstance(raw, str) and raw.strip():
                return raw.strip()
            elif isinstance(raw, list):
                extracted = []
                for p in raw:
                    if isinstance(p, str):
                        extracted.append(p)
                    elif isinstance(p, dict) and "text" in p:
                        extracted.append(p["text"])
                if extracted:
                    return "\n".join(extracted).strip()
    except Exception as e:
        logger.warning("LangChain invoke gặp lỗi (%s), chuyển sang Direct Gemini API...", e)

    # 2. Dự phòng trực tiếp qua Google Generative Language REST API
    contents = []
    for h in history[-8:]:
        role = "user" if h.get("role") == "user" else "model"
        contents.append({"role": role, "parts": [{"text": h["content"]}]})

    contents.append({"role": "user", "parts": [{"text": user_message}]})

    payload = {
        "system_instruction": {
            "parts": [{"text": system_prompt}]
        },
        "contents": contents,
        "generationConfig": {
            "temperature": 0.7,
            "maxOutputTokens": 1024,
        }
    }

    # Thử danh sách model cho đến khi thành công
    models_to_try = [model_name] + [m for m in FALLBACK_MODELS if m != model_name]
    last_error = None

    for m in models_to_try:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{m}:generateContent?key={api_key}"
        data = json.dumps(payload).encode("utf-8")
        req = urllib.request.Request(url, data=data, headers={"Content-Type": "application/json"})
        try:
            with urllib.request.urlopen(req, timeout=25) as resp:
                res_data = json.loads(resp.read().decode("utf-8"))
                candidates = res_data.get("candidates", [])
                if candidates and "content" in candidates[0]:
                    parts = candidates[0]["content"].get("parts", [])
                    if parts:
                        return parts[0].get("text", "").strip()
        except Exception as err:
            logger.warning("Model %s không phản hồi (%s), thử model tiếp theo...", m, err)
            last_error = err

    raise RuntimeError(f"Không thể kết nối tới các model Gemini: {last_error}")
