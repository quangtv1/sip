/**
 * Queue View — paginated list of all dossiers with state/date filters.
 * Operators see only their own dossiers (enforced by backend + mirrored in UI).
 */
import { useState, useEffect, useCallback } from 'react';
import { Card, Space, Select, DatePicker, Input, Button, Typography, message } from 'antd';
import { SearchOutlined, ReloadOutlined } from '@ant-design/icons';
import DossierListTable from '../components/dossier/DossierListTable.jsx';
import apiClient from '../config/api-client.js';

const { Title } = Typography;
const { RangePicker } = DatePicker;

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

export default function QueueViewPage() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [stateFilter, setStateFilter] = useState('');
  const [search, setSearch] = useState('');
  const [dateRange, setDateRange] = useState(null);

  const fetchDossiers = useCallback(async (pageNum = 1) => {
    setLoading(true);
    try {
      const params = { page: pageNum, limit: 20 };
      if (stateFilter) params.state = stateFilter;
      if (search.trim()) params.search = search.trim();
      if (dateRange?.[0]) params.from = dateRange[0].toISOString();
      if (dateRange?.[1]) params.to = dateRange[1].toISOString();

      const { data: res } = await apiClient.get('/dossiers', { params });
      setData(res.data.items);
      setTotal(res.data.total);
      setPage(pageNum);
    } catch {
      message.error('Không thể tải danh sách hồ sơ');
    } finally {
      setLoading(false);
    }
  }, [stateFilter, search, dateRange]);

  useEffect(() => { fetchDossiers(1); }, [fetchDossiers]);

  function handleTableChange(pagination) {
    fetchDossiers(pagination.current);
  }

  return (
    <div>
      <Title level={4} style={{ marginBottom: 16 }}>Danh sách hồ sơ</Title>

      <Card size="small" style={{ marginBottom: 16 }}>
        <Space wrap>
          <Select
            style={{ width: 160 }}
            options={STATE_OPTIONS}
            value={stateFilter}
            onChange={(v) => setStateFilter(v)}
            placeholder="Lọc trạng thái"
          />
          <RangePicker
            onChange={(dates) => setDateRange(dates)}
            format="DD/MM/YYYY"
            placeholder={['Từ ngày', 'Đến ngày']}
          />
          <Input
            prefix={<SearchOutlined />}
            placeholder="Tìm theo mã hồ sơ"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onPressEnter={() => fetchDossiers(1)}
            style={{ width: 220 }}
            allowClear
          />
          <Button icon={<ReloadOutlined />} onClick={() => fetchDossiers(1)}>
            Làm mới
          </Button>
        </Space>
      </Card>

      <Card size="small" styles={{ body: { padding: 0 } }}>
        <DossierListTable
          data={data}
          loading={loading}
          pagination={{ current: page, pageSize: 20, total, showSizeChanger: false }}
          onChange={handleTableChange}
        />
      </Card>
    </div>
  );
}
