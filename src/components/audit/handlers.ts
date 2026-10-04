// The server actions behind a fix's buttons, as one object the Audit's client parts take.

import { askFixAction, markFixAction } from '@/app/(dashboard)/actions';
import type { FixActionHandlers } from './FixActions';

export const FixPanelHandlers: FixActionHandlers = { onMark: markFixAction, onAsk: askFixAction };
