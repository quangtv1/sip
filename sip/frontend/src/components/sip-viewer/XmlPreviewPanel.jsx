/**
 * XmlPreviewPanel — renders XML as a collapsible tree with syntax highlighting.
 * All content is escaped via DOM text nodes — no innerHTML, no XSS risk.
 *
 * Props:
 *   xml {string} — raw XML string
 */
import { useState } from 'react';
import { Input, Button, Space, Typography } from 'antd';
import { CopyOutlined, SearchOutlined } from '@ant-design/icons';

const { Text } = Typography;

/** Parse an XML string into a DOM Document using browser's DOMParser. */
function parseXml(xml) {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xml, 'application/xml');
    const err = doc.querySelector('parsererror');
    if (err) return null;
    return doc;
  } catch {
    return null;
  }
}

/** Recursive node renderer. Returns JSX without dangerouslySetInnerHTML. */
function XmlNode({ node, depth = 0, searchTerm }) {
  const [collapsed, setCollapsed] = useState(depth > 3);

  if (node.nodeType === Node.TEXT_NODE) {
    const text = node.textContent.trim();
    if (!text) return null;
    const match = searchTerm && text.toLowerCase().includes(searchTerm.toLowerCase());
    return (
      <span style={{ color: '#595959', background: match ? '#fffb8f' : undefined }}>
        {text}
      </span>
    );
  }

  if (node.nodeType !== Node.ELEMENT_NODE) return null;

  const tagName = node.tagName;
  const attrs = Array.from(node.attributes);
  const children = Array.from(node.childNodes).filter(
    (c) => c.nodeType === Node.ELEMENT_NODE || (c.nodeType === Node.TEXT_NODE && c.textContent.trim())
  );
  const hasChildren = children.length > 0;
  const tagMatch = searchTerm && tagName.toLowerCase().includes(searchTerm.toLowerCase());

  return (
    <div style={{ paddingLeft: depth > 0 ? 16 : 0, fontFamily: 'monospace', fontSize: 12, lineHeight: '1.8' }}>
      <span
        onClick={() => hasChildren && setCollapsed((c) => !c)}
        style={{ cursor: hasChildren ? 'pointer' : 'default' }}
      >
        {hasChildren && (
          <Text type="secondary" style={{ fontSize: 10, marginRight: 4, userSelect: 'none' }}>
            {collapsed ? '▶' : '▼'}
          </Text>
        )}
        <Text style={{ color: '#0070f3', background: tagMatch ? '#fffb8f' : undefined }}>
          &lt;{tagName}
        </Text>
        {attrs.map((a) => (
          <span key={a.name}>
            {' '}
            <Text style={{ color: '#b37700' }}>{a.name}</Text>
            <Text>=</Text>
            <Text style={{ color: '#389e0d' }}>"{a.value}"</Text>
          </span>
        ))}
        {!hasChildren ? (
          <Text style={{ color: '#0070f3' }}> /&gt;</Text>
        ) : (
          <Text style={{ color: '#0070f3' }}>&gt;</Text>
        )}
      </span>

      {hasChildren && !collapsed && (
        <div>
          {children.map((child, i) => (
            <XmlNode key={i} node={child} depth={depth + 1} searchTerm={searchTerm} />
          ))}
          <Text style={{ color: '#0070f3' }}>&lt;/{tagName}&gt;</Text>
        </div>
      )}
    </div>
  );
}

export default function XmlPreviewPanel({ xml = '' }) {
  const [search, setSearch] = useState('');
  const doc = parseXml(xml);

  function handleCopy() {
    navigator.clipboard?.writeText(xml);
  }

  if (!doc) {
    return <Text type="danger">Không thể phân tích XML</Text>;
  }

  return (
    <Space direction="vertical" style={{ width: '100%' }} size={8}>
      <Space>
        <Input
          prefix={<SearchOutlined />}
          placeholder="Tìm kiếm trong XML..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          allowClear
          style={{ width: 240 }}
        />
        <Button size="small" icon={<CopyOutlined />} onClick={handleCopy}>Sao chép</Button>
      </Space>
      <div style={{ border: '1px solid #f0f0f0', borderRadius: 6, padding: 12, background: '#fafafa', maxHeight: 480, overflowY: 'auto' }}>
        <XmlNode node={doc.documentElement} depth={0} searchTerm={search} />
      </div>
    </Space>
  );
}
