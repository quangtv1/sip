/**
 * Paginated dossier list table with configurable columns + delete action.
 * Props: data, loading, pagination, onChange, hiddenCols, colWidths, onDelete
 * Exports: COL_FIELDS, COL_DEFAULT_WIDTHS for config drawer.
 */
import { Table, Space, Typography, Button, Popconfirm } from 'antd';
import { useNavigate } from 'react-router-dom';
import { DeleteOutlined } from '@ant-design/icons';
import DossierStatusBadge from './DossierStatusBadge.jsx';

const { Text } = Typography;
const FS = { fontSize: 13 };
const CELL_WRAP = { style: { whiteSpace: 'normal', wordBreak: 'break-word' } };

// Ordered column definitions — order here defines display order
const COL_DEFS = [
  {
    key: 'createdAt', title: 'Ngày tải lên', dataIndex: 'createdAt', defaultWidth: 100,
    render: (v) => <span style={FS}>{v ? new Date(v).toLocaleDateString('vi-VN') : '—'}</span>,
  },
  {
    key: 'maHoSo', title: 'Mã hồ sơ', dataIndex: 'maHoSo', defaultWidth: 110,
    render: (v) => <Text strong style={FS}>{v || '—'}</Text>,
  },
  {
    key: 'tieuDeHoSo', title: 'Tiêu đề hồ sơ', dataIndex: 'tieuDeHoSo', defaultWidth: 220,
    render: (v) => <span style={FS}>{v || '—'}</span>,
  },
  {
    key: 'pdfCount', title: 'Số file PDF', dataIndex: 'pdfCount', defaultWidth: 90, align: 'center',
    render: (v) => <span style={FS}>{v ?? 0}</span>,
  },
  {
    key: 'vanBanCount', title: 'Số dòng exel', dataIndex: 'vanBanCount', defaultWidth: 100, align: 'center',
    render: (v) => <span style={FS}>{v ?? 0}</span>,
  },
  {
    key: 'state', title: 'Trạng thái', dataIndex: 'state', defaultWidth: 120,
    render: (state) => <DossierStatusBadge state={state} />,
  },
  {
    key: 'errors', title: 'Lỗi / Cảnh báo', defaultWidth: 130,
    render: (_, row) => (
      <Space size={4}>
        {row.errorCount > 0 && <Text type="danger" style={FS}>{row.errorCount} lỗi</Text>}
        {row.warningCount > 0 && <Text type="warning" style={FS}>{row.warningCount} cảnh báo</Text>}
        {row.errorCount === 0 && row.warningCount === 0 && <Text type="secondary" style={FS}>—</Text>}
      </Space>
    ),
  },
  {
    key: 'uploadedBy', title: 'Người tải lên', dataIndex: 'uploadedBy', defaultWidth: 140,
    render: (v) => <span style={FS}>{v || '—'}</span>,
  },
];

export const COL_DEFAULT_WIDTHS = Object.fromEntries(COL_DEFS.map((c) => [c.key, c.defaultWidth]));
export const COL_FIELDS = COL_DEFS.map((c) => [c.key, c.title]);

export default function DossierListTable({ data, loading, pagination, onChange, hiddenCols, colWidths, onDelete }) {
  const navigate = useNavigate();

  const columns = COL_DEFS
    .filter(({ key }) => !hiddenCols?.has(key))
    .map(({ key, title, dataIndex, defaultWidth, align, render }) => ({
      key, title, dataIndex, align,
      width: colWidths?.[key] ?? defaultWidth,
      onCell: () => CELL_WRAP,
      render,
    }));

  if (onDelete) {
    columns.push({
      key: 'actions',
      title: 'Hành động',
      width: 72,
      align: 'center',
      render: (_, row) => (
        <Popconfirm
          title="Xoá hồ sơ này?"
          okText="Xoá"
          cancelText="Huỷ"
          okType="danger"
          onConfirm={(e) => { e?.stopPropagation?.(); onDelete(row); }}
        >
          <Button
            type="text" danger size="small"
            icon={<DeleteOutlined />}
            onClick={(e) => e.stopPropagation()}
          />
        </Popconfirm>
      ),
    });
  }

  return (
    <Table
      columns={columns}
      dataSource={data}
      rowKey="dossierId"
      loading={loading}
      pagination={pagination}
      onChange={onChange}
      onRow={(row) => ({
        onClick: () => navigate(`/dossier/${row.dossierId}`),
        style: { cursor: 'pointer' },
      })}
      size="small"
    />
  );
}
