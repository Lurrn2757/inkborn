import type { Lesson } from '../../shared/schema.js';
import { sampleLessons } from '../../shared/samples.js';
import { battleReducer, createBattle, type BattleState } from '../battle/reducer.js';
import { prepareSprite } from '../drawing/sprite.js';
import { emptyDrawing, type CreatureAsset, type DrawingDocument } from '../drawing/types.js';

export type Screen = 'title' | 'notes' | 'draw' | 'preview' | 'awakening' | 'battle' | 'results';
export type Settings = { muted: boolean; volume: number; motion: 'system' | 'reduced' | 'full' };
export type AppSnapshot = {
  screen: Screen; resumeScreen: Screen | null; lesson: Lesson | null;
  drawing: DrawingDocument; sprite: CreatureAsset | null; battle: BattleState | null;
  error: string | null; preparing: boolean; presenting: boolean; settings: Settings;
};
export class SessionController {
  private state: AppSnapshot = {
    screen: 'title', resumeScreen: null, lesson: null, drawing: emptyDrawing(), sprite: null,
    battle: null, error: null, preparing: false, presenting: false,
    settings: { muted: false, volume: 0.3, motion: 'system' },
  };
  private listeners = new Set<() => void>();
  private epoch = 0;
  private visualTimer: ReturnType<typeof setTimeout> | null = null;
  getSnapshot = (): AppSnapshot => this.state;
  subscribe = (listener: () => void): (() => void) => { this.listeners.add(listener); return () => this.listeners.delete(listener); };
  private update(patch: Partial<AppSnapshot>) {
    this.state = { ...this.state, ...patch };
    this.listeners.forEach(listener => listener());
  }
  setError = (error: string | null) => this.update({ error });
  navigate = (screen: Screen) => this.update({ screen, error: null });
  start = () => {
    this.epoch += 1;
    if (this.visualTimer) clearTimeout(this.visualTimer);
    this.update({ screen: 'notes', resumeScreen: null, lesson: sampleLessons[0] ?? null, drawing: emptyDrawing(), sprite: null, battle: null, error: null, preparing: false, presenting: false });
  };
  chooseLesson = (lesson: Lesson) => this.update({ lesson, sprite: null, battle: null, error: null });
  setDrawing = (drawing: DrawingDocument) => this.update({ drawing, sprite: null, error: null });
  setSprite = (sprite: CreatureAsset) => this.update({ sprite });
  setSettings = (settings: Partial<Settings>) => this.update({ settings: { ...this.state.settings, ...settings } });
  toTitle = () => { if (this.state.screen !== 'title') this.update({ screen: 'title', resumeScreen: this.state.screen === 'results' ? null : this.state.screen }); };
  resume = () => this.update({ screen: this.state.resumeScreen ?? 'notes', error: null });
  prepare = async () => {
    if (this.state.preparing || !this.state.lesson) return;
    const epoch = this.epoch;
    const drawing = this.state.drawing;
    const ids = this.state.lesson.concepts.map(concept => concept.id);
    this.update({ preparing: true, error: null });
    try {
      const sprite = await prepareSprite(drawing, ids);
      if (epoch === this.epoch) this.update({ sprite, screen: 'preview', preparing: false });
    } catch (error) {
      if (epoch === this.epoch) this.update({ preparing: false, error: error instanceof Error ? error.message : 'Your drawing could not be prepared. Please try again.' });
    }
  };
  awaken = () => {
    if (!this.state.lesson || !this.state.sprite) return;
    this.update({ battle: createBattle(this.state.lesson), screen: 'awakening', presenting: false, error: null });
  };
  beginBattle = () => { if (this.state.screen === 'awakening') this.update({ screen: 'battle' }); };
  select = (conceptId: string) => {
    const { battle, lesson } = this.state;
    if (!battle || !lesson || this.state.presenting) return;
    this.update({ battle: battleReducer(battle, { type: 'select', conceptId }, lesson) });
  };
  submit = (questionId: string, conceptId: string, optionId: string, expectedRevision: number) => {
    const { battle, lesson } = this.state;
    if (!battle || !lesson || this.state.presenting) return;
    const next = battleReducer(battle, { type: 'submit', questionId, conceptId, optionId, expectedRevision, now: new Date().toISOString() }, lesson);
    if (next === battle) return;
    this.update({ battle: next, presenting: true });
    const eventId = next.event?.id;
    if (this.visualTimer) clearTimeout(this.visualTimer);
    this.visualTimer = setTimeout(() => {
      if (this.state.battle?.event?.id === eventId) this.update({ presenting: false });
    }, this.state.settings.motion === 'reduced' ? 200 : 1100);
  };
  continueBattle = () => {
    const { battle, lesson } = this.state;
    if (!battle || !lesson || this.state.presenting) return;
    this.update({ battle: battleReducer(battle, { type: 'continue' }, lesson) });
  };
  finish = () => {
    const { battle, lesson } = this.state;
    if (!battle || !lesson || battle.phase !== 'ending') return;
    this.update({ battle: battleReducer(battle, { type: 'finish' }, lesson), screen: 'results', resumeScreen: null });
  };
}
export const session = new SessionController();
