/**
 * WorkflowDistributionChart — Doughnut chart of dossier counts by state.
 * Props: { data: Record<string, number> }  e.g. { UPLOAD: 5, DONE: 20, ... }
 */
import { lazy, Suspense } from 'react';
import { Spin } from 'antd';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';

ChartJS.register(ArcElement, Tooltip, Legend);

const Doughnut = lazy(() => import('react-chartjs-2').then((m) => ({ default: m.Doughnut })));

const STATE_COLORS = {
  UPLOAD:     '#8c8c8c',
  VALIDATING: '#1677ff',
  VALIDATED:  '#722ed1',
  APPROVED:   '#13c2c2',
  PACKAGING:  '#fa8c16',
  DONE:       '#52c41a',
  REJECTED:   '#ff4d4f',
};

const STATE_LABELS = {
  UPLOAD:     'Chờ tải lên',
  VALIDATING: 'Đang kiểm tra',
  VALIDATED:  'Đã kiểm tra',
  APPROVED:   'Đã phê duyệt',
  PACKAGING:  'Đang đóng gói',
  DONE:       'Hoàn thành',
  REJECTED:   'Từ chối',
};

export default function WorkflowDistributionChart({ data = {} }) {
  const entries = Object.entries(data).filter(([, v]) => v > 0);
  const labels = entries.map(([k]) => STATE_LABELS[k] || k);
  const values = entries.map(([, v]) => v);
  const colors = entries.map(([k]) => STATE_COLORS[k] || '#595959');

  const chartData = {
    labels,
    datasets: [{ data: values, backgroundColor: colors, borderWidth: 1 }],
  };

  const options = {
    responsive: true,
    plugins: {
      legend: { position: 'right' },
      title: { display: true, text: 'Phân bố trạng thái hồ sơ' },
    },
  };

  if (entries.length === 0) {
    return <div style={{ textAlign: 'center', padding: 24, color: '#8c8c8c' }}>Chưa có dữ liệu</div>;
  }

  return (
    <Suspense fallback={<Spin />}>
      <Doughnut data={chartData} options={options} />
    </Suspense>
  );
}
