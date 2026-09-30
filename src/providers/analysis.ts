// The analysis provider writes text from other data: why a rival's post worked, content
// ideas built on student questions, and later how to fix a check and the 3 things to do.
// Real version: Claude API (later). It has its own small interface because it does not
// collect signals.

import type { ProviderMode } from '../config/providers.ts';
import type { ContentPlatform } from '../domain/types.ts';
import type { RivalContentValue } from './signals.ts';

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

export interface AnalysisProvider {
  key: 'analysis';
  mode: ProviderMode;
  /** One or two plain sentences on what made a post work. A principle to learn from, never a script to copy. */
  whyItWorked(input: { institutionSlug: string; platform: ContentPlatform; title: string; metrics: RivalContentValue['metrics'] }): Promise<string>;
  /** Content ideas, each built on a real student question, with its source. */
  contentIdeas(input: ContentIdeaInput): Promise<ContentIdea[]>;
}
