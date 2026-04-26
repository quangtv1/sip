/**
 * Tree view of the uploaded dossier folder structure.
 * Color-codes files by their validation status:
 *   Red   → file referenced in ERROR
 *   Yellow → file referenced in WARNING
 *   Green → OK
 * Clicking a PDF node calls onSelectPdf(filename).
 */
import { Tree, Typography } from 'antd';
import {
  FolderOutlined, FolderOpenOutlined,
  FilePdfOutlined, FileExcelOutlined,
} from '@ant-design/icons';

const { Text } = Typography;

/** Build a Set of PDF filenames that have errors/warnings */
function buildPdfStatusMap(errors) {
  const map = {}; // basename → 'error' | 'warning'
  for (const e of errors || []) {
    if (e.sheet === 'Attachment' && e.value) {
      const severity = e.severity === 'ERROR' ? 'error' : 'warning';
      map[e.value] = severity;
    }
  }
  return map;
}

function colorForStatus(status) {
  if (status === 'error') return '#C0392B';
  if (status === 'warning') return '#D4860A';
  return '#1A7A5E';
}

export default function FolderTreeView({ pdfFiles = [], errors = [], maHoSo, onSelectPdf }) {
  const pdfStatusMap = buildPdfStatusMap(errors);

  const pdfNodes = pdfFiles.map((name) => {
    const status = pdfStatusMap[name];
    const color = colorForStatus(status);
    return {
      key: `pdf-${name}`,
      title: (
        <Text
          style={{ color, cursor: 'pointer' }}
          onClick={() => onSelectPdf?.(name)}
        >
          {name}
        </Text>
      ),
      icon: <FilePdfOutlined style={{ color }} />,
      isLeaf: true,
    };
  });

  const excelNode = {
    key: 'excel',
    title: <Text>{maHoSo ? `${maHoSo}.xlsx` : 'metadata.xlsx'}</Text>,
    icon: <FileExcelOutlined style={{ color: '#1A7A5E' }} />,
    isLeaf: true,
  };

  const treeData = [
    {
      key: 'root',
      title: <Text strong>{maHoSo || 'Hồ sơ'}</Text>,
      icon: <FolderOpenOutlined />,
      children: [
        {
          key: 'attachment',
          title: <Text>Attachment</Text>,
          icon: <FolderOutlined />,
          children: pdfNodes,
        },
        {
          key: 'metadata',
          title: <Text>Metadata</Text>,
          icon: <FolderOutlined />,
          children: [excelNode],
        },
      ],
    },
  ];

  return (
    <Tree
      treeData={treeData}
      defaultExpandAll
      showIcon
      style={{ background: 'transparent', fontSize: 13 }}
    />
  );
}
