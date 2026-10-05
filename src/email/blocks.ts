// The monthly summary and the Audit ready email, laid out as the version 2 mock was approved: a
// black band with the lockup, then one ivory column of blocks (the month, a title, the three words
// as tiles, lists with a small line under each, buttons, a box), and the footer saying how to turn
// it off. Inline styles only, so every mail app shows it the same way; every word that came from
// outside is escaped. The plain text version says the same. Pure.

import { EMAIL_COLORS, escapeHtml } from './layout.ts';

const FONT = "'Bricolage Grotesque', 'Segoe UI', Arial, sans-serif";
const MUTED = '#5E6066';
/** Numbers that stand on their own, in Inter, as on screen. */
const NUM_FONT = "'Inter', 'Segoe UI', Arial, sans-serif";
const PANEL = '#F2E8D6';

export type EmailBlock =
  | { kind: 'kicker'; text: string }
  | { kind: 'title'; text: string }
  | { kind: 'heading'; text: string }
  | { kind: 'text'; text: string; strong?: string }
  | { kind: 'words'; words: ReadonlyArray<{ name: string; score: number | null; word: string; note: string }> }
  | { kind: 'list'; items: ReadonlyArray<{ title: string; meta: string | null; link?: { label: string; url: string } }> }
  | { kind: 'buttons'; buttons: ReadonlyArray<{ label: string; url: string; quiet?: boolean }> }
  | { kind: 'box'; heading: string; text: string; button: { label: string; url: string } }
  | { kind: 'small'; text: string };

export interface BlockEmail {
  /** The first words a mail app shows beside the subject. */
  preview: string;
  blocks: readonly EmailBlock[];
  footer: string;
}

/** Said at the end of the monthly summary and the Audit ready email. */
export const TURN_OFF_FOOTER = 'You get this as part of your institution’s Drishti. Turn it off in Settings, Notifications. AdmitLabs, hello@admitlabs.in';

function button(label: string, url: string, quiet = false): string {
  const c = EMAIL_COLORS;
  const style = quiet
    ? `display:inline-block;padding:11px 16px;border-radius:8px;border:1px solid ${c.black};color:${c.black};font:600 14px/1 ${FONT};text-decoration:none`
    : `display:inline-block;padding:12px 18px;border-radius:8px;background:${c.black};color:${c.ivory};font:600 15px/1 ${FONT};text-decoration:none`;
  return `<a href="${escapeHtml(url)}" style="${style}">${escapeHtml(label)}</a>`;
}

