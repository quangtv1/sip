/**
 * Drag-and-drop upload panel.
 * Supports ZIP file upload and folder upload (webkitdirectory).
 * On success calls onUploaded(dossierData).
 * Receives uploadZip, uploadFolder, loading, error from parent (DossierPage).
 */
import { useState, useRef } from 'react';
import { Upload, Space, Typography, Alert, Spin, Segmented } from 'antd';
import { InboxOutlined, FolderOpenOutlined, FileZipOutlined } from '@ant-design/icons';
import UploadProgress from './UploadProgress.jsx';

const { Dragger } = Upload;
const { Text, Title } = Typography;

export default function UploadPanel({ onUploaded, uploadZip, uploadFolder, loading, error, uploadProgress }) {
  const [mode, setMode] = useState('zip');
  const folderInputRef = useRef(null);

  // ZIP upload via Dragger
  async function handleZipUpload({ file }) {
    try {
      const data = await uploadZip(file);
      onUploaded?.(data);
    } catch {
      // error shown via `error` state
    }
    return false; // prevent default antd upload
  }

  // Folder upload via hidden input[webkitdirectory]
  async function handleFolderSelect(e) {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    const paths = files.map((f) => f.webkitRelativePath || f.name);
    try {
      const data = await uploadFolder(files, paths);
      onUploaded?.(data);
    } catch {
      // error shown via `error` state
    }
    // reset so same folder can be re-selected
    e.target.value = '';
  }

  return (
    <div style={{ padding: '24px 0' }}>
      <Title level={4} style={{ marginBottom: 16 }}>Tải lên hồ sơ</Title>

      <Segmented
        options={[
          { label: <Space><FileZipOutlined />File ZIP</Space>, value: 'zip' },
          { label: <Space><FolderOpenOutlined />Thư mục</Space>, value: 'folder' },
        ]}
        value={mode}
        onChange={setMode}
        style={{ marginBottom: 16 }}
      />

      {error && !uploadProgress?.step && (
        <Alert message={error} type="error" showIcon style={{ marginBottom: 12 }} closable />
      )}

      {uploadProgress?.step && (
        <div style={{ marginBottom: 16 }}>
          <UploadProgress {...uploadProgress} />
        </div>
      )}

      <Spin spinning={loading && !uploadProgress?.step} tip="Đang xử lý...">
        {mode === 'zip' ? (
          <Dragger
            name="dossierZip"
            accept=".zip"
            maxCount={1}
            customRequest={handleZipUpload}
            showUploadList={false}
            style={{ padding: '8px 0' }}
          >
            <p className="ant-upload-drag-icon"><InboxOutlined /></p>
            <p className="ant-upload-text">Kéo thả file ZIP vào đây hoặc click để chọn</p>
            <p className="ant-upload-hint">
              Cấu trúc: <Text code>TenHoSo/Attachment/*.pdf</Text> + <Text code>Metadata/*.xlsx</Text>
            </p>
          </Dragger>
        ) : (
          <div
            style={{
              border: '1px dashed #d9d9d9', borderRadius: 10,
              padding: '40px 20px', textAlign: 'center', background: '#fafafa', cursor: 'pointer',
            }}
            onClick={() => folderInputRef.current?.click()}
          >
            <FolderOpenOutlined style={{ fontSize: 48, color: '#0E9F8E', marginBottom: 8 }} />
            <p style={{ fontSize: 16, color: '#0D1B2A', margin: '8px 0' }}>Click để chọn thư mục hồ sơ</p>
            <p style={{ color: '#6B7C8D', fontSize: 13 }}>
              Chọn thư mục chứa <Text code>Attachment/</Text> và <Text code>Metadata/</Text>
            </p>
            <input
              ref={folderInputRef}
              type="file"
              webkitdirectory=""
              multiple
              style={{ display: 'none' }}
              onChange={handleFolderSelect}
            />
          </div>
        )}
      </Spin>
    </div>
  );
}
