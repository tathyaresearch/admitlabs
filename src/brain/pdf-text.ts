// The words of a simple PDF (the Blueprint's mock reader, spec sections 17 and 26): the text a PDF
// shows with Tj and TJ in content streams that are not compressed, one line each. A PDF made by a
// design tool compresses its streams, so this finds nothing there and says so (null); the real
// reader, later, is the AI reader. Pure.

/** A PDF string's text: its escapes undone. */
function unescape(raw: string): string {
  return raw.replace(/\\([nrtbf()\\]|[0-7]{1,3})/g, (_match, code: string) => {
    if (/^[0-7]+$/.test(code)) return String.fromCharCode(parseInt(code, 8));
    return ({ n: '\n', r: '', t: ' ', b: '', f: '', '(': '(', ')': ')', '\\': '\\' } as Record<string, string>)[code] ?? code;
  });
}

const STRING = /\((?:\\.|[^\\)])*\)/g;

export function extractPdfText(bytes: Uint8Array): string | null {
  // Latin-1 keeps every byte as one character, so offsets and strings stay as they are.
  const source = Array.from(bytes, (byte) => String.fromCharCode(byte)).join('');
  const lines: string[] = [];
  for (const stream of source.matchAll(/stream\r?\n([\s\S]*?)endstream/g)) {
    const body = stream[1] ?? '';
    if (!/\bBT\b/.test(body)) continue;
    for (const show of body.matchAll(/(\((?:\\.|[^\\)])*\))\s*Tj|\[((?:[^\]\\]|\\.)*)\]\s*TJ/g)) {
      const parts = show[1] ? [show[1]] : [...(show[2] ?? '').matchAll(STRING)].map((match) => match[0]);
      const line = parts.map((part) => unescape(part.slice(1, -1))).join('').replace(/\s+/g, ' ').trim();
      if (line) lines.push(line);
    }
  }
  return lines.length ? lines.join('\n') : null;
}
