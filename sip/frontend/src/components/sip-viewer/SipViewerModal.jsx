/**
 * SipViewerModal — shows a tree of SIP ZIP contents.
 * Clicking a text/XML/CSV entry loads its content for inline preview.
 *
 * Props:
 *   open        {boolean}
 *   objectPath  {string}  — MinIO object key
 *   onClose     {Function}
 */
import { useState, useEffect } from 'react';
import { Modal, Tree, Spin, Alert, Typography, Tabs } from 'antd';
import { FileOutlined, FolderOutlined } from '@ant-design/icons';
import apiClient from '../../config/api-client.js';
import XmlPreviewPanel from './XmlPreviewPanel.jsx';

const { Text } = Typography;

/** Convert flat entry list to Ant Design Tree nodes */
function buildTree(entries) {
  const root = {};
  for (const e of entries) {
    const parts = e.path.replace(/\/$/, '').split('/');
    let node = root;
    for (let i = 0; i < parts.length; i++) {
      const key = parts.slice(0, i + 1).join('/');
      if (!node[key]) {
        node[key] = { title: parts[i], key, isLeaf: !e.isDir, size: e.size, children: {} };
      }
      node = node[key].children;
    }
  }

  function toArray(obj) {
    return Object.values(obj).map((n) => ({
      title: <span><Text style={{ fontSize: 12 }}>{n.title}</Text>{!n.isLeaf && <Text type="secondary" style={{ fontSize: 11, marginLeft: 4 }}>({(n.size / 1024).toFixed(1)} KB)</Text>}</span>,
      key: n.key,
      isLeaf: n.isLeaf,
      icon: n.isLeaf ? <FileOutlined /> : <FolderOutlined />,
      children: toArray(n.children),
    }));
  }
  return toArray(root);
}

const PREVIEWABLE = ['.xml', '.csv', '.txt', '.json'];

export default function SipViewerModal({ open, objectPath, onClose }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [treeData, setTreeData] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileContent, setFileContent] = useState(null);
  const [loadingFile, setLoadingFile] = useState(false);

  useEffect(() => {
    if (!open || !objectPath) return;
    setLoading(true);
    setError(null);
    setTreeData([]);
    setSelectedFile(null);
    setFileContent(null);

    apiClient.get('/stats/sip/tree', { params: { path: objectPath } })
      .then(({ data }) => setTreeData(buildTree(data.data)))
      .catch((err) => setError(err.response?.data?.error?.message || 'Không thể tải cây thư mục'))
      .finally(() => setLoading(false));
  }, [open, objectPath]);

  function handleSelect(keys) {
    const key = keys[0];
    if (!key) return;
    const lower = key.toLowerCase();
    const canPreview = PREVIEWABLE.some((ext) => lower.endsWith(ext));
    if (!canPreview) return;

    setSelectedFile(key);
    setLoadingFile(true);
    setFileContent(null);

    apiClient.get('/stats/sip/file', { params: { path: objectPath, file: key } })
      .then(({ data }) => setFileContent(data.data.content))
      .catch(() => setFileContent(null))
      .finally(() => setLoadingFile(false));
  }

  const isXml = selectedFile?.toLowerCase().endsWith('.xml');

  const tabItems = [
    {
      key: 'tree',
      label: 'Cây thư mục',
      children: loading ? <Spin /> : error ? <Alert type="error" message={error} /> : (
        <Tree
          showIcon
          treeData={treeData}
          onSelect={handleSelect}
          defaultExpandAll={false}
          style={{ fontSize: 12 }}
        />
      ),
    },
    ...(selectedFile ? [{
      key: 'preview',
      label: `Xem: ${selectedFile.split('/').pop()}`,
      children: loadingFile ? <Spin /> : fileContent ? (
        isXml ? <XmlPreviewPanel xml={fileContent} /> : (
          <pre style={{ fontSize: 11, maxHeight: 480, overflow: 'auto', background: '#fafafa', padding: 12, borderRadius: 6 }}>{fileContent}</pre>
        )
      ) : <Text type="secondary">Không có nội dung để hiển thị</Text>,
    }] : []),
  ];

  return (
    <Modal
      title={`SIP Viewer — ${objectPath?.split('/').pop() || ''}`}
      open={open}
      onCancel={onClose}
      footer={null}
      width={860}
      styles={{ body: { padding: '12px 16px' } }}
    >
      <Tabs items={tabItems} size="small" />
    </Modal>
  );
}
