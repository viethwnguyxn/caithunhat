"""
Script sao chép toàn bộ dữ liệu từ Supabase cũ (Ireland) sang Supabase mới (Singapore).
Cách dùng:
    python migrate_db.py "URL_DATABASE_CU" "URL_DATABASE_MOI"
"""
import sys
import psycopg2
from sqlalchemy import create_engine, MetaData, text
from sqlalchemy.pool import NullPool

def normalize_url(url: str) -> str:
    url = url.strip().strip('"').strip("'")
    if url.startswith("postgres://"):
        url = url.replace("postgres://", "postgresql://", 1)
    return url

def main():
    if len(sys.argv) < 3:
        print("❌ Vui lòng truyền đủ 2 đường link:")
        print('   python migrate_db.py "URL_DATABASE_CU" "URL_DATABASE_MOI"')
        sys.exit(1)

    old_url = normalize_url(sys.argv[1])
    new_url = normalize_url(sys.argv[2])

    print("🔄 Đang kết nối tới 2 Database...")
    try:
        old_engine = create_engine(old_url, poolclass=NullPool)
        new_engine = create_engine(new_url, poolclass=NullPool)

        with old_engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        print("✅ Kết nối Database CŨ thành công.")

        with new_engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        print("✅ Kết nối Database MỚI thành công.")
    except Exception as e:
        print(f"❌ Lỗi kết nối: {e}")
        sys.exit(1)

    print("\n📦 Đang đọc cấu trúc các bảng từ Database cũ...")
    old_meta = MetaData()
    old_meta.reflect(bind=old_engine)

    if not old_meta.tables:
        print("⚠️ Database cũ không có bảng nào để sao chép.")
        sys.exit(0)

    print(f"📋 Tìm thấy {len(old_meta.tables)} bảng. Đang tạo bảng tại Database mới nếu chưa có...")
    old_meta.create_all(bind=new_engine)

    print("\n🚀 Bắt đầu chuyển dữ liệu theo đúng thứ tự quan hệ khóa ngoại (Foreign Keys)...")
    with old_engine.connect() as old_conn, new_engine.connect() as new_conn:
        for table in old_meta.sorted_tables:
            table_name = table.name
            # Lấy toàn bộ dữ liệu từ bảng cũ
            result = old_conn.execute(table.select()).fetchall()
            row_count = len(result)
            if row_count == 0:
                print(f"  ▫️ Bảng [{table_name}]: 0 dòng (bỏ qua)")
                continue

            # Chuyển đổi thành danh sách dict
            rows_data = [dict(row._mapping) for row in result]

            # Xóa sạch dữ liệu cũ ở bảng mới (nếu có) trước khi insert để tránh trùng lặp
            try:
                new_conn.execute(text(f'TRUNCATE TABLE "{table_name}" CASCADE;'))
                new_conn.commit()
            except Exception:
                pass

            # Insert vào bảng mới
            new_conn.execute(table.insert(), rows_data)
            new_conn.commit()
            print(f"  ✅ Bảng [{table_name}]: Đã chuyển {row_count} bản ghi.")

            # Cập nhật PostgreSQL sequence để các ID tự tăng tiếp tục bình thường
            try:
                seq_query = text(f"""
                    SELECT setval(pg_get_serial_sequence('"{table_name}"', 'id'), coalesce(max(id), 1), max(id) IS NOT null) 
                    FROM "{table_name}";
                """)
                new_conn.execute(seq_query)
                new_conn.commit()
            except Exception:
                pass

    print("\n🎉 HOÀN TẤT CHUYỂN DỮ LIỆU 100% SANG SUPABASE MỚI!")

if __name__ == "__main__":
    main()
