import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { createExam, examMetrics, examReducer } from '../../src/exam/engine.js';
import { quickExam } from '../../src/exam/samples.js';
import { clearSiege, loadSiege, newSiegeSave, restoreSiege, saveSiege, type SiegeSave } from '../../src/exam/storage.js';

function readySave(): SiegeSave {
  const save = newSiegeSave(quickExam);
  save.sprite = { id: 'creature', dataUrl: 'data:image/png;base64,AAAA', width: 100, height: 100, hash: 'original', mask: { width: 80, height: 80, cells: [1] }, anchors: [], bounds: { x: 0, y: 0, width: 20, height: 20 } };
  save.keyConfirmed = true;
  save.battle = createExam(save.exam);
  save.stage = 'battle';
  return save;
}
beforeEach(async () => { await clearSiege(); });

describe('Exam Siege durable snapshots', () => {
  it('preserves an independent preparation draft and restores valid in-progress battle inputs', async () => {
    const draft = newSiegeSave(quickExam);
    draft.exam.questions[0]!.correctAnswer = null;
    draft.exam.questions[0]!.keyStatus = 'missing';
    await saveSiege(draft);
    expect(await loadSiege()).toEqual(draft);
    const save = readySave(), q = save.exam.questions[0]!;
    save.battle = examReducer(save.battle!, { type: 'submit', questionId: q.id, answer: q.correctAnswer!, now: '2026-10-26T12:00:00.000Z', expectedRevision: 0 }, save.exam);
    await saveSiege(save);
    expect(await loadSiege()).toEqual(save);
    const corrupt = structuredClone(save);
    corrupt.battle!.answers[0]!.marks = 900;
    corrupt.battle!.answers[0]!.correct = false;
    expect(examMetrics(restoreSiege(corrupt).battle!, save.exam).earned).toBe(1);
  });

  it('queues snapshots in invocation order and captures immutable input at save time', async () => {
    const first = newSiegeSave(quickExam), second = readySave();
    const writes = [saveSiege(first), saveSiege(second)];
    second.exam.title = 'Mutation after save';
    await Promise.all(writes);
    expect((await loadSiege())?.stage).toBe('battle');
    expect((await loadSiege())?.exam.title).toBe(quickExam.title);
    await clearSiege();
    expect(await loadSiege()).toBeNull();
  });

  it('resumes incomplete preparation safely but requires valid content before drawing or graded battle', async () => {
    const draft = newSiegeSave(quickExam);
    draft.exam.title = '';
    draft.exam.passThreshold = 0;
    draft.exam.questions[0]!.text = '';
    draft.exam.questions[0]!.marks = 0;
    draft.exam.questions[0]!.number = '';
    draft.exam.questions[0]!.options = [{ id: 'A', text: '' }];
    draft.exam.questions[0]!.correctAnswer = 'B';
    await saveSiege(draft);
    expect(await loadSiege()).toEqual(draft);
    expect(() => restoreSiege({ ...draft, stage: 'draw' })).toThrow();
    draft.exam.questions = [];
    await saveSiege(draft);
    expect((await loadSiege())!.exam.questions).toEqual([]);
    expect(() => restoreSiege({ ...draft, exam: { ...draft.exam, questions: new Array(301).fill(quickExam.questions[0]) } })).toThrow();
  });

  it('resumes awakening directly in battle rather than replaying progression or cinematic side effects', () => {
    const save = readySave(); save.stage = 'awakening';
    expect(restoreSiege(save)).toMatchObject({ stage: 'battle', battle: { revision: 0, answers: [] } });
  });

  it.each([
    ['missing creature', (save: SiegeSave) => { save.sprite = null; }],
    ['missing answers', (save: SiegeSave) => { save.battle = null; }],
    ['missing confirmed key', (save: SiegeSave) => { save.keyConfirmed = false; }],
    ['unsupported marking', (save: SiegeSave) => { save.markingConfirmed = false; }],
    ['negative image size', (save: SiegeSave) => { save.sprite!.width = -100; }],
    ['foreign image URL', (save: SiegeSave) => { save.sprite!.dataUrl = 'https://example.com/secret'; }],
    ['broken ink mask', (save: SiegeSave) => { save.sprite!.mask.cells = [999999]; }],
    ['invalid drawing cursor', (save: SiegeSave) => { save.drawing.cursor = -1; }],
    ['unfinished final report', (save: SiegeSave) => { save.stage = 'report'; }],
  ] as const)('rejects a malformed or inconsistent saved input: %s', (_name, change) => {
    const save = readySave(); change(save);
    expect(() => restoreSiege(save)).toThrow();
  });

  it('rejects partial rigs, extra fields, incompatible versions and missing confirmation flags', () => {
    const save = readySave();
    expect(() => restoreSiege({ ...save, rig: { leftShoulder: { x: .2, y: .3 } } })).toThrow();
    expect(() => restoreSiege({ ...save, version: 2 })).toThrow();
    expect(() => restoreSiege({ ...save, keyConfirmed: undefined })).toThrow();
    expect(() => restoreSiege({ ...save, arbitraryField: 'not a snapshot' })).toThrow();
  });
});
