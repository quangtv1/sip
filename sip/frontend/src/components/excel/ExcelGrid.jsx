/**
 * Editable Excel data grid — tabs for Ho_so (single row) and Van_ban (multi-row, virtual scroll).
 * Exposes scrollToCell(sheet, rowNum, field) via ref for ErrorPanel navigation.
 */
import { forwardRef, useImperativeHandle, useRef, useState, useMemo } from 'react';
import { Tabs, Table, Typography, Badge } from 'antd';
import ExcelCell from './ExcelCell.jsx';

const { Text } = Typography;

// Ho_so field definitions [fieldName, label]
const HO_SO_FIELDS = [
  ['maHoSo','Mã hồ sơ'],['tieuDeHoSo','Tiêu đề hồ sơ'],['thoiHanBaoQuan','Thời hạn bảo quản'],
  ['cheDoSuDung','Chế độ sử dụng'],['ngonNgu','Ngôn ngữ'],['thoiGianBatDau','Thời gian bắt đầu'],
  ['thoiGianKetThuc','Thời gian kết thúc'],['tuKhoa','Từ khóa'],['tongSoTaiLieu','Tổng số tài liệu'],
  ['soLuongTo','Số lượng tờ'],['soLuongTrang','Số lượng trang'],['tinhTrangVatLy','Tình trạng vật lý'],
  ['kyHieuThongTin','Ký hiệu thông tin'],['mucDoTinCay','Mức độ tin cậy'],['maHoSoGocGiay','Mã hồ sơ gốc giấy'],
  ['cheDoDuPhong','Chế độ dự phòng'],['tinhTrangDuPhong','Tình trạng dự phòng'],['ghiChu','Ghi chú'],
];

// Van_ban field definitions [fieldName, label]
const VAN_BAN_FIELDS = [
  ['maDinhDanh','Mã định danh'],['maLuuTru','Mã lưu trữ'],['thoiHanBaoQuan','THBQ'],
  ['tenLoaiTaiLieu','Loại tài liệu'],['soTaiLieu','Số TL'],['kyHieuTaiLieu','Ký hiệu'],
  ['ngayThangNam','Ngày tháng năm'],['tenCoQuan','Cơ quan ban hành'],['trichYeuNoiDung','Trích yếu'],
  ['ngonNgu','Ngôn ngữ'],['soLuongTrang','Số trang'],['kyHieuThongTin','KH thông tin'],
  ['tuKhoa','Từ khóa'],['cheDoSuDung','Chế độ SD'],['mucDoTinCay','Mức độ TC'],
  ['butTich','Bút tích'],['tinhTrangVatLy','Tình trạng VL'],['cheDoDuPhong','Chế độ DP'],
  ['tinhTrangDuPhong','Tình trạng DP'],['ghiChu','Ghi chú'],['duongDanPdf','Đường dẫn PDF'],
];

/** Build lookup: `${sheet}.${row}.${field}` → errors[] */
function buildErrorMap(errors) {
  const map = {};
  for (const e of errors || []) {
    if (!e.sheet || e.row == null || !e.field) continue;
    const key = `${e.sheet}.${e.row}.${e.field}`;
    (map[key] = map[key] || []).push(e);
  }
  return map;
}

const ExcelGrid = forwardRef(function ExcelGrid(
  { hoSoRow = {}, vanBanRows = [], errors = [], onCellChange, editable = true },
  ref
) {
  const [activeTab, setActiveTab] = useState('Ho_so');
  const rowRefs = useRef({}); // rowNum → DOM element

  const errorMap = useMemo(() => buildErrorMap(errors), [errors]);
  const hoSoErrorCount = errors.filter((e) => e.sheet === 'Ho_so').length;
  const vanBanErrorCount = errors.filter((e) => e.sheet === 'Van_ban').length;

  useImperativeHandle(ref, () => ({
    scrollToCell(sheet, rowNum, field) {
      setActiveTab(sheet);
      setTimeout(() => {
        const el = rowRefs.current[`${sheet}.${rowNum}`];
        el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
    },
  }));

  // Ho_so: vertical key-value table
  const hoSoColumns = [
    { title: 'Trường', dataIndex: 'label', width: 220, render: (v) => <Text strong>{v}</Text> },
    {
      title: 'Giá trị',
      dataIndex: 'fieldName',
      render: (fieldName, record) => (
        <ExcelCell
          sheet="Ho_so" rowNum={1} fieldName={fieldName}
          value={hoSoRow[fieldName] ?? ''}
          cellErrors={errorMap[`Ho_so.1.${fieldName}`] || []}
          editable={editable}
          onCommit={(f, v) => onCellChange?.('Ho_so', 0, f, v)}
        />
      ),
    },
  ];
  const hoSoData = HO_SO_FIELDS.map(([fieldName, label]) => ({ key: fieldName, fieldName, label }));

  // Van_ban: horizontal scrollable table
  const vanBanColumns = [
    { title: '#', width: 48, fixed: 'left', render: (_, __, idx) => <Text type="secondary">{idx + 1}</Text> },
    ...VAN_BAN_FIELDS.map(([fieldName, label]) => ({
      title: label,
      dataIndex: fieldName,
      width: 120,
      render: (val, _, idx) => (
        <ExcelCell
          sheet="Van_ban" rowNum={idx + 1} fieldName={fieldName}
          value={val ?? ''}
          cellErrors={errorMap[`Van_ban.${idx + 1}.${fieldName}`] || []}
          editable={editable}
          onCommit={(f, v) => onCellChange?.('Van_ban', idx, f, v)}
        />
      ),
    })),
  ];

  const tabItems = [
    {
      key: 'Ho_so',
      label: <Badge count={hoSoErrorCount} size="small" offset={[6,-2]}>Ho_so</Badge>,
      children: (
        <Table
          dataSource={hoSoData} columns={hoSoColumns}
          pagination={false} size="small" showHeader
          scroll={{ y: 420 }}
        />
      ),
    },
    {
      key: 'Van_ban',
      label: <Badge count={vanBanErrorCount} size="small" offset={[6,-2]}>Van_ban</Badge>,
      children: (
        <Table
          dataSource={vanBanRows.map((r, i) => ({ ...r, key: i }))}
          columns={vanBanColumns}
          pagination={false} size="small"
          scroll={{ x: 'max-content', y: 420 }}
          virtual
          onRow={(_, idx) => ({
            ref: (el) => { if (el) rowRefs.current[`Van_ban.${idx + 1}`] = el; },
          })}
        />
      ),
    },
  ];

  return (
    <Tabs
      activeKey={activeTab}
      onChange={setActiveTab}
      items={tabItems}
      type="card"
      size="small"
    />
  );
});

export default ExcelGrid;
