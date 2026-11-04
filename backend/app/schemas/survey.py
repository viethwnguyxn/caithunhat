from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field


class SurveyCreate(BaseModel):
    # Step 1: About You
    age_group: str = Field(..., description="Nhóm độ tuổi: Dưới 18, 18-22, 23-26, 27-35, 36-50, Trên 50")
    current_status: str = Field(..., description="Tình trạng hiện tại: Sinh viên, Đi làm, Freelancer, Đang tìm việc...")

    # Step 2: Life Situation
    life_situation: str = Field(..., description="Hoàn cảnh sống hiện tại: Đang chuyển ngành, Bắt đầu độc lập, Áp lực công việc...")
    recent_feelings: list[str] = Field(default_factory=list, description="Cảm xúc gần đây: Cô đơn, Lo lắng, Hy vọng, Hào hứng...")

    # Step 3: Goals
    goals: list[str] = Field(default_factory=list, description="Mục tiêu bản thân: Tìm bạn tâm giao, Phát triển sự nghiệp, Chia sẻ sở thích...")
    community_expectations: list[str] = Field(default_factory=list, description="Mong muốn từ cộng đồng: Lắng nghe không phán xét, Lời khuyên tích cực...")

    # Step 4: Interests
    topics: list[str] = Field(default_factory=list, description="Chủ đề quan tâm: Công nghệ, Nghệ thuật, Sách, Tâm lý học, Du lịch...")
    free_time_activities: list[str] = Field(default_factory=list, description="Hoạt động rảnh: Xem phim, Đọc sách, Chạy bộ, Nghe podcast...")

    # Step 5: Connection
    desired_connection_types: list[str] = Field(default_factory=list, description="Kiểu kết nối mong muốn: Bạn bè 1-1, Nhóm học tập, Người đồng hành...")
    preferred_mode: str = Field(..., description="Phương thức ưu tiên: Nhắn tin chậm rãi, Trò chuyện thường xuyên, Cùng chia sẻ bài viết")
    discovery_preference: str = Field(..., description="Tùy chọn khám phá: Tương đồng tối đa, Mở rộng góc nhìn mới")

    # Step 6: Story (Optional)
    story: str | None = Field(None, max_length=2000, description="Câu chuyện ngắn của bạn (tùy chọn)")
    what_you_want_others_to_understand: str | None = Field(None, max_length=1000, description="Điều bạn muốn người khác hiểu về mình (tùy chọn)")


class SurveyResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    age_group: str
    current_status: str
    life_situation: str
    recent_feelings: list[str]
    goals: list[str]
    community_expectations: list[str]
    topics: list[str]
    free_time_activities: list[str]
    desired_connection_types: list[str]
    preferred_mode: str
    discovery_preference: str
    story: str | None = None
    what_you_want_others_to_understand: str | None = None
    created_at: datetime
    updated_at: datetime
