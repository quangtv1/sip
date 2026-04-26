/**
 * Paginated dossier list table.
 * Columns: maHoSo, state, uploadedBy, error count, date.
 * Clicking a row navigates to the dossier detail page.
 */
import { Table, Space, Typography } from 'antd';
import { useNavigate } from 'react-router-dom';
import DossierStatusBadge from './DossierStatusBadge.jsx';

const { Text } = Typography;

export default function DossierListTable({ data, loading, pagination, onChange }) {
  const navigate = useNavigate();

  const columns = [
    {
      title: 'Mã hồ sơ',
      dataIndex: 'maHoSo',
      key: 'maHoSo',
      render: (v) => <Text strong>{v || '—'}</Text>,
    },
    {
      title: 'Trạng thái',
      dataIndex: 'state',
      key: 'state',
      render: (state) => <DossierStatusBadge state={state} />,
    },
    {
      title: 'Người tải lên',
      dataIndex: 'uploadedBy',
      key: 'uploadedBy',
      ellipsis: true,
    },
    {
      title: 'Lỗi / Cảnh báo',
      key: 'errors',
      render: (_, row) => (
        <Space size={4}>
          {row.errorCount > 0 && <Text type="danger">{row.errorCount} lỗi</Text>}
          {row.warningCount > 0 && <Text type="warning">{row.warningCount} cảnh báo</Text>}
          {row.errorCount === 0 && row.warningCount === 0 && <Text type="secondary">—</Text>}
        </Space>
      ),
    },
    {
      title: 'Ngày tải lên',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (v) => v ? new Date(v).toLocaleDateString('vi-VN') : '—',
      width: 130,
    },
  ];

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
