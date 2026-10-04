// Drishti's emails, laid out in black and ivory (spec 14): one plain column that every mail app
// shows the same way, with inline styles only. Every word that came from outside (a student's
// name, a city) is escaped. Pure, so each email is tested on its own.

export const EMAIL_COLORS = { black: '#0A0A0C', graphite: '#1E1F23', ivory: '#F2E8D6', slate: '#8A8D94', card: '#FBF6EC', line: '#E2D6C0' } as const;

const FONT = "'Bricolage Grotesque', 'Segoe UI', Arial, sans-serif";

/** Text made safe to put inside HTML. */
export function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

export interface EmailFact {
  label: string;
  value: string;
}

export interface EmailParts {
  /** The first words a mail app shows beside the subject. */
  preview: string;
  title: string;
  /** Plain sentences, one paragraph each. */
  lines: readonly string[];
  facts?: readonly EmailFact[];
  /** Said after the facts. */
  after?: readonly string[];
  button?: { label: string; url: string };
  footer: string;
}

/** The plain text version, for every mail app. */
export function emailText(parts: EmailParts): string {
  const blocks = [
    parts.title,
    ...parts.lines,
    ...(parts.facts?.length ? [parts.facts.map((fact) => `${fact.label}: ${fact.value}`).join('\n')] : []),
    ...(parts.after ?? []),
    ...(parts.button ? [`${parts.button.label}: ${parts.button.url}`] : []),
    parts.footer,
  ];
  return `${blocks.join('\n\n')}\n`;
}

/** The laid out version. */
export function emailHtml(parts: EmailParts): string {
  const c = EMAIL_COLORS;
  const paragraph = (text: string, color: string = c.black) => `<p style="margin:0 0 14px;font:400 16px/1.5 ${FONT};color:${color}">${escapeHtml(text)}</p>`;
  const facts = parts.facts?.length
    ? `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:6px 0 18px;border-collapse:collapse">${parts.facts
        .map(
          (fact) =>
            `<tr><td style="padding:9px 12px 9px 0;border-top:1px solid ${c.line};font:600 14px/1.4 ${FONT};color:${c.graphite};white-space:nowrap;vertical-align:top">${escapeHtml(fact.label)}</td><td style="padding:9px 0;border-top:1px solid ${c.line};font:400 15px/1.4 ${FONT};color:${c.black}">${escapeHtml(fact.value)}</td></tr>`,
        )
        .join('')}</table>`
    : '';
  const button = parts.button
    ? `<p style="margin:8px 0 22px"><a href="${escapeHtml(parts.button.url)}" style="display:inline-block;padding:12px 18px;border-radius:8px;background:${c.black};color:${c.ivory};font:600 15px/1 ${FONT};text-decoration:none">${escapeHtml(parts.button.label)}</a></p>`
    : '';
  return [
    '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">',
    `<title>${escapeHtml(parts.title)}</title></head>`,
    `<body style="margin:0;padding:0;background:${c.ivory}">`,
    `<div style="display:none;max-height:0;overflow:hidden">${escapeHtml(parts.preview)}</div>`,
    `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:${c.ivory}"><tr><td align="center" style="padding:28px 14px">`,
    `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:${c.card};border:1px solid ${c.line};border-radius:14px"><tr><td style="padding:28px 26px">`,
    `<p style="margin:0 0 18px;font:800 15px/1 ${FONT};color:${c.black}">Drishti <span style="font-weight:500;color:${c.slate}">by AdmitLabs</span></p>`,
    `<h1 style="margin:0 0 16px;font:800 22px/1.25 ${FONT};color:${c.black}">${escapeHtml(parts.title)}</h1>`,
    ...parts.lines.map((text) => paragraph(text)),
    facts,
    ...(parts.after ?? []).map((text) => paragraph(text)),
    button,
    `<p style="margin:0;font:400 13px/1.5 ${FONT};color:${c.slate}">${escapeHtml(parts.footer)}</p>`,
    '</td></tr></table></td></tr></table></body></html>',
  ].join('');
}
