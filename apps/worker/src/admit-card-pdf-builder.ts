import * as zlib from 'zlib';

type Image = { width: number; height: number; dict: string; stream: Buffer };

function esc(s: string) {
  return s.replace(/[()\\\r\n]/g, ' ').replace(/[^\x20-\x7E]/g, '?').slice(0, 160);
}

function paeth(a: number, b: number, c: number) {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  return pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
}

function pngToImage(buf: Buffer): Image | null {
  if (buf.length < 32 || buf.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a') return null;
  const width = buf.readUInt32BE(16);
  const height = buf.readUInt32BE(20);
  const bit = buf[24];
  const color = buf[25];
  const interlace = buf[28];
  if (bit !== 8 || interlace !== 0 || ![0, 2, 6].includes(color) || width < 1 || height < 1 || width * height > 20_000_000) {
    return null;
  }
  let p = 8;
  const chunks: Buffer[] = [];
  while (p + 12 <= buf.length) {
    const len = buf.readUInt32BE(p);
    const type = buf.subarray(p + 4, p + 8).toString('ascii');
    if (type === 'IDAT') chunks.push(buf.subarray(p + 8, p + 8 + len));
    p += 12 + len;
  }
  if (!chunks.length) return null;
  const raw = zlib.inflateSync(Buffer.concat(chunks));
  const bpp = color === 6 ? 4 : color === 2 ? 3 : 1;
  const stride = width * bpp;
  const rgb = Buffer.alloc(width * height * 3);
  let input = 0;
  let out = 0;
  let prior = Buffer.alloc(stride);
  for (let y = 0; y < height; y++) {
    const filter = raw[input++];
    const row = Buffer.alloc(stride);
    for (let i = 0; i < stride; i++) {
      const x = raw[input++];
      const a = i >= bpp ? row[i - bpp] : 0;
      const b = prior[i] || 0;
      const c = i >= bpp ? (prior[i - bpp] || 0) : 0;
      let v = x;
      if (filter === 1) v = (x + a) & 255;
      else if (filter === 2) v = (x + b) & 255;
      else if (filter === 3) v = (x + Math.floor((a + b) / 2)) & 255;
      else if (filter === 4) v = (x + paeth(a, b, c)) & 255;
      else if (filter !== 0) return null;
      row[i] = v;
    }
    for (let x = 0; x < width; x++) {
      if (color === 0) {
        rgb[out++] = row[x];
        rgb[out++] = row[x];
        rgb[out++] = row[x];
      } else if (color === 2) {
        rgb[out++] = row[x * 3];
        rgb[out++] = row[x * 3 + 1];
        rgb[out++] = row[x * 3 + 2];
      } else {
        const alpha = row[x * 4 + 3] / 255;
        rgb[out++] = Math.round(row[x * 4] * alpha + 255 * (1 - alpha));
        rgb[out++] = Math.round(row[x * 4 + 1] * alpha + 255 * (1 - alpha));
        rgb[out++] = Math.round(row[x * 4 + 2] * alpha + 255 * (1 - alpha));
      }
    }
    prior = row;
  }
  const stream = zlib.deflateSync(rgb);
  return {
    width,
    height,
    stream,
    dict: `<< /Type /XObject /Subtype /Image /Width ${width} /Height ${height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /FlateDecode /Length ${stream.length} >>`,
  };
}

function jpegToImage(buf: Buffer): Image | null {
  if (buf.length < 4 || buf[0] !== 0xff || buf[1] !== 0xd8) return null;
  let i = 2;
  let w = 0;
  let h = 0;
  while (i + 9 < buf.length) {
    if (buf[i] !== 0xff) {
      i++;
      continue;
    }
    const marker = buf[i + 1];
    if ([0xc0, 0xc1, 0xc2, 0xc3].includes(marker)) {
      h = buf.readUInt16BE(i + 5);
      w = buf.readUInt16BE(i + 7);
      break;
    }
    if (i + 4 >= buf.length) break;
    const len = buf.readUInt16BE(i + 2);
    if (len < 2) break;
    i += 2 + len;
  }
  if (!w || !h) return null;
  return {
    width: w,
    height: h,
    stream: buf,
    dict: `<< /Type /XObject /Subtype /Image /Width ${w} /Height ${h} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${buf.length} >>`,
  };
}

function image(buf?: Buffer | null): Image | null {
  if (!buf || buf.length === 0) return null;
  return pngToImage(buf) || jpegToImage(buf);
}

function fit(img: Image, maxW: number, maxH: number) {
  const r = Math.min(maxW / img.width, maxH / img.height);
  return { w: img.width * r, h: img.height * r };
}

export function buildAdmitCardPdf(snapshot: any, logoBuf?: Buffer | null, signatureBuf?: Buffer | null): Buffer {
  const logo = image(logoBuf);
  const sig = image(signatureBuf);

  const lines: string[] = [];
  const add = (txt: string, x: number, y: number, size = 10, bold = false) => {
    lines.push(`BT /${bold ? 'F2' : 'F1'} ${size} Tf ${x} ${y} Td (${esc(txt)}) Tj ET`);
  };

  // Outer border & header banner
  lines.push('0.1 0.25 0.55 RG 2 w 30 30 535 782 re S');
  lines.push('0.94 0.96 0.99 rg 31 720 533 90 re f');
  lines.push('0.1 0.25 0.55 RG 1 w 31 720 533 90 re S');

  // School Logo
  if (logo) {
    const lf = fit(logo, 60, 60);
    lines.push(`q ${lf.w} 0 0 ${lf.h} 50 ${735 + (60 - lf.h) / 2} cm /ImLogo Do Q`);
  }

  // School Header
  add(snapshot.school.name, logo ? 125 : 55, 785, 17, true);
  const metaParts: string[] = [];
  if (snapshot.school.affiliationNumber) metaParts.push(`Affiliation No: ${snapshot.school.affiliationNumber}`);
  if (snapshot.school.udiseNumber) metaParts.push(`UDISE: ${snapshot.school.udiseNumber}`);
  if (snapshot.school.schoolCode) metaParts.push(`Code: ${snapshot.school.schoolCode}`);
  if (metaParts.length > 0) {
    add(metaParts.join('  |  '), logo ? 125 : 55, 768, 8.5);
  }
  if (snapshot.school.address) {
    add(snapshot.school.address.slice(0, 80), logo ? 125 : 55, 753, 8.5);
  }

  // Document Title Banner
  lines.push('0.15 0.35 0.65 rg 60 675 475 28 re f');
  add('EXAMINATION ADMIT CARD', 200, 684, 14, true);

  // Exam Summary Box
  lines.push('0.98 0.98 0.98 rg 50 595 495 65 re f');
  lines.push('0.8 0.8 0.8 RG 1 w 50 595 495 65 re S');

  add(`Exam: ${snapshot.exam.title}`, 65, 642, 11, true);
  if (snapshot.exam.examCode) {
    add(`Code: ${snapshot.exam.examCode}`, 370, 642, 10, true);
  }
  add(`Academic Session: ${snapshot.exam.academicSessionLabel}`, 65, 622, 10);
  add(`Class: ${snapshot.exam.className}`, 370, 622, 10, true);
  add(`Exam Dates: ${snapshot.exam.examStart} to ${snapshot.exam.examEnd}`, 65, 604, 9.5);
  if (snapshot.exam.venue) {
    add(`Venue: ${snapshot.exam.venue}`, 370, 604, 9.5);
  }

  // Student Details Box
  add('CANDIDATE DETAILS', 50, 570, 11, true);
  lines.push('0.8 0.8 0.8 RG 1 w 50 375 495 185 re S');

  let y = 538;
  const studentRows = [
    ['Candidate Name', snapshot.student.name, 'Roll Number', snapshot.student.rollNumber || 'To be allocated'],
    ['Student ID / SR', snapshot.student.studentCode, 'Class & Section', `${snapshot.student.className} - ${snapshot.student.sectionName}`],
    ["Father's Name", snapshot.student.fatherName || 'N/A', "Mother's Name", snapshot.student.motherName || 'N/A'],
    ['Date of Birth', snapshot.student.dateOfBirth || 'N/A', 'Admit Card UUID', snapshot.cardUuid.slice(0, 18) + '...'],
  ];

  for (const [k1, v1, k2, v2] of studentRows) {
    add(k1 + ':', 65, y, 9.5, true);
    add(String(v1), 175, y, 9.5);
    add(k2 + ':', 320, y, 9.5, true);
    add(String(v2), 415, y, 9.5);
    y -= 30;
  }

  // Instructions Box
  add('IMPORTANT INSTRUCTIONS FOR CANDIDATE', 50, 350, 10, true);
  lines.push('0.97 0.97 0.97 rg 50 205 495 130 re f');
  lines.push('0.8 0.8 0.8 RG 1 w 50 205 495 130 re S');

  let iy = 315;
  const defaultInstructions = [
    '1. Candidate must carry this printed Admit Card to the examination hall on all exam days.',
    '2. Arrive at the examination venue at least 15 minutes before the scheduled start time.',
    '3. Possession of mobile phones, smartwatches, or unauthorized materials is strictly prohibited.',
    '4. Maintain complete discipline. Malpractice or misconduct will lead to immediate disqualification.',
  ];

  const customInstructions = snapshot.exam.instructions
    ? snapshot.exam.instructions.split('\n').filter(Boolean).slice(0, 4)
    : [];

  const displayInstructions = customInstructions.length > 0 ? customInstructions : defaultInstructions;
  for (const inst of displayInstructions) {
    add(inst.slice(0, 110), 65, iy, 8.5);
    iy -= 22;
  }

  // Signatures Area
  if (sig) {
    const sf = fit(sig, 120, 45);
    lines.push(`q ${sf.w} 0 0 ${sf.h} 390 115 cm /ImSig Do Q`);
  }
  const principalTitle = snapshot.school.principalName
    ? `${snapshot.school.principalName} (Principal)`
    : 'Principal / Center Head';
  add(principalTitle, 370, 98, 9, true);
  add('Authorized Signatory', 370, 85, 8.5);

  lines.push('0.7 0.7 0.7 RG 1 w 65 105 140 0.1 re S');
  add("Candidate's Signature", 80, 88, 8.5);

  // Footer / Verification notice
  add(`Issued on: ${snapshot.issuedAt.slice(0, 10)}  |  Verification UUID: ${snapshot.cardUuid}`, 50, 45, 7.5);
  add('Verified Fee Cleared & Authoritative School Examination Issuance', 315, 45, 7.5);

  const content = Buffer.from(lines.join('\n'), 'binary');
  const objects: Buffer[] = [];
  const push = (body: Buffer | string) => {
    objects.push(Buffer.isBuffer(body) ? body : Buffer.from(body, 'binary'));
    return objects.length;
  };

  push('<< /Type /Catalog /Pages 2 0 R >>');
  push('<< /Type /Pages /Kids [3 0 R] /Count 1 >>');

  let xobjDict = '<< ';
  if (logo) xobjDict += '/ImLogo 6 0 R ';
  if (sig) xobjDict += '/ImSig 7 0 R ';
  xobjDict += '>>';

  push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> /XObject ${xobjDict} >> /Contents 8 0 R >>`);
  push('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');
  push('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>');

  if (logo) {
    push(Buffer.concat([Buffer.from(logo.dict + '\nstream\n', 'binary'), logo.stream, Buffer.from('\nendstream', 'binary')]));
  } else {
    push('<< >>');
  }

  if (sig) {
    push(Buffer.concat([Buffer.from(sig.dict + '\nstream\n', 'binary'), sig.stream, Buffer.from('\nendstream', 'binary')]));
  } else {
    push('<< >>');
  }

  push(Buffer.concat([Buffer.from(`<< /Length ${content.length} >>\nstream\n`, 'binary'), content, Buffer.from('\nendstream', 'binary')]));

  let pdf = Buffer.from('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n', 'binary');
  const offsets = [0];
  for (let n = 0; n < objects.length; n++) {
    offsets.push(pdf.length);
    pdf = Buffer.concat([pdf, Buffer.from(`${n + 1} 0 obj\n`, 'binary'), objects[n], Buffer.from('\nendobj\n', 'binary')]);
  }
  const xref = pdf.length;
  let table = `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let n = 1; n < offsets.length; n++) {
    table += `${String(offsets[n]).padStart(10, '0')} 00000 n \n`;
  }
  table += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.concat([pdf, Buffer.from(table, 'binary')]);
}

