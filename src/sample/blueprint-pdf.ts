// A small sample PDF for the sample Blueprints (spec section 26): a title and lines of plain text,
// one A4 page each, in Helvetica, with streams left uncompressed so the mock reader can read them.
// Only plain ASCII: no rupee sign in the standard font. Pure.

export interface SamplePage {
  title: string;
  lines: readonly string[];
}

/** A PDF string: brackets and backslashes escaped. */
const pdfString = (text: string) => `(${text.replace(/[\\()]/g, (char) => `\\${char}`)})`;

export function samplePdf(pages: readonly SamplePage[]): Uint8Array<ArrayBuffer> {
  const objects: string[] = [];
  // 1 catalog, 2 pages, 3 font, 4 bold font, then each page and its content.
  const pageIds = pages.map((_, index) => 5 + index * 2);
  objects[1] = '<< /Type /Catalog /Pages 2 0 R >>';
  objects[2] = `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(' ')}] /Count ${pages.length} >>`;
  objects[3] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>';
  objects[4] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>';
  pages.forEach((page, index) => {
    const pageId = pageIds[index] as number;
    const content = [
      'BT',
      '/F2 18 Tf',
      '56 780 Td',
      `${pdfString(page.title)} Tj`,
      '/F1 11 Tf',
      '16 TL',
      '0 -12 Td',
      ...page.lines.flatMap((line) => ['T*', `${pdfString(line)} Tj`]),
      'ET',
    ].join('\n');
    objects[pageId] = `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${pageId + 1} 0 R >>`;
    objects[pageId + 1] = `<< /Length ${content.length} >>\nstream\n${content}\nendstream`;
  });
  let body = '%PDF-1.4\n';
  const offsets: number[] = [];
  for (let id = 1; id < objects.length; id += 1) {
    offsets[id] = body.length;
    body += `${id} 0 obj\n${objects[id]}\nendobj\n`;
  }
  const xref = body.length;
  body += `xref\n0 ${objects.length}\n0000000000 65535 f \n`;
  for (let id = 1; id < objects.length; id += 1) body += `${String(offsets[id]).padStart(10, '0')} 00000 n \n`;
  body += `trailer\n<< /Size ${objects.length} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Uint8Array.from(body, (char) => char.charCodeAt(0) & 0xff);
}
