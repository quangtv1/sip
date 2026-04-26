/**
 * PREMIS 3 XML generator for SIP packaging.
 * Spec: Library of Congress PREMIS 3 Data Dictionary
 *
 * Generates:
 *   <object> — one per PDF file (identifier, format, size, checksum)
 *   <event>  — packaging creation event
 *   <agent>  — software agent
 *   <rights> — access restrictions from cheDoSuDung
 */
const { create } = require('xmlbuilder2');

/**
 * @param {object} opts
 * @param {string}  opts.maHoSo
 * @param {object}  opts.hoSoRow
 * @param {Array}   opts.pdfFiles       - [{ name, size, sha256 }]
 * @param {string}  opts.packagingDate  - ISO 8601 datetime
 * @param {string}  opts.softwareName
 * @param {string}  opts.softwareVersion
 * @returns {string} Well-formed XML string
 */
function generatePremis({ maHoSo, hoSoRow, pdfFiles, packagingDate, softwareName, softwareVersion }) {
  const hs = hoSoRow || {};

  const doc = create({ version: '1.0', encoding: 'UTF-8' })
    .ele('premis:premis', {
      'xmlns:premis': 'http://www.loc.gov/premis/v3',
      'xmlns:xsi':    'http://www.w3.org/2001/XMLSchema-instance',
      'xsi:schemaLocation': 'http://www.loc.gov/premis/v3 https://www.loc.gov/standards/premis/premis.xsd',
      'version': '3.0',
    });

  // --- object per PDF file ---
  pdfFiles.forEach((f, idx) => {
    const obj = doc.ele('premis:object', { 'xsi:type': 'premis:file' });

    obj.ele('premis:objectIdentifier')
      .ele('premis:objectIdentifierType').txt('local').up()
      .ele('premis:objectIdentifierValue').txt(`${maHoSo || 'SIP'}_${f.name}`);

    const chars = obj.ele('premis:objectCharacteristics');
    chars.ele('premis:compositionLevel').txt('0');

    if (f.sha256) {
      chars.ele('premis:fixity')
        .ele('premis:messageDigestAlgorithm').txt('SHA-256').up()
        .ele('premis:messageDigest').txt(f.sha256);
    }

    if (f.size != null) {
      chars.ele('premis:size').txt(String(f.size));
    }

    chars.ele('premis:format')
      .ele('premis:formatDesignation')
        .ele('premis:formatName').txt('Portable Document Format').up()
        .ele('premis:formatVersion').txt('1.4+');

    obj.ele('premis:originalName').txt(`representations/original/${f.name}`);
  });

  // --- packaging event ---
  const evt = doc.ele('premis:event');
  evt.ele('premis:eventIdentifier')
    .ele('premis:eventIdentifierType').txt('local').up()
    .ele('premis:eventIdentifierValue').txt(`PKG_${maHoSo || ''}_${Date.now()}`);
  evt.ele('premis:eventType').txt('creation');
  evt.ele('premis:eventDateTime').txt(packagingDate || new Date().toISOString());
  evt.ele('premis:eventOutcomeInformation')
    .ele('premis:eventOutcome').txt('success');

  evt.ele('premis:linkingAgentIdentifier')
    .ele('premis:linkingAgentIdentifierType').txt('software').up()
    .ele('premis:linkingAgentIdentifierValue').txt(softwareName || 'SIP Archival System');

  pdfFiles.forEach((f) => {
    evt.ele('premis:linkingObjectIdentifier')
      .ele('premis:linkingObjectIdentifierType').txt('local').up()
      .ele('premis:linkingObjectIdentifierValue').txt(`${maHoSo || 'SIP'}_${f.name}`);
  });

  // --- agent ---
  const agent = doc.ele('premis:agent');
  agent.ele('premis:agentIdentifier')
    .ele('premis:agentIdentifierType').txt('local').up()
    .ele('premis:agentIdentifierValue').txt(softwareName || 'SIP Archival System');
  agent.ele('premis:agentName').txt(`${softwareName || 'SIP Archival System'} ${softwareVersion || '1.0.0'}`);
  agent.ele('premis:agentType').txt('software');

  // --- rights from cheDoSuDung ---
  if (hs.cheDoSuDung) {
    const rights = doc.ele('premis:rights');
    rights.ele('premis:rightsIdentifier')
      .ele('premis:rightsIdentifierType').txt('local').up()
      .ele('premis:rightsIdentifierValue').txt(`RIGHTS_${maHoSo || ''}`);
    rights.ele('premis:rightsStatement')
      .ele('premis:rightsStatementIdentifier')
        .ele('premis:rightsStatementIdentifierType').txt('local').up()
        .ele('premis:rightsStatementIdentifierValue').txt('ACCESS').up().up()
      .ele('premis:rightsBasis').txt('statute').up()
      .ele('premis:rightsGranted')
        .ele('premis:act').txt(hs.cheDoSuDung);
  }

  return doc.end({ prettyPrint: true });
}

module.exports = { generatePremis };
