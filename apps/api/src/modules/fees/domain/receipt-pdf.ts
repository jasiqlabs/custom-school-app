import type { PaymentReceiptDto } from '@custom-school/contracts';

/** A4, two individually labelled receipt copies. No external binaries or remote assets. */
function pdfEscape(text: unknown): string {
  return String(text ?? '').normalize('NFKD').replace(/[^\x20-\x7e]/g, '?')
    .replace(/[\\()]/g, ' ').slice(0, 120);
}
function linesFor(r: PaymentReceiptDto & { collectorName?: string }, copy: string): string[] {
  const lines = [
    r.schoolName || 'School ERP',
    r.schoolAddress || '',
    `FEE RECEIPT - ${copy}`,
    `Receipt: ${r.receiptNumber} | Date: ${r.paymentDate}`,
    `Student: ${r.studentName} | Code: ${r.studentCode}`,
    `Class: ${r.className || '-'} | Period: ${r.feeMonth || '-'}`,
    '---------------------------------------------------------------',
  ];
  for (const item of r.items || []) {
    const name = item.description || item.categoryName || item.categoryCode;
    lines.push(`${name} [${item.period || ''}]    Rs. ${Number(item.paidAmount).toFixed(2)}`);
  }
  lines.push('---------------------------------------------------------------');
  lines.push(`Amount collected: Rs. ${Number(r.amountPaidThisReceipt).toFixed(2)}`);
  lines.push(`Mode: ${r.paymentMode} | Reference: ${r.reference || '-'}`);
  lines.push(`Collected by: ${r.collectorName || 'School Operator'}`);
  if (r.status === 'VOIDED') lines.push(`VOIDED - ${r.voidReason || ''}`);
  lines.push('Computer-generated receipt; both copies have the same receipt number.');
  return lines;
}
export function makeTwoCopyReceiptPdf(receipt: PaymentReceiptDto & { collectorName?: string }): Buffer {
  // Pdf text uses safe ASCII labels ('Rs.') to avoid corrupt glyphs in built-in Type1 fonts.
  // Each copy is kept on its own A4 sheet for clear Office / Student filing.
  const bodies = ['OFFICE COPY', 'STUDENT COPY'].map(label => {
    const commands: string[] = ['0.2 0.25 0.4 RG 1 w 30 40 535 760 re S'];
    let y = 778;
    for (const [i, line] of linesFor(receipt, label).entries()) {
      const font = i === 0 || i === 2 ? 'F2' : 'F1';
      const size = i === 0 ? 16 : i === 2 ? 14 : 10;
      const chunks = String(line).match(/.{1,84}/g) || [''];
      for (const chunk of chunks) {
        if (y < 55) break;
        commands.push(`BT /${font} ${size} Tf 45 ${y} Td (${pdfEscape(chunk)}) Tj ET`);
        y -= i === 0 ? 25 : 17;
      }
    }
    return Buffer.from(commands.join('\n'), 'latin1');
  });
  const objects: Buffer[] = [];
  const put = (body: string | Buffer) => { objects.push(typeof body === 'string' ? Buffer.from(body, 'latin1') : body); return objects.length; };
  put('<< /Type /Catalog /Pages 2 0 R >>');
  put('<< /Type /Pages /Kids [3 0 R 4 0 R] /Count 2 >>');
  put('<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 5 0 R /F2 6 0 R >> >> /Contents 7 0 R >>');
  put('<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 5 0 R /F2 6 0 R >> >> /Contents 8 0 R >>');
  put('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');
  put('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>');
  for (const body of bodies) put(Buffer.concat([Buffer.from(`<< /Length ${body.length} >>\nstream\n`, 'latin1'), body, Buffer.from('\nendstream', 'latin1')]));
  let output = Buffer.from('%PDF-1.4\n', 'latin1');
  const offsets = [0];
  for (const [i, obj] of objects.entries()) {
    offsets.push(output.length);
    output = Buffer.concat([output, Buffer.from(`${i + 1} 0 obj\n`, 'latin1'), obj, Buffer.from('\nendobj\n', 'latin1')]);
  }
  const xrefStart = output.length;
  let xref = `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const x of offsets.slice(1)) xref += `${String(x).padStart(10, '0')} 00000 n \n`;
  xref += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF\n`;
  return Buffer.concat([output, Buffer.from(xref, 'latin1')]);
}
