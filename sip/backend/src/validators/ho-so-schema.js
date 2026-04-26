/**
 * Ho_so sheet field definitions — 18 fields per TT05.
 * Fields are indexed by position (0-based) to handle varying header text.
 * type: 'string' | 'date' | 'positiveInt' | 'enum'
 * required: true | false | 'conditional'
 * conditionalOn: { fieldIndex, value } — required when that field equals given value
 */

const {
  THOI_HAN_BAO_QUAN,
  CHE_DO_SU_DUNG,
  NGON_NGU,
  TINH_TRANG_VAT_LY,
  MUC_DO_TIN_CAY,
  CHE_DO_DU_PHONG,
  TINH_TRANG_DU_PHONG,
} = require('./enum-definitions');

// Regex: at least 4 segments separated by '.' — anchored at both ends
const MA_HO_SO_REGEX = /^[^.]+\.[^.]+\.[^.]+\.[^.]+(\.[^.]+)*$/;

const HO_SO_SCHEMA = Object.freeze([
  // index 0
  {
    index: 0,
    name: 'maHoSo',
    label: 'Mã hồ sơ',
    type: 'string',
    required: true,
    regex: MA_HO_SO_REGEX,
    severity: 'ERROR',
  },
  // index 1
  {
    index: 1,
    name: 'tieuDeHoSo',
    label: 'Tiêu đề hồ sơ',
    type: 'string',
    required: true,
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
    name: 'cheDoSuDung',
    label: 'Chế độ sử dụng',
    type: 'enum',
    required: true,
    enumValues: CHE_DO_SU_DUNG,
    severity: 'ERROR',
  },
  // index 4
  {
    index: 4,
    name: 'ngonNgu',
    label: 'Ngôn ngữ',
    type: 'enum',
    required: true,
    enumValues: NGON_NGU,
    severity: 'ERROR',
  },
  // index 5
  {
    index: 5,
    name: 'thoiGianBatDau',
    label: 'Thời gian bắt đầu',
    type: 'date',
    required: true,
    severity: 'ERROR',
  },
  // index 6
  {
    index: 6,
    name: 'thoiGianKetThuc',
    label: 'Thời gian kết thúc',
    type: 'date',
    required: true,
    severity: 'ERROR',
  },
  // index 7
  {
    index: 7,
    name: 'tuKhoa',
    label: 'Từ khóa',
    type: 'string',
    required: true,
    severity: 'ERROR',
  },
  // index 8
  {
    index: 8,
    name: 'tongSoTaiLieu',
    label: 'Tổng số tài liệu trong hồ sơ',
    type: 'positiveInt',
    required: true,
    severity: 'ERROR',
  },
  // index 9
  {
    index: 9,
    name: 'soLuongTo',
    label: 'Số lượng tờ',
    type: 'positiveInt',
    required: true,
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
    name: 'tinhTrangVatLy',
    label: 'Tình trạng vật lý (nếu có)',
    type: 'enum',
    required: false,
    enumValues: TINH_TRANG_VAT_LY,
    severity: 'WARNING',
  },
  // index 12
  {
    index: 12,
    name: 'kyHieuThongTin',
    label: 'Ký hiệu thông tin (nếu có)',
    type: 'string',
    required: false,
    severity: 'WARNING',
  },
  // index 13
  {
    index: 13,
    name: 'mucDoTinCay',
    label: 'Mức độ tin cậy',
    type: 'enum',
    required: true,
    enumValues: MUC_DO_TIN_CAY,
    severity: 'ERROR',
  },
  // index 14
  {
    index: 14,
    name: 'maHoSoGocGiay',
    label: 'Mã hồ sơ gốc giấy (nếu có)',
    type: 'string',
    required: false,
    severity: 'WARNING',
  },
  // index 15
  {
    index: 15,
    name: 'cheDoDuPhong',
    label: 'Chế độ dự phòng',
    type: 'enum',
    required: true,
    enumValues: CHE_DO_DU_PHONG,
    severity: 'ERROR',
  },
  // index 16
  {
    index: 16,
    name: 'tinhTrangDuPhong',
    label: 'Tình trạng dự phòng',
    type: 'enum',
    required: 'conditional',
    conditionalOn: { fieldIndex: 15, value: '1: Có' },
    enumValues: TINH_TRANG_DU_PHONG,
    severity: 'ERROR',
  },
  // index 17
  {
    index: 17,
    name: 'ghiChu',
    label: 'Ghi chú',
    type: 'string',
    required: true,
    severity: 'ERROR',
  },
]);

module.exports = { HO_SO_SCHEMA, MA_HO_SO_REGEX };
