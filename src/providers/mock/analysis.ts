// Mock analysis: text from a written bank that follows the copy rules. No Claude calls.

import { DEMAND_FIXTURES } from '../../sample/demand.ts';
import { SAMPLE_CONTENT } from '../../sample/rivals.ts';
import type { AnalysisProvider } from '../analysis.ts';
import { writeFixAdvice } from './fix-advice.ts';
import { rngFor } from './random.ts';

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

  async contentIdeas({ programKey, questions }) {
    const fixture = DEMAND_FIXTURES[programKey];
    if (!fixture) return [];
    return fixture.ideas.flatMap((idea) => {
      const question = questions.find((candidate) => candidate.questionIndex === idea.question);
      return question ? [{ text: idea.text, basedOn: question.text, sourceUrl: question.sourceUrl }] : [];
    });
  },

  async fixAdvice(input) {
    return writeFixAdvice(input);
  },
};
