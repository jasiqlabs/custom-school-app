'use client';

import type { PaymentReceiptDto } from '@custom-school/contracts';

const escapeHtml = (value: unknown) => String(value ?? '').replace(/[&<>"']/g, (char) =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char] || char));
const money = (value: unknown) => {
  const amount = Number(value);
  return Number.isFinite(amount) ? '₹' + amount.toFixed(2) : '—';
};

/**
 * Browser-native Unicode printing for two A4 copies, from the frozen receipt DTO.
 * The standalone view has no external requests or executable user content.
 * Operators can choose "Save as PDF" in the browser's native print dialogue.
 */
export function printReceiptCopies(receipt: PaymentReceiptDto & { collectorName?: string }): void {
  const popup = window.open('', '_blank', 'width=920,height=860');
  if (!popup) throw new Error('The browser blocked the print window. Allow pop-ups for this site and try again.');

  const lines = (receipt.items || []).map((item) => {
    const label = escapeHtml(item.description || item.categoryName || item.categoryCode);
    const period = escapeHtml(item.period || '');
    return '<tr><td>' + label + '</td><td>' + period + '</td><td class="right">' +
      escapeHtml(money(item.paidAmount)) + '</td></tr>';
  }).join('') || '<tr><td colspan="3">No fee line details available</td></tr>';

  const receiptCopy = (copy: string) => '<section class="page">' +
    '<header><div class="school">' + escapeHtml(receipt.schoolName || 'School') + '</div>' +
    '<div class="secondary">' + escapeHtml(receipt.schoolAddress || '') + '</div></header>' +
    '<h2>Fee Receipt <small>— ' + escapeHtml(copy) + '</small></h2>' +
    '<div class="meta"><div><b>Receipt number:</b> ' + escapeHtml(receipt.receiptNumber) + '</div>' +
    '<div><b>Payment date:</b> ' + escapeHtml(receipt.paymentDate) + '</div>' +
    '<div><b>Student:</b> ' + escapeHtml(receipt.studentName) + '</div>' +
    '<div><b>Student code:</b> ' + escapeHtml(receipt.studentCode) + '</div>' +
    '<div><b>Class:</b> ' + escapeHtml(receipt.className || '—') + '</div>' +
    '<div><b>Fee period:</b> ' + escapeHtml(receipt.feeMonth || '—') + '</div></div>' +
    '<table><thead><tr><th>Fee description</th><th>Period</th><th class="right">Paid</th></tr></thead>' +
    '<tbody>' + lines + '</tbody></table>' +
    '<div class="total">Amount collected: ' + escapeHtml(money(receipt.amountPaidThisReceipt)) + '</div>' +
    '<p><b>Payment method:</b> ' + escapeHtml(receipt.paymentMode) +
    ' &nbsp; <b>Reference:</b> ' + escapeHtml(receipt.reference || '—') + '</p>' +
    '<p><b>Collected by:</b> ' + escapeHtml(receipt.collectorName || 'School Operator') + '</p>' +
    (receipt.status === 'VOIDED' ? '<p class="voided"><b>VOIDED:</b> ' +
      escapeHtml(receipt.voidReason || 'Receipt cancelled') + '</p>' : '') +
    '<footer>Computer-generated receipt. Both copies share the same receipt number.</footer>' +
    '</section>';

  const html = '<!doctype html><html><head><meta charset="utf-8">' +
    '<meta name="viewport" content="width=device-width,initial-scale=1">' +
    '<title>Fee receipt ' + escapeHtml(receipt.receiptNumber) + '</title>' +
    '<style>@page{size:A4;margin:12mm}*{box-sizing:border-box}' +
    'body{margin:0;color:#17243b;font:12px system-ui,"Noto Sans","Noto Sans Devanagari","Noto Nastaliq Urdu",sans-serif}' +
    '.page{min-height:260mm;padding:13mm;border:1px solid #d1d5db;break-after:page;page-break-after:always}' +
    '.page:last-child{break-after:auto;page-break-after:auto}' +
    'header{text-align:center;border-bottom:2px solid #1d4ed8;padding-bottom:16px;margin-bottom:16px}' +
    '.school{font-weight:700;font-size:22px;white-space:pre-wrap;overflow-wrap:anywhere}' +
    '.secondary{color:#525e72;white-space:pre-wrap;overflow-wrap:anywhere}' +
    'h2{font-size:17px;margin:14px 0}h2 small{font-size:12px;color:#525e72}' +
    '.meta{display:grid;grid-template-columns:1fr 1fr;gap:9px;margin-bottom:20px}' +
    '.meta>div,td,th,p{overflow-wrap:anywhere}table{border-collapse:collapse;width:100%}' +
    'td,th{padding:9px;border-bottom:1px solid #e5e7eb;text-align:left}' +
    'th{background:#f1f5f9}.right{text-align:right}.total{font-weight:700;font-size:16px;margin-top:20px}' +
    '.voided{color:#b91c1c}footer{font-size:11px;color:#64748b;margin-top:32px;border-top:1px solid #e5e7eb;padding-top:12px}' +
    '@media print{.page{border:0;padding:0;min-height:0}}' +
    '</style></head><body>' + receiptCopy('OFFICE COPY') +
    receiptCopy('STUDENT COPY') + '</body></html>';

  try {
    popup.document.open();
    popup.document.write(html);
    popup.document.close();
    popup.focus();
    popup.onafterprint = () => popup.close();
    popup.print();
  } catch {
    popup.close();
    throw new Error('Unable to open the receipt print view. Please try again.');
  }
}
