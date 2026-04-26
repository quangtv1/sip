/**
 * Color-coded badge for dossier workflow state.
 */
import { Tag } from 'antd';
import { stateMeta } from '../../utils/format-helpers.js';

const STATE_TAG_COLOR = {
  UPLOAD:     'blue',
  VALIDATING: 'processing',
  VALIDATED:  'orange',
  APPROVED:   'green',
  PACKAGING:  'cyan',
  PACKAGED:   'geekblue',
  DONE:       'success',
  REJECTED:   'error',
};

export default function DossierStatusBadge({ state }) {
  const meta = stateMeta(state);
  const color = STATE_TAG_COLOR[state] || 'default';
  return <Tag color={color}>{meta.label}</Tag>;
}
