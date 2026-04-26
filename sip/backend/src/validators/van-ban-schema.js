/**
 * Van_ban sheet field definitions — 21 fields per TT05.
 * Fields indexed by position (0-based).
 */

const {
  THOI_HAN_BAO_QUAN,
  CHE_DO_SU_DUNG,
  NGON_NGU,
  TINH_TRANG_VAT_LY,
  MUC_DO_TIN_CAY,
  CHE_DO_DU_PHONG,
  TINH_TRANG_DU_PHONG,
  TEN_LOAI_TAI_LIEU,
} = require('./enum-definitions');

// Regex: {MaHoSo}.{7 digits} — prefix validated separately via cross-validator
const MA_LUU_TRU_REGEX = /\.\d{7}$/;

const VAN_BAN_SCHEMA = Object.freeze([
  // index 0
  {
    index: 0,
    name: 'maDinhDanh',
    label: 'Mã định danh tài liệu',
    type: 'string',
    required: true,
    severity: 'ERROR',
  },
  // index 1
  {
    index: 1,
    name: 'maLuuTru',
    label: 'Mã lưu trữ của tài liệu',
    type: 'string',
    required: true,
    regex: MA_LUU_TRU_REGEX,
    severity: 'ERROR',
  },
  // index 2
  {
    index: 2,
    name: 'thoiHanBaoQuan',
    label: 'Thời hạn bảo quản',
    type: 'enum',
    required: true,
    enumValues: THOI_HAN_BAO_QUAN,
    severity: 'ERROR',
  },
  // index 3
  {
    index: 3,
    name: 'tenLoaiTaiLieu',
    label: 'Tên loại tài liệu',
    type: 'enum',
    required: true,
    enumValues: TEN_LOAI_TAI_LIEU,
    severity: 'ERROR',
  },
  // index 4
  {
    index: 4,
    name: 'soTaiLieu',
    label: 'Số của tài liệu',
    type: 'string',
    required: true,
    severity: 'ERROR',
  },
  // index 5
  {
    index: 5,
    name: 'kyHieuTaiLieu',
    label: 'Ký hiệu của tài liệu',
    type: 'string',
    required: true,
    severity: 'ERROR',
  },
  // index 6
  {
    index: 6,
    name: 'ngayThangNam',
    label: 'Ngày, tháng, năm tài liệu',
    type: 'date',
    required: true,
    severity: 'ERROR',
  },
  // index 7
  {
    index: 7,
    name: 'tenCoQuan',
    label: 'Tên cơ quan, tổ chức, cá nhân ban hành tài liệu',
    type: 'string',
    required: true,
    severity: 'ERROR',
  },
  // index 8
  {
    index: 8,
    name: 'trichYeuNoiDung',
    label: 'Trích yếu nội dung',
    type: 'string',
    required: true,
    severity: 'ERROR',
  },
  // index 9
  {
    index: 9,
    name: 'ngonNgu',
    label: 'Ngôn ngữ',
    type: 'enum',
    required: true,
    enumValues: NGON_NGU,
    severity: 'ERROR',
  },
  // index 10
  {
    index: 10,
    name: 'soLuongTrang',
    label: 'Số lượng trang',
    type: 'positiveInt',
    required: true,
    severity: 'ERROR',
  },
  // index 11
  {
    index: 11,
    name: 'kyHieuThongTin',
    label: 'Ký hiệu thông tin',
    type: 'string',
    required: true,
    severity: 'ERROR',
  },
  // index 12
  {
    index: 12,
    name: 'tuKhoa',
    label: 'Từ khóa',
    type: 'string',
    required: true,
    severity: 'ERROR',
  },
  // index 13
  {
    index: 13,
    name: 'cheDoSuDung',
    label: 'Chế độ sử dụng',
    type: 'enum',
    required: true,
    enumValues: CHE_DO_SU_DUNG,
    severity: 'ERROR',
  },
  // index 14
  {
    index: 14,
    name: 'mucDoTinCay',
    label: 'Mức độ tin cậy',
    type: 'enum',
    required: true,
    enumValues: MUC_DO_TIN_CAY,
    severity: 'ERROR',
  },
  // index 15
  {
    index: 15,
    name: 'butTich',
    label: 'Bút tích (nếu có)',
    type: 'string',
    required: false,
    severity: 'WARNING',
  },
  // index 16
  {
    index: 16,
    name: 'tinhTrangVatLy',
    label: 'Tình trạng vật lý (nếu có)',
    type: 'enum',
    required: false,
    enumValues: TINH_TRANG_VAT_LY,
    severity: 'WARNING',
  },
  // index 17
  {
    index: 17,
    name: 'cheDoDuPhong',
    label: 'Chế độ dự phòng',
    type: 'enum',
    required: true,
    enumValues: CHE_DO_DU_PHONG,
    severity: 'ERROR',
  },
  // index 18
  {
    index: 18,
    name: 'tinhTrangDuPhong',
    label: 'Tình trạng dự phòng',
    type: 'enum',
    required: 'conditional',
    conditionalOn: { fieldIndex: 17, value: '1: Có' },
    enumValues: TINH_TRANG_DU_PHONG,
    severity: 'ERROR',
  },
  // index 19
  {
    index: 19,
    name: 'ghiChu',
    label: 'Ghi chú',
    type: 'string',
    required: true,
    severity: 'ERROR',
  },
  // index 20
  {
    index: 20,
    name: 'duongDanPdf',
    label: 'Đường dẫn tài liệu Quy trình xử lý (nếu có)',
    type: 'string',
    required: false,
    severity: 'WARNING',
  },
]);

module.exports = { VAN_BAN_SCHEMA, MA_LUU_TRU_REGEX };
