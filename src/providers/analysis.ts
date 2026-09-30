// The analysis provider writes text from other data: why a rival's post worked, content
// ideas built on student questions, how to fix a check, and later the 3 things to do.
// Real version: Claude API (later). It has its own small interface because it does not
// collect signals.

import type { ProviderMode } from '../config/providers.ts';
import type { CheckFacts } from '../domain/facts.ts';
import type { CheckKey, CheckResult, ContentPlatform, Difficulty, InstitutionType } from '../domain/types.ts';
import type { Opportunity } from '../rivals/opportunities.ts';
import type { RivalContentValue } from './signals.ts';

export interface FixAdviceInput<K extends CheckKey = CheckKey> {
  checkKey: K;
  result: CheckResult;
  facts: CheckFacts[K];
  institutionType: InstitutionType;
  /** The program, for program checks. */
  programName: string | null;
}

export interface FixAdvice {
  /** Why this matters to a student, in one or two plain sentences. */
  whyItMatters: string;
  /** What to do next. Null when the result is already Strong. */
  howToFix: string | null;
  /** How hard the fix is. Null when the result is already Strong. */
  difficulty: Difficulty | null;
}

export interface ContentIdeaInput {
  programKey: string;
  questions: ReadonlyArray<{ text: string; sourceUrl: string; questionIndex: number | null }>;
}

export interface ContentIdea {
  text: string;
  /** The student question the idea is built on. */
  basedOn: string;
  /** Where that question was found. */
  sourceUrl: string;
}

export interface RivalActionsInput {
  institutionType: InstitutionType;
  /** Already picked and ordered from the rival data (src/rivals/opportunities.ts). */
  opportunities: readonly Opportunity[];
}

/** One of the Rivals "3 things to do": a short title and a line on why. */
export interface RivalActionText {
  text: string;
  detail: string;
}

export interface AnalysisProvider {
  key: 'analysis';
  mode: ProviderMode;
  /** One or two plain sentences on what made a post work. A principle to learn from, never a script to copy. */
  whyItWorked(input: { institutionSlug: string; platform: ContentPlatform; title: string; metrics: RivalContentValue['metrics'] }): Promise<string>;
  /** Content ideas, each built on a real student question, with its source. */
  contentIdeas(input: ContentIdeaInput): Promise<ContentIdea[]>;
  /** Why a check matters to a student, how to fix it, and how hard that is. Opportunity, never blame. */
  fixAdvice<K extends CheckKey>(input: FixAdviceInput<K>): Promise<FixAdvice>;
  /** The Rivals 3 things to do, one per opportunity, in the same order. Learn, never copy. */
  rivalActions(input: RivalActionsInput): Promise<RivalActionText[]>;
}
