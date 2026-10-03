// Mock analysis: text from a written bank that follows the copy rules. No Claude calls.

import { SAMPLE_CONTENT } from '../../sample/rivals.ts';
import type { AnalysisProvider } from '../analysis.ts';
import { demandFixture, localize, placeWords } from './demand-bank.ts';
import { writeFixAdvice } from './fix-advice.ts';
import { rngFor } from './random.ts';
import { writeRivalAction } from './rival-actions.ts';

const GENERAL_REASONS = [
  'Real people and a clear outcome early on. The idea to take away is showing proof, not the post itself.',
  'It answers a question students already ask, in plain words.',
  'People saved and shared it, which usually means it was useful, not just nice to look at.',
] as const;

export const mockAnalysis: AnalysisProvider = {
  key: 'analysis',
  mode: 'mock',

  async whyItWorked({ institutionSlug, title }) {
    const known = SAMPLE_CONTENT.find((item) => item.slug === institutionSlug && item.title === title);
    if (known) return known.whyItWorked;
    return rngFor('why', institutionSlug, title).pick(GENERAL_REASONS);
  },

  async contentIdeas({ programKey, questions, rising, region }) {
    const fixture = demandFixture(programKey);
    if (!fixture) return [];
    const words = region ? placeWords(region.scope, region.region, region.state) : null;
    return fixture.ideas.flatMap((idea) => {
      const question = questions.find((candidate) => candidate.questionIndex === idea.question);
      const trend = idea.trend === undefined ? null : (rising.find((candidate) => candidate.trendIndex === idea.trend)?.text ?? null);
      return question ? [{ text: words ? localize(idea.text, words) : idea.text, basedOn: question.text, sourceUrl: question.sourceUrl, trend, format: idea.format, effort: idea.effort }] : [];
    });
  },

  async fixAdvice(input) {
    return writeFixAdvice(input);
  },

  async rivalActions({ institutionType, opportunities }) {
    return opportunities.map((item) => writeRivalAction(item, institutionType));
  },
};
