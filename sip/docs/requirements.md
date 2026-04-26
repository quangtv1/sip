# Tài liệu Yêu cầu Hệ thống
## Ứng dụng Đóng gói SIP theo Thông tư 05/TT-BNV

**Phiên bản:** 1.0  
**Ngày:** 2026-04-25  
**Trạng thái:** Draft

---

## Mục lục

1. [Tổng quan hệ thống](#1-tổng-quan-hệ-thống)
2. [Kiến trúc hệ thống](#2-kiến-trúc-hệ-thống)
3. [Cấu trúc dữ liệu đầu vào](#3-cấu-trúc-dữ-liệu-đầu-vào)
4. [Quan hệ PDF – Excel](#4-quan-hệ-pdf--excel)
5. [Validation Engine (TT05)](#5-validation-engine-tt05)
6. [Auto-fix Engine](#6-auto-fix-engine)
7. [Giao diện người dùng (UI/UX)](#7-giao-diện-người-dùng-uiux)
8. [Đóng gói SIP](#8-đóng-gói-sip)
9. [Ký số điện tử](#9-ký-số-điện-tử)
10. [Workflow xử lý](#10-workflow-xử-lý)
11. [Audit Log](#11-audit-log)
12. [Dashboard & Thống kê](#12-dashboard--thống-kê)
13. [Cấu hình Storage (MinIO)](#13-cấu-hình-storage-minio)
14. [File Browser & PDF Preview](#14-file-browser--pdf-preview)
15. [SIP Viewer & XML Preview](#15-sip-viewer--xml-preview)
16. [Phân quyền người dùng (RBAC)](#16-phân-quyền-người-dùng-rbac)
17. [API Backend](#17-api-backend)
18. [Triển khai (Docker)](#18-triển-khai-docker)
19. [Nguyên tắc hệ thống](#19-nguyên-tắc-hệ-thống)
20. [Hướng mở rộng](#20-hướng-mở-rộng)

---

## 1. Tổng quan hệ thống

### 1.1 Mục tiêu

Ứng dụng web hỗ trợ cán bộ lưu trữ **kiểm tra, xử lý và đóng gói hồ sơ tài liệu điện tử** theo đúng chuẩn **Thông tư 05/TT-BNV** về lưu trữ tài liệu số. Đầu vào là thư mục hồ sơ (Excel metadata + file PDF), đầu ra là gói **SIP (Submission Information Package)** chuẩn OAIS.

### 1.2 Luồng xử lý tổng thể

```
Upload thư mục hồ sơ
        ↓
Kiểm tra cấu trúc thư mục
        ↓
Đọc file Excel (Ho_so + Van_ban)
        ↓
Validate dữ liệu theo TT05
        ↓
Hiển thị lỗi + Highlight trực quan
        ↓
[Người dùng xem xét, sửa lỗi]
        ↓
Phê duyệt (Approve)
        ↓
Đóng gói SIP (METS + EAD + PREMIS + checksum)
        ↓
Ký số điện tử (XML signature + TSA)
        ↓
Upload SIP + PDF → MinIO
        ↓
Ghi Audit Log → Cập nhật Dashboard
```

### 1.3 Ràng buộc chung

- Tuân thủ **tuyệt đối** Thông tư 05 (giá trị enum cứng, không tự ý linh hoạt)
- **Không cho phép đóng gói** nếu còn lỗi mức ERROR
- Validator phải **stateless** (không lưu state giữa các request)
- **Không tự động sửa dữ liệu** – chỉ gợi ý, người dùng quyết định

---

## 2. Kiến trúc hệ thống

### 2.1 Sơ đồ kiến trúc

```
Browser (React + Ant Design)
        ↓ HTTP/REST
Nginx (reverse proxy, port 8080)
        ↓
Backend API (Node.js + Express, port 3000)
    ├── Validation Service
    ├── Auto-fix Engine
    ├── Packaging Engine
    ├── Workflow Engine
    └── Storage Service (MinIO adapter)
        ↓
MongoDB (audit log, config, version)
MinIO (pdf-files/, sip-files/)
```

### 2.2 Tech stack

| Thành phần | Công nghệ |
|---|---|
| Frontend | React, Ant Design, Chart.js |
| Backend | Node.js, Express |
| Database | MongoDB |
| Object Storage | MinIO |
| Containerization | Docker, Docker Compose |
| Reverse Proxy | Nginx |
| File Excel | SheetJS (xlsx) |
| Validation | AJV (JSON Schema) |

### 2.3 Nguyên tắc kiến trúc

- Các module **độc lập** (microservice-ready): UI / Validation / Packaging / Workflow
- API **stateless**
- Storage **tách riêng** (MinIO), không lưu file trên server
- Config **env-based** (không hardcode)

---

## 3. Cấu trúc dữ liệu đầu vào

### 3.1 Cấu trúc thư mục bắt buộc

```
[TenHoSo]/
├── Attachment/          ← chứa các file PDF văn bản
│   ├── VB001.pdf
│   ├── VB002.pdf
│   └── ...
└── Metadata/            ← chứa file Excel metadata
    └── [TenHoSo].xlsx   ← đúng 1 file Excel
```

**Ràng buộc:**

- Phải có thư mục `Attachment/`
- Phải có thư mục `Metadata/`
- `Metadata/` phải chứa **đúng 1** file Excel
- Sai cấu trúc → **block toàn bộ pipeline**, không cho tiếp tục
- Không tự sửa cấu trúc – chỉ báo lỗi

### 3.2 Cấu trúc file Excel – Sheet `Ho_so` (18 trường)

| # | Tên cột | Bắt buộc | Mô tả / Enum |
|---|---------|----------|-------------|
| 1 | Mã hồ sơ | Có | Regex ≥4 đoạn phân tách `.`; trùng tên folder |
| 2 | Tiêu đề hồ sơ | Có | Không rỗng |
| 3 | Thời hạn bảo quản | Có | `01: Vĩnh viễn` / `02: 70 năm` / `03: 50 năm` / `04: 30 năm` / `05: 20 năm` / `06: 10 năm` |
| 4 | Chế độ sử dụng | Có | `01: Công khai` / `02: Sử dụng có điều kiện` / `03: Mật` |
| 5 | Ngôn ngữ | Có | `01: Tiếng Việt` … `11: Khác` (11 giá trị) |
| 6 | Thời gian bắt đầu | Có | DD/MM/YYYY |
| 7 | Thời gian kết thúc | Có | DD/MM/YYYY |
| 8 | Từ khóa | Có | Không rỗng |
| 9 | Tổng số tài liệu trong hồ sơ | Có | Số nguyên dương; bằng số dòng Van_ban |
| 10 | Số lượng tờ | Có | Số nguyên dương |
| 11 | Số lượng trang | Có | Số nguyên dương |
| 12 | Tình trạng vật lý (nếu có) | Không | `01: Tốt` / `02: Bình thường` / `03: Hỏng` |
| 13 | Ký hiệu thông tin (nếu có) | Không | Tự do |
| 14 | Mức độ tin cậy | Có | `01: Gốc điện tử` / `02: Số hóa` / `03: Hỗn hợp` |
| 15 | Mã hồ sơ gốc giấy (nếu có) | Không | Tự do |
| 16 | Chế độ dự phòng | Có | `1: Có` / `0: Không` |
| 17 | Tình trạng dự phòng | Điều kiện | `01: Đã dự phòng` / `02: Chưa dự phòng`; bắt buộc khi trường 16 = `1: Có` |
| 18 | Ghi chú | Có | Không rỗng |

### 3.3 Cấu trúc file Excel – Sheet `Van_ban` (21 trường)

| # | Tên cột | Bắt buộc | Mô tả / Enum |
|---|---------|----------|-------------|
| 1 | Mã định danh tài liệu | Có | Trùng tên file tài liệu |
| 2 | Mã lưu trữ của tài liệu | Có | Regex `{MaHoSo}.\d{7}` (7 chữ số cuối) |
| 3 | Thời hạn bảo quản | Có | Enum 6 giá trị (như Ho_so trường 3) |
| 4 | Tên loại tài liệu | Có | `01: Nghị quyết` … `32: Khác` (32 giá trị) |
| 5 | Số của tài liệu | Có | Không rỗng |
| 6 | Ký hiệu của tài liệu | Có | Không rỗng |
| 7 | Ngày, tháng, năm tài liệu | Có | DD/MM/YYYY |
| 8 | Tên cơ quan, tổ chức, cá nhân ban hành tài liệu | Có | Không rỗng |
| 9 | Trích yếu nội dung | Có | Không rỗng |
| 10 | Ngôn ngữ | Có | Enum 11 giá trị (như Ho_so trường 5) |
| 11 | Số lượng trang | Có | Số nguyên dương |
| 12 | Ký hiệu thông tin | Có | Không rỗng |
| 13 | Từ khóa | Có | Không rỗng |
| 14 | Chế độ sử dụng | Có | Enum 3 giá trị (như Ho_so trường 4) |
| 15 | Mức độ tin cậy | Có | Enum 3 giá trị (như Ho_so trường 14) |
| 16 | Bút tích (nếu có) | Không | Tự do |
| 17 | Tình trạng vật lý (nếu có) | Không | Enum 3 giá trị (như Ho_so trường 12) |
| 18 | Chế độ dự phòng | Có | `1: Có` / `0: Không` |
| 19 | Tình trạng dự phòng | Điều kiện | `01: Đã dự phòng` / `02: Chưa dự phòng`; bắt buộc khi trường 18 = `1: Có` |
| 20 | Ghi chú | Có | Không rỗng |
| 21 | Đường dẫn tài liệu Quy trình xử lý (nếu có) | Không | Tên file PDF; nhiều file ngăn cách bởi `,` |

---

## 4. Quan hệ PDF – Excel

### 4.1 Quy tắc mapping

- Dùng trường `Van_ban["Đường dẫn tài liệu Quy trình xử lý (nếu có)"]` (trường 21) làm tên file PDF
- Trường 21 có thể chứa nhiều file, ngăn cách bởi `,`
- Mỗi tên file phải khớp **EXACT MATCH** với file trong `Attachment/` (phân biệt hoa thường)
- Nếu trường 21 rỗng: fallback kiểm tra `{MaLuuTru}.pdf` trong `Attachment/`

### 4.2 Kết quả kiểm tra

| Trường hợp | Mức độ |
|---|---|
| Văn bản trong Excel nhưng không có file PDF tương ứng | ERROR |
| File PDF trong `Attachment/` nhưng không có trong Excel | WARNING |
| Tên file trùng nhau trong cùng thư mục | ERROR |

---

## 5. Validation Engine (TT05)

### 5.1 Validate cấp trường – Sheet `Ho_so`

| Trường | Rule | Mức độ |
|---|---|---|
| Mã hồ sơ (1) | Required + regex ≥4 đoạn `.` + trùng tên folder | ERROR |
| Tiêu đề hồ sơ (2) | Required, không rỗng | ERROR |
| Thời hạn bảo quản (3) | Required + enum exact: `01`–`06` | ERROR |
| Chế độ sử dụng (4) | Required + enum exact: `01: Công khai` / `02: Sử dụng có điều kiện` / `03: Mật` | ERROR |
| Ngôn ngữ (5) | Required + enum exact: `01: Tiếng Việt`–`11: Khác` | ERROR |
| Thời gian bắt đầu (6) | Required + DD/MM/YYYY | ERROR |
| Thời gian kết thúc (7) | Required + DD/MM/YYYY | ERROR |
| Từ khóa (8) | Required, không rỗng | ERROR |
| Tổng số tài liệu (9) | Required + số nguyên dương + bằng count(Van_ban rows) | ERROR |
| Số lượng tờ (10) | Required + số nguyên dương | ERROR |
| Số lượng trang (11) | Required + số nguyên dương | ERROR |
| Tình trạng vật lý (12) | Optional + enum nếu có | WARNING |
| Mức độ tin cậy (14) | Required + enum exact: `01: Gốc điện tử` / `02: Số hóa` / `03: Hỗn hợp` | ERROR |
| Chế độ dự phòng (16) | Required + enum: `1: Có` / `0: Không` | ERROR |
| Tình trạng dự phòng (17) | Required khi (16)=`1: Có` + enum: `01: Đã dự phòng` / `02: Chưa dự phòng` | ERROR |
| Ghi chú (18) | Required, không rỗng | ERROR |

### 5.2 Validate cấp trường – Sheet `Van_ban`

| Trường | Rule | Mức độ |
|---|---|---|
| Mã định danh tài liệu (1) | Required + trùng tên file | ERROR |
| Mã lưu trữ của tài liệu (2) | Required + regex `{MaHoSo}.\d{7}` | ERROR |
| Thời hạn bảo quản (3) | Required + enum exact 6 giá trị | ERROR |
| Tên loại tài liệu (4) | Required + enum exact: `01: Nghị quyết`–`32: Khác` | ERROR |
| Số của tài liệu (5) | Required, không rỗng | ERROR |
| Ký hiệu của tài liệu (6) | Required, không rỗng | ERROR |
| Ngày, tháng, năm tài liệu (7) | Required + DD/MM/YYYY | ERROR |
| Tên cơ quan ban hành (8) | Required, không rỗng | ERROR |
| Trích yếu nội dung (9) | Required, không rỗng | ERROR |
| Ngôn ngữ (10) | Required + enum exact 11 giá trị | ERROR |
| Số lượng trang (11) | Required + số nguyên dương | ERROR |
| Ký hiệu thông tin (12) | Required, không rỗng | ERROR |
| Từ khóa (13) | Required, không rỗng | ERROR |
| Chế độ sử dụng (14) | Required + enum exact 3 giá trị | ERROR |
| Mức độ tin cậy (15) | Required + enum exact 3 giá trị | ERROR |
| Tình trạng vật lý (17) | Optional + enum nếu có | WARNING |
| Chế độ dự phòng (18) | Required + enum: `1: Có` / `0: Không` | ERROR |
| Tình trạng dự phòng (19) | Required khi (18)=`1: Có` | ERROR |
| Ghi chú (20) | Required, không rỗng | ERROR |

### 5.3 Validate enum (quan trọng)

Enum phải khớp **chuỗi đầy đủ**, bao gồm cả mã số và tên:

```
Đúng:   "01: Nghị quyết"
Sai:    "01"
Sai:    "Nghị quyết"
Sai:    "01-Nghị quyết"
```

> Không trim, không normalize, so sánh EXACT STRING (bao gồm dấu tiếng Việt).

### 5.4 Validate chéo (cross-validation)

| Kiểm tra | Rule |
|---|---|
| Số lượng văn bản | `Ho_so.TongSoTaiLieu == count(Van_ban rows)` |
| Mã lưu trữ | Mỗi `Van_ban.MaLuuTru` phải bắt đầu bằng `Ho_so.MaHoSo` |
| Mã duy nhất | Không có 2 Van_ban trùng MaLuuTru |
| File PDF | Mỗi văn bản phải có file PDF tương ứng |

### 5.5 Phân loại mức độ lỗi

| Mức | Ký hiệu | Hành động |
|---|---|---|
| Lỗi nghiêm trọng | ERROR | Block đóng gói SIP |
| Cảnh báo | WARNING | Cho phép tiếp tục, phải xác nhận |

---

## 6. Auto-fix Engine

> **Nguyên tắc:** Auto-fix chỉ dừng lại ở mức **gợi ý** – người dùng xem xét và quyết định có áp dụng hay không. Hệ thống không được tự động sửa và lưu mà không có sự xác nhận.

### 6.1 Các loại fix được hỗ trợ

| Loại lỗi | Hành động gợi ý |
|---|---|
| Ngày dạng `1-2-2024` | Sửa thành `01/02/2024` |
| Ngày dạng Excel serial number | Chuyển đổi về DD/MM/YYYY |
| Khoảng trắng thừa đầu/cuối | Trim |
| Enum bẩn (`"gốc"` → `"01"`, `"scan"` → `"02"`) | Map fuzzy |
| Số có ký tự lạ (`"10 trang"` → `10`) | Extract số |

### 6.2 Quy trình áp dụng fix

1. Chạy auto-fix scan → liệt kê danh sách gợi ý
2. Người dùng xem diff trước/sau
3. Người dùng chọn "Áp dụng tất cả" hoặc chọn từng mục
4. Sau khi áp dụng → chạy lại validate

---

## 7. Giao diện người dùng (UI/UX)

### 7.1 Upload hồ sơ

- **Drag & drop** thư mục hoặc file zip
- Hỗ trợ upload nhiều hồ sơ cùng lúc
- Hiển thị cây thư mục ngay sau khi upload
- Không cho upload file lẻ (phải đúng cấu trúc)

### 7.2 Tree View (cây thư mục)

- Hiển thị toàn bộ cấu trúc thư mục dạng cây
- Màu sắc phân loại:
  - Đỏ: file/thư mục có lỗi ERROR
  - Vàng: file/thư mục có WARNING
  - Xanh: hợp lệ
- Click file PDF → mở PDF Viewer đồng bộ

### 7.3 Excel Grid (bảng dữ liệu)

- Render dữ liệu 2 sheet thành bảng HTML
- **Highlight cell lỗi** màu đỏ nhạt, hover hiển thị thông báo lỗi
- Chế độ **chỉ xem** khi đang validate
- Dropdown lock cho các trường enum
- **Không cho phép sửa** khi đang ở trạng thái validate (phải chuyển sang chế độ edit)

### 7.4 Editable Excel Grid

- Sửa trực tiếp từng cell trên UI
- Validate **realtime** khi nhập (gọi API inline validate)
- Cell lỗi tô đỏ ngay lập tức sau khi rời ô
- Nút **"Lưu thay đổi"** → gửi về server, validate lại và lưu version mới

### 7.5 Error Panel (bảng lỗi)

- Liệt kê tất cả lỗi theo thứ tự: Sheet → Dòng → Trường
- Click vào lỗi → **cuộn đến cell** tương ứng trong bảng
- Lọc lỗi theo mức độ (ERROR / WARNING)
- Đồng bộ row index giữa bảng lỗi và Excel Grid

### 7.6 PDF Viewer

- Hiển thị file PDF (iframe hoặc PDF.js)
- Đồng bộ: click dòng trong Van_ban → highlight văn bản tương ứng → mở PDF
- Nếu file PDF thiếu → disable viewer, hiển thị thông báo

### 7.7 Rule Editor (dành cho Admin)

- Giao diện cấu hình rule validate
- Xem và chỉnh sửa rule trực tiếp (no-code)
- Các loại rule: required, date, positiveInt, enum, regex
- Rule lưu vào DB, áp dụng ngay không cần restart
- Hỗ trợ nhiều phiên bản schema (multi-version: TT05-2025, TT05-2026...)

---

## 8. Đóng gói SIP

### 8.1 Điều kiện đóng gói

- Toàn bộ validate **không có lỗi ERROR** (chỉ có WARNING hoặc sạch)
- Hồ sơ đã qua bước **Phê duyệt** trong workflow
- Tất cả file PDF đã được xác nhận mapping

### 8.2 Cấu trúc gói SIP xuất ra

```
SIP_[MaHoSo]/
├── METS.xml                    ← file mô tả cấu trúc SIP (bắt buộc)
├── metadata/
│   ├── EAD.xml                 ← mô tả nội dung hồ sơ
│   ├── PREMIS.xml              ← thông tin bảo quản
│   └── checksums.csv           ← SHA256 của tất cả file
└── representations/
    └── original/
        ├── VB001.pdf
        ├── VB002.pdf
        └── ...
```

### 8.3 Các file XML bắt buộc

| File | Chuẩn | Mô tả |
|---|---|---|
| METS.xml | METS 1.12 | Cấu trúc tổng thể gói SIP |
| EAD.xml | EAD 3 | Mô tả nội dung hồ sơ theo chuẩn lưu trữ |
| PREMIS.xml | PREMIS 3 | Metadata bảo quản kỹ thuật |

### 8.4 Checksum

- Thuật toán: **SHA-256**
- Bắt buộc cho **tất cả file** trong gói SIP
- Lưu vào `checksums.csv` và khai báo trong METS.xml
- Verify lại checksum sau khi đóng gói

### 8.5 Đầu ra

- File nén: `SIP_[MaHoSo]_[YYYYMMDD].zip`
- Upload tự động lên MinIO bucket `sip-files/`

---

## 9. Ký số điện tử

### 9.1 Phạm vi ký

- Ký file XML (METS.xml, EAD.xml, PREMIS.xml)
- Chuẩn: **XML Signature (XMLDSig)**

### 9.2 Yêu cầu

- Chữ ký phải **hợp lệ** tại thời điểm verify
- Không bị **tamper** (toàn vẹn)
- Có **TSA timestamp** (dấu thời gian tin cậy)
- Không cho phép ký lại sau khi workflow đã hoàn thành

### 9.3 Verify signature

- Hệ thống verify chữ ký khi load SIP
- Nếu signature không hợp lệ → cảnh báo rõ ràng trên UI

---

## 10. Workflow xử lý

### 10.1 Các trạng thái

```
UPLOAD → VALIDATING → VALIDATED → APPROVED → PACKAGING → SIGNED → DONE
                            ↓
                        REJECTED (quay lại UPLOAD để sửa)
```

### 10.2 Mô tả từng bước

| Trạng thái | Mô tả | Người thực hiện |
|---|---|---|
| UPLOAD | Người dùng tải lên hồ sơ | Operator |
| VALIDATING | Hệ thống tự động validate | System |
| VALIDATED | Validate xong, hiển thị kết quả | System |
| APPROVED | Người có quyền phê duyệt xác nhận | Approver |
| REJECTED | Từ chối, yêu cầu sửa lại | Approver |
| PACKAGING | Hệ thống đóng gói SIP | System |
| SIGNED | Ký số hoàn tất | Signer |
| DONE | Lưu trữ hoàn thành | System |

### 10.3 Ràng buộc workflow

- **Không được bỏ qua** bất kỳ bước nào
- **Không được rollback** sau khi đã ký số
- Mỗi transition phải ghi vào Audit Log

---

## 11. Audit Log

### 11.1 Mục tiêu

Ghi lại toàn bộ hành động của người dùng và hệ thống để phục vụ truy vết, kiểm tra.

### 11.2 Cấu trúc bản ghi log

```json
{
  "id": "uuid",
  "action": "VALIDATE | APPROVE | PACKAGE | SIGN | UPLOAD | DOWNLOAD",
  "user": "username",
  "timestamp": "ISO8601",
  "fileId": "id của hồ sơ",
  "fileName": "tên file",
  "errors": 5,
  "detail": { }
}
```

### 11.3 Ràng buộc

- Log là **append-only** (chỉ ghi thêm, không sửa, không xóa)
- Toàn bộ action đều phải được log, không có ngoại lệ
- Lưu trữ: MongoDB (collection `auditLogs`)

---

## 12. Dashboard & Thống kê

### 12.1 Các chỉ số hiển thị

| Chỉ số | Mô tả |
|---|---|
| Tổng hồ sơ | Tổng số hồ sơ đã xử lý |
| Tổng lỗi | Số lỗi phát sinh |
| Tỷ lệ thành công | % hồ sơ đóng gói thành công |
| Lỗi theo tháng | Biểu đồ line/bar chart |
| Lỗi theo trường | Top trường dữ liệu hay lỗi nhất |
| Trạng thái workflow | Phân bố hồ sơ theo trạng thái |

### 12.2 Drill-down từ Dashboard

- Click 1 dòng log → mở **Modal chi tiết**
  - **Tab 1:** Danh sách lỗi (row, field, message, severity)
  - **Tab 2:** Excel Preview với cell lỗi được highlight

### 12.3 Yêu cầu kỹ thuật

- Dữ liệu **realtime** hoặc near-realtime (< 30 giây)
- Hỗ trợ filter: theo tháng, theo đơn vị, theo mức lỗi
- API: `GET /api/stats` trả về dữ liệu aggregate từ MongoDB

---

## 13. Cấu hình Storage (MinIO)

### 13.1 Mục tiêu

Cho phép admin cấu hình nơi lưu trữ file PDF và gói SIP, hỗ trợ nhiều môi trường (local / MinIO / S3).

### 13.2 Giao diện cài đặt (UI)

Form cấu hình gồm các trường:

| Trường | Mô tả | Ví dụ |
|---|---|---|
| Storage Type | Loại storage | `minio` / `local` |
| Endpoint | Địa chỉ MinIO server | `localhost` |
| Port | Cổng kết nối | `9000` |
| Access Key | Khóa truy cập | `minioadmin` |
| Secret Key | Khóa bí mật (ẩn) | `minioadmin` |
| Bucket PDF | Tên bucket chứa PDF | `pdf-files` |
| Bucket SIP | Tên bucket chứa SIP | `sip-files` |

### 13.3 Tổ chức bucket (best practice)

```
pdf-files/
└── YYYY/
    └── [MaHoSo].pdf

sip-files/
└── YYYY/
    └── SIP_[MaHoSo]_[YYYYMMDD].zip
```

### 13.4 Yêu cầu kỹ thuật

- Cấu hình lưu vào MongoDB, **load động** khi khởi động
- Thay đổi cấu hình → áp dụng ngay **không cần restart**
- Không expose MinIO trực tiếp ra ngoài → dùng **presigned URL** (thời hạn 1 giờ)
- Upload có **retry tự động** (tối đa 3 lần) khi lỗi mạng

---

## 14. File Browser & PDF Preview

### 14.1 File Browser

- Liệt kê file trong MinIO bucket (PDF / SIP)
- Switch giữa 2 bucket qua Tabs
- Thông tin hiển thị: tên file, kích thước, ngày tạo
- Tìm kiếm/lọc file theo tên
- Sort theo ngày tạo

### 14.2 Hành động trên file

| Hành động | Mô tả |
|---|---|
| Preview | Mở file PDF trong modal (presigned URL) |
| Download | Tải file về máy |
| Xem nội dung SIP | Giải nén và hiển thị cây thư mục bên trong |

### 14.3 PDF Preview

- Hiển thị PDF qua `<iframe>` với presigned URL
- Modal có kích thước 900px chiều rộng
- Nếu file không tồn tại → thông báo rõ ràng

---

## 15. SIP Viewer & XML Preview

### 15.1 SIP Viewer

- Click file `.zip` (SIP) → **giải nén in-memory** trên backend (không lưu ra disk)
- Hiển thị cây thư mục bên trong gói SIP
- Hiển thị thông tin: tên file, kích thước, loại file

### 15.2 XML Preview

- Click file XML (METS, EAD, PREMIS) → mở modal
- Hiển thị nội dung XML dạng **cây có thể thu/mở** (collapsible tree)
- Syntax highlighting cho XML
- Hỗ trợ tìm kiếm trong nội dung XML

---

## 16. Phân quyền người dùng (RBAC)

### 16.1 Các role

| Role | Mô tả |
|---|---|
| Admin | Toàn quyền, cấu hình hệ thống, rule editor |
| Operator | Upload, validate, sửa dữ liệu |
| Approver | Phê duyệt hồ sơ |
| Signer | Ký số |
| Auditor | Chỉ xem log và dashboard |

### 16.2 Ma trận phân quyền

| Chức năng | Admin | Operator | Approver | Signer | Auditor |
|---|---|---|---|---|---|
| Upload hồ sơ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Sửa dữ liệu | ✅ | ✅ | ❌ | ❌ | ❌ |
| Phê duyệt | ✅ | ❌ | ✅ | ❌ | ❌ |
| Ký số | ✅ | ❌ | ❌ | ✅ | ❌ |
| Xem dashboard | ✅ | ✅ | ✅ | ✅ | ✅ |
| Xem audit log | ✅ | ❌ | ❌ | ❌ | ✅ |
| Cấu hình rule | ✅ | ❌ | ❌ | ❌ | ❌ |
| Cấu hình storage | ✅ | ❌ | ❌ | ❌ | ❌ |

### 16.3 Yêu cầu kỹ thuật

- Xác thực qua **JWT token**
- API kiểm tra permission trước khi thực thi
- UI **ẩn** các action không có quyền (không chỉ disable)

---

## 17. API Backend

### 17.1 Danh sách API

| Method | Endpoint | Mô tả | Auth |
|---|---|---|---|
| POST | `/api/validate` | Upload Excel → auto-fix → validate | Operator+ |
| POST | `/api/validate-inline` | Validate JSON realtime | Operator+ |
| POST | `/api/save` | Lưu dữ liệu đã sửa + version | Operator+ |
| GET | `/api/logs` | Danh sách audit log | Auditor+ |
| GET | `/api/stats` | Thống kê lỗi theo tháng | Operator+ |
| GET | `/api/config` | Lấy cấu hình storage | Admin |
| POST | `/api/config` | Lưu cấu hình storage | Admin |
| GET | `/api/files` | Liệt kê file trong MinIO bucket | Operator+ |
| GET | `/api/preview` | Presigned URL preview/download | Operator+ |
| POST | `/api/package` | Khởi tạo đóng gói SIP | Approver+ |
| GET | `/api/health` | Kiểm tra backend | Public |

### 17.2 Cấu trúc response lỗi chuẩn

```json
{
  "errors": [
    {
      "field": "Mã lưu trữ của tài liệu",
      "message": "Trường bắt buộc không được để trống",
      "value": "",
      "row": 3,
      "severity": "error",
      "code": "REQUIRED_FIELD"
    }
  ]
}
```

---

## 18. Triển khai (Docker)

### 18.1 Cấu trúc docker-compose

```yaml
services:
  nginx:       # port 8080, reverse proxy + static frontend
  backend:     # port 3000, Node.js API
  mongodb:     # port 27017, database
  minio:       # port 9000/9001, object storage
```

### 18.2 Lệnh triển khai

```bash
# Build và chạy toàn bộ hệ thống
docker-compose up --build -d

# Xem log
docker-compose logs -f backend

# Dừng
docker-compose down
```

### 18.3 Biến môi trường

```env
NODE_ENV=production
MONGO_URL=mongodb://mongodb:27017/sip
MINIO_ENDPOINT=minio
MINIO_PORT=9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_BUCKET_PDF=pdf-files
MINIO_BUCKET_SIP=sip-files
JWT_SECRET=your-secret-key
```

---

## 19. Nguyên tắc hệ thống

| Nguyên tắc | Mô tả |
|---|---|
| **Stateless** | API không lưu state, không cache giữa request |
| **Strict compliance** | Enum TT05 không được linh hoạt, không override |
| **User-driven** | Không tự động sửa và lưu mà không có xác nhận của người dùng |
| **Block on error** | Không cho phép đóng gói khi còn ERROR |
| **Immutable log** | Audit log chỉ ghi thêm, không sửa/xóa |
| **Secure storage** | Không expose MinIO trực tiếp, luôn dùng presigned URL |
| **Version history** | Mỗi lần sửa dữ liệu tạo version mới, không overwrite |

---

## 20. Hướng mở rộng

| Tính năng | Mô tả |
|---|---|
| AI validate | Dùng LLM tự đoán và gợi ý sửa field sai (embedding-based) |
| OCR | Trích xuất metadata từ file scan (PDF/ảnh) |
| Auto mapping | Tự động map tên cột Excel không chuẩn về schema |
| Batch processing | Xử lý nhiều hồ sơ song song qua queue (BullMQ + Redis) |
| Multi-template Excel | Nhận diện và xử lý nhiều mẫu Excel khác nhau |
| Diff viewer | So sánh 2 version dữ liệu dạng Git diff |
| Approval workflow nâng cao | Multi-level approval, delegation |
| Sync cloud | Đồng bộ SIP lên S3 / Azure Blob / Google Cloud Storage |
| Version schema | Tự động detect phiên bản TT05 áp dụng |
| Microservice | Tách Validation Service và Packaging Service thành service độc lập |

---

*Tài liệu này mô tả yêu cầu cho phiên bản 1.0. Mọi thay đổi cần được cập nhật và phê duyệt.*