function blockHtml(block: EmailBlock): string {
  const c = EMAIL_COLORS;
  switch (block.kind) {
    case 'kicker':
      return `<p style="margin:0 0 8px;font:600 13px/1.4 ${FONT};color:${MUTED}">${escapeHtml(block.text)}</p>`;
    case 'title':
      return `<h1 style="margin:0 0 16px;font:800 24px/1.2 ${FONT};color:${c.black}">${escapeHtml(block.text)}</h1>`;
    case 'heading':
      return `<h2 style="margin:24px 0 10px;font:700 16px/1.3 ${FONT};color:${c.black}">${escapeHtml(block.text)}</h2>`;
    case 'text':
      return `<p style="margin:0 0 14px;font:400 15px/1.5 ${FONT};color:${c.black}">${block.strong ? `<strong style="font-weight:700">${escapeHtml(block.strong)}</strong>${block.text ? ' ' : ''}` : ''}${escapeHtml(block.text)}</p>`;
    case 'words':
      return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:4px 0 10px;border-collapse:separate;border-spacing:0"><tr>${block.words
        .map(
          (word, index) =>
            `<td width="33%" style="padding:0 ${index < block.words.length - 1 ? '8px' : '0'} 0 0;vertical-align:top"><div style="padding:12px;border:1px solid ${c.line};border-radius:10px;background:${c.card}"><p style="margin:0;font:600 12px/1.3 ${FONT};color:${MUTED}">${escapeHtml(word.name)}</p>${wordValueHtml(word)}<p style="margin:0;font:400 12px/1.35 ${FONT};color:${MUTED}">${escapeHtml(word.note)}</p></div></td>`,
        )
        .join('')}</tr></table>`;
    case 'list':
      return `<ol style="margin:0 0 8px;padding:0 0 0 22px;font:400 15px/1.5 ${FONT};color:${c.black}">${block.items
        .map(
          (item) =>
            `<li style="margin:0 0 12px"><span style="display:block;font-weight:700">${escapeHtml(item.title)}</span>${item.meta ? `<span style="display:block;font-size:13px;color:${MUTED}">${escapeHtml(item.meta)}</span>` : ''}${item.link ? `<a href="${escapeHtml(item.link.url)}" style="font-size:13px;font-weight:600;color:${c.black};text-decoration:underline">${escapeHtml(item.link.label)}</a>` : ''}</li>`,
        )
        .join('')}</ol>`;
    case 'buttons':
      return `<p style="margin:12px 0 18px">${block.buttons.map((entry) => button(entry.label, entry.url, entry.quiet)).join('&nbsp;&nbsp;')}</p>`;
    case 'box':
      return `<div style="margin:18px 0 14px;padding:16px;border-radius:10px;background:${PANEL}"><h2 style="margin:0 0 8px;font:700 16px/1.3 ${FONT};color:${c.black}">${escapeHtml(block.heading)}</h2><p style="margin:0 0 14px;font:400 15px/1.5 ${FONT};color:${c.black}">${escapeHtml(block.text)}</p>${button(block.button.label, block.button.url, true)}</div>`;
    case 'small':
      return `<p style="margin:0 0 12px;font:400 13px/1.5 ${FONT};color:${MUTED}">${escapeHtml(block.text)}</p>`;
  }
}

/** The laid out version. */
/** A word's tile in an email: its number out of 100 with the word beside it and a thin bar, or the word alone in an old summary. */
function wordValueHtml(word: { score: number | null; word: string }): string {
  const c = EMAIL_COLORS;
  if (word.score === null) return `<p style="margin:4px 0 2px;font:800 20px/1.1 ${FONT};color:${c.black}">${escapeHtml(word.word)}</p>`;
  const share = Math.max(0, Math.min(100, word.score));
  return (
    `<p style="margin:6px 0 6px;font:800 22px/1 ${NUM_FONT};color:${c.black}">${share}<span style="font:500 11px/1 ${NUM_FONT};color:${MUTED}">/100</span>` +
    `<span style="display:inline-block;margin-left:8px;padding:3px 6px;border:1px solid ${c.black};border-radius:4px;font:700 11px/1 ${FONT};color:${c.black};vertical-align:3px">${escapeHtml(word.word)}</span></p>` +
    `<div style="height:4px;margin:0 0 8px;border-radius:2px;background:${c.line}"><div style="width:${share}%;height:4px;border-radius:2px;background:${c.black}"></div></div>`
  );
}

export function blocksHtml(email: BlockEmail): string {
  const c = EMAIL_COLORS;
  const title = email.blocks.find((block) => block.kind === 'title');
  return [
    '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">',
    `<title>${escapeHtml(title?.kind === 'title' ? title.text : 'Drishti')}</title></head>`,
    `<body style="margin:0;padding:0;background:${c.ivory}">`,
    `<div style="display:none;max-height:0;overflow:hidden">${escapeHtml(email.preview)}</div>`,
    `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:${c.ivory}"><tr><td align="center" style="padding:28px 14px">`,
    `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;background:${c.card};border:1px solid ${c.line};border-radius:14px;overflow:hidden">`,
    `<tr><td style="padding:20px 26px;background:${c.black}"><p style="margin:0;font:800 17px/1 ${FONT};color:${c.ivory}">Drishti <span style="font-weight:500;color:${c.slate}">by </span><span style="font-weight:800;color:${c.ivory}">Admit</span><span style="font-weight:400;color:${c.ivory}">Labs</span></p></td></tr>`,
    `<tr><td style="padding:26px">`,
    ...email.blocks.map(blockHtml),
    `</td></tr>`,
    `<tr><td style="padding:16px 26px 22px;border-top:1px solid ${c.line}"><p style="margin:0;font:400 12.5px/1.5 ${FONT};color:${MUTED}">${escapeHtml(email.footer)}</p></td></tr>`,
    '</table></td></tr></table></body></html>',
  ].join('');
}

/** The plain text version, for every mail app. */
export function blocksText(email: BlockEmail): string {
  const lines: string[] = [];
  for (const block of email.blocks) {
    switch (block.kind) {
      case 'kicker':
      case 'title':
      case 'small':
        lines.push(block.text);
        break;
      case 'heading':
        lines.push(block.text.toUpperCase());
        break;
      case 'text':
        lines.push(block.strong ? `${block.strong}${block.text ? ` ${block.text}` : ''}` : block.text);
        break;
      case 'words':
        lines.push(block.words.map((word) => `${word.name}: ${word.score === null ? word.word : `${word.score}/100, ${word.word}`}. ${word.note}`).join('\n'));
        break;
      case 'list':
        lines.push(block.items.map((item, index) => [`${index + 1}. ${item.title}`, item.meta ? `   ${item.meta}` : null, item.link ? `   ${item.link.label}: ${item.link.url}` : null].filter(Boolean).join('\n')).join('\n'));
        break;
      case 'buttons':
        lines.push(block.buttons.map((entry) => `${entry.label}: ${entry.url}`).join('\n'));
        break;
      case 'box':
        lines.push([block.heading, block.text, `${block.button.label}: ${block.button.url}`].join('\n'));
        break;
    }
  }
  lines.push(email.footer);
  return `${lines.join('\n\n')}\n`;
}
