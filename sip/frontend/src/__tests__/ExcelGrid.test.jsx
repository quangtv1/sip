import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { createRef } from 'react';
import ExcelGrid from '../components/excel/ExcelGrid.jsx';

const HO_SO = {
  maHoSo: 'H49.61.8.2017',
  tieuDeHoSo: 'Hồ sơ test',
  tongSoTaiLieu: '3',
};

const VAN_BAN = [
  { maDinhDanh: 'VB0000001', maLuuTru: 'H49.61.8.2017.0000001', soTaiLieu: '123/1' },
  { maDinhDanh: 'VB0000002', maLuuTru: 'H49.61.8.2017.0000002', soTaiLieu: '123/2' },
];

const ERRORS = [
  { sheet: 'Ho_so', row: 1, field: 'maHoSo',  severity: 'ERROR',   message: 'Sai định dạng', code: 'INVALID_FORMAT', label: 'Mã hồ sơ' },
  { sheet: 'Van_ban', row: 1, field: 'soTaiLieu', severity: 'WARNING', message: 'Khuyến nghị', code: 'SUGGEST', label: 'Số TL' },
];

describe('ExcelGrid — tab navigation', () => {
  it('renders Ho_so tab by default', () => {
    render(<ExcelGrid hoSoRow={HO_SO} vanBanRows={VAN_BAN} />);
    expect(screen.getByText('Mã hồ sơ')).toBeInTheDocument();
  });

  it('switches to Van_ban tab on click', () => {
    render(<ExcelGrid hoSoRow={HO_SO} vanBanRows={VAN_BAN} />);
    fireEvent.click(screen.getByText(/Văn bản/));
    expect(screen.getByText('Mã lưu trữ')).toBeInTheDocument();
  });
});

describe('ExcelGrid — error counts in tab labels', () => {
  it('shows Ho_so error badge when errors present', () => {
    render(<ExcelGrid hoSoRow={HO_SO} vanBanRows={VAN_BAN} errors={ERRORS} />);
    // Badge renders error count — tab label includes "Hồ sơ" + count badge
    expect(screen.getByText('1')).toBeInTheDocument();
  });
});

describe('ExcelGrid — cell rendering', () => {
  it('renders maHoSo value in Ho_so grid', () => {
    render(<ExcelGrid hoSoRow={HO_SO} vanBanRows={VAN_BAN} />);
    expect(screen.getByDisplayValue('H49.61.8.2017')).toBeInTheDocument();
  });

  it('renders Van_ban rows after switching tab', () => {
    render(<ExcelGrid hoSoRow={HO_SO} vanBanRows={VAN_BAN} />);
    fireEvent.click(screen.getByText(/Văn bản/));
    expect(screen.getByDisplayValue('VB0000001')).toBeInTheDocument();
    expect(screen.getByDisplayValue('VB0000002')).toBeInTheDocument();
  });
});

describe('ExcelGrid — cell editing', () => {
  it('calls onCellChange when a cell value changes', () => {
    const onCellChange = vi.fn();
    render(<ExcelGrid hoSoRow={HO_SO} vanBanRows={VAN_BAN} onCellChange={onCellChange} editable />);
    const input = screen.getByDisplayValue('Hồ sơ test');
    fireEvent.change(input, { target: { value: 'Hồ sơ sửa' } });
    expect(onCellChange).toHaveBeenCalledWith('Ho_so', 1, 'tieuDeHoSo', 'Hồ sơ sửa');
  });
});

describe('ExcelGrid — imperative scrollToCell ref', () => {
  it('switches to Van_ban tab when scrollToCell targets Van_ban sheet', () => {
    const ref = createRef();
    render(<ExcelGrid ref={ref} hoSoRow={HO_SO} vanBanRows={VAN_BAN} />);
    // Initially on Ho_so
    expect(screen.getByDisplayValue('H49.61.8.2017')).toBeInTheDocument();
    // Invoke imperative handle
    ref.current.scrollToCell('Van_ban', 1, 'soTaiLieu');
    // Tab should switch to Van_ban
    expect(screen.getByDisplayValue('VB0000001')).toBeInTheDocument();
  });
});
