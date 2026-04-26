/**
 * Main dossier workspace.
 * Layout: UploadPanel (empty state) → WorkflowBar + split pane [ExcelGrid | ErrorPanel+AutoFix]
 * Supports two entry points:
 *   /dossier       — fresh upload flow
 *   /dossier/:id   — load existing dossier by ID (from QueueView)
 */
import { useRef, useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Row, Col, Card, Tabs, message, Modal, Input, Spin } from 'antd';
import UploadPanel from '../components/upload/UploadPanel.jsx';
import FolderTreeView from '../components/upload/FolderTreeView.jsx';
import ExcelGrid from '../components/excel/ExcelGrid.jsx';
import ErrorPanel from '../components/errors/ErrorPanel.jsx';
import AutoFixPanel from '../components/errors/AutoFixPanel.jsx';
import WorkflowBar from '../components/workflow/WorkflowBar.jsx';
import PdfViewer from '../components/pdf/PdfViewer.jsx';
import { useDossier } from '../hooks/use-dossier.js';
import apiClient from '../config/api-client.js';

export default function DossierPage() {
  const { id: routeId } = useParams();
  const { dossier, setDossier, loading, uploadZip, uploadFolder, validate, save, uploadProgress } = useDossier();
  const [fetchingById, setFetchingById] = useState(false);

  // Load dossier by ID when navigating from QueueView
  useEffect(() => {
    if (!routeId) return;
    setFetchingById(true);
    apiClient.get(`/dossiers/${routeId}`)
      .then(({ data }) => {
        const d = data.data;
        setDossier({
          dossierId: d.dossierId,
          maHoSo: d.maHoSo,
          state: d.state,
          hoSoRow: d.hoSoRow,
          vanBanRows: d.vanBanRows,
          pdfFiles: d.pdfFiles,
          validation: d.validation,
        });
      })
      .catch(() => message.error('Không thể tải hồ sơ'))
      .finally(() => setFetchingById(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeId]);

  if (fetchingById) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 80 }}>
        <Spin tip="Đang tải hồ sơ..." size="large" />
      </div>
    );
  }
  const gridRef = useRef(null);
  const [pdfOpen, setPdfOpen] = useState(false);
  const [selectedPdf, setSelectedPdf] = useState('');
  const [rejectVisible, setRejectVisible] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectLoading, setRejectLoading] = useState(false);

  const errors = dossier?.validation?.errors || [];
  const suggestions = dossier?.validation?.suggestions || [];
  const hoSoRow = dossier?.hoSoRow || {};
  const vanBanRows = dossier?.vanBanRows || [];
  // local editable copies
  const [editHoSo, setEditHoSo] = useState(null);
  const [editVanBan, setEditVanBan] = useState(null);

  const activeHoSo = editHoSo ?? hoSoRow;
  const activeVanBan = editVanBan ?? vanBanRows;

  function handleUploaded(data) {
    setDossier(data);
    setEditHoSo(null);
    setEditVanBan(null);
  }

  function handleCellChange(sheet, rowIdx, field, value) {
    if (sheet === 'Ho_so') {
      setEditHoSo((prev) => ({ ...(prev ?? hoSoRow), [field]: value }));
    } else {
      setEditVanBan((prev) => {
        const rows = [...(prev ?? vanBanRows)];
        rows[rowIdx] = { ...rows[rowIdx], [field]: value };
        return rows;
      });
    }
  }

  async function handleSave() {
    if (!dossier?.dossierId) return;
    try {
      await save(dossier.dossierId, activeHoSo, activeVanBan);
      setEditHoSo(null);
      setEditVanBan(null);
      message.success('Đã lưu và kiểm tra lại');
    } catch { message.error('Lưu thất bại'); }
  }

  function handleApplyFixes(patches) {
    let hs = { ...activeHoSo };
    let vb = [...activeVanBan];
    for (const p of patches) {
      if (p.sheet === 'Ho_so') { hs = { ...hs, [p.field]: p.suggested }; }
      else if (p.row != null) {
        vb = [...vb];
        vb[p.row - 1] = { ...vb[p.row - 1], [p.field]: p.suggested };
      }
    }
    setEditHoSo(hs);
    setEditVanBan(vb);
  }

  async function handleApprove() {
    if (!dossier?.dossierId) return;
    try {
      const { data } = await apiClient.post(`/dossiers/${dossier.dossierId}/approve`);
      setDossier((prev) => ({ ...prev, state: data.data.state }));
      message.success('Đã phê duyệt');
    } catch { message.error('Phê duyệt thất bại'); }
  }

  async function handleReject() {
    if (!dossier?.dossierId) return;
    if (!rejectReason.trim()) {
      message.warning('Vui lòng nhập lý do từ chối');
      return;
    }
    setRejectLoading(true);
    try {
      const { data: rData } = await apiClient.post(`/dossiers/${dossier.dossierId}/reject`, { reason: rejectReason });
      // Backend auto-reverts REJECTED → UPLOAD; use returned state
      setDossier((prev) => ({ ...prev, state: rData.data.state }));
      setRejectVisible(false);
      setRejectReason('');
      message.success('Đã từ chối hồ sơ');
    } catch { message.error('Thao tác thất bại'); }
    finally { setRejectLoading(false); }
  }

  async function handlePackage() {
    if (!dossier?.dossierId) return;
    try {
      // Enqueue job via POST /api/package; transitions dossier to PACKAGING
      await apiClient.post('/package', { dossierId: dossier.dossierId });
      setDossier((prev) => ({ ...prev, state: 'PACKAGING' }));
      message.success('Đã bắt đầu đóng gói SIP');
    } catch { message.error('Đóng gói thất bại'); }
  }

  const hasEdits = editHoSo !== null || editVanBan !== null;

  if (!dossier) {
    return (
      <UploadPanel
        onUploaded={handleUploaded}
        uploadZip={uploadZip}
        uploadFolder={uploadFolder}
        loading={loading}
        uploadProgress={uploadProgress}
      />
    );
  }

  const rightPanelItems = [
    {
      key: 'errors',
      label: `Lỗi (${errors.filter((e) => e.severity === 'ERROR').length})`,
      children: (
        <ErrorPanel
          errors={errors}
          onNavigate={(sheet, row, field) => gridRef.current?.scrollToCell(sheet, row, field)}
        />
      ),
    },
    {
      key: 'autofix',
      label: `Gợi ý (${suggestions.length})`,
      children: <AutoFixPanel suggestions={suggestions} onApply={handleApplyFixes} />,
    },
    {
      key: 'tree',
      label: 'Cây thư mục',
      children: (
        <FolderTreeView
          pdfFiles={dossier.pdfFiles || []}
          errors={errors}
          maHoSo={dossier.maHoSo}
          onSelectPdf={(f) => { setSelectedPdf(f); setPdfOpen(true); }}
        />
      ),
    },
  ];

  return (
    <div>
      <WorkflowBar
        state={dossier.state}
        validationValid={dossier.validation?.valid}
        dossierId={dossier.dossierId}
        loading={loading}
        onValidate={() => validate(dossier.dossierId)}
        onApprove={handleApprove}
        onReject={() => setRejectVisible(true)}
        onPackage={handlePackage}
      />

      <Row gutter={16}>
        <Col span={16}>
          <Card
            size="small"
            title="Dữ liệu Excel"
            extra={hasEdits && (
              <a onClick={handleSave} style={{ fontWeight: 500 }}>Lưu thay đổi</a>
            )}
            styles={{ body: { padding: 0 } }}
          >
            <ExcelGrid
              ref={gridRef}
              hoSoRow={activeHoSo}
              vanBanRows={activeVanBan}
              errors={errors}
              onCellChange={handleCellChange}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card size="small" styles={{ body: { padding: '12px 8px' } }}>
            <Tabs items={rightPanelItems} size="small" />
          </Card>
        </Col>
      </Row>

      <PdfViewer
        open={pdfOpen}
        dossierId={dossier.dossierId}
        filename={selectedPdf}
        dossierState={dossier.state}
        onClose={() => setPdfOpen(false)}
      />

      <Modal
        title="Từ chối hồ sơ"
        open={rejectVisible}
        onOk={handleReject}
        onCancel={() => setRejectVisible(false)}
        confirmLoading={rejectLoading}
        okText="Từ chối"
        okButtonProps={{ danger: true, disabled: rejectLoading }}
      >
        <Input.TextArea
          placeholder="Lý do từ chối..."
          value={rejectReason}
          onChange={(e) => setRejectReason(e.target.value)}
          rows={4}
        />
      </Modal>
    </div>
  );
}
