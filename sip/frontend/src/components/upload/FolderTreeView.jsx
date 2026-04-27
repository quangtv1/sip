/**
 * Tree view of the uploaded dossier folder structure.
 * Styled as a dark navy code block (matches prototype design).
 * Color-codes files by validation status:
 *   Red   → file in ERROR
 *   Yellow → file in WARNING
 *   Green  → OK
 * Clicking a PDF node calls onSelectPdf(filename).
 */

/** Build a map of PDF filename → 'error' | 'warning' */
function buildPdfStatusMap(errors) {
  const map = {};
  for (const e of errors || []) {
    if (e.sheet === 'Attachment' && e.value) {
      map[e.value] = e.severity === 'ERROR' ? 'error' : 'warning';
    }
  }
  return map;
}

// ── Colour tokens (matching prototype CSS variables) ──────────────────────
const C = {
  root:    '#A5D8FF',  // root folder
  dir:     '#74C0FC',  // sub-folder
  pdf:     '#8ADFC0',  // pdf OK
  xlsx:    '#FFC078',  // xlsx / xml
  pdfErr:  '#FF8080',  // pdf with error
  pdfWarn: '#FFCC60',  // pdf with warning
  tree:    '#8FB3CC',  // default tree chrome (├── └──)
  bg:      '#0D1B2A',  // navy background
};

const mono = "'IBM Plex Mono', 'Courier New', monospace";

// ── Small inline components ────────────────────────────────────────────────

function TreeLine({ children, style }) {
  return (
    <div style={{ lineHeight: 1.7, whiteSpace: 'pre', fontFamily: mono, fontSize: 11.5, ...style }}>
      {children}
    </div>
  );
}

function PdfNode({ name, status, onSelectPdf }) {
  const color = status === 'error' ? C.pdfErr : status === 'warning' ? C.pdfWarn : C.pdf;
  return (
    <span
      style={{ color, cursor: onSelectPdf ? 'pointer' : 'default', textDecoration: onSelectPdf ? 'underline' : 'none', textDecorationColor: color + '88' }}
      onClick={() => onSelectPdf?.(name)}
      title={onSelectPdf ? 'Mở PDF' : undefined}
    >
      {name}
    </span>
  );
}

// ── Main component ─────────────────────────────────────────────────────────

export default function FolderTreeView({ pdfFiles = [], errors = [], maHoSo, onSelectPdf }) {
  const pdfStatusMap = buildPdfStatusMap(errors);
  const rootName = maHoSo || 'Hồ sơ';
  const xlsxName = maHoSo ? `${maHoSo}.xlsx` : 'metadata.xlsx';

  const lastPdfIdx = pdfFiles.length - 1;

  return (
    <div style={{
      background: C.bg,
      borderRadius: 10,
      padding: '14px 16px',
      overflowX: 'auto',
      overflowY: 'auto',
      maxHeight: '33vh',
      color: C.tree,
    }}>
      {/* root */}
      <TreeLine>
        <span style={{ color: C.root, fontWeight: 500 }}>{rootName}/</span>
      </TreeLine>

      {/* Attachment/ */}
      <TreeLine>
        <span style={{ color: C.tree }}>├── </span>
        <span style={{ color: C.dir }}>Attachment/</span>
      </TreeLine>
      {pdfFiles.map((name, i) => {
        const isLast = i === lastPdfIdx;
        const status = pdfStatusMap[name];
        return (
          <TreeLine key={name}>
            <span style={{ color: C.tree }}>│   {isLast ? '└── ' : '├── '}</span>
            <PdfNode name={name} status={status} onSelectPdf={onSelectPdf} />
          </TreeLine>
        );
      })}
      {pdfFiles.length === 0 && (
        <TreeLine><span style={{ color: C.tree }}>│   └── </span><span style={{ color: '#555' }}>(trống)</span></TreeLine>
      )}

      {/* Metadata/ */}
      <TreeLine>
        <span style={{ color: C.tree }}>└── </span>
        <span style={{ color: C.dir }}>Metadata/</span>
      </TreeLine>
      <TreeLine>
        <span style={{ color: C.tree }}>    └── </span>
        <span style={{ color: C.xlsx }}>{xlsxName}</span>
      </TreeLine>
    </div>
  );
}
