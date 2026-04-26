/**
 * StatCards — 4 KPI cards for the dashboard top row.
 * Props: { kpis: { total, done, pending, errorTotal, successRate } }
 */
import { Row, Col, Statistic, Card } from 'antd';
import { FileOutlined, CheckCircleOutlined, ClockCircleOutlined, WarningOutlined } from '@ant-design/icons';

export default function StatCards({ kpis = {} }) {
  const { total = 0, done = 0, pending = 0, errorTotal = 0, successRate = 0 } = kpis;

  const cards = [
    { title: 'Tổng hồ sơ',        value: total,               icon: <FileOutlined />,         color: '#1677ff' },
    { title: 'Đã hoàn thành',      value: done,                icon: <CheckCircleOutlined />,  color: '#52c41a' },
    { title: 'Chờ xử lý',          value: pending,             icon: <ClockCircleOutlined />,  color: '#fa8c16' },
    { title: 'Tỷ lệ thành công',   value: `${successRate}%`,   icon: <WarningOutlined />,      color: '#0E9F8E' },
  ];

  return (
    <Row gutter={16}>
      {cards.map((c) => (
        <Col key={c.title} xs={24} sm={12} md={6}>
          <Card size="small" style={{ borderTop: `3px solid ${c.color}` }}>
            <Statistic
              title={c.title}
              value={c.value}
              prefix={<span style={{ color: c.color, marginRight: 4 }}>{c.icon}</span>}
              valueStyle={{ color: c.color }}
            />
          </Card>
        </Col>
      ))}
    </Row>
  );
}
