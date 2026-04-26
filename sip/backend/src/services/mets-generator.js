/**
 * METS 1.12 XML generator for SIP packaging.
 * Spec: Library of Congress METS 1.12 schema
 *
 * Structure:
 *   metsHdr   — creation date + agent (software + submitting org)
 *   dmdSec    — reference to EAD.xml descriptive metadata
 *   amdSec    — reference to PREMIS.xml preservation metadata
 *   fileSec   — list of all representation files with checksum + size
 *   structMap — physical structure mapping files to their locations
 */
const { create } = require('xmlbuilder2');
const path = require('path');

/**
 * Generate METS.xml content.
 *
 * @param {object} opts
 * @param {string}   opts.maHoSo       - Dossier code (record identifier)
 * @param {string}   opts.createDate   - ISO 8601 creation datetime
 * @param {string}   opts.softwareName - Name of the packaging software
 * @param {string}   opts.submittingOrg- Submitting organisation name
 * @param {Array}    opts.pdfFiles     - [{ name, size, sha256 }]
 * @returns {string} Well-formed XML string
 */
function generateMets({ maHoSo, createDate, softwareName, submittingOrg, pdfFiles }) {
  const doc = create({ version: '1.0', encoding: 'UTF-8' })
    .ele('mets:mets', {
      'xmlns:mets':  'http://www.loc.gov/METS/',
      'xmlns:xlink': 'http://www.w3.org/1999/xlink',
      'xmlns:xsi':   'http://www.w3.org/2001/XMLSchema-instance',
      'xsi:schemaLocation': 'http://www.loc.gov/METS/ http://www.loc.gov/standards/mets/mets.xsd',
      'OBJID':  maHoSo || 'UNKNOWN',
      'TYPE':   'SIP',
      'LABEL':  `Ho so ${maHoSo || ''}`,
    });

  // --- metsHdr ---
  const hdr = doc.ele('mets:metsHdr', { CREATEDATE: createDate });
  hdr.ele('mets:agent', { ROLE: 'CREATOR', TYPE: 'OTHER', OTHERTYPE: 'SOFTWARE' })
    .ele('mets:name').txt(softwareName || 'SIP Archival System');
  hdr.ele('mets:agent', { ROLE: 'SUBMITTER', TYPE: 'ORGANIZATION' })
    .ele('mets:name').txt(submittingOrg || '');

  // --- dmdSec — reference to EAD.xml ---
  doc.ele('mets:dmdSec', { ID: 'DMD001' })
    .ele('mets:mdRef', {
      'xlink:href':  'metadata/EAD.xml',
      'MDTYPE':      'EAD',
      'LOCTYPE':     'URL',
      'MIMETYPE':    'text/xml',
    });

  // --- amdSec — reference to PREMIS.xml ---
  const amd = doc.ele('mets:amdSec');
  amd.ele('mets:digiprovMD', { ID: 'PRES001' })
    .ele('mets:mdRef', {
      'xlink:href':  'metadata/PREMIS.xml',
      'MDTYPE':      'PREMIS',
      'LOCTYPE':     'URL',
      'MIMETYPE':    'text/xml',
    });

  // --- fileSec ---
  const fileSec = doc.ele('mets:fileSec');
  const fileGrp = fileSec.ele('mets:fileGrp', { USE: 'original' });

  pdfFiles.forEach((f, idx) => {
    const fileId = `FILE${String(idx + 1).padStart(3, '0')}`;
    fileGrp.ele('mets:file', {
      ID:        fileId,
      MIMETYPE:  'application/pdf',
      SIZE:      String(f.size || 0),
      CHECKSUM:  f.sha256 || '',
      CHECKSUMTYPE: 'SHA-256',
    }).ele('mets:FLocat', {
      'xlink:href': `representations/original/${f.name}`,
      'LOCTYPE': 'URL',
    });
  });

  // --- structMap ---
  const structMap = doc.ele('mets:structMap', { TYPE: 'physical' });
  const rootDiv = structMap.ele('mets:div', { TYPE: 'physicalStructMap', LABEL: maHoSo || '' });

  pdfFiles.forEach((f, idx) => {
    const fileId = `FILE${String(idx + 1).padStart(3, '0')}`;
    rootDiv.ele('mets:div', { TYPE: 'file', LABEL: path.basename(f.name, '.pdf') })
      .ele('mets:fptr', { FILEID: fileId });
  });

  return doc.end({ prettyPrint: true });
}

module.exports = { generateMets };
