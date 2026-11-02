import type { PaymentReceiptDto } from '@custom-school/contracts';
import {
  a4Svg, textSvg, ruleSvg, rasterizeUnicodePages, type DocumentPage,
} from '@custom-school/storage';

type Receipt = PaymentReceiptDto & { collectorName?: string };
const amount = (value: number) => 'Rs. ' + Number(value || 0).toFixed(2);
const rawText = (v: unknown) => String(v ?? '').replace(/[\r\n\t]+/g, ' ').trim();
const widthUnits = (s: string) => Array.from(s).reduce((sum, char) =>
  sum + (/[\u0900-\u097F\u0600-\u06FF]/.test(char) ? 1.4 : 1), 0);

function wrap(value: unknown, units = 76): string[] {
  const normalized = rawText(value);
  if (!normalized) return ['—'];
  const words = normalized.split(/\s+/u);
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    const candidate = current ? current + ' ' + word : word;
    if (widthUnits(candidate) <= units) { current = candidate; continue; }
    if (current) { lines.push(current); current = ''; }
    let tail = word;
    while (widthUnits(tail) > units) {
      const letters = Array.from(tail);
      let count = 0, n = 0;
      while (n < letters.length && count + widthUnits(letters[n]) <= units) count += widthUnits(letters[n++]);
      n = Math.max(n, 1);
      lines.push(letters.slice(0, n).join(''));
      tail = letters.slice(n).join('');
    }
    current = tail;
  }
  if (current) lines.push(current);
  return lines;
}

function drawLine(x: number, y: number, text: unknown, size = 10, bold = false) {
  return textSvg(x, y, text, size, bold);
}

/** Printed from a frozen, school-scoped payment receipt. No external font or image calls. */
function receiptPages(receipt: Receipt): DocumentPage[] {
  const result: DocumentPage[] = [];
  const entries = receipt.items?.length ? receipt.items.map(x => ({
    label: rawText(x.description || x.categoryName || x.categoryCode),
    period: rawText(x.period || ''),
    total: amount(x.paidAmount),
  })) : [{
    label: 'Fee payment', period: rawText(receipt.feeMonth), total: amount(receipt.amountPaidThisReceipt),
  }];
  const school = rawText(receipt.schoolName || 'School');
  const student = rawText(receipt.studentName);
  const code = rawText(receipt.studentCode);
  const receiptNo = rawText(receipt.receiptNumber);
  const status = receipt.status === 'VOIDED' ? 'VOIDED — ' + rawText(receipt.voidReason || 'Cancelled') : 'ACTIVE';

  for (const copy of ['OFFICE COPY', 'STUDENT COPY']) {
    let i = 0;
    let pageNo = 0;
    while (i < entries.length) {
      pageNo++;
      const pageLabel = copy + (pageNo > 1 ? ' (CONTINUED ' + pageNo + ')' : '');
      const svg: string[] = [
        '<rect x="25" y="25" width="545" height="792" rx="8" fill="#ffffff" stroke="#94a3b8"/>',
      ];
      let y = 55;
      for (const name of wrap(school, 68).slice(0, 3)) {
        svg.push(drawLine(42, y, name, 15, true)); y += 19;
      }
      for (const address of wrap(receipt.schoolAddress || '', 99).slice(0, 2)) {
        svg.push(drawLine(42, y, address, 9)); y += 13;
      }
      y = Math.max(y + 5, 129);
      svg.push(ruleSvg(y), drawLine(42, y + 23, 'FEE RECEIPT — ' + pageLabel, 13, true));
      y += 45;
      svg.push(drawLine(42, y, 'Receipt: ' + receiptNo + '    Date: ' + rawText(receipt.paymentDate)));
      y += 18;
      for (const name of wrap('Student: ' + student + '    Code: ' + code, 88).slice(0, 3)) {
        svg.push(drawLine(42, y, name)); y += 16;
      }
      svg.push(drawLine(42, y + 3, 'Class: ' + rawText(receipt.className || '—') +
        '    Fee period: ' + rawText(receipt.feeMonth || '—')));
      y += 29;
      svg.push(ruleSvg(y), drawLine(42, y + 17, 'Description', 10, true),
        drawLine(380, y + 17, 'Period', 10, true),
        drawLine(478, y + 17, 'Paid', 10, true), ruleSvg(y + 23));
      y += 39;
      const plainRows: string[] = [];
      while (i < entries.length && y <= 695) {
        const item = entries[i];
        const wrapped = wrap(item.label, 57);
        const rowHeight = Math.max(18, wrapped.length * 15);
        if (y + rowHeight > 715) break;
        wrapped.forEach((line, n) => svg.push(drawLine(42, y + n * 15, line, 9)));
        svg.push(drawLine(380, y, item.period, 8), drawLine(470, y, item.total, 9));
        plainRows.push(item.label + ' ' + item.period + ' ' + item.total);
        y += rowHeight;
        i++;
      }
      if (!plainRows.length) throw new Error('DOCUMENT_LAYOUT_OVERFLOW');
      const isLast = i === entries.length;
      svg.push(ruleSvg(730));
      svg.push(drawLine(42, 750, isLast ?
        'Total paid this receipt: ' + amount(receipt.amountPaidThisReceipt) : 'Continued on next page',
        11, true));
      svg.push(drawLine(42, 769, 'Payment: ' + rawText(receipt.paymentMode) +
        '    Reference: ' + rawText(receipt.reference || '—'), 9));
      svg.push(drawLine(42, 784, 'Collected by: ' + rawText(receipt.collectorName || 'School Operator'), 9));
      svg.push(drawLine(42, 802, status, 9, receipt.status === 'VOIDED'));
      const accessibleText = [
        school, rawText(receipt.schoolAddress), 'FEE RECEIPT', pageLabel,
        'Receipt: ' + receiptNo, 'Date: ' + rawText(receipt.paymentDate),
        'Student: ' + student, 'Code: ' + code, 'Class: ' + rawText(receipt.className),
        ...plainRows, isLast ? 'Total paid this receipt: ' + amount(receipt.amountPaidThisReceipt) : '',
        'Payment: ' + rawText(receipt.paymentMode),
        'Reference: ' + rawText(receipt.reference), 'Collected by: ' + rawText(receipt.collectorName),
        status,
      ].join('\n');
      result.push({ svg: a4Svg(svg.join('')), accessibleText });
      if (result.length > 16) throw new Error('DOCUMENT_PAGE_LIMIT');
    }
  }
  return result;
}

export async function makeTwoCopyUnicodeReceiptPdf(receipt: Receipt): Promise<Buffer> {
  const pages = receiptPages(receipt);
  return rasterizeUnicodePages(pages, async svg => {
    // Dynamically import after FONTCONFIG_FILE has been set by the shared renderer.
    const sharp = (await import('sharp')).default;
    const { data, info } = await sharp(Buffer.from(svg), { density: 180 })
      .flatten({ background: '#ffffff' }).removeAlpha().toColourspace('rgb')
      .raw().toBuffer({ resolveWithObject: true });
    if (info.channels !== 3) throw new Error('DOCUMENT_RASTER_INVALID');
    return { pixels: data, width: info.width, height: info.height };
  });
}
