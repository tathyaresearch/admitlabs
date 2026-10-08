// Mock AI writer: text from a written bank that follows the copy rules. No Claude calls.

import { matchQuestion } from '../../brain/ask.ts';
import { fitIdea } from '../../brain/writing.ts';
import { SAMPLE_CONTENT } from '../../sample/rivals.ts';
import type { AnalysisProvider, ContentIdea } from '../analysis.ts';
import { demandFixture, localize, placeWords } from './demand-bank.ts';
import { writeFindingFix } from './finding-fix.ts';
import { writeFixAdvice } from './fix-advice.ts';
import { rngFor } from './random.ts';
import { writeReadyFix } from './ready-fix.ts';
import { writeRivalAction, writeRivalLine } from './rival-actions.ts';

const GENERAL_REASONS = [
  'Real people and a clear outcome early on. The idea to take away is showing proof, not the post itself.',
  'It answers a question students already ask, in plain words.',
  'People saved and shared it, which usually means it was useful, not just nice to look at.',
] as const;

export const mockAnalysis: AnalysisProvider = {
  key: 'ai',
  mode: 'mock',

  async whyItWorked({ institutionSlug, title }) {
    const known = SAMPLE_CONTENT.find((item) => item.slug === institutionSlug && item.title === title);
    if (known) return known.whyItWorked;
    return rngFor('why', institutionSlug, title).pick(GENERAL_REASONS);
  },

  async contentIdeas({ programKey, questions, topics, rising, region }) {
    const fixture = demandFixture(programKey);
    if (!fixture) return [];
    const words = region ? placeWords(region.scope, region.region, region.state) : null;
    const local = (text: string) => (words ? localize(text, words) : text);
    return fixture.ideas.flatMap((idea): ContentIdea[] => {
      // Each idea stands on a question students asked this month: one of the program's questions, or a topic's top one.
      const question = idea.question === undefined ? undefined : questions.find((candidate) => candidate.questionIndex === idea.question);
      const topic = idea.topic === undefined ? undefined : topics.find((candidate) => candidate.topic === idea.topic);
      const basis = question ? { text: question.text, sourceUrl: question.sourceUrl, topic: question.topic } : topic;
      if (!basis) return [];
      const trend = idea.trend === undefined ? null : (rising.find((candidate) => candidate.trendIndex === idea.trend)?.text ?? null);
      return [
        {
          title: local(idea.title),
          text: local(idea.text),
          hook: local(idea.hook),
          points: idea.points.map(local),
          basedOn: basis.text,
          sourceUrl: basis.sourceUrl,
          topic: basis.topic,
          trend,
          format: idea.format,
          effort: idea.effort,
        },
      ];
    });
  },

  async fixAdvice(input) {
    const advice = writeFixAdvice(input);
    if (input.result === 'strong') return { ...advice, readyFix: null };
    const context = input.context;
    const readyFix = writeReadyFix(input.checkKey, {
      institutionName: context?.institutionName ?? 'your institution',
      city: context?.city ?? 'your city',
      institutionType: input.institutionType,
      programNames: context?.programNames ?? [],
      programName: input.programName,
      institutionDetails: context?.institutionDetails ?? null,
      programDetails: input.programName ? (context?.programDetails.get(input.programName) ?? null) : null,
      brain: context?.brain ?? null,
    });
    return { ...advice, readyFix };
  },

  async findingFix(input) {
    return writeFindingFix(input);
  },

  async rivalActions({ institutionType, opportunities }) {
    return opportunities.map((item) => writeRivalAction(item, institutionType));
  },

  async rivalLine(input) {
    return writeRivalLine(input);
  },

  async answerBrain({ question, facts }) {
    return matchQuestion(question, facts);
  },

  async fitIdea({ idea, brain }) {
    return fitIdea(idea, brain);
  },
};
