/**
 * Đóng gói SIP — 3 tabs: Đóng gói | Hàng đợi hồ sơ | Kho lưu trữ file
 * Routes: /dossier (new upload) | /dossier/:id (load existing)
 */
import { useRef, useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import {
  Row, Col, Card, Tabs, message, Modal, Input, Spin,
  Select, DatePicker, Space, Button, Tooltip,
} from 'antd';

/** Small inline count pill — replaces oversized Ant Design Badge in tab labels */
function CountPill({ count, color = '#C0392B' }) {
  if (!count) return null;
  return (
    <span style={{
      background: color,
      color: '#fff',
      borderRadius: 8,
      fontSize: 10,
      fontWeight: 600,
      padding: '1px 5px',
      lineHeight: '14px',
      marginLeft: 4,
      verticalAlign: 'middle',
      display: 'inline-block',
    }}>
      {count}
    </span>
  );
}
import { SearchOutlined, ReloadOutlined, SettingOutlined } from '@ant-design/icons';
import UploadPanel from '../components/upload/UploadPanel.jsx';
import FolderTreeView from '../components/upload/FolderTreeView.jsx';
import ExcelGrid from '../components/excel/ExcelGrid.jsx';
import ErrorPanel from '../components/errors/ErrorPanel.jsx';
import AutoFixPanel from '../components/errors/AutoFixPanel.jsx';
import WorkflowBar from '../components/workflow/WorkflowBar.jsx';
import PdfViewer from '../components/pdf/PdfViewer.jsx';
import GuideSidebar from '../components/dossier/GuideSidebar.jsx';
import DossierListTable, { COL_FIELDS, COL_DEFAULT_WIDTHS } from '../components/dossier/DossierListTable.jsx';
import SipArchiveTable, { SIP_ARCHIVE_COL_FIELDS, SIP_ARCHIVE_DEFAULT_WIDTHS } from '../components/files/SipArchiveTable.jsx';
import GridConfigDrawer from '../components/excel/GridConfigDrawer.jsx';
// FileBrowser replaced by SipArchiveTable for structured archive view
import { useDossier } from '../hooks/use-dossier.js';
import apiClient from '../config/api-client.js';

const LS_QUEUE   = 'sip_queue_col_config';
const LS_ARCHIVE = 'sip_archive_col_config';

function loadCfg(key) {
  try {
    const { hidden = [], widths = {} } = JSON.parse(localStorage.getItem(key) || '{}');
    return { hidden: new Set(hidden), widths };
  } catch { return { hidden: new Set(), widths: {} }; }
}
function saveCfg(key, hidden, widths) {
  try { localStorage.setItem(key, JSON.stringify({ hidden: [...hidden], widths })); } catch {}
}

const { RangePicker } = DatePicker;

// ─── Queue tab state options ──────────────────────────────────────────────────
const STATE_OPTIONS = [
  { label: 'Tất cả', value: '' },
  { label: 'Mới tải lên', value: 'UPLOAD' },
  { label: 'Đang kiểm tra', value: 'VALIDATING' },
  { label: 'Đã kiểm tra', value: 'VALIDATED' },
  { label: 'Đã phê duyệt', value: 'APPROVED' },
  { label: 'Đang đóng gói', value: 'PACKAGING' },
  { label: 'Hoàn thành', value: 'DONE' },
  { label: 'Từ chối', value: 'REJECTED' },
];

// ─── Queue tab (with column config + delete) ─────────────────────────────────
function QueueTab() {
  const [data, setData]           = useState([]);
  const [loading, setLoading]     = useState(false);
  const [total, setTotal]         = useState(0);
  const [page, setPage]           = useState(1);
  const [stateFilter, setFilter]  = useState('');
  const [search, setSearch]       = useState('');
  const [dateRange, setDateRange] = useState(null);
  const [hidden, setHidden]       = useState(() => loadCfg(LS_QUEUE).hidden);
  const [colWidths, setColWidths] = useState(() => loadCfg(LS_QUEUE).widths);
  const [cfgOpen, setCfgOpen]     = useState(false);

  const fetchDossiers = useCallback(async (p = 1) => {
    setLoading(true);
    try {
      const params = { page: p, limit: 20 };
      if (stateFilter) params.state = stateFilter;
      if (search.trim()) params.search = search.trim();
      if (dateRange?.[0]) params.from = dateRange[0].toISOString();
      if (dateRange?.[1]) params.to   = dateRange[1].toISOString();
      const { data: res } = await apiClient.get('/dossiers', { params });
      setData(res.data.items); setTotal(res.data.total); setPage(p);
    } catch { message.error('Không thể tải danh sách hồ sơ'); }
    finally { setLoading(false); }
  }, [stateFilter, search, dateRange]);

  useEffect(() => { fetchDossiers(1); }, [fetchDossiers]);

  async function handleDelete(row) {
    try {
      await apiClient.delete(`/dossiers/${row.dossierId}`);
      message.success('Đã xoá hồ sơ'); fetchDossiers(page);
    } catch (err) { message.error(err.response?.data?.error?.message || 'Xoá thất bại'); }
  }

  function toggleCol(k) {
    setHidden((prev) => {
      const next = new Set(prev); next.has(k) ? next.delete(k) : next.add(k);
      saveCfg(LS_QUEUE, next, colWidths); return next;
    });
  }
  function changeWidth(k, delta) {
    setColWidths((prev) => {
      const updated = { ...prev, [k]: Math.max(60, Math.min(500, (prev[k] ?? COL_DEFAULT_WIDTHS[k]) + delta)) };
      saveCfg(LS_QUEUE, hidden, updated); return updated;
    });
  }
  function resetCfg() { setHidden(new Set()); setColWidths({}); saveCfg(LS_QUEUE, new Set(), {}); }

  return (
    <>
      <Card size="small" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
          <Space wrap>
            <Select style={{ width: 160 }} options={STATE_OPTIONS} value={stateFilter}
              onChange={(v) => setFilter(v)} placeholder="Lọc trạng thái" />
            <RangePicker onChange={(d) => setDateRange(d)} format="DD/MM/YYYY"
              placeholder={['Từ ngày', 'Đến ngày']} />
            <Input prefix={<SearchOutlined />} placeholder="Tìm theo mã hồ sơ" value={search}
              onChange={(e) => setSearch(e.target.value)} onPressEnter={() => fetchDossiers(1)}
              style={{ width: 220 }} allowClear />
            <Button icon={<ReloadOutlined />} onClick={() => fetchDossiers(1)}>Làm mới</Button>
          </Space>
          <Tooltip title="Cấu hình cột">
            <Button size="small" icon={<SettingOutlined />} onClick={() => setCfgOpen(true)} style={{ flexShrink: 0 }} />
          </Tooltip>
        </div>
      </Card>
      <Card size="small" styles={{ body: { padding: 0 } }}>
        <DossierListTable data={data} loading={loading}
          pagination={{ current: page, pageSize: 20, total, showSizeChanger: false }}
          onChange={(p) => fetchDossiers(p.current)}
          hiddenCols={hidden} colWidths={colWidths} onDelete={handleDelete} />
      </Card>
      <GridConfigDrawer open={cfgOpen} onClose={() => setCfgOpen(false)} sheet="Hàng đợi"
        fields={COL_FIELDS} hidden={hidden} onToggle={toggleCol}
        widths={colWidths} defaultWidths={COL_DEFAULT_WIDTHS}
        onWidthChange={changeWidth} onReset={resetCfg} />
    </>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function DossierPage() {
  const { id: routeId } = useParams();
  const { dossier, setDossier, loading, uploadZip, uploadFolder, validate, save, uploadProgress } = useDossier();

  // All hooks declared unconditionally at the top
  const [fetchingById, setFetchingById] = useState(false);
  const [activeTab, setActiveTab] = useState('package');
  const [activeDataTab, setActiveDataTab] = useState('tree'); // inner 5-tab state
  const gridRefHoSo = useRef(null);
  const gridRefVanBan = useRef(null);
  const [pdfOpen, setPdfOpen] = useState(false);
  const [selectedPdf, setSelectedPdf] = useState('');
  const [rejectVisible, setRejectVisible] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectLoading, setRejectLoading] = useState(false);
  const [editHoSo, setEditHoSo] = useState(null);
  const [editVanBan, setEditVanBan] = useState(null);

  // Load dossier by ID and switch to package tab
  useEffect(() => {
    if (!routeId) return;
    setActiveTab('package');
    setFetchingById(true);
    apiClient.get(`/dossiers/${routeId}`)
      .then(({ data }) => {
        const d = data.data;
        setDossier({
          dossierId: d.dossierId,
          maHoSo: d.maHoSo,
          state: d.state,
          hoSoRow: d.hoSoRow,
          vanBanRows: d.vanBanRows,
          pdfFiles: d.pdfFiles,
          validation: d.validation,
        });
      })
      .catch(() => message.error('Không thể tải hồ sơ'))
      .finally(() => setFetchingById(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeId]);

  // ── Derived state ──
  const errors = dossier?.validation?.errors || [];
  const suggestions = dossier?.validation?.suggestions || [];
  const hoSoRow = dossier?.hoSoRow || {};
  const vanBanRows = dossier?.vanBanRows || [];
  const activeHoSo = editHoSo ?? hoSoRow;
  const activeVanBan = editVanBan ?? vanBanRows;
  const hasEdits = editHoSo !== null || editVanBan !== null;
  const errorCount = errors.filter((e) => e.severity === 'ERROR').length;
  const warnCount  = errors.filter((e) => e.severity !== 'ERROR').length;
  const hoSoErrorCount = errors.filter((e) => e.sheet === 'Ho_so').length;
  const vanBanErrorCount = errors.filter((e) => e.sheet === 'Van_ban').length;

  // ── Handlers ──
  function handleUploaded(data) {
    setDossier(data);
    setEditHoSo(null);
    setEditVanBan(null);
  }

  function handleCellChange(sheet, rowIdx, field, value) {
    if (sheet === 'Ho_so') {
      setEditHoSo((prev) => ({ ...(prev ?? hoSoRow), [field]: value }));
    } else {
      setEditVanBan((prev) => {
        const rows = [...(prev ?? vanBanRows)];
        rows[rowIdx] = { ...rows[rowIdx], [field]: value };
        return rows;
      });
    }
  }

  async function handleSave() {
    if (!dossier?.dossierId) return;
    try {
      await save(dossier.dossierId, activeHoSo, activeVanBan);
      setEditHoSo(null);
      setEditVanBan(null);
      message.success('Đã lưu và kiểm tra lại');
    } catch { message.error('Lưu thất bại'); }
  }

  function handleApplyFixes(patches) {
    let hs = { ...activeHoSo };
    let vb = [...activeVanBan];
    for (const p of patches) {
      if (p.sheet === 'Ho_so') { hs = { ...hs, [p.field]: p.suggested }; }
      else if (p.row != null) {
        vb = [...vb];
        vb[p.row - 1] = { ...vb[p.row - 1], [p.field]: p.suggested };
      }
    }
    setEditHoSo(hs);
    setEditVanBan(vb);
  }

  async function handleApprove() {
    if (!dossier?.dossierId) return;
    try {
      const { data } = await apiClient.post(`/dossiers/${dossier.dossierId}/approve`);
      setDossier((prev) => ({ ...prev, state: data.data.state }));
      message.success('Đã phê duyệt');
    } catch { message.error('Phê duyệt thất bại'); }
  }

  async function handleReject() {
    if (!dossier?.dossierId) return;
    if (!rejectReason.trim()) { message.warning('Vui lòng nhập lý do từ chối'); return; }
    setRejectLoading(true);
    try {
      const { data: rData } = await apiClient.post(`/dossiers/${dossier.dossierId}/reject`, { reason: rejectReason });
      setDossier((prev) => ({ ...prev, state: rData.data.state }));
      setRejectVisible(false);
      setRejectReason('');
      message.success('Đã từ chối hồ sơ');
    } catch { message.error('Thao tác thất bại'); }
    finally { setRejectLoading(false); }
  }

  function handleNavigate(sheet, row, field) {
    setActiveDataTab(sheet);
    setTimeout(() => {
      if (sheet === 'Ho_so') gridRefHoSo.current?.scrollToCell(sheet, row, field);
      else gridRefVanBan.current?.scrollToCell(sheet, row, field);
    }, 100);
  }

  async function handlePackage() {
    if (!dossier?.dossierId) return;
    try {
      await apiClient.post('/package', { dossierId: dossier.dossierId });
      setDossier((prev) => ({ ...prev, state: 'PACKAGING' }));
      message.success('Đã bắt đầu đóng gói SIP');
    } catch { message.error('Đóng gói thất bại'); }
  }

  // ── Package tab content ──
  let packageContent;
  if (fetchingById) {
    packageContent = (
      <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 80 }}>
        <Spin tip="Đang tải hồ sơ..." size="large" />
      </div>
    );
  } else if (!dossier) {
    packageContent = (
      <Row gutter={20} align="top">
        <Col xs={24} lg={16}>
          <UploadPanel
            onUploaded={handleUploaded}
            uploadZip={uploadZip}
            uploadFolder={uploadFolder}
            loading={loading}
            uploadProgress={uploadProgress}
          />
        </Col>
        <Col xs={24} lg={8}>
          <GuideSidebar showWorkflow={false} />
        </Col>
      </Row>
    );
  } else {
    const dataTabs = [
      {
        key: 'tree',
        label: 'Cấu trúc',
        children: (
          <div style={{ padding: '12px 16px' }}>
            <FolderTreeView
              pdfFiles={dossier.pdfFiles || []}
              errors={errors}
              maHoSo={dossier.maHoSo}
              onSelectPdf={(f) => { setSelectedPdf(f); setPdfOpen(true); }}
            />
          </div>
        ),
      },
      {
        key: 'Ho_so',
        label: <span>Ho_so<CountPill count={hoSoErrorCount} /></span>,
        children: (
          <ExcelGrid
            ref={gridRefHoSo}
            forceSheet="Ho_so"
            hoSoRow={activeHoSo}
            vanBanRows={activeVanBan}
            errors={errors}
            onCellChange={handleCellChange}
          />
        ),
      },
      {
        key: 'Van_ban',
        label: <span>Van_ban<CountPill count={vanBanErrorCount} /></span>,
        children: (
          <ExcelGrid
            ref={gridRefVanBan}
            forceSheet="Van_ban"
            hoSoRow={activeHoSo}
            vanBanRows={activeVanBan}
            errors={errors}
            onCellChange={handleCellChange}
          />
        ),
      },
      {
        key: 'errors',
        label: <span>Lỗi<CountPill count={errorCount} /></span>,
        children: (
          <div style={{ padding: '12px 16px', minHeight: 200 }}>
            <ErrorPanel errors={errors} onNavigate={handleNavigate} />
          </div>
        ),
      },
      {
        key: 'suggestions',
        label: <span>Gợi ý<CountPill count={suggestions.length} color="#0E9F8E" /></span>,
        children: (
          <div style={{ padding: '12px 16px', minHeight: 200 }}>
            <AutoFixPanel suggestions={suggestions} onApply={handleApplyFixes} />
          </div>
        ),
      },
    ];

    packageContent = (
      <div>
        <WorkflowBar
          state={dossier.state}
          validationValid={dossier.validation?.valid}
          dossierId={dossier.dossierId}
          loading={loading}
          onValidate={() => validate(dossier.dossierId)}
          onApprove={handleApprove}
          onReject={() => setRejectVisible(true)}
          onPackage={handlePackage}
        />
        <Card
          size="small"
          style={{ marginTop: 12 }}
          styles={{ body: { padding: 0 } }}
          extra={hasEdits && (
            <a onClick={handleSave} style={{ fontWeight: 500 }}>Lưu thay đổi</a>
          )}
        >
          <Tabs
            activeKey={activeDataTab}
            onChange={setActiveDataTab}
            items={dataTabs}
            size="small"
            destroyInactiveTabPane={false}
            tabBarStyle={{ paddingLeft: 8, marginBottom: 0 }}
            tabBarExtraContent={(activeDataTab === 'Ho_so' || activeDataTab === 'Van_ban') ? {
              right: (
                <Tooltip title="Cấu hình cột">
                  <Button
                    size="small"
                    icon={<SettingOutlined />}
                    style={{ marginRight: 8 }}
                    onClick={() => {
                      if (activeDataTab === 'Ho_so') gridRefHoSo.current?.openSettings();
                      else gridRefVanBan.current?.openSettings();
                    }}
                  />
                </Tooltip>
              ),
            } : null}
          />
        </Card>

        <PdfViewer
          open={pdfOpen}
          dossierId={dossier.dossierId}
          filename={selectedPdf}
          dossierState={dossier.state}
          onClose={() => setPdfOpen(false)}
        />
        <Modal
          title="Từ chối hồ sơ"
          open={rejectVisible}
          onOk={handleReject}
          onCancel={() => setRejectVisible(false)}
          confirmLoading={rejectLoading}
          okText="Từ chối"
          okButtonProps={{ danger: true, disabled: rejectLoading }}
        >
          <Input.TextArea
            placeholder="Lý do từ chối..."
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            rows={4}
          />
        </Modal>
      </div>
    );
  }

  // Archive tab — self-managed config state
  const [aHidden, setAHidden]   = useState(() => loadCfg(LS_ARCHIVE).hidden);
  const [aWidths, setAWidths]   = useState(() => loadCfg(LS_ARCHIVE).widths);
  const [aOpen, setAOpen]       = useState(false);

  function toggleArchiveCol(k) {
    setAHidden((prev) => {
      const next = new Set(prev); next.has(k) ? next.delete(k) : next.add(k);
      saveCfg(LS_ARCHIVE, next, aWidths); return next;
    });
  }
  function changeArchiveWidth(k, delta) {
    setAWidths((prev) => {
      const updated = { ...prev, [k]: Math.max(60, Math.min(500, (prev[k] ?? SIP_ARCHIVE_DEFAULT_WIDTHS[k]) + delta)) };
      saveCfg(LS_ARCHIVE, aHidden, updated); return updated;
    });
  }
  function resetArchiveCfg() { setAHidden(new Set()); setAWidths({}); saveCfg(LS_ARCHIVE, new Set(), {}); }

  // ── Outer tabs ──
  const outerTabItems = [
    { key: 'package', label: 'Đóng gói', children: packageContent },
    { key: 'queue',   label: 'Hàng đợi hồ sơ', children: <QueueTab /> },
    {
      key: 'files', label: 'Kho lưu trữ file',
      children: (
        <>
          <SipArchiveTable hidden={aHidden} colWidths={aWidths} onOpenConfig={() => setAOpen(true)} />
          <GridConfigDrawer open={aOpen} onClose={() => setAOpen(false)} sheet="Kho lưu trữ"
            fields={SIP_ARCHIVE_COL_FIELDS} hidden={aHidden} onToggle={toggleArchiveCol}
            widths={aWidths} defaultWidths={SIP_ARCHIVE_DEFAULT_WIDTHS}
            onWidthChange={changeArchiveWidth} onReset={resetArchiveCfg} />
        </>
      ),
    },
  ];

  return (
    <Tabs
      activeKey={activeTab}
      onChange={setActiveTab}
      items={outerTabItems}
      destroyInactiveTabPane={false}
    />
  );
}
