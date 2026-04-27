/**
 * Dossier workflow status bar — high-contrast redesign.
 * Each state renders as a tinted banner (left-border accent, icon, description, action buttons)
 * followed by a full-width progress Steps bar.
 */
import { Steps, Space, Button, Typography } from 'antd';
import {
  CheckCircleFilled, CloseCircleFilled,
  SafetyCertificateOutlined, InboxOutlined,
  CheckCircleOutlined, CloseCircleOutlined,
  UploadOutlined, FileSearchOutlined,
  LoadingOutlined, TrophyOutlined, FileDoneOutlined,
} from '@ant-design/icons';
import { useAuth } from '../../hooks/use-auth.js';
import { stateMeta } from '../../utils/format-helpers.js';

const { Text } = Typography;

// Per-state visual config: accent colour, tint bg, icon, description
const STATE_CFG = {
  UPLOAD:     { color: '#1677FF', bg: '#EFF6FF', icon: <UploadOutlined />,      desc: 'Hồ sơ đã tải lên thành công — sẵn sàng kiểm tra cấu trúc' },
  VALIDATING: { color: '#7C3AED', bg: '#F5F3FF', icon: <LoadingOutlined spin />, desc: 'Đang chạy kiểm tra cấu trúc hồ sơ…' },
  VALIDATED:  { color: '#D97706', bg: '#FFFBEB', icon: <FileSearchOutlined />,   desc: 'Kiểm tra hoàn tất — chờ phê duyệt từ Approver' },
  APPROVED:   { color: '#0E9F8E', bg: '#ECFDF5', icon: <CheckCircleFilled />,    desc: 'Hồ sơ đã được phê duyệt — sẵn sàng tạo file SIP' },
  PACKAGING:  { color: '#0891B2', bg: '#ECFEFF', icon: <LoadingOutlined spin />, desc: 'Đang đóng gói — hệ thống đang tạo file SIP…' },
  PACKAGED:   { color: '#059669', bg: '#ECFDF5', icon: <FileDoneOutlined />,     desc: 'File SIP đã được tạo thành công' },
  DONE:       { color: '#15803D', bg: '#F0FDF4', icon: <TrophyOutlined />,       desc: 'Hồ sơ hoàn thành — đã lưu vào kho lưu trữ SIP' },
  REJECTED:   { color: '#DC2626', bg: '#FFF1F0', icon: <CloseCircleFilled />,    desc: 'Hồ sơ bị từ chối — cần xem xét và tải lên lại' },
};

const WORKFLOW_STEPS = ['UPLOAD', 'VALIDATED', 'APPROVED', 'PACKAGED', 'DONE'];
const TRANSIENT_STEP  = { VALIDATING: 1, PACKAGING: 3, REJECTED: 1 };

function stepIndex(state) {
  if (TRANSIENT_STEP[state] !== undefined) return TRANSIENT_STEP[state];
  const idx = WORKFLOW_STEPS.indexOf(state);
  return idx >= 0 ? idx : 0;
}

export default function WorkflowBar({
  state, validationValid,
  onValidate, onApprove, onReject, onPackage,
  loading,
}) {
  const { user } = useAuth();
  const role = user?.role;
  const meta = stateMeta(state);
  const cfg  = STATE_CFG[state] || { color: '#6B7280', bg: '#F9FAFB', icon: null, desc: '' };

  const stepsItems = WORKFLOW_STEPS.map((s, i) => ({
    title: stateMeta(s).label,
    status: i < stepIndex(state) ? 'finish'
          : i === stepIndex(state) ? (state === 'REJECTED' ? 'error' : 'process')
          : 'wait',
  }));

  return (
    <div style={{
      borderRadius: 12, overflow: 'hidden', marginBottom: 16,
      boxShadow: '0 2px 12px rgba(13,27,42,0.09)',
      border: `1px solid ${cfg.color}30`,
    }}>
      {/* ─── State banner ──────────────────────────────────────── */}
      <div style={{
        background: `linear-gradient(135deg, ${cfg.color}14 0%, ${cfg.bg} 100%)`,
        borderLeft: `5px solid ${cfg.color}`,
        padding: '16px 20px',
        display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', flexWrap: 'wrap', gap: 12,
      }}>
        {/* Left: icon + label + description */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          {/* Icon box */}
          <div style={{
            width: 50, height: 50, borderRadius: 12, flexShrink: 0,
            background: `${cfg.color}18`,
            border: `2px solid ${cfg.color}35`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 24, color: cfg.color,
          }}>
            {cfg.icon}
          </div>

          <div>
            {/* Eyebrow label */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
              <Text style={{
                fontSize: 11, color: '#6B7280', fontWeight: 600,
                textTransform: 'uppercase', letterSpacing: '0.06em',
              }}>
                Trạng thái hiện tại
              </Text>

              {/* Validation pill — only on VALIDATED */}
              {state === 'VALIDATED' && (
                <span style={{
                  fontSize: 11, fontWeight: 700, padding: '1px 9px', borderRadius: 20,
                  background: validationValid ? '#bbf7d0' : '#fecaca',
                  color:      validationValid ? '#15803D' : '#B91C1C',
                }}>
                  {validationValid ? '✓ Hợp lệ' : '✗ Còn lỗi'}
                </span>
              )}
            </div>

            {/* State label */}
            <div style={{
              fontSize: 19, fontWeight: 700, color: cfg.color,
              lineHeight: 1.2, marginBottom: 4,
            }}>
              {meta.label}
            </div>

            {/* Description */}
            <div style={{ fontSize: 12.5, color: '#4B5563', lineHeight: 1.5 }}>
              {cfg.desc}
            </div>
          </div>
        </div>

        {/* Right: role-specific action buttons */}
        <Space wrap>
          {(role === 'Operator' || role === 'Admin') && ['UPLOAD', 'VALIDATED'].includes(state) && (
            <Button icon={<SafetyCertificateOutlined />} onClick={onValidate} loading={loading}>
              Kiểm tra lại
            </Button>
          )}
          {(role === 'Approver' || role === 'Admin') && state === 'VALIDATED' && validationValid && (
            <>
              <Button type="primary" icon={<CheckCircleOutlined />} onClick={onApprove} loading={loading}
                style={{ background: '#0E9F8E', borderColor: '#0E9F8E' }}>
                Phê duyệt
              </Button>
              <Button danger icon={<CloseCircleOutlined />} onClick={onReject} loading={loading}>
                Từ chối
              </Button>
            </>
          )}
          {(role === 'Admin' || role === 'Operator') && state === 'APPROVED' && (
            <Button type="primary" icon={<InboxOutlined />} onClick={onPackage} loading={loading}
              style={{ background: '#0E9F8E', borderColor: '#0E9F8E' }}>
              Đóng gói SIP
            </Button>
          )}
        </Space>
      </div>

      {/* ─── Progress steps ────────────────────────────────────── */}
      <div style={{
        background: '#fff', padding: '14px 20px 12px',
        borderTop: '1px solid #F0F0F0',
      }}>
        <Steps
          items={stepsItems}
          current={stepIndex(state)}
          size="small"
        />
      </div>
    </div>
  );
}
