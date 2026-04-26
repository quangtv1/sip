/**
 * EAD 3 XML generator for SIP packaging.
 * Spec: Society of American Archivists EAD3 schema
 *
 * Maps Ho_so fields → <archdesc> and Van_ban rows → <dsc> components.
 *
 * Ho_so field mapping:
 *   tieuDe          → archdesc/did/unittitle
 *   maHoSo          → archdesc/did/unitid
 *   ngayBatDau/KetThuc → archdesc/did/unitdate
 *   coQuan          → archdesc/did/origination
 *   ngonNgu         → archdesc/did/langmaterial
 *   trichYeu        → archdesc/scopecontent
 *   cheDoSuDung     → archdesc/accessrestrict
 *
 * Van_ban fields (per component):
 *   tieuDe, soKyHieu, ngayThang, nguoiKy, trichYeu
 */
const { create } = require('xmlbuilder2');

/**
 * @param {object} opts
 * @param {string}  opts.maHoSo
 * @param {object}  opts.hoSoRow   - Ho_so Excel row
 * @param {Array}   opts.vanBanRows - Van_ban Excel rows
 * @returns {string} Well-formed XML string
 */
function generateEad({ maHoSo, hoSoRow, vanBanRows }) {
  const hs = hoSoRow || {};

  const doc = create({ version: '1.0', encoding: 'UTF-8' })
    .ele('ead', {
      'xmlns':     'http://ead3.archivists.org/schema/',
      'xmlns:xsi': 'http://www.w3.org/2001/XMLSchema-instance',
      'xsi:schemaLocation': 'http://ead3.archivists.org/schema/ http://www.loc.gov/ead/ead3.xsd',
    });

  // --- control ---
  const ctrl = doc.ele('control');
  ctrl.ele('recordid').txt(maHoSo || 'UNKNOWN');
  ctrl.ele('filedesc').ele('titlestmt').ele('titleproper').txt(hs.tieuDe || '');
  ctrl.ele('maintenancestatus', { value: 'new' });
  ctrl.ele('maintenanceagency').ele('agencyname').txt(hs.coQuan || '');
  ctrl.ele('languagedeclaration')
    .ele('language', { langcode: 'vie' }).txt('Vietnamese');

  // --- archdesc ---
  const arch = doc.ele('archdesc', { level: 'file' });
  const did = arch.ele('did');

  did.ele('unitid').txt(maHoSo || '');
  did.ele('unittitle').txt(hs.tieuDe || '');

  if (hs.ngayBatDau || hs.ngayKetThuc) {
    did.ele('unitdate', {
      unitdatetype: 'inclusive',
      normal: [hs.ngayBatDau, hs.ngayKetThuc].filter(Boolean).join('/'),
    }).txt([hs.ngayBatDau, hs.ngayKetThuc].filter(Boolean).join(' – '));
  }

  if (hs.coQuan) {
    did.ele('origination', { label: 'creator' }).ele('corpname').txt(hs.coQuan);
  }

  if (hs.ngonNgu) {
    did.ele('langmaterial').ele('language', { langcode: 'vie' }).txt(hs.ngonNgu);
  }

  if (hs.soLuongVanBan != null) {
    did.ele('physdescstructured', { physdescstructuredtype: 'spaceoccupied' })
      .ele('quantity').txt(String(hs.soLuongVanBan));
  }

  if (hs.trichYeu) {
    arch.ele('scopecontent').ele('p').txt(hs.trichYeu);
  }

  if (hs.cheDoSuDung) {
    arch.ele('accessrestrict').ele('p').txt(hs.cheDoSuDung);
  }

  if (hs.thoiHanBaoQuan) {
    arch.ele('acqinfo').ele('p').txt(`Thời hạn bảo quản: ${hs.thoiHanBaoQuan}`);
  }

  // --- dsc — van ban components ---
  if (vanBanRows && vanBanRows.length > 0) {
    const dsc = arch.ele('dsc');
    vanBanRows.forEach((vb, idx) => {
      if (!vb) return;
      const c = dsc.ele('c', { id: `VB${String(idx + 1).padStart(4, '0')}`, level: 'item' });
      const cdid = c.ele('did');

      cdid.ele('unitid').txt(vb.soKyHieu || String(idx + 1));
      cdid.ele('unittitle').txt(vb.tieuDe || '');

      if (vb.ngayThang) {
        cdid.ele('unitdate').txt(vb.ngayThang);
      }
      if (vb.nguoiKy) {
        cdid.ele('origination', { label: 'creator' }).ele('persname').txt(vb.nguoiKy);
      }
      if (vb.trichYeu) {
        c.ele('scopecontent').ele('p').txt(vb.trichYeu);
      }
      if (vb.soTrang) {
        cdid.ele('physdescstructured', { physdescstructuredtype: 'spaceoccupied' })
          .ele('quantity').txt(String(vb.soTrang));
      }
    });
  }

  return doc.end({ prettyPrint: true });
}

module.exports = { generateEad };
