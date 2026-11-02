import {
  a4Svg, textSvg, ruleSvg, imageSvg, rasterizeUnicodePages, type DocumentPage,
} from '@custom-school/storage';

function flat(value: unknown) { return String(value ?? '').replace(/[\r\n\t]+/g, ' ').trim(); }
function wrap(value: unknown, columns = 45): string[] {
  const words = flat(value).split(/\s+/u);
  const result: string[] = [];
  let line = '';
  for (const word of words) {
    const candidate = line ? line + ' ' + word : word;
    if (Array.from(candidate).length > columns && line) { result.push(line); line = word; }
    else line = candidate;
    while (Array.from(line).length > columns) {
      result.push(Array.from(line).slice(0, columns).join(''));
      line = Array.from(line).slice(columns).join('');
    }
  }
  if (line) result.push(line);
  return result.length ? result : ['—'];
}
function imageMime(bytes: Buffer): string {
  return bytes.subarray(0, 8).toString('hex') === '89504e470d0a1a0a' ? 'image/png' :
    bytes[0] === 0xff && bytes[1] === 0xd8 ? 'image/jpeg' : 'unsupported';
}

/**
 * New immutable TC v2 rendering path. Existing TC v1 PDFs and bytes are untouched.
 * Separate extra-field pages prevent long names/fields from being cut off.
 */
export async function buildTcUnicodePdf(snapshot: any, logo: Buffer, signature: Buffer): Promise<Buffer> {
  if (snapshot?.templateVersion !== 'standard-v2') throw new Error('DOCUMENT_TEMPLATE_INVALID');
  const fields: Array<[string, string]> = [
    ['Student code / SR', flat(snapshot.student?.studentCode)],
    ['Student name', flat(snapshot.student?.name)],
    ['Father name', flat(snapshot.student?.fatherName)],
    ['Mother name', flat(snapshot.student?.motherName)],
    ['Date of birth', flat(snapshot.student?.dateOfBirth)],
    ['Class', flat(snapshot.student?.className)],
    ['Section', flat(snapshot.student?.sectionName)],
    ['Admission date', flat(snapshot.student?.admissionDate)],
    ['Address', flat(snapshot.student?.address)],
    ...Object.entries(snapshot.student?.approvedTemplateFields || {})
      .filter(([key, value]) => key && value !== null && value !== undefined)
      .map(([key, value]) => [flat(key), flat(value)] as [string, string]),
  ];
  if (!snapshot.school?.principal?.name || !snapshot.tcUuid || !snapshot.issuedAt)
    throw new Error('DOCUMENT_TEMPLATE_INVALID');
  const docs: DocumentPage[] = [];
  const schoolNames = wrap(snapshot.school.name, 43);
  const schoolAddresses = snapshot.school.address ? wrap(snapshot.school.address, 69) : [];
  if (schoolNames.length > 2 || schoolAddresses.length > 2) throw new Error('DOCUMENT_LAYOUT_OVERFLOW');
  const principalNames = wrap(snapshot.school.principal.name, 25);
  if (principalNames.length > 2) throw new Error('DOCUMENT_LAYOUT_OVERFLOW');
  let position = 0;
  let page = 0;
  while (position < fields.length) {
    page++;
    const title = page === 1 ? 'TRANSFER CERTIFICATE' : 'TRANSFER CERTIFICATE — CONTINUED';
    const svg: string[] = [
      '<rect x="27" y="27" width="541" height="788" rx="6" stroke="#1e40af" fill="white"/>',
      imageSvg(logo, imageMime(logo), 45, 46, 72, 72),
      ...schoolNames.map((name, i) => textSvg(130, 65 + i * 19, name, 15, true)),
      ...schoolAddresses.map((address, i) => textSvg(130, 105 + i * 13, address, 9)),
      textSvg(130, 134, 'School code: ' + flat(snapshot.school.schoolCode || '—') +
        '    UDISE: ' + flat(snapshot.school.udiseNumber || '—'), 9),
      textSvg(130, 149, 'Affiliation: ' + flat(snapshot.school.affiliationNumber || '—'), 9),
      ruleSvg(165),
      textSvg(140, 194, title, 17, true),
      textSvg(40, 222, 'TC number: ' + flat(snapshot.tcUuid), 10, true),
      textSvg(397, 222, 'Issued: ' + flat(snapshot.issuedAt).slice(0, 10), 10),
      ruleSvg(240),
    ];
    let y = 262;
    const shown: string[] = [];
    while (position < fields.length) {
      const [key, value] = fields[position];
      const wrapped = wrap(value, 49);
      const keyLines = wrap(key + ':', 22);
      const height = Math.max(26, Math.max(wrapped.length, keyLines.length) * 15 + 8);
      if (y + height > 680) break;
      for (let i = 0; i < keyLines.length; i++) svg.push(textSvg(45, y + i * 15, keyLines[i], 10, true));
      for (let i = 0; i < wrapped.length; i++) svg.push(textSvg(200, y + i * 15, wrapped[i], 10));
      shown.push(key + ': ' + value);
      y += height;
      position++;
    }
    if (!shown.length) throw new Error('DOCUMENT_LAYOUT_OVERFLOW');
    svg.push(ruleSvg(715));
    // The authorizing principal and frozen signature belong on every page.
    svg.push(imageSvg(signature, imageMime(signature), 390, 720, 126, 40));
    principalNames.forEach((name, i) => svg.push(textSvg(390, 769 + i * 12, name, 9, true)));
    svg.push(textSvg(390, 795, 'Principal / Authorized Signatory', 8));
    svg.push(textSvg(43, 800, 'Official certificate — ' + page + ' / generated from frozen issuance data', 8));
    docs.push({
      svg: a4Svg(svg.join('')),
      accessibleText: [
        flat(snapshot.school.name), flat(snapshot.school.address), title,
        'School code: ' + flat(snapshot.school.schoolCode), 'UDISE: ' + flat(snapshot.school.udiseNumber),
        'TC number: ' + flat(snapshot.tcUuid), 'Issued: ' + flat(snapshot.issuedAt),
        ...shown, 'Principal: ' + flat(snapshot.school.principal.name),
      ].join('\n'),
    });
    if (docs.length > 16) throw new Error('DOCUMENT_PAGE_LIMIT');
  }
  return rasterizeUnicodePages(docs, async svg => {
    const sharp = (await import('sharp')).default;
    const { data, info } = await sharp(Buffer.from(svg), { density: 180 })
      .flatten({ background: '#ffffff' }).removeAlpha().toColourspace('rgb')
      .raw().toBuffer({ resolveWithObject: true });
    if (info.channels !== 3) throw new Error('DOCUMENT_RASTER_INVALID');
    return { pixels: data, width: info.width, height: info.height };
  });
}
