// The email to the AdmitLabs team when a college answers its Blueprint (spec section 26): it
// approved the version, or asked for changes with a short note. To the Client's managers, or every
// Admin when it has none. Pure.

import { emailHtml, emailText, type EmailParts } from '../email/layout.ts';
import { formatDateTime } from '../domain/format.ts';
import type { EmailMessage } from '../providers/email.ts';

export interface BlueprintReplyInput {
  kind: 'approved' | 'changes';
  college: string;
  version: number;
  fileName: string;
  /** Who answered: their name, or their email. */
  who: string;
  note: string | null;
  at: string;
  /** The Client Brain's Blueprint, in the team area. */
  url: string;
}

export function blueprintReplyParts(input: BlueprintReplyInput): EmailParts {
  const line =
    input.kind === 'approved'
      ? `${input.who} approved the Blueprint, version ${input.version}, for ${input.college}.`
      : `${input.who} asked for changes to the Blueprint, version ${input.version}, for ${input.college}.`;
  return {
    preview: line,
    title: input.kind === 'approved' ? 'The Blueprint is approved' : 'Changes asked for the Blueprint',
    lines: [line, ...(input.note ? [`Their note: ${input.note}`] : [])],
    facts: [
      { label: 'Version', value: `${input.version}, ${input.fileName}` },
      { label: input.kind === 'approved' ? 'Approved' : 'Asked', value: formatDateTime(input.at) },
    ],
    after: input.kind === 'changes' ? ['Upload the next version when it is ready, and share it with them.'] : [],
    button: { label: 'Open the Blueprint', url: input.url },
    footer: 'You get this because you look after this Client, or you are an Admin and it has no Client manager. AdmitLabs team, Drishti.',
  };
}

export function blueprintReplyEmail(input: BlueprintReplyInput, to: readonly string[]): EmailMessage {
  const parts = blueprintReplyParts(input);
  return {
    kind: 'blueprint_reply',
    to,
    subject: input.kind === 'approved' ? `${input.college} approved the Blueprint, version ${input.version}` : `${input.college} asked for changes to the Blueprint, version ${input.version}`,
    text: emailText(parts),
    html: emailHtml(parts),
  };
}
