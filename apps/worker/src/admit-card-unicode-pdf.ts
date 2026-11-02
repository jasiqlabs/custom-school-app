import {
  a4Svg, textSvg, ruleSvg, imageSvg, rasterizeUnicodePages, type DocumentPage,
} from '@custom-school/storage';

const str = (v: unknown) => String(v ?? '').replace(/[\u0000-\u001f\u007f]+/g, ' ').trim();
const graphemes = (s: string) =>
  Array.from(new Intl.Segmenter('und', { granularity: 'grapheme' }).segment(s), x => x.segment);
function wrap(input: unknown, maxChars = 66): string[] {
  const words = str(input).split(/\s+/u);
  const out: string[] = [];
  let line = '';
  for (const word of words) {
    if (graphemes(line + (line ? ' ' : '') + word).length <= maxChars) {
      line += (line ? ' ' : '') + word;
      continue;
    }
    if (line) out.push(line);
    const clusters = graphemes(word);
    for (let i = 0; i < clusters.length - maxChars; i += maxChars)
      out.push(clusters.slice(i, i + maxChars).join(''));
    line = clusters.slice(Math.max(0, Math.floor((clusters.length - 1) / maxChars) * maxChars)).join('');
  }
  if (line) out.push(line);
  return out.length ? out : ['—'];
}
const mime = (buf: Buffer): string => buf.subarray(0, 8).toString('hex') === '89504e470d0a1a0a'
  ? 'image/png' : buf[0] === 0xff && buf[1] === 0xd8 ? 'image/jpeg' : 'unsupported';

/**
 * New issue/retry output only. Issued immutable admit-card PDFs are always read
 * from their existing stored file and never regenerated on GET/download.
 */
export async function buildAdmitCardUnicodePdf(snapshot: any, logo?: Buffer, signature?: Buffer): Promise<Buffer> {
  if (!snapshot?.cardUuid || !snapshot?.school || !snapshot?.student || !snapshot?.exam)
    throw new Error('DOCUMENT_TEMPLATE_INVALID');
  const schoolNames = wrap(snapshot.school.name, 44);
  const schoolAddresses = wrap(snapshot.school.address, 78);
  if (schoolNames.length > 2 || schoolAddresses.length > 2)
    throw new Error('DOCUMENT_LAYOUT_OVERFLOW');

  const studentFields: Array<[string, string]> = [
    ['Candidate name', str(snapshot.student.name)],
    ['Student code / SR', str(snapshot.student.studentCode)],
    ['Roll number', str(snapshot.student.rollNumber || 'To be allocated')],
    ['Class and section', str(snapshot.student.className) + ' / ' + str(snapshot.student.sectionName)],
    ['Father name', str(snapshot.student.fatherName)],
    ['Mother name', str(snapshot.student.motherName)],
    ['Date of birth', str(snapshot.student.dateOfBirth)],
  ];
  const instructions: string[] = snapshot.exam.instructions
    ? String(snapshot.exam.instructions).split(/\r?\n/u).map(str).filter(Boolean)
    : [
      'Bring this admit card to the examination hall on all scheduled exam days.',
      'Arrive at least 15 minutes before the scheduled start time.',
      'Mobile phones and unauthorized examination materials are not permitted.',
      'Follow the examination supervisor’s instructions.',
    ];
  const fields = [
    ...studentFields,
    ['Instructions', instructions.join(' ')] as [string, string],
  ];
  const docPages: DocumentPage[] = [];
  let row = 0;
  while (row < fields.length) {
    const num = docPages.length + 1;
    const title = num === 1 ? 'EXAMINATION ADMIT CARD' : 'ADMIT CARD — CONTINUED';
    const svg = [
      '<rect x="29" y="28" width="536" height="786" rx="6" fill="white" stroke="#1e3a8a"/>',
      imageSvg(logo, logo?.length ? mime(logo) : '', 42, 43, 65, 65),
      ...schoolNames.map((name, i) => textSvg(120, 59 + i * 19, name, 15, true)),
      ...schoolAddresses.map((address, i) => textSvg(120, 103 + i * 12, address, 9)),
      textSvg(120, 139, 'School code: ' + str(snapshot.school.schoolCode) +
        '    UDISE: ' + str(snapshot.school.udiseNumber), 9),
      textSvg(120, 153, 'Affiliation: ' + str(snapshot.school.affiliationNumber), 9),
      ruleSvg(168),
      textSvg(143, 195, title, 16, true),
      textSvg(40, 219, 'Exam: ' + str(snapshot.exam.title), 11, true),
      textSvg(40, 236, 'Session: ' + str(snapshot.exam.academicSessionLabel) +
        '    Class: ' + str(snapshot.exam.className), 10),
      textSvg(40, 252, 'Dates: ' + str(snapshot.exam.examStart) +
        ' to ' + str(snapshot.exam.examEnd), 10),
      textSvg(40, 270, 'Venue: ' + str(snapshot.exam.venue || 'As announced'), 10),
      ruleSvg(286),
    ];
    let y = 310;
    const shown: string[] = [];
    while (row < fields.length) {
      const [label, value] = fields[row];
      const lines = wrap(value, 83);
      const height = Math.max(28, lines.length * 15 + 10);
      if (y + height > 680) break;
      svg.push(textSvg(44, y, label + ':', 10, true));
      lines.forEach((text, i) => svg.push(textSvg(180, y + i * 15, text, 9)));
      shown.push(label + ': ' + value);
      y += height;
      row++;
    }
    if (!shown.length) throw new Error('DOCUMENT_LAYOUT_OVERFLOW');
    svg.push(ruleSvg(718),
      imageSvg(signature, signature?.length ? mime(signature) : '', 385, 725, 130, 35),
      textSvg(390, 776, str(snapshot.school.principalName || 'Principal / Authorized Signatory'), 9, true),
      textSvg(43, 799, 'Issued: ' + str(snapshot.issuedAt).slice(0, 10) +
        '    Verification: ' + str(snapshot.cardUuid), 8));
    docPages.push({
      svg: a4Svg(svg.join('')),
      accessibleText: [
        str(snapshot.school.name), str(snapshot.school.address), title,
        'School code: ' + str(snapshot.school.schoolCode),
        'UDISE: ' + str(snapshot.school.udiseNumber),
        'Exam: ' + str(snapshot.exam.title),
        'Session: ' + str(snapshot.exam.academicSessionLabel),
        'Dates: ' + str(snapshot.exam.examStart) + ' to ' + str(snapshot.exam.examEnd),
        ...shown, 'Issued: ' + str(snapshot.issuedAt),
        'Verification: ' + str(snapshot.cardUuid),
      ].join('\n'),
    });
    if (docPages.length > 8) throw new Error('DOCUMENT_PAGE_LIMIT');
  }
  return rasterizeUnicodePages(docPages, async svg => {
    const sharp = (await import('sharp')).default;
    const { data, info } = await sharp(Buffer.from(svg), { density: 180 })
      .flatten({ background: '#ffffff' }).removeAlpha().toColourspace('rgb')
      .raw().toBuffer({ resolveWithObject: true });
    if (info.channels !== 3) throw new Error('DOCUMENT_RASTER_INVALID');
    return { pixels: data, width: info.width, height: info.height };
  });
}
