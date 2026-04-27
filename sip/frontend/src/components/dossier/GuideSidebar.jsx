/**
 * GuideSidebar — right-column guidance panel for the dossier workflow.
 * Mirrors the sidebar cards from the prototype:
 *   1. Workflow steps (quy trình)
 *   2. Applied standards (chuẩn áp dụng)
 *   3. Required input structure
 *   4. Auto-generated output files
 *
 * When `dossier` prop is provided, shows dossier info at the top.
 */
import { Typography, Tag, Collapse } from 'antd';
import {
  CheckCircleOutlined, LoadingOutlined,
  ClockCircleOutlined, FolderOutlined,
  FileTextOutlined, FilePdfOutlined, FileExcelOutlined,
} from '@ant-design/icons';
import { HEADER_BG } from '../../config/theme-config.js';

const { Text } = Typography;

// ─── Shared style tokens ──────────────────────────────────────────────────────
const NAVY = '#0D1B2A';
const TEAL = '#0E9F8E';
const TEAL_PALE = '#E0F5F2';
const BORDER = 'rgba(14,31,50,0.1)';
const TEXT3 = '#6B7C8D';
const MONO = "'IBM Plex Mono', 'Courier New', monospace";

// ─── Sub-components ───────────────────────────────────────────────────────────

function SideCard({ title, children, defaultOpen = true }) {
  return (
    <div style={{
      border: `1px solid ${BORDER}`,
      borderRadius: 10,
      overflow: 'hidden',
      marginBottom: 12,
    }}>
      <div style={{
        background: NAVY,
        padding: '10px 14px',
        fontSize: 11,
        fontWeight: 500,
        color: 'rgba(255,255,255,0.75)',
        fontFamily: MONO,
        letterSpacing: '0.3px',
        display: 'flex',
        alignItems: 'center',
        gap: 6,
      }}>
        <span style={{ color: TEAL }}>//</span> {title}
      </div>
      <div style={{ padding: '12px 14px', background: '#fff' }}>
        {children}
      </div>
    </div>
  );
}

function TreeBlock({ lines }) {
  return (
    <div style={{
      background: NAVY,
      borderRadius: 8,
      padding: '12px 14px',
      fontFamily: MONO,
      fontSize: 11,
      lineHeight: 1.8,
      color: '#8FB3CC',
      whiteSpace: 'pre',
      overflowX: 'auto',
    }}>
      {lines.map((line, i) => (
        <div key={i} dangerouslySetInnerHTML={{ __html: line }} />
      ))}
    </div>
  );
}

// ─── Workflow steps ───────────────────────────────────────────────────────────
const STEPS = [
  { key: 'upload',    label: 'Tải lên thư mục hồ sơ',       desc: 'Kéo thư mục có Attachment/ + Metadata/' },
  { key: 'validate',  label: 'Kiểm tra & sửa metadata',      desc: 'Xem lỗi, chỉnh sửa ô trong bảng Excel' },
  { key: 'approve',   label: 'Phê duyệt hồ sơ',              desc: 'Người có quyền Approver xét duyệt' },
  { key: 'package',   label: 'Đóng gói SIP',                 desc: 'Hệ thống tự tạo gói METS/EAD/PREMIS' },
  { key: 'done',      label: 'Tải xuống & lưu trữ',          desc: 'Tải file ZIP SIP về hoặc lưu vào kho' },
];

const STATE_TO_STEP = {
  UPLOAD:    0,
  VALIDATED: 1,
  APPROVED:  2,
  PACKAGING: 3,
  DONE:      4,
};

