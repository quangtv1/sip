# SIP — Hệ thống đóng gói hồ sơ lưu trữ số

Ứng dụng web hỗ trợ cán bộ lưu trữ Việt Nam **xác thực và đóng gói hồ sơ số** theo chuẩn Thông tư 05/TT-BNV. Người dùng tải lên thư mục hồ sơ (Excel metadata + PDF), hệ thống tự động kiểm tra lỗi, hiển thị trực quan, cho phép sửa ngay trên giao diện, rồi xuất gói SIP chuẩn OAIS.

**Mục tiêu:** Giảm thời gian đóng gói từ 2 giờ xuống <10 phút, đạt 100% tuân thủ TT05.

---

## Tính năng chính

| Nhóm | Chức năng |
|------|-----------|
| **Tải lên** | Kéo thả thư mục hồ sơ (xlsx + PDF), kiểm tra cấu trúc Attachment/Metadata, chống ZIP bomb & path traversal |
| **Xác thực** | Kiểm tra từng trường dữ liệu (11 kiểu: string, date, positiveInt, enum, float, boolean, regex, email, url, range, dependent-enum), cross-validate đếm văn bản, trùng mã, khoảng ngày, mapping PDF–Excel |
| **Hồ sơ xác thực** | Quản lý nhiều profile (TT05, TT04, tuỳ chỉnh), mỗi profile định nghĩa tên sheet Excel và schema trường riêng; 1 profile active toàn hệ thống |
| **Sửa trực tiếp** | Bảng dữ liệu Excel có thể sửa inline, tô sáng ô lỗi/cảnh báo, validate real-time theo từng trường |
| **Tự động sửa** | Gợi ý sửa định dạng ngày, trim whitespace, fuzzy match danh mục (Levenshtein) |
| **Quy trình duyệt** | State machine: UPLOAD → VALIDATING → VALIDATED → APPROVED → PACKAGING → DONE (+ REJECTED) |
| **RBAC** | 5 vai trò: Admin, Operator, Approver, Signer, Auditor; phân quyền theo endpoint |
| **Đóng gói SIP** | Sinh METS.xml + EAD.xml + PREMIS.xml, tính SHA-256 checksum, nén ZIP async (BullMQ queue) |
| **Cấu hình hệ thống** | Quản lý danh mục (enum), cấu trúc trường (schema), profile tiêu chuẩn qua giao diện web |
| **Nhật ký kiểm toán** | Mọi hành động được ghi log bất biến vào MongoDB |

---

## Kiến trúc

```
Browser (React 18 + Ant Design 5)
        │ HTTP/REST + JWT
        ▼
Nginx :8080  (Reverse proxy + Static files)
        │
        ▼
Express :3000  (Backend API)
   ├── /api/upload       Upload & parse hồ sơ
   ├── /api/validate     Xác thực toàn bộ / inline
   ├── /api/save         Lưu chỉnh sửa (versioning, 20 phiên bản)
   ├── /api/package      Đóng gói SIP async
   ├── /api/approve      Luồng duyệt (approve/reject)
   └── /api/config       Profile, schema, enum CRUD
        │
        ├── MongoDB :27017  (Dossier, AuditLog, AppConfig)
        └── MinIO :9000     (PDF files, SIP packages)
```

**Stack:**
- **Backend:** Node.js 20, Express 4, Mongoose, BullMQ, SheetJS, archiver
- **Frontend:** React 18, Ant Design 5, Vite 5, React Query, Axios
- **Infrastructure:** Docker Compose, Nginx, MongoDB 7, MinIO, Redis 7

---

## Cài đặt & Triển khai

### Yêu cầu

- Docker + Docker Compose ≥ 1.29
- Git

### Cấu hình môi trường

```bash
cp backend/.env.example backend/.env
```

Chỉnh sửa `backend/.env`:

```env
MONGO_URL=mongodb://mongo:27017/sip
REDIS_URL=redis://redis:6379
MINIO_ENDPOINT=minio
MINIO_PORT=9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
JWT_SECRET=your-secret-key
NODE_ENV=production
```

### Khởi động

```bash
# Build và chạy tất cả services
docker-compose up -d --build

# Kiểm tra logs
docker-compose logs -f backend
```

Ứng dụng chạy tại **http://localhost:8080**

### Tài khoản mặc định

| Email | Mật khẩu | Vai trò |
|-------|---------|---------|
| `admin@example.com` | `admin123` | Admin |

### Dừng hệ thống

```bash
docker-compose down
```

---

## Cấu trúc thư mục hồ sơ đầu vào

```
TenHoSo/
├── Metadata/
│   └── HoSo.xlsx        # Sheet "Ho_so" (1 dòng) + Sheet "Van_ban" (N dòng)
└── Attachment/
    ├── VB001.pdf
    ├── VB002.pdf
    └── ...
```

---

## Phát triển

```bash
# Backend (dev)
cd backend && npm install && npm run dev

# Frontend (dev)
cd frontend && npm install && npm run dev

# Chạy test
cd backend && npm test
```

**Yêu cầu:** Node.js 20+, MongoDB và Redis đang chạy (hoặc dùng Docker Compose)

---

## Tài liệu

| File | Nội dung |
|------|----------|
| `docs/project-overview-pdr.md` | Tổng quan dự án, yêu cầu sản phẩm |
| `docs/system-architecture.md` | Kiến trúc hệ thống chi tiết |
| `docs/codebase-summary.md` | Tóm tắt codebase, trạng thái triển khai |
| `docs/code-standards.md` | Quy chuẩn code |
| `docs/project-roadmap.md` | Lộ trình phát triển |

---

## Giấy phép

Nội bộ — chưa phát hành công khai.
