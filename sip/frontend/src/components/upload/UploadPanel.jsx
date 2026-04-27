/**
 * Upload panel for dossier packaging.
 *
 * Flow (folder mode):
 *   IDLE     → user drops/clicks folder → local validation
 *   PREVIEW  → show FolderTreeView + validation result + "Kiểm tra" / "Upload lại"
 *   UPLOADING → uploadFolder called → parent controls loading + uploadProgress
 *
 * ZIP mode: immediate upload via Ant Design Dragger (unchanged).
 */
import { useState, useRef } from 'react';
import { Upload, Typography, Alert, Segmented, Space, Tag, Button } from 'antd';
import {
  FolderOpenOutlined, FileZipOutlined, InboxOutlined,
  FolderOutlined, FileExcelOutlined, FilePdfOutlined,
  CheckCircleFilled, CloseCircleFilled, SafetyOutlined, ReloadOutlined,
} from '@ant-design/icons';
import UploadProgress from './UploadProgress.jsx';
import FolderTreeView from './FolderTreeView.jsx';

const { Dragger } = Upload;
const { Text, Title } = Typography;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function validateStructure(paths) {
  const hasPdf   = paths.some((p) => /\/attachment\//i.test(p) && /\.pdf$/i.test(p));
  const hasExcel = paths.some((p) => /\/metadata\//i.test(p)   && /\.(xlsx?)$/i.test(p));
  return { hasPdf, hasExcel };
}

function buildPickedState(files, paths) {
  const rootName = paths[0]?.split('/')[0] || 'HoSo';
  const pdfFiles = paths
    .filter((p) => /\/attachment\//i.test(p) && /\.pdf$/i.test(p))
    .map((p) => p.split('/').pop());
  const { hasPdf, hasExcel } = validateStructure(paths);
  return { files, paths, rootName, pdfFiles, hasPdf, hasExcel };
}

// ─── Small validation row ──────────────────────────────────────────────────────

function CheckRow({ ok, label }) {
  return (
    <Space size={6}>
      {ok
        ? <CheckCircleFilled style={{ color: '#52c41a' }} />
        : <CloseCircleFilled style={{ color: '#ff4d4f' }} />}
      <Text style={{ fontSize: 13, color: ok ? '#389e0d' : '#cf1322' }}>{label}</Text>
    </Space>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function UploadPanel({ onUploaded, uploadZip, uploadFolder, loading, error, uploadProgress }) {
  const [mode, setMode]     = useState('folder');
  const [dragOver, setDO]   = useState(false);
  const [picked, setPicked] = useState(null);   // null = IDLE
  const folderInputRef      = useRef(null);

  const isUploading = loading || !!uploadProgress?.step;
  const isPreview   = !!picked && !isUploading;

  // ── Handlers ──

  async function handleZipUpload({ file }) {
    try { const d = await uploadZip(file); onUploaded?.(d); } catch {}
    return false;
  }

  function handleFolderInput(e) {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const paths = files.map((f) => f.webkitRelativePath || f.name);
    setPicked(buildPickedState(files, paths));
    e.target.value = '';
  }

  const openPicker = () => !loading && folderInputRef.current?.click();

  function handleDrop(e) {
    e.preventDefault(); e.stopPropagation(); setDO(false);
    if (loading) return;
    openPicker();   // redirect to native picker (avoids Chrome 122+ folder-access dialog)
  }

  async function handleSubmit() {
    if (!picked) return;
    try { const d = await uploadFolder(picked.files, picked.paths); onUploaded?.(d); } catch {}
  }

  function handleReupload() {
    setPicked(null);
    folderInputRef.current?.click();
  }

  // ── Hidden folder input (shared across all phases) ──
  const folderInput = (
    <input ref={folderInputRef} type="file" webkitdirectory="" multiple
      style={{ display: 'none' }} onChange={handleFolderInput} />
  );

  // ─ UPLOADING phase ─────────────────────────────────────────────────────────
  if (mode === 'folder' && isUploading) {
    return (
      <div style={{ padding: '24px 0' }}>
        <Title level={4} style={{ marginBottom: 16 }}>Đóng gói SIP</Title>
        {picked && (
          <div style={{ marginBottom: 16 }}>
            <FolderTreeView pdfFiles={picked.pdfFiles} maHoSo={picked.rootName} />
          </div>
        )}
        <UploadProgress {...uploadProgress} />
        {folderInput}
      </div>
    );
  }

  // ─ PREVIEW phase ───────────────────────────────────────────────────────────
  if (mode === 'folder' && isPreview) {
    const valid = picked.hasPdf && picked.hasExcel;
    return (
      <div style={{ padding: '24px 0' }}>
        <Title level={4} style={{ marginBottom: 16 }}>Đóng gói SIP</Title>

        {error && <Alert message={error} type="error" showIcon style={{ marginBottom: 16 }} closable />}

        <div style={{ marginBottom: 16 }}>
          <FolderTreeView pdfFiles={picked.pdfFiles} maHoSo={picked.rootName} />
        </div>

        <div style={{
          background: valid ? '#f6ffed' : '#fff2f0',
          border: `1px solid ${valid ? '#b7eb8f' : '#ffccc7'}`,
          borderRadius: 8, padding: '12px 16px', marginBottom: 20,
        }}>
          <Space direction="vertical" size={6}>
            <CheckRow ok={picked.hasPdf}   label="File PDF trong Attachment/" />
            <CheckRow ok={picked.hasExcel} label="File Excel (.xlsx) trong Metadata/" />
          </Space>
        </div>

        <Space>
          <Button type="primary" icon={<SafetyOutlined />} disabled={!valid}
            onClick={handleSubmit}
            style={valid ? { background: '#0E9F8E', borderColor: '#0E9F8E' } : {}}>
            Kiểm tra
          </Button>
          <Button icon={<ReloadOutlined />} onClick={handleReupload}>Upload lại</Button>
        </Space>
        {folderInput}
      </div>
    );
  }

  // ─ IDLE phase ──────────────────────────────────────────────────────────────
  return (
    <div style={{ padding: '24px 0' }}>
      <Title level={4} style={{ marginBottom: 4 }}>Đóng gói SIP</Title>
      <Text type="secondary" style={{ display: 'block', marginBottom: 20 }}>
        Tải lên thư mục hồ sơ hoặc file ZIP để bắt đầu đóng gói
      </Text>

      <Segmented
        options={[
          { label: <Space size={6}><FolderOpenOutlined />Thư mục</Space>, value: 'folder' },
          { label: <Space size={6}><FileZipOutlined />File ZIP</Space>, value: 'zip' },
        ]}
        value={mode} onChange={(v) => { setMode(v); setPicked(null); }}
        style={{ marginBottom: 20 }}
      />

      {error && <Alert message={error} type="error" showIcon style={{ marginBottom: 16 }} closable />}

      {mode === 'folder' ? (
        <div
          onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setDO(true); }}
          onDragEnter={(e) => { e.preventDefault(); e.stopPropagation(); setDO(true); }}
          onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); if (!e.currentTarget.contains(e.relatedTarget)) setDO(false); }}
          onDrop={handleDrop}
          onClick={openPicker}
          style={{
            border: `2px dashed ${dragOver ? '#0E9F8E' : 'rgba(14,159,142,0.45)'}`,
            borderRadius: 16, padding: '56px 32px', textAlign: 'center',
            background: dragOver
              ? 'linear-gradient(135deg,#e6fffb 0%,#f0f9ff 100%)'
              : 'linear-gradient(135deg,#f0fdf9 0%,#f8fbff 100%)',
            cursor: loading ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s',
            boxShadow: dragOver ? '0 4px 24px rgba(14,159,142,0.18)' : '0 2px 16px rgba(14,159,142,0.07)',
          }}
        >
          <FolderOpenOutlined style={{
            fontSize: 72, marginBottom: 16, transition: 'all 0.2s',
            color: dragOver ? '#0E9F8E' : '#38B2A0',
            filter: dragOver ? 'drop-shadow(0 0 10px rgba(14,159,142,0.45))' : 'none',
          }} />
          <p style={{ fontSize: 18, fontWeight: 600, color: '#0D1B2A', margin: '0 0 8px' }}>
            {dragOver ? 'Thả thư mục vào đây' : 'Kéo thả thư mục hồ sơ vào đây'}
          </p>
          <p style={{ color: '#6B7C8D', fontSize: 13, margin: '0 0 24px' }}>
            hoặc click để chọn từ máy tính
          </p>
          <div style={{
            display: 'inline-flex', gap: 16, flexWrap: 'wrap', justifyContent: 'center',
            alignItems: 'center', background: 'rgba(255,255,255,0.85)',
            border: '1px solid rgba(14,159,142,0.2)', borderRadius: 10, padding: '14px 24px',
          }}>
            <Space size={4}>
              <FolderOutlined style={{ color: '#F5A623', fontSize: 16 }} />
              <Text style={{ fontWeight: 600, fontSize: 13, color: '#4A5568' }}>HoSo/</Text>
            </Space>
            <Space size={4}>
              <FilePdfOutlined style={{ color: '#E53E3E', fontSize: 14 }} />
              <Text code style={{ fontSize: 12 }}>Attachment/</Text>
              <Tag color="red" style={{ fontSize: 11, margin: 0 }}>PDF</Tag>
            </Space>
            <Space size={4}>
              <FileExcelOutlined style={{ color: '#38A169', fontSize: 14 }} />
              <Text code style={{ fontSize: 12 }}>Metadata/</Text>
              <Tag color="green" style={{ fontSize: 11, margin: 0 }}>Excel</Tag>
            </Space>
          </div>
        </div>
      ) : (
        <Dragger name="dossierZip" accept=".zip" maxCount={1} customRequest={handleZipUpload}
          showUploadList={false} disabled={loading} style={{ borderRadius: 12 }}>
          <p className="ant-upload-drag-icon"><InboxOutlined style={{ color: '#0E9F8E' }} /></p>
          <p className="ant-upload-text">Kéo thả file ZIP vào đây hoặc click để chọn</p>
          <p className="ant-upload-hint" style={{ marginTop: 8 }}>
            <Tag icon={<FilePdfOutlined />} color="red">Attachment/</Tag>
            <Tag icon={<FileExcelOutlined />} color="green">Metadata/</Tag>
          </p>
        </Dragger>
      )}
      {mode === 'folder' && folderInput}
    </div>
  );
}
