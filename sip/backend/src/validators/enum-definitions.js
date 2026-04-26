/**
 * TT05 (Thông tư 05/TT-BNV) exact enum values.
 * All comparisons MUST be exact string match — no trimming, no normalizing.
 */

const THOI_HAN_BAO_QUAN = Object.freeze([
  '01: Vĩnh viễn',
  '02: 70 năm',
  '03: 50 năm',
  '04: 30 năm',
  '05: 20 năm',
  '06: 10 năm',
]);

const CHE_DO_SU_DUNG = Object.freeze([
  '01: Công khai',
  '02: Sử dụng có điều kiện',
  '03: Mật',
]);

const NGON_NGU = Object.freeze([
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
]);

const TINH_TRANG_VAT_LY = Object.freeze([
  '01: Tốt',
  '02: Bình thường',
  '03: Hỏng',
]);

const MUC_DO_TIN_CAY = Object.freeze([
  '01: Gốc điện tử',
  '02: Số hóa',
  '03: Hỗn hợp',
]);

const CHE_DO_DU_PHONG = Object.freeze([
  '1: Có',
  '0: Không',
]);

const TINH_TRANG_DU_PHONG = Object.freeze([
  '01: Đã dự phòng',
  '02: Chưa dự phòng',
]);

const TEN_LOAI_TAI_LIEU = Object.freeze([
  '01: Nghị quyết',
  '02: Quyết định',
  '03: Chỉ thị',
  '04: Thông tư',
  '05: Thông báo',
  '06: Hướng dẫn',
  '07: Chương trình',
  '08: Kế hoạch',
  '09: Phương án',
  '10: Đề án',
  '11: Dự án',
  '12: Báo cáo',
  '13: Biên bản',
  '14: Tờ trình',
  '15: Hợp đồng',
  '16: Công văn',
  '17: Công điện',
  '18: Bản ghi nhớ',
  '19: Bản thỏa thuận',
  '20: Giấy ủy quyền',
  '21: Giấy mời',
  '22: Giấy giới thiệu',
  '23: Giấy nghỉ phép',
  '24: Phiếu gửi',
  '25: Phiếu chuyển',
  '26: Thư công',
  '27: Quy chế',
  '28: Quy định',
  '29: Điều lệ',
  '30: Chuẩn mực',
  '31: Thỏa ước',
  '32: Khác',
]);

module.exports = {
  THOI_HAN_BAO_QUAN,
  CHE_DO_SU_DUNG,
  NGON_NGU,
  TINH_TRANG_VAT_LY,
  MUC_DO_TIN_CAY,
  CHE_DO_DU_PHONG,
  TINH_TRANG_DU_PHONG,
  TEN_LOAI_TAI_LIEU,
};
