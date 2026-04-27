import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import UploadPanel from '../components/upload/UploadPanel.jsx';

function renderPanel(props = {}) {
  return render(
    <UploadPanel
      onUploaded={props.onUploaded ?? vi.fn()}
      uploadZip={props.uploadZip ?? vi.fn()}
      uploadFolder={props.uploadFolder ?? vi.fn()}
      loading={props.loading ?? false}
      error={props.error ?? null}
      uploadProgress={props.uploadProgress ?? null}
    />
  );
}

describe('UploadPanel — mode toggle', () => {
  it('renders folder mode by default', () => {
    renderPanel();
    expect(screen.getByText(/Kéo thả thư mục hồ sơ/)).toBeInTheDocument();
  });

  it('switches to ZIP mode when File ZIP is clicked', () => {
    renderPanel();
    fireEvent.click(screen.getByText('File ZIP'));
    expect(screen.getByText(/Kéo thả file ZIP/)).toBeInTheDocument();
    expect(screen.queryByText(/Kéo thả thư mục/)).not.toBeInTheDocument();
  });

  it('switches back to folder mode from ZIP mode', () => {
    renderPanel();
    fireEvent.click(screen.getByText('File ZIP'));
    fireEvent.click(screen.getByText('Thư mục'));
    expect(screen.getByText(/Kéo thả thư mục hồ sơ/)).toBeInTheDocument();
  });
});

describe('UploadPanel — error display', () => {
  it('shows error alert when error prop set and no progress step', () => {
    renderPanel({ error: 'File ZIP không hợp lệ' });
    expect(screen.getByText('File ZIP không hợp lệ')).toBeInTheDocument();
  });

  it('hides error when uploadProgress has a step (progress overrides error)', () => {
    renderPanel({
      error: 'File ZIP không hợp lệ',
      uploadProgress: { step: 'upload', progress: 40, detail: null, summary: null, error: null, done: false },
    });
    expect(screen.queryByText('File ZIP không hợp lệ')).not.toBeInTheDocument();
  });

  it('shows no error when error is null', () => {
    renderPanel({ error: null });
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});

describe('UploadPanel — upload progress', () => {
  it('renders UploadProgress when progress step is set', () => {
    renderPanel({
      uploadProgress: { step: 'validate', progress: 60, detail: 'Đang kiểm tra...', summary: null, error: null, done: false },
    });
    expect(screen.getByText(/Đang kiểm tra/)).toBeInTheDocument();
  });
});

describe('UploadPanel — static content', () => {
  it('renders page heading', () => {
    renderPanel();
    expect(screen.getByText('Đóng gói SIP')).toBeInTheDocument();
  });

  it('shows folder structure hint in folder mode', () => {
    renderPanel();
    expect(screen.getByText(/Attachment/)).toBeInTheDocument();
    expect(screen.getByText(/Metadata/)).toBeInTheDocument();
  });

  it('shows folder structure hint in ZIP mode', () => {
    renderPanel();
    fireEvent.click(screen.getByText('File ZIP'));
    expect(screen.getByText(/Attachment/)).toBeInTheDocument();
    expect(screen.getByText(/Metadata/)).toBeInTheDocument();
  });
});
