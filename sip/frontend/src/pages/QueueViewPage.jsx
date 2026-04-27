/**
 * QueueViewPage — dossier queue + SIP archive in tabs.
 * Column config (visibility + widths) persisted per-tab in localStorage.
 */
import { useState, useEffect, useCallback } from 'react';
import { Card, Space, Select, DatePicker, Input, Button, Typography, Tabs, Tooltip, message } from 'antd';
import { SearchOutlined, ReloadOutlined, SettingOutlined } from '@ant-design/icons';
import DossierListTable, { COL_FIELDS, COL_DEFAULT_WIDTHS } from '../components/dossier/DossierListTable.jsx';
import SipArchiveTable, { SIP_ARCHIVE_COL_FIELDS, SIP_ARCHIVE_DEFAULT_WIDTHS } from '../components/files/SipArchiveTable.jsx';
import GridConfigDrawer from '../components/excel/GridConfigDrawer.jsx';
import apiClient from '../config/api-client.js';

const { Title } = Typography;
const { RangePicker } = DatePicker;

const LS_QUEUE   = 'sip_queue_col_config';
const LS_ARCHIVE = 'sip_archive_col_config';

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

function loadCfg(key) {
  try {
    const { hidden = [], widths = {} } = JSON.parse(localStorage.getItem(key) || '{}');
    return { hidden: new Set(hidden), widths };
  } catch { return { hidden: new Set(), widths: {} }; }
}
function saveCfg(key, hidden, widths) {
  try { localStorage.setItem(key, JSON.stringify({ hidden: [...hidden], widths })); } catch {}
}

// ─── Filter bar ───────────────────────────────────────────────────────────────
function FilterBar({ children, onOpenConfig }) {
  return (
    <Card size="small" style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
        <Space wrap>{children}</Space>
        <Tooltip title="Cấu hình cột">
          <Button size="small" icon={<SettingOutlined />} onClick={onOpenConfig} style={{ flexShrink: 0 }} />
        </Tooltip>
      </div>
    </Card>
  );
}

// ─── Queue tab ────────────────────────────────────────────────────────────────
function QueueTab({ hidden, colWidths, onOpenConfig }) {
  const [data, setData]           = useState([]);
  const [loading, setLoading]     = useState(false);
  const [total, setTotal]         = useState(0);
  const [page, setPage]           = useState(1);
  const [stateFilter, setFilter]  = useState('');
  const [search, setSearch]       = useState('');
  const [dateRange, setDateRange] = useState(null);

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

  return (
    <>
      <FilterBar onOpenConfig={onOpenConfig}>
        <Select style={{ width: 160 }} options={STATE_OPTIONS} value={stateFilter}
          onChange={(v) => setFilter(v)} placeholder="Lọc trạng thái" />
        <RangePicker onChange={(d) => setDateRange(d)} format="DD/MM/YYYY"
          placeholder={['Từ ngày', 'Đến ngày']} />
        <Input prefix={<SearchOutlined />} placeholder="Tìm theo mã hồ sơ" value={search}
          onChange={(e) => setSearch(e.target.value)} onPressEnter={() => fetchDossiers(1)}
          style={{ width: 220 }} allowClear />
        <Button icon={<ReloadOutlined />} onClick={() => fetchDossiers(1)}>Làm mới</Button>
      </FilterBar>
      <Card size="small" styles={{ body: { padding: 0 } }}>
        <DossierListTable data={data} loading={loading}
          pagination={{ current: page, pageSize: 20, total, showSizeChanger: false }}
          onChange={(p) => fetchDossiers(p.current)}
          hiddenCols={hidden} colWidths={colWidths} onDelete={handleDelete} />
      </Card>
    </>
  );
}

// ─── Archive tab ──────────────────────────────────────────────────────────────
function ArchiveTab({ hidden, colWidths, onOpenConfig }) {
  return <SipArchiveTable hidden={hidden} colWidths={colWidths} onOpenConfig={onOpenConfig} />;
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function QueueViewPage() {
  // Queue table config
  const [qHidden, setQHidden]   = useState(() => loadCfg(LS_QUEUE).hidden);
  const [qWidths, setQWidths]   = useState(() => loadCfg(LS_QUEUE).widths);
  const [qOpen, setQOpen]       = useState(false);

  // Archive table config
  const [aHidden, setAHidden]   = useState(() => loadCfg(LS_ARCHIVE).hidden);
  const [aWidths, setAWidths]   = useState(() => loadCfg(LS_ARCHIVE).widths);
  const [aOpen, setAOpen]       = useState(false);

  function makeHandlers(key, hidden, setHidden, widths, setWidths, defaultWidths) {
    return {
      toggle: (k) => setHidden((prev) => {
        const next = new Set(prev); next.has(k) ? next.delete(k) : next.add(k);
        saveCfg(key, next, widths); return next;
      }),
      width: (k, delta) => setWidths((prev) => {
        const updated = { ...prev, [k]: Math.max(60, Math.min(500, (prev[k] ?? defaultWidths[k]) + delta)) };
        saveCfg(key, hidden, updated); return updated;
      }),
      reset: () => { setHidden(new Set()); setWidths({}); saveCfg(key, new Set(), {}); },
    };
  }

  const q = makeHandlers(LS_QUEUE, qHidden, setQHidden, qWidths, setQWidths, COL_DEFAULT_WIDTHS);
  const a = makeHandlers(LS_ARCHIVE, aHidden, setAHidden, aWidths, setAWidths, SIP_ARCHIVE_DEFAULT_WIDTHS);

  const tabItems = [
    {
      key: 'queue', label: 'Hàng đợi hồ sơ',
      children: <QueueTab hidden={qHidden} colWidths={qWidths} onOpenConfig={() => setQOpen(true)} />,
    },
    {
      key: 'archive', label: 'Kho lưu trữ',
      children: <ArchiveTab hidden={aHidden} colWidths={aWidths} onOpenConfig={() => setAOpen(true)} />,
    },
  ];

  return (
    <div>
      <Title level={4} style={{ marginBottom: 16 }}>Hồ sơ &amp; Kho lưu trữ</Title>
      <Tabs items={tabItems} destroyInactiveTabPane={false} />

      <GridConfigDrawer open={qOpen} onClose={() => setQOpen(false)} sheet="Hàng đợi"
        fields={COL_FIELDS} hidden={qHidden} onToggle={q.toggle}
        widths={qWidths} defaultWidths={COL_DEFAULT_WIDTHS}
        onWidthChange={q.width} onReset={q.reset} />

      <GridConfigDrawer open={aOpen} onClose={() => setAOpen(false)} sheet="Kho lưu trữ"
        fields={SIP_ARCHIVE_COL_FIELDS} hidden={aHidden} onToggle={a.toggle}
        widths={aWidths} defaultWidths={SIP_ARCHIVE_DEFAULT_WIDTHS}
        onWidthChange={a.width} onReset={a.reset} />
    </div>
  );
}
