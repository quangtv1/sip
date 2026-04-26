import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ErrorPanel from '../components/errors/ErrorPanel.jsx';

const ERRORS = [
  { sheet: 'Ho_so', row: 1, field: 'maHoSo', label: 'Mã hồ sơ', severity: 'ERROR', message: 'Bắt buộc', code: 'REQUIRED' },
  { sheet: 'Ho_so', row: 1, field: 'tieuDe', label: 'Tiêu đề', severity: 'ERROR', message: 'Sai định dạng', code: 'INVALID_FORMAT' },
  { sheet: 'Van_ban', row: 2, field: 'ngayThangNam', label: 'Ngày', severity: 'WARNING', message: 'Khuyến nghị', code: 'SUGGEST' },
];

describe('ErrorPanel', () => {
  it('renders all errors by default', () => {
    render(<ErrorPanel errors={ERRORS} />);
    // All 3 items visible
    expect(screen.getAllByText(/Bắt buộc|Sai định dạng|Khuyến nghị/).length).toBe(3);
  });

  it('shows empty state when no errors', () => {
    render(<ErrorPanel errors={[]} />);
    expect(screen.getByText('Không có lỗi')).toBeInTheDocument();
  });

  it('filters to show only ERRORs', () => {
    render(<ErrorPanel errors={ERRORS} />);
    // Click the "Lỗi" segmented option
    fireEvent.click(screen.getByText(/^Lỗi/));
    // Only 2 ERROR items
    expect(screen.getAllByText(/Bắt buộc|Sai định dạng/).length).toBe(2);
    expect(screen.queryByText('Khuyến nghị')).not.toBeInTheDocument();
  });

  it('filters to show only WARNINGs', () => {
    render(<ErrorPanel errors={ERRORS} />);
    fireEvent.click(screen.getByText(/^Cảnh báo/));
    expect(screen.getByText('Khuyến nghị')).toBeInTheDocument();
    expect(screen.queryByText('Bắt buộc')).not.toBeInTheDocument();
  });

  it('shows empty-filter message when no items match filter', () => {
    const errorsOnly = ERRORS.filter((e) => e.severity === 'ERROR');
    render(<ErrorPanel errors={errorsOnly} />);
    // Switch to WARNING tab — no warnings exist
    fireEvent.click(screen.getByText(/^Cảnh báo/));
    expect(screen.getByText('Không có lỗi theo bộ lọc này')).toBeInTheDocument();
  });

  it('calls onNavigate when an error item is clicked', () => {
    const onNavigate = vi.fn();
    render(<ErrorPanel errors={ERRORS} onNavigate={onNavigate} />);
    // Click on first error (ErrorItem renders the message text)
    fireEvent.click(screen.getByText('Bắt buộc'));
    expect(onNavigate).toHaveBeenCalledWith('Ho_so', 1, 'maHoSo');
  });

  it('does not throw when onNavigate is not provided', () => {
    render(<ErrorPanel errors={ERRORS} />);
    expect(() => fireEvent.click(screen.getByText('Bắt buộc'))).not.toThrow();
  });

  it('displays correct counts in segmented labels', () => {
    render(<ErrorPanel errors={ERRORS} />);
    expect(screen.getByText('Tất cả (3)')).toBeInTheDocument();
    expect(screen.getByText('Lỗi (2)')).toBeInTheDocument();
    expect(screen.getByText('Cảnh báo (1)')).toBeInTheDocument();
  });
});
