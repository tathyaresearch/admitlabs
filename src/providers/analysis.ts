// The AI reader and writer (provider key `ai`) writes text from other data: why a rival's post
// worked, content ideas built on student questions, how to fix a check with a ready fix, the fix
// for a finding, and the Rivals 3 things to do. Real version: Claude API (later). It has its own
// small interface because it does not collect signals.

import type { ProviderMode } from '../config/providers.ts';
import type { InstitutionDetails, ProgramDetails } from '../domain/details.ts';
import type { CheckFacts } from '../domain/facts.ts';
import type { ListingProblem } from '../domain/finding-rules.ts';
import type { ReadyFix } from '../domain/ready-fix.ts';
import type {
  AskTopic,
  CheckKey,
  CheckResult,
  ContentPlatform,
  DemandScope,
  Difficulty,
  FindingKind,
  FindingPlace,
  IdeaFormat,
  Impact,
  InstitutionType,
} from '../domain/types.ts';
import type { AskFact, BrainAnswer } from '../brain/ask.ts';
import type { BrainWriting, FittedIdea, IdeaToFit } from '../brain/writing.ts';
import type { LineFacts } from '../rivals/line.ts';
import type { Opportunity } from '../rivals/opportunities.ts';
import type { RivalContentValue } from './signals.ts';

/** Who the fix is for, and the details they added (never read by scoring), so a ready fix can fill its blanks. */
export interface WritingContext {
  institutionName: string;
  city: string;
  /** Every program the institution offers, by name. */
  programNames: readonly string[];
  institutionDetails: InstitutionDetails | null;
  /** Each program's details, by program name. */
  programDetails: ReadonlyMap<string, ProgramDetails>;
  /** A Client's Brain: its voice and the facts a ready fix can use. Null without one. */
  brain?: BrainWriting | null;
}

export interface FixAdviceInput<K extends CheckKey = CheckKey> {
  checkKey: K;
  result: CheckResult;
  facts: CheckFacts[K];
  institutionType: InstitutionType;
  /** The program, for program checks. */
  programName: string | null;
  /** For the ready fix. Without it the ready fix keeps its blanks. */
  context?: WritingContext;
}

export interface FixAdvice {
  /** Why this matters to a student, in one or two plain sentences. */
  whyItMatters: string;
  /** What to do next, in short steps, one thing each. Empty when the result is already Strong. */
  steps: string[];
  /** The same steps as one paragraph. Null when the result is already Strong. */
  howToFix: string | null;
  /** How hard the fix is. Null when the result is already Strong. */
  difficulty: Difficulty | null;
  /** A text or layout to copy. Null when the result is already Strong. */
  readyFix: ReadyFix | null;
}

export interface FindingFixInput {
  finding: {
    place: FindingPlace;
    kind: FindingKind;
    /** The same finding month after month. */
    key: string;
    line: string;
    /** Where it was found, by name. */
    source: string;
    repeats: number;
    listing: ListingProblem | null;
  };
  institutionType: InstitutionType;
  institutionName: string;
  city: string;
  programNames: readonly string[];
  /** The details the institution added, for a listing's ready fix. */
  details?: { institution: InstitutionDetails | null; program: ProgramDetails | null };
}

export interface FindingFixText {
  /** The fix's name: "Answer the question on Quora". */
  title: string;
  why: string;
  steps: string[];
  readyFix: ReadyFix;
  /** When the writer knows better than the rules (src/domain/finding-rules.ts). */
  impact?: Impact;
  effort?: Difficulty;
}

export interface ContentIdeaInput {
  programKey: string;
  /** The region the questions come from, so ideas fit the place (and its languages). */
  region?: { scope: DemandScope; region: string; state: string | null };
  questions: ReadonlyArray<{ text: string; sourceUrl: string; questionIndex: number | null; topic: AskTopic | null }>;
  /** What students ask about the program, each topic with the question asked most. */
  topics: ReadonlyArray<{ topic: AskTopic; text: string; sourceUrl: string }>;
  /** This month's rising searches, so an idea can say which one it rides on. */
  rising: ReadonlyArray<{ text: string; trendIndex: number | null }>;
}

export interface ContentIdea {
  /** What to make, in a few words. `{institution}` stands for the institution's name: the pull is shared. */
  title: string;
  /** The longer brief. */
  text: string;
  /** The first line, to stop the scroll. May hold `{institution}`. */
  hook: string;
  /** What to cover, 3 or 4 points. */
  points: string[];
  /** The student question the idea is built on. */
  basedOn: string;
  /** Where that question was found. */
  sourceUrl: string;
  /** What the question is about. */
  topic: AskTopic | null;
  /** The rising search behind it, when there is one. */
  trend: string | null;
  /** What to make: a post, a reel, a video, an FAQ or a web page. */
  format: IdeaFormat;
  /** How big a job it is. */
  effort: Difficulty;
}

export interface RivalActionsInput {
  institutionType: InstitutionType;
  /** Already picked and ordered from the rival data (src/rivals/opportunities.ts). */
  opportunities: readonly Opportunity[];
}

export interface RivalLineInput {
  institutionType: InstitutionType;
  /** The institution's city, for "no rival in Guwahati". */
  city: string;
  /** Every rival is in the institution's city (none from a Nearby city). */
  allLocal: boolean;
  /** Who is ahead and on what (src/rivals/line.ts). */
  facts: LineFacts;
}

/** One of the Rivals "3 things to do": a short title, a line on why, and how big a job it is. */
export interface RivalActionText {
  text: string;
  detail: string;
  /** Null for a lesson about a check: the Audit's fix for that check says how big it is. */
  effort: Difficulty | null;
}

export interface AnalysisProvider {
  key: 'ai';
  mode: ProviderMode;
  /** One or two plain sentences on what made a post work. A principle to learn from, never a script to copy. */
  whyItWorked(input: { institutionSlug: string; platform: ContentPlatform; title: string; metrics: RivalContentValue['metrics'] }): Promise<string>;
  /** Content ideas, each built on a real student question, with its source, a hook and key points. */
  contentIdeas(input: ContentIdeaInput): Promise<ContentIdea[]>;
  /** Why a check matters to a student, how to fix it, how hard that is, and a ready fix. Opportunity, never blame. */
  fixAdvice<K extends CheckKey>(input: FixAdviceInput<K>): Promise<FixAdvice>;
  /** The fix for a finding that has something to do, or null when there is nothing to do. */
  findingFix(input: FindingFixInput): Promise<FindingFixText | null>;
  /** The Rivals 3 things to do, one per opportunity, in the same order. Learn, never copy. */
  rivalActions(input: RivalActionsInput): Promise<RivalActionText[]>;
  /** The month's one line about rivals: who is ahead of you, and on what. One plain sentence. */
  rivalLine(input: RivalLineInput): Promise<string>;
  /** Ask the brain: the facts that answer a question, only ever from the Brain, or where to add the answer. */
  answerBrain(input: { question: string; facts: readonly AskFact[] }): Promise<BrainAnswer>;
  /** One of Make these 3, fitted to a Client's brand: the hook in its tone, a Brain fact, nothing it avoids. */
  fitIdea(input: { idea: IdeaToFit; brain: BrainWriting }): Promise<FittedIdea>;
  /** The words of a PDF (a Client's Blueprint), for Ask the brain; null when it cannot read them. */
  readPdf(input: { bytes: Uint8Array }): Promise<string | null>;
}
