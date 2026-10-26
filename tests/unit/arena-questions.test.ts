import { describe, expect, it } from 'vitest';
import { bankQuestionSchema, questionBank } from '../../server/arena/questions.js';
import { categorySchema, publicQuestionSchema } from '../../shared/arena/protocol.js';

describe('Arena server-only prepared question bank', () => {
  it('contains forty distinct validated questions with five in every requested category', () => {
    expect(questionBank).toHaveLength(40);
    expect(new Set(questionBank.map(question => question.id)).size).toBe(40);
    expect(new Set(questionBank.map(question => question.text)).size).toBe(40);
    for (const category of categorySchema.options) expect(questionBank.filter(question => question.category === category)).toHaveLength(5);
    for (const question of questionBank) expect(bankQuestionSchema.safeParse(question).success).toBe(true);
  });

  it('has exactly one confirmed choice per question and balanced authored key positions', () => {
    for (const question of questionBank) {
      expect(new Set(question.choices.map(choice => choice.id)).size).toBe(4);
      expect(new Set(question.choices.map(choice => choice.text.toLocaleLowerCase('en'))).size).toBe(4);
      expect(question.choices.filter(choice => choice.id === question.correctChoiceId)).toHaveLength(1);
      expect(question.explanation.length).toBeGreaterThan(15);
      expect(question.source).toMatch(/^https:\/\/|^Derivation checked:/);
    }
    for (const id of ['A', 'B', 'C', 'D']) expect(questionBank.filter(question => question.correctChoiceId === id)).toHaveLength(10);
  });

  it('rejects duplicate choices, unmatched keys and empty verification evidence', () => {
    const valid = questionBank[0]!;
    expect(bankQuestionSchema.safeParse({ ...valid, choices: Array(4).fill(valid.choices[0]) }).success).toBe(false);
    expect(bankQuestionSchema.safeParse({ ...valid, choices: valid.choices.map(choice => ({ ...choice, text: 'same answer' })) }).success).toBe(false);
    expect(bankQuestionSchema.safeParse({ ...valid, correctChoiceId: 'E' }).success).toBe(false);
    expect(bankQuestionSchema.safeParse({ ...valid, source: '' }).success).toBe(false);
  });

  it('requires deliberate public projection before a bank item can enter the live-question schema', () => {
    for (const question of questionBank) {
      expect(publicQuestionSchema.safeParse(question).success).toBe(false);
      const { id, category, difficulty, text, choices } = question;
      const projected = publicQuestionSchema.parse({ id, category, difficulty, text, choices });
      expect(Object.keys(projected).sort()).toEqual(['category', 'choices', 'difficulty', 'id', 'text']);
      expect(JSON.stringify(projected)).not.toContain('correctChoiceId');
      expect(JSON.stringify(projected)).not.toContain('explanation');
      expect(JSON.stringify(projected)).not.toContain('source');
    }
  });

  it('records exact arithmetic and distinguishes similar historical/artwork questions', () => {
    const answer = (id: string) => { const question = questionBank.find(item => item.id === id)!; return question.choices.find(choice => choice.id === question.correctChoiceId)!.text; };
    expect(answer('gk-mathematics-001')).toBe(`${7 * 8}`);
    expect(answer('gk-mathematics-002')).toBe(`${200 * 15 / 100}`);
    expect(answer('gk-mathematics-004')).toBe(`${Math.hypot(3, 4)}`);
    expect(answer('gk-mathematics-005')).toBe(`${(4 + 8 + 12) / 3}`);
    expect(answer('gk-technology-005')).toBe(`${parseInt('10', 2)}`);
    expect(questionBank.find(question => question.id === 'gk-history-001')!.text).toContain('adopt');
    expect(questionBank.find(question => question.id === 'gk-art-005')!.text).toContain('Galleria');
  });
});
