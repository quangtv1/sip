/**
 * Dossier workflow status bar.
 * Shows current state as Steps + role-appropriate action buttons.
 */
import { Steps, Space, Button, Tag, Typography } from 'antd';
import {
  CheckCircleOutlined, CloseCircleOutlined,
  SafetyCertificateOutlined, InboxOutlined,
} from '@ant-design/icons';
import { useAuth } from '../../hooks/use-auth.js';
import { stateMeta } from '../../utils/format-helpers.js';

const { Text } = Typography;

const WORKFLOW_STEPS = ['UPLOAD', 'VALIDATED', 'APPROVED', 'PACKAGED', 'DONE'];

// Transient states map to the step they are transitioning toward
const TRANSIENT_STEP = { VALIDATING: 1, PACKAGING: 3, REJECTED: 1 };

function stepIndex(state) {
  if (TRANSIENT_STEP[state] !== undefined) return TRANSIENT_STEP[state];
  const idx = WORKFLOW_STEPS.indexOf(state);
  return idx >= 0 ? idx : 0;
}

export default function WorkflowBar({
  state, validationValid,
  dossierId,
  onValidate, onApprove, onReject, onPackage,
  loading,
}) {
  const { user } = useAuth();
  const role = user?.role;
  const meta = stateMeta(state);

  const stepsItems = WORKFLOW_STEPS.map((s, i) => ({
    title: stateMeta(s).label,
    status: i < stepIndex(state) ? 'finish' : i === stepIndex(state) ? (state === 'REJECTED' ? 'error' : 'process') : 'wait',
  }));

  return (
    <div style={{ background: '#fff', borderRadius: 10, padding: '14px 20px', marginBottom: 16, boxShadow: '0 1px 6px rgba(13,27,42,0.06)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <Space>
          <Text strong>Trạng thái:</Text>
          <Tag color={state === 'REJECTED' ? 'error' : state === 'DONE' ? 'success' : 'processing'}>
            {meta.label}
          </Tag>
          {state === 'VALIDATED' && (
            <Tag color={validationValid ? 'success' : 'error'}>
              {validationValid ? 'Hợp lệ' : 'Còn lỗi'}
            </Tag>
          )}
        </Space>

        <Space wrap>
          {/* Operator: validate */}
          {(role === 'Operator' || role === 'Admin') && ['UPLOAD', 'VALIDATED'].includes(state) && (
            <Button size="small" icon={<SafetyCertificateOutlined />} onClick={onValidate} loading={loading}>
              Kiểm tra lại
            </Button>
          )}
          {/* Approver: approve/reject */}
          {(role === 'Approver' || role === 'Admin') && state === 'VALIDATED' && validationValid && (
            <>
              <Button size="small" type="primary" icon={<CheckCircleOutlined />} onClick={onApprove} loading={loading}>
                Phê duyệt
              </Button>
              <Button size="small" danger icon={<CloseCircleOutlined />} onClick={onReject} loading={loading}>
                Từ chối
              </Button>
            </>
          )}
          {/* Packaging */}
          {(role === 'Admin' || role === 'Operator') && state === 'APPROVED' && (
            <Button size="small" type="primary" icon={<InboxOutlined />} onClick={onPackage} loading={loading}>
              Đóng gói SIP
            </Button>
          )}
        </Space>
      </div>

      <Steps
        items={stepsItems}
        current={stepIndex(state)}
        size="small"
        style={{ marginTop: 14 }}
      />
    </div>
  );
}
