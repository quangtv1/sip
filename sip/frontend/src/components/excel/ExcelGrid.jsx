/**
 * Editable Excel data grid.
 * Ho_so  — horizontal table (one row, all fields as columns) + Eye detail modal.
 * Van_ban — horizontal scrollable table (multi-row) + Eye detail modal with prev/next.
 * forceSheet prop renders only the specified sheet without a tab bar.
 * Exposes scrollToCell(sheet, rowNum, field) via ref.
 * Settings (⚙) button per sheet: toggle column visibility, adjust widths, set page size.
 */
import { forwardRef, useImperativeHandle, useRef, useState, useMemo, useCallback } from 'react';
import { Tabs, Table, Typography, Badge, Modal, Tooltip, Button, Space } from 'antd';
import { EyeOutlined, LeftOutlined, RightOutlined, SettingOutlined } from '@ant-design/icons';
import ExcelCell from './ExcelCell.jsx';
import GridConfigDrawer from './GridConfigDrawer.jsx';

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

// Fields that get double-width columns by default
const WIDE_FIELDS = new Set(['tieuDeHoSo', 'trichYeuNoiDung']);
const COL_WIDTH = 140;

// Default widths per field (computed once)
const DEFAULT_HO_SO_WIDTHS = Object.fromEntries(
  HO_SO_FIELDS.map(([fn]) => [fn, WIDE_FIELDS.has(fn) ? COL_WIDTH * 2 : COL_WIDTH])
);
const DEFAULT_VAN_BAN_WIDTHS = Object.fromEntries(
  VAN_BAN_FIELDS.map(([fn]) => [fn, WIDE_FIELDS.has(fn) ? COL_WIDTH * 2 : COL_WIDTH])
);

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
  { hoSoRow = {}, vanBanRows = [], errors = [], onCellChange, editable = true, forceSheet = null },
  ref
) {
  const [activeTab, setActiveTab] = useState(forceSheet ?? 'Ho_so');
  const [hoSoDetailOpen, setHoSoDetailOpen] = useState(false);
  const [vanBanDetailOpen, setVanBanDetailOpen] = useState(false);
  const [vanBanDetailIdx, setVanBanDetailIdx] = useState(0);
  const rowRefs = useRef({});

  // ── Column config state ───────────────────────────────────────────────────
  const [configOpen, setConfigOpen] = useState(false);
  const [hoSoHidden, setHoSoHidden]   = useState(new Set());
  const [hoSoWidths, setHoSoWidths]   = useState({});
  const [vanBanHidden, setVanBanHidden] = useState(new Set());
  const [vanBanWidths, setVanBanWidths] = useState({});
  // Controlled pagination for Van_ban
  const [pagination, setPagination] = useState({ current: 1, pageSize: 50 });

  // Active sheet for config drawer
  const activeSheet = forceSheet ?? activeTab;

  const toggleHidden = useCallback((sheet, field) => {
    const setter = sheet === 'Ho_so' ? setHoSoHidden : setVanBanHidden;
    setter((prev) => {
      const next = new Set(prev);
      if (next.has(field)) next.delete(field); else next.add(field);
      return next;
    });
  }, []);

  const changeWidth = useCallback((sheet, field, delta) => {
    const setter = sheet === 'Ho_so' ? setHoSoWidths : setVanBanWidths;
    const defaults = sheet === 'Ho_so' ? DEFAULT_HO_SO_WIDTHS : DEFAULT_VAN_BAN_WIDTHS;
    setter((prev) => {
      const cur = prev[field] ?? defaults[field];
      return { ...prev, [field]: Math.min(500, Math.max(60, cur + delta)) };
    });
  }, []);

  const resetConfig = useCallback((sheet) => {
    if (sheet === 'Ho_so') { setHoSoHidden(new Set()); setHoSoWidths({}); }
    else { setVanBanHidden(new Set()); setVanBanWidths({}); setPagination({ current: 1, pageSize: 50 }); }
  }, []);

  const errorMap = useMemo(() => buildErrorMap(errors), [errors]);
  const hoSoErrorCount  = errors.filter((e) => e.sheet === 'Ho_so').length;
  const vanBanErrorCount = errors.filter((e) => e.sheet === 'Van_ban').length;

  useImperativeHandle(ref, () => ({
    scrollToCell(sheet, rowNum, field) {
      setActiveTab(sheet);
      setTimeout(() => {
        const el = rowRefs.current[`${sheet}.${rowNum}`];
        el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
    },
    openSettings() { setConfigOpen(true); },
  }));

  // ── Settings button (icon-only, used in tabBarExtraContent) ─────────────
  const settingsButton = (
    <Tooltip title="Cấu hình cột">
      <Button
        size="small"
        icon={<SettingOutlined />}
        onClick={() => setConfigOpen(true)}
        style={{ marginRight: 4 }}
      />
    </Tooltip>
  );

  // ── Config drawer ─────────────────────────────────────────────────────────
  const configDrawer = (
    <GridConfigDrawer
      open={configOpen}
      onClose={() => setConfigOpen(false)}
      sheet={activeSheet}
      fields={activeSheet === 'Ho_so' ? HO_SO_FIELDS : VAN_BAN_FIELDS}
      hidden={activeSheet === 'Ho_so' ? hoSoHidden : vanBanHidden}
      onToggle={(f) => toggleHidden(activeSheet, f)}
      widths={activeSheet === 'Ho_so' ? hoSoWidths : vanBanWidths}
      defaultWidths={activeSheet === 'Ho_so' ? DEFAULT_HO_SO_WIDTHS : DEFAULT_VAN_BAN_WIDTHS}
      onWidthChange={(f, d) => changeWidth(activeSheet, f, d)}
      pageSize={activeSheet === 'Van_ban' ? pagination.pageSize : null}
      onPageSizeChange={(s) => setPagination({ current: 1, pageSize: s })}
      onReset={() => resetConfig(activeSheet)}
    />
  );

  // ── Ho_so HORIZONTAL table ────────────────────────────────────────────────
  const hoSoHorizColumns = [
    {
      key: 'eye', title: '', width: 40, fixed: 'left',
      render: () => (
        <Tooltip title="Xem chi tiết">
          <EyeOutlined
            style={{ color: '#0E9F8E', cursor: 'pointer', fontSize: 15 }}
            onClick={() => setHoSoDetailOpen(true)}
          />
        </Tooltip>
      ),
    },
    ...HO_SO_FIELDS
      .filter(([fn]) => !hoSoHidden.has(fn))
      .map(([fieldName, label]) => ({
        title: <span style={{ fontSize: 12 }}>{label}</span>,
        dataIndex: fieldName,
        width: hoSoWidths[fieldName] ?? DEFAULT_HO_SO_WIDTHS[fieldName],
        render: (val) => (
          <ExcelCell
            sheet="Ho_so" rowNum={1} fieldName={fieldName}
            value={val ?? ''}
            cellErrors={errorMap[`Ho_so.1.${fieldName}`] || []}
            editable={editable} wrap
            onCommit={(f, v) => onCellChange?.('Ho_so', 0, f, v)}
          />
        ),
      })),
  ];

  const hoSoHorizTable = (
    <>
      <Table
        dataSource={[{ key: 0, ...hoSoRow }]}
        columns={hoSoHorizColumns}
        pagination={false}
        size="small"
        scroll={{ x: 'max-content' }}
      />
      <Modal
        title="Chi tiết hồ sơ"
        open={hoSoDetailOpen}
        onCancel={() => setHoSoDetailOpen(false)}
        footer={null}
        width={640}
      >
        <Table
          dataSource={HO_SO_FIELDS.map(([fn, label]) => ({ key: fn, fieldName: fn, label }))}
          columns={[
            { title: 'Trường', dataIndex: 'label', width: 200, render: (v) => <Text strong style={{ fontSize: 13 }}>{v}</Text> },
            {
              title: 'Giá trị', dataIndex: 'fieldName',
              render: (fn) => (
                <ExcelCell
                  sheet="Ho_so" rowNum={1} fieldName={fn}
                  value={hoSoRow[fn] ?? ''}
                  cellErrors={errorMap[`Ho_so.1.${fn}`] || []}
                  editable={editable} wrap
                  onCommit={(f, v) => onCellChange?.('Ho_so', 0, f, v)}
                />
              ),
            },
          ]}
          pagination={false} size="small" scroll={{ y: 480 }}
        />
      </Modal>
    </>
  );

  // ── Van_ban HORIZONTAL table ──────────────────────────────────────────────
  // >50 rows → pagination; ≤50 → expand full height.
  // _absIdx stored in record so renders stay correct across pages.
  const usePagination = vanBanRows.length > 50;
  const vanBanData = vanBanRows.map((r, i) => ({ ...r, key: i, _absIdx: i }));

  const vanBanColumns = [
    {
      key: 'eye', title: '', width: 40, fixed: 'left',
      render: (_, record) => (
        <Tooltip title="Xem chi tiết">
          <EyeOutlined
            style={{ color: '#0E9F8E', cursor: 'pointer', fontSize: 15 }}
            onClick={() => { setVanBanDetailIdx(record._absIdx); setVanBanDetailOpen(true); }}
          />
        </Tooltip>
      ),
    },
    {
      title: '#', width: 44, fixed: 'left',
      render: (_, record) => <Text type="secondary" style={{ fontSize: 13 }}>{record._absIdx + 1}</Text>,
    },
    ...VAN_BAN_FIELDS
      .filter(([fn]) => !vanBanHidden.has(fn))
      .map(([fieldName, label]) => ({
        title: <span style={{ fontSize: 12 }}>{label}</span>,
        dataIndex: fieldName,
        width: vanBanWidths[fieldName] ?? DEFAULT_VAN_BAN_WIDTHS[fieldName],
        render: (val, record) => (
          <ExcelCell
            sheet="Van_ban" rowNum={record._absIdx + 1} fieldName={fieldName}
            value={val ?? ''}
            cellErrors={errorMap[`Van_ban.${record._absIdx + 1}.${fieldName}`] || []}
            editable={editable} wrap
            onCommit={(f, v) => onCellChange?.('Van_ban', record._absIdx, f, v)}
          />
        ),
      })),
  ];

  // Van_ban detail modal — one row at a time, prev/next navigation
  const vanBanDetailRow = vanBanRows[vanBanDetailIdx] || {};
  const vanBanDetailModal = (
    <Modal
      title={
        <Space>
          <span>Chi tiết văn bản</span>
          <Text type="secondary" style={{ fontSize: 13 }}>
            {vanBanDetailIdx + 1} / {vanBanRows.length}
          </Text>
        </Space>
      }
      open={vanBanDetailOpen}
      onCancel={() => setVanBanDetailOpen(false)}
      footer={
        <Space>
          <Button icon={<LeftOutlined />} disabled={vanBanDetailIdx === 0}
            onClick={() => setVanBanDetailIdx((i) => i - 1)}>Trước</Button>
          <Button icon={<RightOutlined />} disabled={vanBanDetailIdx >= vanBanRows.length - 1}
            onClick={() => setVanBanDetailIdx((i) => i + 1)}>Sau</Button>
          <Button onClick={() => setVanBanDetailOpen(false)}>Đóng</Button>
        </Space>
      }
      width={640}
    >
      <Table
        dataSource={VAN_BAN_FIELDS.map(([fn, label]) => ({ key: fn, fieldName: fn, label }))}
        columns={[
          { title: 'Trường', dataIndex: 'label', width: 180, render: (v) => <Text strong style={{ fontSize: 13 }}>{v}</Text> },
          {
            title: 'Giá trị', dataIndex: 'fieldName',
            render: (fn) => (
              <ExcelCell
                sheet="Van_ban" rowNum={vanBanDetailIdx + 1} fieldName={fn}
                value={vanBanDetailRow[fn] ?? ''}
                cellErrors={errorMap[`Van_ban.${vanBanDetailIdx + 1}.${fn}`] || []}
                editable={editable} wrap
                onCommit={(f, v) => onCellChange?.('Van_ban', vanBanDetailIdx, f, v)}
              />
            ),
          },
        ]}
        pagination={false} size="small" scroll={{ y: 460 }}
      />
    </Modal>
  );

  const vanBanTable = (
    <>
      <Table
        dataSource={vanBanData}
        columns={vanBanColumns}
        pagination={usePagination ? {
          current: pagination.current,
          pageSize: pagination.pageSize,
          pageSizeOptions: [50, 100, 150, 200],
          showSizeChanger: true,
          showTotal: (total) => `${total} văn bản`,
          size: 'small',
          onChange: (page, size) => setPagination({ current: page, pageSize: size }),
        } : false}
        size="small"
        scroll={{ x: 'max-content' }}
        onRow={(record) => ({
          ref: (el) => { if (el) rowRefs.current[`Van_ban.${record._absIdx + 1}`] = el; },
        })}
      />
      {vanBanDetailModal}
    </>
  );

  // ── forceSheet: render one sheet directly (no tab bar) ───────────────────
  // Settings button is injected by parent via tabBarExtraContent; drawer still renders here.
  if (forceSheet === 'Ho_so') return <>{hoSoHorizTable}{configDrawer}</>;
  if (forceSheet === 'Van_ban') return <>{vanBanTable}{configDrawer}</>;

  // ── Default: tabbed view with settings button in tab bar right slot ───────
  const tabItems = [
    {
      key: 'Ho_so',
      label: <Badge count={hoSoErrorCount} size="small" offset={[6, -2]}>Ho_so</Badge>,
      children: hoSoHorizTable,
    },
    {
      key: 'Van_ban',
      label: <Badge count={vanBanErrorCount} size="small" offset={[6, -2]}>Van_ban</Badge>,
      children: vanBanTable,
    },
  ];

  return (
    <>
      <Tabs
        activeKey={activeTab}
        onChange={(key) => { setActiveTab(key); }}
        items={tabItems}
        type="card"
        size="small"
        tabBarExtraContent={{ right: settingsButton }}
      />
      {configDrawer}
    </>
  );
});

export default ExcelGrid;
