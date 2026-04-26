/**
 * ErrorTrendChart — Line chart showing error count per month (last 12 months).
 * Props: { data: Array<{ month: string, errorCount: number, uploads: number }> }
 */
import { lazy, Suspense } from 'react';
import { Spin } from 'antd';
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, PointElement, LineElement,
  Title, Tooltip, Legend, Filler,
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

const Line = lazy(() => import('react-chartjs-2').then((m) => ({ default: m.Line })));

export default function ErrorTrendChart({ data = [] }) {
  const labels = data.map((d) => d.month);
  const chartData = {
    labels,
    datasets: [
      {
        label: 'Số lỗi',
        data: data.map((d) => d.errorCount),
        borderColor: '#ff4d4f',
        backgroundColor: 'rgba(255,77,79,0.1)',
        fill: true,
        tension: 0.3,
        pointRadius: 4,
      },
      {
        label: 'Số hồ sơ tải lên',
        data: data.map((d) => d.uploads),
        borderColor: '#1677ff',
        backgroundColor: 'rgba(22,119,255,0.1)',
        fill: false,
        tension: 0.3,
        pointRadius: 4,
      },
    ],
  };

  const options = {
    responsive: true,
    plugins: {
      legend: { position: 'top' },
      title: { display: true, text: 'Xu hướng lỗi theo tháng' },
    },
    scales: {
      y: { beginAtZero: true, ticks: { precision: 0 } },
    },
  };

  return (
    <Suspense fallback={<Spin />}>
      <Line data={chartData} options={options} />
    </Suspense>
  );
}
