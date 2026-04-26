# Tài liệu Mô tả Chức năng - Hệ thống SIP

**Phiên bản:** 1.0  
**Cập nhật:** 2026-04-26  
**Ngôn ngữ:** Tiếng Việt

---

## Giới thiệu

Hệ thống SIP (Submission Information Package) là ứng dụng web giúp cán bộ lưu trữ kiểm tra, xử lý và đóng gói hồ sơ tài liệu điện tử theo chuẩn **Thông tư 05/TT-BNV** về lưu trữ tài liệu số. Hệ thống nhận đầu vào là thư mục hồ sơ chứa Excel metadata cùng file PDF văn bản, thực hiện xác thực dữ liệu, hiển thị lỗi trực quan, cho phép sửa chữa, sau đó tự động đóng gói thành gói SIP chuẩn OAIS để lưu trữ lâu dài.

---

## Mục lục

1. [Nhập liệu & Xác thực](#nhập-liệu--xác-thực)
   - Kiểm tra cấu trúc thư mục (1)
   - Đọc và xác thực file Excel (2)
   - Gợi ý sửa lỗi tự động (3)
   - Kiểm tra ánh xạ PDF-Excel (4)
   - Giao diện tải lên hồ sơ (5)
   - Tiến trình tải lên và xác thực (6)

2. [Xử lý dữ liệu](#xử-lý-dữ-liệu)
   - Bảng dữ liệu Excel (8)
   - Bảng lỗi và điều hướng (9)
   - Trình xem file PDF (10)

3. [Quản lý & Giám sát](#quản-lý--giám-sát)
   - Danh sách hồ sơ (Queue View) (11)
   - Quản lý người dùng (12)
   - Luồng xử lý (Workflow) (13)
   - Phê duyệt hồ sơ (14)
   - Thông báo trong ứng dụng (15)
   - Ghi nhật ký kiểm toán (16)
   - Bảng điều khiển thống kê (17)

4. [Hệ thống & Cấu hình](#hệ-thống--cấu-hình)
   - Đóng gói SIP (18)
   - Ký số điện tử (19)
   - Cấu hình lưu trữ MinIO (20)
   - Trình duyệt tệp (21)
   - Trình xem SIP và XML (22)
   - Phân quyền người dùng (23)
   - API Backend (24)
   - Triển khai Docker (25)
   - Đăng nhập và xác thực (7)

---

## Nhập liệu & Xác thực

### 1. Kiểm tra cấu trúc thư mục

**Mục đích:** Xác minh rằng thư mục hồ sơ tuân thủ cấu trúc bắt buộc trước khi xử lý dữ liệu.

**Cấu trúc bắt buộc:**
```
[TenHoSo]/
├── Attachment/          (thư mục chứa file PDF)
│   ├── VB001.pdf
│   ├── VB002.pdf
│   └── ...
└── Metadata/            (thư mục chứa file Excel)
    └── [TenHoSo].xlsx
```

**Quy tắc kiểm tra:**
- Phải tồn tại thư mục `Attachment/` chứa ít nhất một file PDF
- Phải tồn tại thư mục `Metadata/` chứa đúng một file Excel
- Tên file Excel phải trùng tên hồ sơ (có phần mở rộng .xlsx)
- Sai cấu trúc → **BLOCK toàn bộ pipeline**, không cho tiếp tục

**Hành động:**
- Hiển thị lỗi rõ ràng yêu cầu sửa cấu trúc thư mục
- Không tự động sửa - cán bộ phải tải lên lại theo đúng cấu trúc

---

### 2. Đọc và xác thực file Excel (TT05)

**Mục đích:** Xác thực dữ liệu metadata trong file Excel theo các quy tắc của Thông tư 05.

**Hai sheet bắt buộc:**

**Sheet `Ho_so` (thông tin hồ sơ) — 18 trường:**
| # | Trường | Bắt buộc | Quy tắc |
|---|--------|----------|---------|
| 1 | Mã hồ sơ | Có | Regex `X.Y.Z.W` (≥4 đoạn phân tách bởi `.`); trùng tên folder |
| 2 | Tiêu đề hồ sơ | Có | Không rỗng |
| 3 | Thời hạn bảo quản | Có | Enum `['01: Vĩnh viễn','02: 70 năm','03: 50 năm','04: 30 năm','05: 20 năm','06: 10 năm']` |
| 4 | Chế độ sử dụng | Có | Enum `['01: Công khai','02: Sử dụng có điều kiện','03: Mật']` |
| 5 | Ngôn ngữ | Có | Enum `['01: Tiếng Việt',…,'11: Khác']` (11 giá trị) |
| 6 | Thời gian bắt đầu | Có | DD/MM/YYYY |
| 7 | Thời gian kết thúc | Có | DD/MM/YYYY |
| 8 | Từ khóa | Có | Không rỗng |
| 9 | Tổng số tài liệu trong hồ sơ | Có | Số nguyên dương; phải bằng số dòng Van_ban |
| 10 | Số lượng tờ | Có | Số nguyên dương |
| 11 | Số lượng trang | Có | Số nguyên dương |
| 12 | Tình trạng vật lý (nếu có) | Không | Enum `['01: Tốt','02: Bình thường','03: Hỏng']` nếu điền |
| 13 | Ký hiệu thông tin (nếu có) | Không | Tự do |
| 14 | Mức độ tin cậy | Có | Enum `['01: Gốc điện tử','02: Số hóa','03: Hỗn hợp']` |
| 15 | Mã hồ sơ gốc giấy (nếu có) | Không | Tự do |
| 16 | Chế độ dự phòng | Có | Enum `['1: Có','0: Không']` |
| 17 | Tình trạng dự phòng | Điều kiện | Enum `['01: Đã dự phòng','02: Chưa dự phòng']`; bắt buộc khi trường 16 = `'1: Có'` |
| 18 | Ghi chú | Có | Không rỗng |

**Sheet `Van_ban` (thông tin văn bản) — 21 trường:**
| # | Trường | Bắt buộc | Quy tắc |
|---|--------|----------|---------|
| 1 | Mã định danh tài liệu | Có | Trùng tên file tài liệu |
| 2 | Mã lưu trữ của tài liệu | Có | Regex `{MaHoSo}.\d{7}` (7 chữ số cuối) |
| 3 | Thời hạn bảo quản | Có | Enum 6 giá trị (như Ho_so trường 3) |
| 4 | Tên loại tài liệu | Có | Enum `['01: Nghị quyết',…,'32: Khác']` (32 giá trị) |
| 5 | Số của tài liệu | Có | Không rỗng |
| 6 | Ký hiệu của tài liệu | Có | Không rỗng |
| 7 | Ngày, tháng, năm tài liệu | Có | DD/MM/YYYY |
| 8 | Tên cơ quan ban hành tài liệu | Có | Không rỗng |
| 9 | Trích yếu nội dung | Có | Không rỗng |
| 10 | Ngôn ngữ | Có | Enum 11 giá trị (như Ho_so trường 5) |
| 11 | Số lượng trang | Có | Số nguyên dương |
| 12 | Ký hiệu thông tin | Có | Không rỗng |
| 13 | Từ khóa | Có | Không rỗng |
| 14 | Chế độ sử dụng | Có | Enum 3 giá trị (như Ho_so trường 4) |
| 15 | Mức độ tin cậy | Có | Enum 3 giá trị (như Ho_so trường 14) |
| 16 | Bút tích (nếu có) | Không | Tự do |
| 17 | Tình trạng vật lý (nếu có) | Không | Enum 3 giá trị (như Ho_so trường 12) nếu điền |
| 18 | Chế độ dự phòng | Có | Enum `['1: Có','0: Không']` |
| 19 | Tình trạng dự phòng | Điều kiện | Enum `['01: Đã dự phòng','02: Chưa dự phòng']`; bắt buộc khi trường 18 = `'1: Có'` |
| 20 | Ghi chú | Có | Không rỗng |
| 21 | Đường dẫn tài liệu Quy trình xử lý (nếu có) | Không | Tên file PDF, nhiều file ngăn cách bởi `,` |

**Kiểm tra chéo (Cross-validation):**
- `Ho_so.TongSoTaiLieu` phải bằng số dòng trong sheet `Van_ban`
- Mỗi `Van_ban.MaLuuTru` phải bắt đầu bằng `Ho_so.MaHoSo`
- Không được có 2 dòng Van_ban trùng `MaLuuTru`
- Enum phải khớp **chuỗi đầy đủ** (VD: `"01: Nghị quyết"` — không phải `"01"` hay `"Nghị quyết"`)
- Không fuzzy matching trong validation — so sánh exact string
- *Lưu ý: Auto-fix Engine (section 3) có thể dùng fuzzy để TÌM GỢI Ý, nhưng giá trị được ÁP DỤNG phải là exact enum string*

**Phân loại mức độ lỗi:**
- **ERROR** (lỗi nghiêm trọng): Block đóng gói SIP, phải sửa
- **WARNING** (cảnh báo): Cho phép tiếp tục nhưng hiển thị cảnh báo
---
### 3. Gợi ý sửa lỗi tự động (Auto-fix Engine)

**Mục đích:** Gợi ý sửa các lỗi phổ biến để cán bộ dễ dàng sửa chữa.

**Nguyên tắc:** Hệ thống KHÔNG tự động sửa và lưu - chỉ gợi ý, cán bộ xem xét rồi quyết định áp dụng.

**Các loại sửa gợi ý:**
| Loại lỗi | Gợi ý | Ví dụ |
|---------|-------|-------|
| Ngày sai định dạng | Chuẩn hóa về DD/MM/YYYY | `1-2-2024` → `01/02/2024` |
| Excel serial number | Chuyển đổi từ số Excel | `45354` → `15/03/2024` |
| Khoảng trắng thừa | Trim đầu cuối | `" Hà Nội "` → `"Hà Nội"` |
| Enum bẩn | Map fuzzy với enum chuẩn | `"gốc"` → `"01: Gốc"` |
| Số có ký tự lạ | Trích xuất số | `"10 trang"` → `10` |

**Quy trình áp dụng:**
1. Chạy scan auto-fix → danh sách gợi ý
2. Cán bộ xem diff trước/sau
3. Chọn "Áp dụng tất cả" hoặc từng mục cụ thể
4. Hệ thống validate lại sau khi áp dụng

*Nguyên tắc: Fuzzy chỉ dùng để TÌM gợi ý sửa (VD: "gốc" → gợi ý "01: Gốc"). Giá trị được áp dụng phải là exact enum value theo TT05.*
---
### 4. Kiểm tra ánh xạ PDF-Excel

**Mục đích:** Đảm bảo mỗi văn bản trong Excel đều có file PDF tương ứng.

**Quy tắc ánh xạ:**
- Dùng trường `Van_ban["Đường dẫn tài liệu Quy trình xử lý (nếu có)"]` (trường 21) làm tên file PDF
- Trường này có thể chứa nhiều file, ngăn cách bởi dấu `,`
- Mỗi tên file phải khớp **EXACT MATCH** với file trong thư mục `Attachment/` (phân biệt hoa thường)
- Nếu trường 21 rỗng: kiểm tra file `{MaLuuTru}.pdf` trong `Attachment/` (fallback)

**Kết quả kiểm tra:**
| Trường hợp | Mức độ | Xử lý |
|-----------|--------|-------|
| Văn bản Excel nhưng thiếu file PDF | ERROR | Block đóng gói |
| File PDF thừa (không có trong Excel) | WARNING | Cho tiếp tục nhưng cảnh báo |
| Tên file PDF trùng nhau | ERROR | Block đóng gói |

---

### 5. Giao diện tải lên hồ sơ

**Mục đích:** Cung cấp cách thuận tiện để cán bộ tải lên thư mục hồ sơ.

**Tính năng:**
- **Drag & Drop**: Kéo thả thư mục hoặc file ZIP lên giao diện
- **Tải lên nhiều hồ sơ**: Hỗ trợ xử lý nhiều hồ sơ cùng lúc
- **Hiển thị cây thư mục**: Sau khi tải lên, hiển thị cấu trúc thư mục dạng cây
- **Phân loại màu sắc**: Đỏ (lỗi ERROR) | Vàng (WARNING) | Xanh (hợp lệ)
- **Không cho tải file lẻ**: Phải tuân thủ cấu trúc `[TenHoSo]/Attachment/` + `Metadata/`

---

### 6. Tiến trình tải lên và xác thực (Upload Progress)

**Mục đích:** Cung cấp phản hồi realtime cho cán bộ trong quá trình tải lên và xác thực hồ sơ.

**Luồng phản hồi:**
```
Tải lên file → Parse Excel → Validate → Kiểm tra PDF → Hoàn tất
```

**Giao diện:**
- Thanh tiến trình hiển thị từng bước
- Mỗi bước: tên bước, trạng thái (đang xử lý/hoàn tất/lỗi)
- Số liệu realtime: "Đang kiểm tra 45/100 dòng Van_ban..."
- Hoàn tất: tóm tắt kết quả (X lỗi ERROR, Y cảnh báo WARNING)

**Kỹ thuật:**
- Backend dùng SSE hoặc WebSocket
- Frontend subscribe stream trong suốt validate
- Fallback polling mỗi 2 giây nếu lỗi kết nối

---

### 7. Đăng nhập và xác thực

**Mục đích:** Xác thực danh tính người dùng trước khi truy cập hệ thống.

**Màn hình đăng nhập:**
- Form: username + password
- Nút "Đăng nhập" → gọi `POST /api/auth/login` → trả JWT token
- Token lưu trong localStorage, tự động đính kèm vào mọi API call
- Token hết hạn (8 giờ) → redirect về trang đăng nhập

**Đăng xuất:**
- Nút đăng xuất → xóa token, redirect về login
- Không có server-side session (stateless JWT)

**Đổi mật khẩu:**
- Menu cài đặt → form đổi mật khẩu (mật khẩu cũ + mới + xác nhận)
- Backend validate mật khẩu cũ trước khi cho đổi

**Bảo mật:**
- Mật khẩu hash bcrypt
- JWT secret từ env var `JWT_SECRET`
- CORS giới hạn trusted origins

---

## Xử lý dữ liệu

### 8. Bảng dữ liệu Excel (Excel Grid)

**Mục đích:** Hiển thị và cho phép sửa dữ liệu Excel trực tiếp trên giao diện.

**Tính năng chế độ xem:**
- Render cả hai sheet `Ho_so` và `Van_ban` thành bảng HTML
- Highlight cell lỗi màu đỏ nhạt, hover hiển thị thông báo lỗi chi tiết
- Cho phép chuyển đổi giữa 2 sheet qua tab
- Hiển thị số dòng để dễ tham chiếu với báo cáo lỗi

**Tính năng chế độ chỉnh sửa:**
- Cho phép sửa trực tiếp từng ô (cell) trên UI
- Validate **realtime** khi nhập dữ liệu (gọi API inline validate)
- Cell lỗi tô đỏ ngay lập tức sau khi rời ô
- Dropdown lock cho các trường enum (danh sách giá trị chuẩn)
- Nút **"Lưu thay đổi"** → gửi dữ liệu lên server, validate lại và lưu phiên bản mới → **tự động trigger validate lại toàn bộ dữ liệu** và cập nhật Error Panel

**Đồng bộ hóa:**
- Click dòng Van_ban → đánh dấu trên bảng
- Sau đó mở file PDF tương ứng (nếu có)
---
### 9. Bảng lỗi và điều hướng (Error Panel)

**Mục đích:** Liệt kê toàn bộ lỗi và cho phép cán bộ dễ dàng tìm đến vị trí sai.

**Chức năng:**
- Liệt kê tất cả lỗi theo thứ tự: Sheet → Dòng → Trường
- Mỗi lỗi hiển thị: tên field, thông báo, giá trị hiện tại, dòng số, mức độ
- **Click vào lỗi** → cuộn tự động đến ô lỗi tương ứng trong bảng dữ liệu
- Lọc lỗi theo mức độ: ERROR hoặc WARNING
- Sắp xếp theo dòng, tên trường hoặc mức độ
- Đếm tổng lỗi theo loại (ERROR, WARNING)

---

### 10. Trình xem file PDF

**Mục đích:** Hiển thị file PDF để cán bộ kiểm tra nội dung văn bản.

**Tính năng:**
- Hiển thị file PDF qua iframe (hoặc PDF.js)
- Presigned URL từ MinIO (thời hạn 1 giờ)
- **Đồng bộ** với bảng Van_ban: click dòng → mở PDF tương ứng
- Nếu file PDF thiếu → disable viewer, hiển thị thông báo "Tệp PDF không tồn tại"
- Hỗ trợ zoom, cuộn trang, in ấn (thông qua PDF viewer)

**Lưu ý về PDF storage:**
- Trong giai đoạn UPLOAD → VALIDATED: PDF lưu trên **server temp** (không lên MinIO)
- Khi hồ sơ được **APPROVED**: PDF được upload lên MinIO bucket `pdf-files/`
- Presigned URL chỉ khả dụng sau khi APPROVED
- Trước APPROVED: PDF viewer đọc trực tiếp từ server temp qua API nội bộ
---
## Quản lý & Giám sát

### 11. Danh sách hồ sơ (Queue View)

**Mục đích:** Tổng quan tất cả hồ sơ đang xử lý theo trạng thái để cán bộ dễ theo dõi.

**Tính năng:**
- Bảng liệt kê: tên hồ sơ, trạng thái, người xử lý, ngày tạo, số lỗi
- Filter: trạng thái, người upload, theo tháng
- Sort: ngày tạo, tên hồ sơ, trạng thái
- Badge số lượng hồ sơ chờ xử lý ở từng trạng thái

**Hành động:**
- Click hồ sơ → mở chi tiết
- Operator: xem hồ sơ cần sửa (REJECTED)
- Approver: xem hồ sơ chờ phê duyệt (VALIDATED)
- Signer: xem hồ sơ chờ ký số (APPROVED)

---

### 12. Quản lý người dùng (User Management)

**Mục đích:** Admin tạo, sửa, xóa tài khoản và gán role cho người dùng. Chỉ Admin mới có quyền truy cập.

**Danh sách người dùng:**
- Bảng: username, họ tên, email, role, trạng thái (hoạt động/khóa), ngày tạo
- Filter theo role, trạng thái
- Tìm kiếm theo tên, username

**Tạo tài khoản mới:**
- Form: username, họ tên, email, role, mật khẩu tạm
- Người dùng phải đổi mật khẩu khi đăng nhập lần đầu

**Sửa tài khoản:**
- Cập nhật thông tin, role, trạng thái
- Reset mật khẩu (Admin đặt mật khẩu tạm mới)

**Khóa / Mở khóa tài khoản:**
- Không xóa vĩnh viễn — chỉ khóa để bảo toàn audit log

---

### 13. Luồng xử lý (Workflow)

**Mục đích:** Quản lý trạng thái hồ sơ qua các bước xử lý để đảm bảo không bỏ qua bước nào.

**Các trạng thái:**
```
UPLOAD 
  ↓
VALIDATING (hệ thống tự động xác thực)
  ↓
VALIDATED (xác thực xong, hiển thị kết quả)
  ↓
APPROVED (phê duyệt)
  ↓
PACKAGING (đóng gói SIP)
  ↓
SIGNED (ký số điện tử) — V2 placeholder
  ↓
DONE (hoàn thành)

(Nếu từ chối)
REJECTED ← APPROVED (quay lại UPLOAD để sửa)
```

**Ràng buộc:**
- **Không bỏ qua bước**: Phải tuân thủ thứ tự, không có shortcut
- **Không rollback sau ký số**: Sau khi SIGNED, không được quay lại sửa
- **Mỗi transition phải log**: Ghi audit log khi chuyển trạng thái
- **Không cho phép đóng gói nếu còn ERROR**: Phải validate 100% thành công trước

**Người thực hiện:**
| Trạng thái | Thực hiện bởi |
|-----------|---------------|
| UPLOAD | Operator |
| VALIDATING | System (tự động) |
| VALIDATED | System (tự động) |
| APPROVED | Approver |
| REJECTED | Approver |
| PACKAGING | System (tự động) |
| SIGNED | Signer — V2 (chưa triển khai ở MVP) |
| DONE | System (tự động) |

---

### 14. Phê duyệt hồ sơ (Approval)

**Mục đích:** Người có quyền phê duyệt xác nhận hồ sơ đã sẵn sàng đóng gói.

**Điều kiện phê duyệt:**
- Hồ sơ đã qua bước VALIDATED
- Không còn lỗi mức ERROR (chỉ có WARNING hoặc sạch)
- Tất cả file PDF đã được xác nhận mapping

**Hành động:**
- **Phê duyệt (Approve)**: Chuyển trạng thái từ VALIDATED → APPROVED
- **Từ chối (Reject)**: Chuyển trạng thái về UPLOAD, yêu cầu cán bộ sửa lại
- Dialog xác nhận khi nhấn "Phê duyệt" hoặc "Từ chối" (REJECT bắt buộc ghi chú ≥ 10 ký tự)
- Mỗi hành động đều được log vào Audit Log với người phê duyệt, thời gian, ghi chú

---

### 15. Thông báo trong ứng dụng (In-app Notification)

**Mục đích:** Thông báo realtime khi hồ sơ chuyển trạng thái.

**Loại thông báo:**
| Sự kiện | Người nhận | Nội dung |
|---------|-----------|---------|
| Hồ sơ cần phê duyệt | Approver | "Hồ sơ [tên] sẵn sàng phê duyệt" |
| Từ chối | Operator | "Hồ sơ [tên] từ chối: [ghi chú]" |
| Chờ ký số | Signer | "Hồ sơ [tên] cần ký số" |
| Hồ sơ được phê duyệt | Operator | "Hồ sơ [tên] đã được phê duyệt" |
| Đóng gói hoàn tất | Operator, Approver | "Gói SIP [tên] tạo thành công, sẵn sàng ký số" |

**Giao diện:**
- Badge thông báo chưa đọc trên chuông (header phải)
- Click chuông → dropdown 10 thông báo gần nhất
- Toast nổi góc phải (tự đóng sau 5 giây)

**Kỹ thuật:**
- WebSocket `/ws/notifications` per user (JWT auth)
- Server push khi state transition
- Lưu MongoDB `notifications` (TTL 30 ngày)

---

### 16. Ghi nhật ký kiểm toán (Audit Log)

**Mục đích:** Ghi lại toàn bộ hành động để phục vụ truy vết, kiểm tra, compliance.

**Cấu trúc bản ghi:**
```json
{
  "id": "uuid",
  "action": "UPLOAD | VALIDATING | VALIDATED | APPROVED | REJECTED | PACKAGING | SIGNED | DONE",
  "user": "username",
  "timestamp": "2026-04-26T10:30:00Z",
  "fileId": "mã hồ sơ",
  "fileName": "tên hồ sơ",
  "errorCount": 5,
  "warningCount": 2,
  "detail": { "note": "...", "result": "..." }
}
```

**Ràng buộc:**
- **Append-only**: Chỉ ghi thêm, không sửa, không xóa
- **Toàn bộ action**: Mọi hành động đều phải được log, không có ngoại lệ
- **Bảo mật**: Không lưu dữ liệu nhạy cảm (mật khẩu, khóa bí mật)
- **Lưu trữ**: MongoDB, collection `auditLogs`

**Người dùng có quyền xem:**
- Admin: xem tất cả
- Auditor: xem tất cả (chỉ đọc)
- Người dùng khác: không có quyền xem

---

### 17. Bảng điều khiển thống kê (Dashboard)

**Mục đích:** Hiển thị thống kê tổng thể, xu hướng lỗi để quản lý giám sát hiệu suất.

**Các chỉ số hiển thị:**
| Chỉ số | Mô tả | Kiểu |
|--------|-------|------|
| Tổng hồ sơ | Số hồ sơ đã xử lý | Số nguyên |
| Tổng lỗi | Tổng số lỗi ERROR phát sinh | Số nguyên |
| Tỷ lệ thành công | % hồ sơ đóng gói thành công | % |
| Lỗi theo tháng | Xu hướng lỗi 12 tháng gần nhất | Biểu đồ Line/Bar |
| Lỗi theo trường | Top 10 trường hay bị lỗi nhất | Biểu đồ Bar |
| Phân bố trạng thái | Số hồ sơ ở mỗi trạng thái workflow | Biểu đồ Pie/Donut |

**Tính năng drill-down:**
- Click một dòng log → mở Modal chi tiết với 2 tab:
  - **Tab "Danh sách lỗi"**: Liệt kê chi tiết mỗi lỗi (sheet, dòng, field, thông báo, mức độ)
  - **Tab "Excel Preview"**: Hiển thị dữ liệu Excel với cell lỗi được highlight

**Tính năng lọc:**
- Filter theo tháng (tháng/năm hoặc range)
- Filter theo đơn vị *(V2 — khi hệ thống hỗ trợ multi-tenant)*
- Filter theo mức lỗi (ERROR / WARNING / All)
- Filter theo trạng thái (UPLOAD / VALIDATED / APPROVED / DONE)

**Yêu cầu kỹ thuật:**
- Dữ liệu realtime hoặc near-realtime (< 30 giây)
- API: `GET /api/stats` trả về dữ liệu aggregate từ MongoDB
- Cache kết quả để tối ưu performance

---

## Hệ thống & Cấu hình

### 18. Đóng gói SIP

**Mục đích:** Tự động tạo gói SIP (Submission Information Package) chuẩn OAIS để lưu trữ lâu dài.

**Điều kiện đóng gói:**
- Toàn bộ validate **không còn lỗi ERROR** (chỉ có WARNING hoặc sạch)
- Hồ sơ đã qua bước **APPROVED**
- Tất cả file PDF đã được xác nhận mapping

**Cấu trúc gói SIP xuất ra:**
```
SIP_[MaHoSo]/
├── METS.xml                    (cấu trúc và mô tả SIP)
├── metadata/
│   ├── EAD.xml                 (mô tả nội dung hồ sơ)
│   ├── PREMIS.xml              (thông tin bảo quản kỹ thuật)
│   └── checksums.csv           (SHA256 của tất cả file)
└── representations/
    └── original/
        ├── VB001.pdf
        ├── VB002.pdf
        └── ...
```

**Các file XML bắt buộc:**
| File | Chuẩn | Mô tả |
|------|-------|-------|
| METS.xml | METS 1.12 | Cấu trúc tổng thể gói SIP |
| EAD.xml | EAD 3 | Mô tả nội dung hồ sơ |
| PREMIS.xml | PREMIS 3 | Metadata bảo quản kỹ thuật |

**Tùy chọn đóng gói:**
| Tùy chọn | Mặc định | Mô tả |
|----------|---------|-------|
| Loại gói | SIP | SIP (nộp sang hệ thống khác) / AIP (lưu nội bộ) |
| Checksum | SHA-256 | SHA-256 (khuyến nghị) / MD5 (legacy) |
| Tên phần mềm | Vietnam Archival System | Ghi vào PREMIS.xml creatingApplication |
| Đơn vị nộp | (từ cấu hình) | Tên cơ quan, ghi vào METS.xml và EAD.xml |

**Đầu ra:**
- File nén: `SIP_[MaHoSo]_[YYYYMMDD].zip` (VD: `SIP_QD001_20260426.zip`)
- Upload tự động lên MinIO bucket `sip-files/` theo cấu trúc: `YYYY/[file].zip`
- Ghi log action PACKAGING vào Audit Log

**Yêu cầu kỹ thuật:**
- Thời gian đóng gói: < 30 giây cho hồ sơ 100 trang
- Size < 500MB (nếu vượt quá, cảnh báo)
- Không lỗi khi tạo XML, checksum hoặc nén file

**Xử lý bất đồng bộ (Async):**
- Đóng gói chạy dưới dạng **background job** (BullMQ + Redis)
- Luồng: Frontend gọi `POST /api/package` → nhận `jobId` → polling `GET /api/package/:jobId/status` hoặc WebSocket
- Job status: `QUEUED → PROCESSING → DONE | FAILED`
- Job thất bại → lưu error message, cho phép retry
- Timeout job: 5 phút

---

### 19. Ký số điện tử (Digital Signature) — V2

> **Ghi chú:** Tính năng này được lên kế hoạch cho phiên bản V2, không thuộc phạm vi MVP.

**Mục đích:** Ký số các file XML trong gói SIP để đảm bảo toàn vẹn và tính pháp lý.

**Phạm vi (V2):**
- Ký METS.xml, EAD.xml, PREMIS.xml bằng chuẩn **XMLDSig**
- Kết hợp **TSA timestamp** (dấu thời gian tin cậy)
- Verify chữ ký khi load SIP từ MinIO
- Không cho phép ký lại sau khi workflow SIGNED

**Trạng thái:** Chưa triển khai, dự kiến Sprint 9-10.

---

### 20. Cấu hình lưu trữ MinIO (Storage Configuration)

**Mục đích:** Cho phép Admin cấu hình nơi lưu trữ file PDF và gói SIP theo từng môi trường.

**Giao diện cài đặt (UI):**

Form cấu hình gồm các trường:

| Trường | Mô tả | Ví dụ |
|--------|-------|-------|
| Storage Type | Loại storage | `minio` / `local` / `s3` |
| Endpoint | Địa chỉ MinIO server | `localhost` hoặc `minio.example.com` |
| Port | Cổng kết nối | `9000` |
| Access Key | Khóa truy cập | `minioadmin` |
| Secret Key | Khóa bí mật (ẩn input) | `minioadmin` |
| Use SSL | Sử dụng HTTPS | true / false |
| Bucket PDF | Tên bucket chứa PDF | `pdf-files` |
| Bucket SIP | Tên bucket chứa SIP | `sip-files` |

**Tổ chức bucket (Best Practice):**
```
pdf-files/
└── YYYY/MM/
    ├── [MaHoSo]_001.pdf
    ├── [MaHoSo]_002.pdf
    └── ...

sip-files/
└── YYYY/
    └── SIP_[MaHoSo]_[YYYYMMDD].zip
```

**Yêu cầu kỹ thuật:**
- Cấu hình lưu vào **MongoDB** (collection `configs`)
- **Load động** khi khởi động backend
- Thay đổi cấu hình → áp dụng ngay **không cần restart** backend
- **Test kết nối** trước khi lưu (chạy health check)
- Không expose MinIO trực tiếp → dùng **Presigned URL** (thời hạn 1 giờ)
- Upload có **retry tự động** (tối đa 3 lần) khi lỗi mạng
- **Encrypt Secret Key** khi lưu vào MongoDB

---

### 21. Trình duyệt tệp (File Browser)

**Mục đích:** Cho phép cán bộ/Admin duyệt, tìm kiếm, xem trước file PDF và SIP.

**Tính năng:**
- Switch giữa 2 bucket: "PDF Files" và "SIP Files" qua Tabs
- Liệt kê file trong bucket (tên, kích thước, ngày tạo/sửa)
- Tìm kiếm file theo tên (partial match)
- Sort theo: tên, kích thước, ngày tạo (ascending/descending)
- Phân trang (20 file per page)

**Hành động trên file:**
| Hành động | Mô tả |
|-----------|-------|
| **Preview** | Mở file PDF trong modal (presigned URL, 1 giờ expiry) |
| **Download** | Tải file về máy tính |
| **View SIP Content** | Giải nén .zip → hiển thị cây thư mục bên trong |

**PDF Preview:**
- Iframe hoặc PDF.js viewer
- Modal 900px chiều rộng, full-height
- Nút: zoom in/out, next/prev page, print, download
- Nếu file không tồn tại → thông báo "Tệp không tồn tại"

---

### 22. Trình xem SIP và XML (SIP Viewer & XML Preview)

**Mục đích:** Hiển thị nội dung gói SIP và các file XML metadata để kiểm tra.

**SIP Viewer:**
- Click file `.zip` (SIP) từ File Browser
- Backend: **giải nén in-memory** (không lưu ra disk)
- Hiển thị cây thư mục bên trong gói SIP (collapsible tree)
- Mỗi file hiển thị: tên, kích thước, loại file (PDF / XML / CSV)
- Click file trong cây → xem trước nội dung

**XML Preview:**
- Click file XML (METS.xml, EAD.xml, PREMIS.xml)
- Modal hiển thị nội dung XML
- **Cây có thể thu/mở** (collapsible tree view, mở rộng từng node)
- **Syntax highlighting** cho XML (màu sắc phân biệt tag, attribute, text)
- **Tìm kiếm** trong nội dung XML (Ctrl+F)
- Nút copy toàn bộ content, download file

---

### 23. Phân quyền người dùng (RBAC)

**Mục đích:** Kiểm soát quyền hạn người dùng theo từng role để đảm bảo bảo mật và phân công.

**Năm role:**

| Role | Mô tả |
|------|-------|
| **Admin** | Toàn quyền: upload, validate, sửa, phê duyệt, ký số, cấu hình hệ thống |
| **Operator** | Upload hồ sơ, validate, sửa dữ liệu Excel, xem dashboard |
| **Approver** | Xem hồ sơ đã validate, phê duyệt hoặc từ chối, không sửa dữ liệu |
| **Signer** | Ký số trên hồ sơ đã approved, không upload/sửa dữ liệu |
| **Auditor** | Chỉ xem Audit Log và Dashboard (read-only), không hành động gì khác |

**Ma trận phân quyền:**

| Chức năng | Admin | Operator | Approver | Signer | Auditor |
|-----------|-------|----------|----------|--------|---------|
| Upload hồ sơ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Validate dữ liệu | ✅ | ✅ | ✅* | ❌ | ❌ |
| Sửa dữ liệu Excel | ✅ | ✅ | ❌ | ❌ | ❌ |
| Phê duyệt hồ sơ | ✅ | ❌ | ✅ | ❌ | ❌ |
| Ký số | ✅ | ❌ | ❌ | ✅ | ❌ |
| Xem Dashboard | ✅ | ✅ | ✅ | ✅ | ✅ |
| Xem Audit Log | ✅ | ❌ | ❌ | ❌ | ✅ |
| Cấu hình Rule Editor | ✅ | ❌ | ❌ | ❌ | ❌ |
| Cấu hình Storage | ✅ | ❌ | ❌ | ❌ | ❌ |

(*Approver xem kết quả validate nhưng không chạy lại validate)

**Yêu cầu kỹ thuật:**
- Xác thực qua **JWT token** (8 giờ expiry)
- Mỗi API endpoint kiểm tra permission trước khi thực thi
- **UI ẩn** các button/menu không có quyền (không chỉ disable)
- Nếu cố gắng truy cập endpoint không có quyền → response 403 Forbidden

---

### 24. API Backend

**Mục đích:** Cung cấp các endpoint REST để frontend gọi thực thi các chức năng.

**Danh sách API chính:**

| Method | Endpoint | Mô tả | Auth |
|--------|----------|-------|------|
| POST | `/api/auth/login` | Đăng nhập, trả JWT token | Public |
| POST | `/api/auth/logout` | Đăng xuất | All |
| PUT | `/api/auth/password` | Đổi mật khẩu | All |
| GET | `/api/users` | Danh sách người dùng | Admin |
| POST | `/api/users` | Tạo tài khoản mới | Admin |
| PUT | `/api/users/:id` | Cập nhật tài khoản | Admin |
| PUT | `/api/users/:id/lock` | Khóa/mở khóa tài khoản | Admin |
| POST | `/api/validate` | Tải lên Excel → validate | Operator+ |
| POST | `/api/validate-inline` | Validate realtime khi nhập từng ô | Operator+ |
| POST | `/api/save` | Lưu dữ liệu đã sửa | Operator+ |
| GET | `/api/logs` | Danh sách Audit Log | Auditor+ |
| GET | `/api/stats` | Thống kê lỗi theo tháng | Operator+ |
| GET | `/api/config` | Lấy cấu hình storage | Admin |
| POST | `/api/config` | Lưu cấu hình storage | Admin |
| GET | `/api/dossiers` | Danh sách hồ sơ | Operator+ |
| GET | `/api/dossiers/:id` | Xem chi tiết 1 hồ sơ | Operator+ |
| GET | `/api/files` | Liệt kê file trong MinIO bucket | Operator+ |
| GET | `/api/package/:jobId/status` | Trạng thái job đóng gói | Approver+ |
| POST | `/api/approve` | Phê duyệt/từ chối | Approver+ |
| POST | `/api/package` | Khởi tạo đóng gói SIP | Approver+ |
| GET | `/api/notifications` | Danh sách thông báo | All |
| WS | `/ws/notifications` | WebSocket thông báo | All |
| GET | `/api/health` | Kiểm tra backend | Public |

**Cấu trúc Response Error chuẩn:**
```json
{
  "success": false,
  "errors": [
    {
      "field": "Mã lưu trữ của tài liệu",
      "message": "Trường bắt buộc không được để trống",
      "value": "",
      "row": 3,
      "sheet": "Van_ban",
      "severity": "error",
      "code": "REQUIRED_FIELD"
    },
    {
      "field": "Ngày tháng tài liệu",
      "message": "Định dạng ngày sai, phải DD/MM/YYYY",
      "value": "26-04-2026",
      "row": 3,
      "sheet": "Van_ban",
      "severity": "error",
      "code": "INVALID_DATE_FORMAT"
    }
  ]
}
```

---

### 25. Triển khai Docker

**Mục đích:** Cung cấp cách triển khai hệ thống nhanh chóng, nhất quán trên các môi trường.

**Cấu trúc docker-compose (5 services):**

| Service | Công nghệ | Cổng | Vai trò |
|---------|-----------|------|--------|
| **nginx** | Nginx | 8080 | Reverse proxy, serve frontend |
| **backend** | Node.js + Express | 3000 | API, validation, packaging |
| **mongodb** | MongoDB | 27017 | Audit log, config, metadata |
| **redis** | Redis | 6379 | Job queue (BullMQ), notification cache |
| **minio** | MinIO | 9000/9001 | Object storage (PDF, SIP) |

**Lệnh triển khai:**
```bash
# Build và chạy toàn bộ hệ thống
docker-compose up --build -d

# Xem log backend
docker-compose logs -f backend

# Dừng
docker-compose down

# Xóa volume (cảnh báo: mất dữ liệu!)
docker-compose down -v
```

**Biến môi trường (.env):**
```env
NODE_ENV=production
MONGO_URL=mongodb://mongodb:27017/sip
REDIS_URL=redis://redis:6379
MINIO_ENDPOINT=minio
MINIO_PORT=9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_BUCKET_PDF=pdf-files
MINIO_BUCKET_SIP=sip-files
JWT_SECRET=your-secret-key-here
JWT_EXPIRY=8h
```

**Health Check:**
- Nginx: `GET http://localhost:8080/` → 200 OK
- Backend: `GET http://localhost:3000/api/health` → `{ "status": "OK" }`
- MongoDB: Kết nối thành công
- MinIO: Liệt kê bucket thành công

---

## Nguyên tắc chung

| Nguyên tắc | Giải thích |
|-----------|-----------|
| **Stateless** | API không lưu trạng thái giữa các request |
| **Strict TT05 Compliance** | Enum cứng, không fuzzy, không override |
| **User-Driven** | Không tự động sửa/lưu mà không xác nhận người dùng |
| **Block on ERROR** | Không cho đóng gói nếu còn lỗi mức ERROR |
| **Immutable Audit Log** | Chỉ ghi thêm, không sửa/xóa |
| **Secure Storage** | Không expose MinIO trực tiếp, presigned URL |
| **Version History** | Mỗi sửa tạo version mới, không overwrite |

---

**Tài liệu này mô tả 25 chức năng chính của hệ thống SIP. Để chi tiết hơn, tham khảo:**
- `/docs/requirements.md` - Thông số kỹ thuật chi tiết
- `/docs/system-architecture.md` - Kiến trúc hệ thống
- `/docs/code-standards.md` - Chuẩn code
- `/docs/project-overview-pdr.md` - PDR chi tiết
