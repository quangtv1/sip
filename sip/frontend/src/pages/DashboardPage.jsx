/**
 * DashboardPage — KPI cards + 3 charts + auto-refresh every 30s.
 */
import { useState, useEffect, useCallback } from 'react';
import { Row, Col, Card, Spin, Alert, Typography } from 'antd';
import apiClient from '../config/api-client.js';
import StatCards from '../components/dashboard/StatCards.jsx';
import ErrorTrendChart from '../components/dashboard/ErrorTrendChart.jsx';
import TopErrorFieldsChart from '../components/dashboard/TopErrorFieldsChart.jsx';
import WorkflowDistributionChart from '../components/dashboard/WorkflowDistributionChart.jsx';

const { Title } = Typography;
const REFRESH_MS = 30_000;

export default function DashboardPage() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchStats = useCallback(async () => {
    try {
      const { data } = await apiClient.get('/stats');
      setStats(data.data);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Không thể tải thống kê');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
    const timer = setInterval(fetchStats, REFRESH_MS);
    return () => clearInterval(timer);
  }, [fetchStats]);

  if (loading) return <div style={{ textAlign: 'center', paddingTop: 60 }}><Spin size="large" /></div>;

  return (
    <div>
      <Title level={4} style={{ marginBottom: 16 }}>Tổng quan hệ thống</Title>

      {error && <Alert type="error" message={error} showIcon style={{ marginBottom: 16 }} />}

      <StatCards kpis={stats?.kpis} />

      <Row gutter={16} style={{ marginTop: 16 }}>
        <Col xs={24} lg={14}>
          <Card size="small" title="Xu hướng lỗi theo tháng" styles={{ body: { padding: '8px 12px' } }}>
            <ErrorTrendChart data={stats?.errorTrend || []} />
          </Card>
        </Col>
        <Col xs={24} lg={10}>
          <Card size="small" title="Phân bố trạng thái" styles={{ body: { padding: '8px 12px' } }}>
            <WorkflowDistributionChart data={stats?.stateDistribution || {}} />
          </Card>
        </Col>
      </Row>

      <Row gutter={16} style={{ marginTop: 16 }}>
        <Col xs={24}>
          <Card size="small" title="Top 10 trường lỗi" styles={{ body: { padding: '8px 12px' } }}>
            <TopErrorFieldsChart data={stats?.topErrorFields || []} />
          </Card>
        </Col>
      </Row>
    </div>
  );
}
