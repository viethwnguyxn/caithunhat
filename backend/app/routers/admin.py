from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from ..db.database import get_db
from ..models.user import User
from ..routers.deps import get_current_admin
from ..schemas.admin import (
    AdminReportDetailResponse,
    AdminReportUpdate,
    AdminStatsResponse,
    AdminUserResponse,
    AdminUserStatusResponse,
)
from ..services import admin_service

router = APIRouter(prefix="/api/admin", tags=["admin"])


@router.get("/stats", response_model=AdminStatsResponse)
def get_stats(
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    """Lấy số liệu thống kê tổng quan của hệ thống."""
    return admin_service.get_admin_stats(db=db)


@router.get("/users", response_model=list[AdminUserResponse])
def get_users(
    search: str | None = Query(None, description="Tìm kiếm theo username hoặc email"),
    role: str | None = Query(None, description="Lọc theo role ('user', 'admin')"),
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    """Lấy danh sách tất cả người dùng trong hệ thống."""
    return admin_service.get_all_users(db=db, search=search, role=role)


@router.put("/users/{user_id}/toggle-status", response_model=AdminUserStatusResponse)
def toggle_user_status(
    user_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    """Khóa hoặc mở khóa tài khoản người dùng."""
    return admin_service.toggle_user_status(db=db, admin_user=admin, target_user_id=user_id)


@router.get("/reports", response_model=list[AdminReportDetailResponse])
def get_reports(
    status: str | None = Query(None, description="Lọc theo trạng thái ('pending', 'resolved', 'dismissed')"),
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    """Lấy danh sách các đơn báo cáo vi phạm."""
    return admin_service.get_all_reports(db=db, status_filter=status)


@router.put("/reports/{report_id}", response_model=AdminReportDetailResponse)
def update_report(
    report_id: int,
    update_in: AdminReportUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    """Xử lý đơn báo cáo vi phạm: Chấp nhận vi phạm (resolved) hoặc Bác bỏ (dismissed)."""
    return admin_service.update_report_status(db=db, report_id=report_id, update_in=update_in)

