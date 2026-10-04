// The month's lessons from rivals as rows of the "what to do next" list. A lesson about one of
// your checks opens it on your Audit page; the others open the rival they came from. The rival is
// named only when the lesson itself does not already say who it is.

import type { NextStep } from '@/components/home/NextSteps';
import { checkName, getCheck } from '@/domain/checks';
import { PILLAR_LABELS, type InstitutionType } from '@/domain/types';
import type { ActionRow } from '@/lib/rivals/load';
import { auditFixPath, checkFixKey } from '@/domain/fix-key';

export function lessonSteps(items: readonly ActionRow[], rivalNames: ReadonlyMap<string, string>, institutionType: InstitutionType): NextStep[] {
  return items.map((item) => {
    const rival = item.rivalId ? rivalNames.get(item.rivalId) : undefined;
    const about = item.checkKey ? `${PILLAR_LABELS[getCheck(item.checkKey).pillar]}, ${checkName(item.checkKey, institutionType)}` : 'From their activity';
    const from = rival && !item.text.includes(rival) && !(item.detail ?? '').includes(rival) ? `Seen at ${rival}` : null;
    return {
      key: `${item.rank}-${item.text}`,
      kicker: [about, from].filter(Boolean).join('  ·  '),
      title: item.text,
      detail: item.detail ?? '',
      href: item.checkKey ? auditFixPath(checkFixKey(item.checkKey)) : item.rivalId ? `/rivals/${item.rivalId}` : '/rivals',
    };
  });
}
