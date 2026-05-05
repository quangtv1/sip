/**
 * SheetImportModal — import sheet field names from an Excel file's header row.
 * Parses only the first row of the first sheet; each column header becomes a
 * field name. All other field attributes (label, type, required, severity) are
 * left as defaults and must be configured manually after import.
 *
 * Defaults applied to every imported field:
 *   label='', type='string', required=true, severity='ERROR'
 */
import { useState } from 'react';
import { Modal, Button, Table, Alert, Space, Typography, Upload, Tag } from 'antd';
import { UploadOutlined, FileExcelOutlined } from '@ant-design/icons';

const { Text } = Typography;

const DEFAULT_FIELD = { label: '', type: 'string', required: true, severity: 'ERROR' };
const VALID_NAME_RE = /^[A-Za-z0-9_]{1,60}$/;

export default function SheetImportModal({ open, onClose, onImport }) {
  const [preview,   setPreview]   = useState(null);   // [{ name }] or null
  const [parseErr,  setParseErr]  = useState(null);
  const [fileName,  setFileName]  = useState(null);

  function reset() { setPreview(null); setParseErr(null); setFileName(null); }

  /** Parse file → extract first row headers */
  async function handleFile(file) {
    setParseErr(null); setPreview(null); setFileName(file.name);
    try {
      const XLSX = await import('xlsx');
      const buf  = await file.arrayBuffer();
      const wb   = XLSX.read(buf, { type: 'array' });
      const ws   = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(ws, { header: 1 });
      if (!rows.length || !rows[0].length) {
        setParseErr('File không có dữ liệu'); return;
      }
      const headers = rows[0]
        .map(h => String(h ?? '').trim())
        .filter(Boolean);
      if (!headers.length) { setParseErr('Hàng đầu tiên trống'); return; }

      // Validate names
      const invalid = headers.filter(h => !VALID_NAME_RE.test(h));
      if (invalid.length) {
        setParseErr(`Tên cột không hợp lệ (chỉ dùng chữ/số/_): ${invalid.join(', ')}`);
        return;
      }
      setPreview(headers.map(name => ({ name })));
    } catch {
      setParseErr('Không đọc được file Excel');
    }
    return false; // prevent antd upload default behavior
  }

  function handleOk() {
    if (!preview) return;
    const fields = preview.map((f, i) => ({ ...DEFAULT_FIELD, ...f, index: i }));
    onImport(fields);
    reset();
  }

  const columns = [
    { title: '#', width: 44, render: (_, __, i) => <Text type="secondary">{i + 1}</Text> },
    { title: 'name (từ header Excel)', dataIndex: 'name',
      render: v => <Text code style={{ fontSize: 13 }}>{v}</Text> },
    { title: 'label', width: 110, render: () => <Text type="secondary" style={{ fontSize: 12 }}>— (trống)</Text> },
    { title: 'type',  width: 90,  render: () => <Tag style={{ fontSize: 12 }}>string</Tag> },
    { title: 'required', width: 90, render: () => <Tag color="blue" style={{ fontSize: 12 }}>true</Tag> },
    { title: 'severity', width: 90, render: () => <Tag color="red" style={{ fontSize: 12 }}>ERROR</Tag> },
  ];

  return (
    <Modal
      title={<Space size={8}><FileExcelOutlined style={{ color: '#16a34a' }} />Import fields từ Excel</Space>}
      open={open} onOk={handleOk} onCancel={() => { reset(); onClose(); }}
      okText="Import" cancelText="Hủy"
      okButtonProps={{ disabled: !preview }}
      width={680} destroyOnClose afterClose={reset}>

      <Alert
        type="info" showIcon style={{ marginBottom: 12 }}
        message={
          <Text style={{ fontSize: 12 }}>
            Chỉ đọc <b>hàng đầu tiên</b> của sheet Excel làm tên cột (field name).
            Các thuộc tính khác (label, type, required…) đặt mặc định, chỉnh thủ công sau.
            Import sẽ <b>thay thế</b> toàn bộ fields hiện tại.
          </Text>
        }
      />

      <Upload.Dragger
        accept=".xlsx,.xls"
        showUploadList={false}
        beforeUpload={handleFile}
        style={{ marginBottom: 12 }}
      >
        <Space direction="vertical" size={4} style={{ padding: '8px 0' }}>
          <UploadOutlined style={{ fontSize: 24, color: '#6b7280' }} />
          <Text style={{ fontSize: 13 }}>Kéo thả file .xlsx / .xls hoặc click để chọn</Text>
          {fileName && <Text type="secondary" style={{ fontSize: 12 }}>{fileName}</Text>}
        </Space>
      </Upload.Dragger>

      {parseErr && <Alert type="error" message={parseErr} showIcon style={{ marginBottom: 8 }} />}

      {preview && (
        <>
          <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 6 }}>
            Xem trước — {preview.length} fields sẽ được tạo:
          </Text>
          <Table
            dataSource={preview} columns={columns} rowKey="name"
            pagination={false} size="small" scroll={{ y: 240 }}
          />
        </>
      )}
    </Modal>
  );
}
