import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import WorkflowBar from '../components/workflow/WorkflowBar.jsx';

// Mock useAuth to control the current user's role in each test
vi.mock('../hooks/use-auth.js', () => ({
  useAuth: vi.fn(),
}));

import { useAuth } from '../hooks/use-auth.js';

function renderBar(state, role, props = {}) {
  useAuth.mockReturnValue({ user: { role, email: `${role.toLowerCase()}@test.com` } });
  return render(
    <WorkflowBar
      state={state}
      validationValid={props.validationValid ?? true}
      dossierId="test-id"
      onValidate={props.onValidate ?? vi.fn()}
      onApprove={props.onApprove ?? vi.fn()}
      onReject={props.onReject ?? vi.fn()}
      onPackage={props.onPackage ?? vi.fn()}
      loading={false}
    />
  );
}

describe('WorkflowBar — button visibility by role & state', () => {
  it('Operator sees Kiểm tra lại on UPLOAD state', () => {
    renderBar('UPLOAD', 'Operator');
    expect(screen.getByText('Kiểm tra lại')).toBeInTheDocument();
  });

  it('Operator sees Kiểm tra lại on VALIDATED state', () => {
    renderBar('VALIDATED', 'Operator');
    expect(screen.getByText('Kiểm tra lại')).toBeInTheDocument();
  });

  it('Auditor sees no action buttons', () => {
    renderBar('VALIDATED', 'Auditor');
    expect(screen.queryByText('Kiểm tra lại')).not.toBeInTheDocument();
    expect(screen.queryByText('Phê duyệt')).not.toBeInTheDocument();
  });

  it('Approver sees Phê duyệt + Từ chối on VALIDATED with valid dossier', () => {
    renderBar('VALIDATED', 'Approver', { validationValid: true });
    expect(screen.getByText('Phê duyệt')).toBeInTheDocument();
    expect(screen.getByText('Từ chối')).toBeInTheDocument();
  });

  it('Approver does NOT see Phê duyệt when dossier has errors', () => {
    renderBar('VALIDATED', 'Approver', { validationValid: false });
    expect(screen.queryByText('Phê duyệt')).not.toBeInTheDocument();
  });

  it('Admin sees Đóng gói SIP on APPROVED state', () => {
    renderBar('APPROVED', 'Admin');
    expect(screen.getByText('Đóng gói SIP')).toBeInTheDocument();
  });

  it('Operator sees Đóng gói SIP on APPROVED state', () => {
    renderBar('APPROVED', 'Operator');
    expect(screen.getByText('Đóng gói SIP')).toBeInTheDocument();
  });

  it('Approver does NOT see Đóng gói SIP on APPROVED state', () => {
    renderBar('APPROVED', 'Approver');
    expect(screen.queryByText('Đóng gói SIP')).not.toBeInTheDocument();
  });

  it('No action buttons on DONE state', () => {
    renderBar('DONE', 'Admin');
    expect(screen.queryByText('Kiểm tra lại')).not.toBeInTheDocument();
    expect(screen.queryByText('Đóng gói SIP')).not.toBeInTheDocument();
  });
});

describe('WorkflowBar — callbacks', () => {
  it('calls onValidate when Kiểm tra lại is clicked', () => {
    const onValidate = vi.fn();
    renderBar('UPLOAD', 'Operator', { onValidate });
    fireEvent.click(screen.getByText('Kiểm tra lại'));
    expect(onValidate).toHaveBeenCalledOnce();
  });

  it('calls onApprove when Phê duyệt is clicked', () => {
    const onApprove = vi.fn();
    renderBar('VALIDATED', 'Approver', { validationValid: true, onApprove });
    fireEvent.click(screen.getByText('Phê duyệt'));
    expect(onApprove).toHaveBeenCalledOnce();
  });

  it('calls onReject when Từ chối is clicked', () => {
    const onReject = vi.fn();
    renderBar('VALIDATED', 'Approver', { validationValid: true, onReject });
    fireEvent.click(screen.getByText('Từ chối'));
    expect(onReject).toHaveBeenCalledOnce();
  });

  it('calls onPackage when Đóng gói SIP is clicked', () => {
    const onPackage = vi.fn();
    renderBar('APPROVED', 'Admin', { onPackage });
    fireEvent.click(screen.getByText('Đóng gói SIP'));
    expect(onPackage).toHaveBeenCalledOnce();
  });
});

describe('WorkflowBar — state display', () => {
  it('shows REJECTED tag with error color', () => {
    renderBar('REJECTED', 'Admin');
    expect(screen.getByText('Từ chối')).toBeInTheDocument();
  });

  it('shows Còn lỗi tag when VALIDATED and not valid', () => {
    renderBar('VALIDATED', 'Operator', { validationValid: false });
    expect(screen.getByText('Còn lỗi')).toBeInTheDocument();
  });

  it('shows Hợp lệ tag when VALIDATED and valid', () => {
    renderBar('VALIDATED', 'Operator', { validationValid: true });
    expect(screen.getByText('Hợp lệ')).toBeInTheDocument();
  });
});
