/**
 * TopErrorFieldsChart — Horizontal bar chart of top 10 error fields.
 * Props: { data: Array<{ field: string, count: number }> }
 */
import { lazy, Suspense } from 'react';
import { Spin } from 'antd';
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, BarElement,
  Title, Tooltip, Legend,
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const Bar = lazy(() => import('react-chartjs-2').then((m) => ({ default: m.Bar })));

export default function TopErrorFieldsChart({ data = [] }) {
  const chartData = {
    labels: data.map((d) => d.field),
    datasets: [
      {
        label: 'Số lỗi',
        data: data.map((d) => d.count),
        backgroundColor: 'rgba(255,77,79,0.7)',
        borderColor: '#ff4d4f',
        borderWidth: 1,
      },
    ],
  };

  const options = {
    indexAxis: 'y',
    responsive: true,
    plugins: {
      legend: { display: false },
      title: { display: true, text: 'Top 10 trường có nhiều lỗi nhất' },
    },
    scales: {
      x: { beginAtZero: true, ticks: { precision: 0 } },
    },
  };

  return (
    <Suspense fallback={<Spin />}>
      <Bar data={chartData} options={options} />
    </Suspense>
  );
}