function WorkflowSteps({ currentState }) {
  const currentIdx = STATE_TO_STEP[currentState] ?? 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {STEPS.map((s, i) => {
        const done    = i < currentIdx;
        const active  = i === currentIdx;
        const pending = i > currentIdx;

        const icon = done
          ? <CheckCircleOutlined style={{ color: '#1A7A5E', fontSize: 14 }} />
          : active
            ? <LoadingOutlined style={{ color: TEAL, fontSize: 14 }} />
            : <ClockCircleOutlined style={{ color: '#CBD5E0', fontSize: 14 }} />;

        return (
          <div key={s.key} style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: 10,
            padding: '7px 0',
            borderBottom: i < STEPS.length - 1 ? `1px solid ${BORDER}` : 'none',
            opacity: pending ? 0.55 : 1,
          }}>
            <div style={{ marginTop: 1, flexShrink: 0 }}>{icon}</div>
            <div>
              <div style={{
                fontSize: 12,
                fontWeight: active ? 600 : 500,
                color: active ? TEAL : '#0D1B2A',
                lineHeight: 1.4,
              }}>
                <span style={{
                  fontFamily: MONO, fontSize: 10,
                  background: active ? TEAL_PALE : '#F0F4F8',
                  color: active ? TEAL : TEXT3,
                  borderRadius: 3, padding: '1px 5px',
                  marginRight: 6,
                }}>
                  {String(i + 1).padStart(2, '0')}
                </span>
                {s.label}
              </div>
              <div style={{ fontSize: 11, color: TEXT3, marginTop: 2 }}>{s.desc}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Standards ────────────────────────────────────────────────────────────────
const STANDARDS = [
  { badge: 'TT-BNV',  label: '05/2025/TT-BNV ngày 14/5/2025' },
  { badge: 'E-ARK',   label: 'CSIP v2.0.4 — dilcis.eu' },
  { badge: 'METS',    label: 'Metadata Encoding & Transmission 1.12' },
  { badge: 'EAD',     label: 'Encoded Archival Description v3' },
  { badge: 'PREMIS',  label: 'Preservation Metadata v3.0' },
  { badge: 'OAIS',    label: 'ISO 14721:2012' },
];

// ─── Input tree ───────────────────────────────────────────────────────────────
const INPUT_TREE = [
  `<span style="color:#A5D8FF;font-weight:500">HoSo_ID/</span>`,
  `├── <span style="color:#74C0FC">Attachment/</span>`,
  `│   ├── <span style="color:#8ADFC0">*.0000001.pdf</span>`,
  `│   ├── <span style="color:#8ADFC0">*.0000002.pdf</span>`,
  `│   └── <span style="color:#8ADFC0">*.000000N.pdf</span>`,
  `└── <span style="color:#74C0FC">Metadata/</span>`,
  `    └── <span style="color:#FFC078">HoSo_ID.xlsx</span>`,
];

// ─── Output tree ──────────────────────────────────────────────────────────────
const OUTPUT_TREE = [
  `<span style="color:#FFC078">METS.xml</span>           <span style="color:#4A6274">← gốc</span>`,
  `<span style="color:#FFC078">metadata/</span>`,
  `  <span style="color:#FFC078">descriptive/EAD.xml</span>  <span style="color:#4A6274">← hồ sơ</span>`,
  `  <span style="color:#FFC078">preservation/PREMIS.xml</span>`,
  `<span style="color:#FFC078">rep1/METS.xml</span>        <span style="color:#4A6274">← đại diện</span>`,
  `<span style="color:#FFC078">rep1/metadata/</span>`,
  `  <span style="color:#FFC078">descriptive/EAD_doc_*.xml</span>`,
  `  <span style="color:#FFC078">preservation/PREMIS_rep1.xml</span>`,
  `<span style="color:#8ADFC0">rep1/data/*.pdf</span>      <span style="color:#4A6274">← bản gốc</span>`,
  `<span style="color:#DA77F2">schemas/*.xsd</span>`,
];

// ─── Dossier info card ────────────────────────────────────────────────────────
function DossierInfoCard({ dossier }) {
  if (!dossier) return null;
  const rows = [
    { key: 'Mã hồ sơ',    val: dossier.maHoSo || '—', code: true },
    { key: 'Trạng thái',  val: dossier.state   || '—' },
    { key: 'Số văn bản',  val: dossier.vanBanRows?.length ?? '—' },
    { key: 'Lỗi / Cảnh báo',
      val: `${dossier.validation?.errorCount ?? 0} / ${dossier.validation?.warningCount ?? 0}` },
  ];

  return (
    <SideCard title="Thông tin hồ sơ">
      {rows.map((r) => (
        <div key={r.key} style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
          padding: '5px 0', borderBottom: `1px solid ${BORDER}`, gap: 12,
        }}>
          <span style={{ fontSize: 11, color: TEXT3, fontFamily: MONO, flexShrink: 0 }}>{r.key}</span>
          <span style={{
            fontSize: r.code ? 11 : 12,
            color: '#0D1B2A',
            fontFamily: r.code ? MONO : 'inherit',
            textAlign: 'right',
            wordBreak: 'break-all',
          }}>
            {r.val}
          </span>
        </div>
      ))}
    </SideCard>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────
export default function GuideSidebar({ dossier, showWorkflow = true }) {
  const state = dossier?.state ?? 'UPLOAD';

  return (
    <div>
      {dossier && <DossierInfoCard dossier={dossier} />}

      {showWorkflow && (
        <SideCard title="Quy trình đóng gói">
          <WorkflowSteps currentState={state} />
        </SideCard>
      )}

      <SideCard title="Chuẩn áp dụng">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          {STANDARDS.map((s) => (
            <div key={s.badge} style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '6px 0', borderBottom: `1px solid ${BORDER}`,
              fontSize: 12, color: '#3A4B5C',
            }}>
              <span style={{
                fontFamily: MONO, fontSize: 10,
                background: NAVY, color: '#8FB3CC',
                borderRadius: 4, padding: '2px 6px',
                flexShrink: 0,
              }}>
                {s.badge}
              </span>
              {s.label}
            </div>
          ))}
        </div>
      </SideCard>

      <SideCard title="Cấu trúc đầu vào">
        <TreeBlock lines={INPUT_TREE} />
      </SideCard>

      <SideCard title="Tệp sinh tự động (SIP)">
        <TreeBlock lines={OUTPUT_TREE} />
      </SideCard>
    </div>
  );
}
