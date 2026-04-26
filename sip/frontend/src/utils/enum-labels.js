/**
 * TT05 enum values for dropdown rendering.
 * These must match EXACTLY the enum strings in the backend validators.
 */

export const THOI_HAN_BAO_QUAN = [
  '01: Vĩnh viễn',
  '02: 70 năm',
  '03: 50 năm',
  '04: 30 năm',
  '05: 20 năm',
  '06: 10 năm',
];

export const CHE_DO_SU_DUNG = [
  '01: Công khai',
  '02: Sử dụng có điều kiện',
  '03: Mật',
];

export const NGON_NGU = [
  '01: Tiếng Việt',
  '02: Tiếng Anh',
  '03: Tiếng Pháp',
  '04: Tiếng Nga',
  '05: Tiếng Trung',
  '06: Tiếng Nhật',
  '07: Tiếng Đức',
  '08: Tiếng Tây Ban Nha',
  '09: Tiếng Ả Rập',
  '10: Tiếng Hàn',
  '11: Khác',
];

export const TINH_TRANG_VAT_LY = ['01: Tốt', '02: Bình thường', '03: Hỏng'];
export const MUC_DO_TIN_CAY = ['01: Gốc điện tử', '02: Số hóa', '03: Hỗn hợp'];
export const CHE_DO_DU_PHONG = ['1: Có', '0: Không'];
export const TINH_TRANG_DU_PHONG = ['01: Đã dự phòng', '02: Chưa dự phòng'];

export const TEN_LOAI_TAI_LIEU = [
  '01: Nghị quyết', '02: Quyết định', '03: Chỉ thị', '04: Thông tư',
  '05: Thông báo', '06: Hướng dẫn', '07: Chương trình', '08: Kế hoạch',
  '09: Phương án', '10: Đề án', '11: Dự án', '12: Báo cáo',
  '13: Biên bản', '14: Tờ trình', '15: Hợp đồng', '16: Công văn',
  '17: Công điện', '18: Bản ghi nhớ', '19: Bản thỏa thuận', '20: Giấy ủy quyền',
  '21: Giấy mời', '22: Giấy giới thiệu', '23: Giấy nghỉ phép', '24: Phiếu gửi',
  '25: Phiếu chuyển', '26: Thư công', '27: Quy chế', '28: Quy định',
  '29: Điều lệ', '30: Chuẩn mực', '31: Thỏa ước', '32: Khác',
];

/** Map field name → enum options array for ExcelGrid dropdowns */
export const FIELD_ENUM_MAP = {
  // Ho_so
  thoiHanBaoQuan: THOI_HAN_BAO_QUAN,
  cheDoSuDung: CHE_DO_SU_DUNG,
  ngonNgu: NGON_NGU,
  tinhTrangVatLy: TINH_TRANG_VAT_LY,
  mucDoTinCay: MUC_DO_TIN_CAY,
  cheDoDuPhong: CHE_DO_DU_PHONG,
  tinhTrangDuPhong: TINH_TRANG_DU_PHONG,
  // Van_ban
  tenLoaiTaiLieu: TEN_LOAI_TAI_LIEU,
};

/** Convert array of enum strings to Ant Design Select options */
export function toSelectOptions(values) {
  return values.map((v) => ({ label: v, value: v }));
}
