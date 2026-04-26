/**
 * AuditLogTable — filterable audit log table with CSV export.
 * Props:
 *   items      {Array}
 *   loading    {boolean}
 *   total      {number}
 *   page       {number}
 *   filters    { action, userID, dossierID, from, to }
 *   onFilter   {Function(filters)}
 *   onPageChange {Function(page)}
 *   onExport   {Function}
 */
import { Table, Tag, Select, Input, DatePicker, Button, Space, Tooltip } from 'antd';
import { DownloadOutlined, SearchOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';

const { RangePicker } = DatePicker;
const { Option } = Select;

const ACTION_COLORS = {
  UPLOAD: 'blue', VALIDATE: 'purple', APPROVE: 'green',
  REJECT: 'red', PACKAGE: 'orange', LOGIN: 'cyan',
  USER_CREATED: 'geekblue', USER_LOCKED: 'volcano',
};

const STATUS_COLORS = { SUCCESS: 'success', ERROR: 'error', WARNING: 'warning' };

const ACTIONS = ['UPLOAD','VALIDATE','APPROVE','REJECT','PACKAGE','SIGN','DOWNLOAD','LOGIN','LOGOUT','USER_CREATED','USER_UPDATED','USER_LOCKED','USER_UNLOCKED','PASSWORD_CHANGED'];

export default function AuditLogTable({ items = [], loading, total, page, filters = {}, onFilter, onPageChange, onExport }) {
  const columns = [
    {
      title: 'Thời gian',
      dataIndex: 'timestamp',
      key: 'timestamp',
      width: 160,
      render: (v) => <span style={{ fontSize: 12 }}>{new Date(v).toLocaleString('vi-VN')}</span>,
    },
    {
      title: 'Hành động',
      dataIndex: 'action',
      key: 'action',
      width: 130,
      render: (v) => <Tag color={ACTION_COLORS[v] || 'default'} style={{ fontSize: 11 }}>{v}</Tag>,
    },
    {
      title: 'Người dùng',
      dataIndex: 'userID',
      key: 'userID',
      ellipsis: true,
    },
    {
      title: 'Hồ sơ',
      dataIndex: 'dossierID',
      key: 'dossierID',
      ellipsis: true,
      render: (v) => v || '—',
    },
    {
      title: 'KQ',
      dataIndex: 'resultStatus',
      key: 'resultStatus',
      width: 90,
      render: (v) => v ? <Tag color={STATUS_COLORS[v] || 'default'} style={{ fontSize: 11 }}>{v}</Tag> : '—',
    },
    {
      title: 'Lỗi',
      dataIndex: 'errorCount',
      key: 'errorCount',
      width: 60,
      render: (v) => (v > 0 ? <Tag color="error">{v}</Tag> : '—'),
    },
  ];

  return (
    <Space direction="vertical" style={{ width: '100%' }} size={12}>
      {/* Filters */}
      <Space wrap size={8}>
        <Select
          placeholder="Hành động"
          allowClear
          style={{ width: 150 }}
          value={filters.action || undefined}
          onChange={(v) => onFilter({ ...filters, action: v })}
        >
          {ACTIONS.map((a) => <Option key={a} value={a}>{a}</Option>)}
        </Select>
        <Input
          prefix={<SearchOutlined />}
          placeholder="Người dùng..."
          value={filters.userID || ''}
          onChange={(e) => onFilter({ ...filters, userID: e.target.value })}
          style={{ width: 180 }}
          allowClear
        />
        <Input
          prefix={<SearchOutlined />}
          placeholder="ID hồ sơ..."
          value={filters.dossierID || ''}
          onChange={(e) => onFilter({ ...filters, dossierID: e.target.value })}
          style={{ width: 160 }}
          allowClear
        />
        <RangePicker
          size="middle"
          value={[filters.from ? dayjs(filters.from) : null, filters.to ? dayjs(filters.to) : null]}
          onChange={(dates) => onFilter({
            ...filters,
            from: dates?.[0]?.toISOString() ?? null,
            to:   dates?.[1]?.toISOString() ?? null,
          })}
        />
        <Tooltip title="Xuất CSV">
          <Button icon={<DownloadOutlined />} onClick={onExport}>Xuất CSV</Button>
        </Tooltip>
      </Space>

      <Table
        rowKey="_id"
        dataSource={items}
        columns={columns}
        loading={loading}
        size="small"
        pagination={{
          current: page,
          total,
          pageSize: 20,
          onChange: onPageChange,
          showTotal: (t) => `Tổng ${t} bản ghi`,
        }}
      />
    </Space>
  );
}
