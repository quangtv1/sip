/**
 * Shared formatting utilities.
 */

/**
 * Severity → Ant Design tag color
 */
export function severityColor(severity) {
  return severity === 'ERROR' ? 'error' : 'warning';
}

/**
 * Dossier state → Ant Design Steps status + label
 */
const STATE_META = {
  UPLOAD: { label: 'Đã tải lên', status: 'process' },
  VALIDATING: { label: 'Đang kiểm tra', status: 'process' },
  VALIDATED: { label: 'Đã kiểm tra', status: 'finish' },
  APPROVED: { label: 'Đã phê duyệt', status: 'finish' },
  PACKAGING: { label: 'Đang đóng gói', status: 'process' },
  PACKAGED: { label: 'Đã đóng gói', status: 'finish' },
  DONE: { label: 'Hoàn thành', status: 'finish' },
  REJECTED: { label: 'Từ chối', status: 'error' },
};

export function stateMeta(state) {
  return STATE_META[state] || { label: state, status: 'wait' };
}

/**
 * Format byte size to human-readable string
 */
export function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

/**
 * Truncate a string to maxLen with ellipsis
 */
export function truncate(str, maxLen = 40) {
  if (!str) return '';
  return str.length > maxLen ? `${str.slice(0, maxLen)}…` : str;
}
