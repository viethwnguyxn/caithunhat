from fastapi import HTTPException, status
from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from ..models.profile import Profile
from ..models.report import Report
from ..models.user import User
from ..schemas.admin import (
    AdminReportDetailResponse,
    AdminReportUpdate,
    AdminReportUserSummary,
    AdminStatsResponse,
    AdminUserResponse,
    AdminUserStatusResponse,
)


def get_admin_stats(db: Session) -> AdminStatsResponse:
    """Tổng hợp số liệu thống kê hệ thống dành cho Admin Dashboard."""
    total_users = db.query(User).count()
    active_users = db.query(User).filter(User.is_active == True).count()
    locked_users = db.query(User).filter(User.is_active == False).count()
    pending_reports = db.query(Report).filter(Report.status == "pending").count()
    total_reports = db.query(Report).count()

    return AdminStatsResponse(
        total_users=total_users,
        active_users=active_users,
        locked_users=locked_users,
        pending_reports=pending_reports,
        total_reports=total_reports,
    )


def get_all_users(
    db: Session, search: str | None = None, role: str | None = None
) -> list[AdminUserResponse]:
    """Lấy danh sách tất cả người dùng kèm thông tin hồ sơ và trạng thái."""
    stmt = (
        select(User, Profile)
        .outerjoin(Profile, User.id == Profile.user_id)
        .order_by(User.created_at.desc())
    )

    if search:
        kw = f"%{search.strip().lower()}%"
        stmt = stmt.where(
            or_(
                User.username.ilike(kw),
                User.email.ilike(kw),
            )
        )

    if role and role in ["user", "admin"]:
        stmt = stmt.where(User.role == role)

    rows = db.execute(stmt).all()

    results: list[AdminUserResponse] = []
    for row in rows:
        u, p = row
        results.append(
            AdminUserResponse(
                id=u.id,
                email=u.email,
                username=u.username,
                role=getattr(u, "role", "user"),
                is_active=bool(u.is_active),
                is_online=bool(getattr(u, "is_online", False)),
                display_name=p.display_name if p and p.display_name else u.username,
                avatar_url=p.avatar_url if p and p.avatar_url else u.avatar_url,
                auth_provider=getattr(u, "auth_provider", "local"),
                created_at=u.created_at,
            )
        )

    return results


def toggle_user_status(
    db: Session, admin_user: User, target_user_id: int
) -> AdminUserStatusResponse:
    """Khóa hoặc Mở khóa tài khoản người dùng."""
    if admin_user.id == target_user_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Không thể tự khóa tài khoản của chính mình",
        )

    target_user = db.query(User).filter(User.id == target_user_id).first()
    if not target_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Người dùng không tồn tại",
        )

    # Đảo trạng thái is_active
    target_user.is_active = not target_user.is_active
    db.commit()
    db.refresh(target_user)

    msg = (
        f"Đã mở khóa tài khoản @{target_user.username} thành công"
        if target_user.is_active
        else f"Đã khóa tài khoản @{target_user.username} thành công"
    )

    return AdminUserStatusResponse(
        success=True,
        message=msg,
        user_id=target_user.id,
        is_active=target_user.is_active,
    )


def _build_user_summary(db: Session, user_id: int) -> AdminReportUserSummary:
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        return AdminReportUserSummary(
            id=user_id,
            username="unknown",
            display_name="Đã xóa",
            avatar_url=None,
            is_active=False,
        )

    profile = db.query(Profile).filter(Profile.user_id == user_id).first()
    return AdminReportUserSummary(
        id=user.id,
        username=user.username,
        display_name=profile.display_name if profile and profile.display_name else user.username,
        avatar_url=profile.avatar_url if profile and profile.avatar_url else user.avatar_url,
        is_active=bool(user.is_active),
    )


def get_all_reports(
    db: Session, status_filter: str | None = None
) -> list[AdminReportDetailResponse]:
    """Lấy danh sách các đơn báo cáo vi phạm kèm thông tin người gửi & người bị tố cáo."""
    query = db.query(Report).order_by(Report.created_at.desc())
    if status_filter and status_filter in ["pending", "resolved", "dismissed"]:
        query = query.filter(Report.status == status_filter)

    reports = query.all()
    results: list[AdminReportDetailResponse] = []

    for r in reports:
        reporter_summary = _build_user_summary(db, r.reporter_id)
        reported_summary = _build_user_summary(db, r.reported_id)

        results.append(
            AdminReportDetailResponse(
                id=r.id,
                reporter=reporter_summary,
                reported=reported_summary,
                reason=r.reason,
                description=r.description,
                status=r.status,
                created_at=r.created_at,
            )
        )

    return results


def update_report_status(
    db: Session, report_id: int, update_in: AdminReportUpdate
) -> AdminReportDetailResponse:
    """Cập nhật trạng thái đơn báo cáo vi phạm ('resolved' hoặc 'dismissed')."""
    if update_in.status not in ["pending", "resolved", "dismissed"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Trạng thái không hợp lệ. Chỉ chấp nhận 'resolved' hoặc 'dismissed'.",
        )

    report = db.query(Report).filter(Report.id == report_id).first()
    if not report:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy đơn báo cáo vi phạm",
        )

    report.status = update_in.status

    # Nếu chọn khóa tài khoản người bị tố cáo
    if update_in.lock_reported_user and update_in.status == "resolved":
        reported_user = db.query(User).filter(User.id == report.reported_id).first()
        if reported_user:
            reported_user.is_active = False

    db.commit()
    db.refresh(report)

    return AdminReportDetailResponse(
        id=report.id,
        reporter=_build_user_summary(db, report.reporter_id),
        reported=_build_user_summary(db, report.reported_id),
        reason=report.reason,
        description=report.description,
        status=report.status,
        created_at=report.created_at,
    )

