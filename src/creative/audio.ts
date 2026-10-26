/* INKBORN original sound compositions/presets. All rights reserved; see ASSETS-LICENSE.md. */

export type AudioCue = 'siegeSigil' | 'chamber' | 'awakening' | 'select' | 'hit' | 'corrupt' | 'recovery' | 'unresolved' | 'victory' | 'scarredVictory' | 'critical' | 'retreat' | 'ink' | 'siegeSlam' | 'siegeStorm' | 'siegeBeam' | 'siegeSweep' | 'siegeFracture' | 'siegeFailure' | 'siegeReport';
export interface CueVoice {
  kind: 'tone' | 'noise';
  frequency: number;
  endFrequency?: number;
  delay: number;
  duration: number;
  gain: number;
  shape?: OscillatorType;
}

/** Original short, restrained alchemical gestures; no recordings or borrowed melodies. */
export const cuePresets: Readonly<Record<AudioCue, readonly CueVoice[]>> = {
  siegeSigil: [
    { kind: 'tone', frequency: 196, endFrequency: 392, delay: 0, duration: .7, gain: .06, shape: 'triangle' },
    { kind: 'tone', frequency: 784, endFrequency: 1175, delay: .65, duration: .5, gain: .045, shape: 'sine' },
    { kind: 'noise', frequency: 2600, delay: 1.2, duration: .3, gain: .1 },
    { kind: 'tone', frequency: 147, endFrequency: 49, delay: 1.2, duration: .45, gain: .12, shape: 'triangle' },
    { kind: 'tone', frequency: 1175, endFrequency: 880, delay: 1.25, duration: 1, gain: .05, shape: 'sine' },
  ],
  chamber: [
    { kind: 'tone', frequency: 49, endFrequency: 48.6, delay: 0, duration: 7, gain: .018, shape: 'sine' },
    { kind: 'tone', frequency: 73.42, endFrequency: 72.9, delay: .6, duration: 6.5, gain: .011, shape: 'sine' },
    { kind: 'tone', frequency: 196, endFrequency: 195, delay: 2, duration: 4, gain: .006, shape: 'sine' },
  ],
  awakening: [
    { kind: 'tone', frequency: 73.42, endFrequency: 146.83, delay: 0, duration: 1.7, gain: .12, shape: 'sine' },
    { kind: 'tone', frequency: 220, delay: .28, duration: 1.3, gain: .07, shape: 'triangle' },
    { kind: 'tone', frequency: 440, delay: .72, duration: .9, gain: .055, shape: 'sine' },
  ],
  select: [
    { kind: 'tone', frequency: 587.33, delay: 0, duration: .19, gain: .09, shape: 'sine' },
    { kind: 'tone', frequency: 880, delay: .035, duration: .23, gain: .04, shape: 'sine' },
  ],
  hit: [
    { kind: 'noise', frequency: 1700, delay: 0, duration: .12, gain: .1 },
    { kind: 'tone', frequency: 160, endFrequency: 52, delay: 0, duration: .21, gain: .14, shape: 'triangle' },
    { kind: 'tone', frequency: 1174.66, delay: .055, duration: .4, gain: .07, shape: 'sine' },
  ],
  corrupt: [
    { kind: 'tone', frequency: 146.83, endFrequency: 82.41, delay: 0, duration: .65, gain: .12, shape: 'triangle' },
    { kind: 'tone', frequency: 155.56, endFrequency: 87.31, delay: .06, duration: .63, gain: .06, shape: 'sine' },
    { kind: 'noise', frequency: 430, delay: .4, duration: .35, gain: .12 },
    { kind: 'tone', frequency: 78, endFrequency: 34, delay: .4, duration: .65, gain: .14, shape: 'triangle' },
    { kind: 'noise', frequency: 2600, delay: .44, duration: .17, gain: .09 },
  ],
  recovery: [
    { kind: 'tone', frequency: 196, endFrequency: 293.66, delay: 0, duration: .48, gain: .09, shape: 'triangle' },
    { kind: 'tone', frequency: 587.33, delay: .36, duration: 1.2, gain: .1, shape: 'sine' },
    { kind: 'tone', frequency: 880, delay: .46, duration: 1, gain: .065, shape: 'sine' },
    { kind: 'noise', frequency: 2400, delay: .36, duration: .28, gain: .1 },
    { kind: 'tone', frequency: 1174.66, delay: .64, duration: 1.2, gain: .055, shape: 'sine' },
  ],
  unresolved: [
    { kind: 'tone', frequency: 130.81, endFrequency: 65.41, delay: 0, duration: .7, gain: .11, shape: 'triangle' },
    { kind: 'noise', frequency: 280, delay: .4, duration: .55, gain: .12 },
    { kind: 'tone', frequency: 65.41, endFrequency: 30, delay: .4, duration: .9, gain: .14, shape: 'triangle' },
    { kind: 'noise', frequency: 1900, delay: .44, duration: .23, gain: .09 },
  ],
  critical: [
    { kind: 'tone', frequency: 55, endFrequency: 49, delay: .7, duration: 1.1, gain: .09, shape: 'sine' },
    { kind: 'tone', frequency: 58.27, endFrequency: 51.91, delay: .75, duration: 1.1, gain: .06, shape: 'sine' },
  ],
  scarredVictory: [
    { kind: 'tone', frequency: 146.83, endFrequency: 196, delay: 0, duration: 1.5, gain: .09, shape: 'triangle' },
    { kind: 'tone', frequency: 293.66, delay: .4, duration: 1.4, gain: .075, shape: 'sine' },
    { kind: 'tone', frequency: 440, delay: .7, duration: 1.2, gain: .07, shape: 'sine' },
    { kind: 'tone', frequency: 587.33, delay: 1, duration: 1.2, gain: .06, shape: 'sine' },
  ],
  victory: [
    { kind: 'tone', frequency: 293.66, delay: 0, duration: 1.25, gain: .09, shape: 'triangle' },
    { kind: 'tone', frequency: 440, delay: .16, duration: 1.1, gain: .075, shape: 'sine' },
    { kind: 'tone', frequency: 587.33, delay: .34, duration: 1, gain: .075, shape: 'sine' },
    { kind: 'tone', frequency: 880, delay: .64, duration: .9, gain: .05, shape: 'sine' },
  ],
  retreat: [
    { kind: 'tone', frequency: 196, endFrequency: 130.81, delay: 0, duration: 1.1, gain: .08, shape: 'triangle' },
    { kind: 'tone', frequency: 146.83, endFrequency: 73.42, delay: .24, duration: 1.05, gain: .07, shape: 'sine' },
    { kind: 'noise', frequency: 350, delay: .18, duration: .55, gain: .04 },
  ],
  // Exam Siege: low anticipation first; the principal impact lands at the scene's
  // 1.2-second action boundary. These are original synthesized gestures.
  siegeSlam: [
    { kind: 'tone', frequency: 48, endFrequency: 88, delay: 0, duration: .85, gain: .075, shape: 'sine' },
    { kind: 'noise', frequency: 650, delay: .65, duration: .43, gain: .06 },
    { kind: 'tone', frequency: 95, endFrequency: 28, delay: 1.2, duration: .7, gain: .14, shape: 'triangle' },
    { kind: 'noise', frequency: 1800, delay: 1.2, duration: .25, gain: .12 },
    { kind: 'tone', frequency: 980, endFrequency: 490, delay: 1.24, duration: .45, gain: .04, shape: 'sine' },
  ],
  siegeStorm: [
    { kind: 'tone', frequency: 520, endFrequency: 1040, delay: 0, duration: .8, gain: .045, shape: 'sine' },
    { kind: 'tone', frequency: 1480, endFrequency: 370, delay: .75, duration: .42, gain: .075, shape: 'triangle' },
    { kind: 'noise', frequency: 2800, delay: 1.2, duration: .32, gain: .11 },
    { kind: 'tone', frequency: 110, endFrequency: 48, delay: 1.2, duration: .4, gain: .12, shape: 'sine' },
    { kind: 'tone', frequency: 1975, endFrequency: 988, delay: 1.35, duration: .3, gain: .045, shape: 'sine' },
  ],
  siegeBeam: [
    { kind: 'tone', frequency: 65, endFrequency: 260, delay: 0, duration: .8, gain: .08, shape: 'triangle' },
    { kind: 'tone', frequency: 131, endFrequency: 524, delay: .1, duration: .85, gain: .035, shape: 'sine' },
    { kind: 'noise', frequency: 850, delay: .75, duration: .8, gain: .075 },
    { kind: 'tone', frequency: 74, endFrequency: 33, delay: 1.2, duration: .8, gain: .13, shape: 'triangle' },
    { kind: 'noise', frequency: 2300, delay: 1.2, duration: .18, gain: .1 },
  ],
  siegeSweep: [
    { kind: 'tone', frequency: 93, endFrequency: 140, delay: 0, duration: .65, gain: .065, shape: 'triangle' },
    { kind: 'noise', frequency: 1400, delay: .65, duration: .55, gain: .075 },
    { kind: 'tone', frequency: 180, endFrequency: 40, delay: 1.2, duration: .45, gain: .13, shape: 'triangle' },
    { kind: 'noise', frequency: 2200, delay: 1.2, duration: .28, gain: .11 },
  ],
  siegeFracture: [
    { kind: 'tone', frequency: 740, delay: .08, duration: .38, gain: .07, shape: 'sine' },
    { kind: 'noise', frequency: 3000, delay: .14, duration: .24, gain: .1 },
    { kind: 'tone', frequency: 1175, endFrequency: 880, delay: .22, duration: .55, gain: .055, shape: 'sine' },
    { kind: 'tone', frequency: 147, endFrequency: 73, delay: .14, duration: .24, gain: .1, shape: 'triangle' },
  ],
  siegeFailure: [
    { kind: 'tone', frequency: 49, endFrequency: 98, delay: 0, duration: .9, gain: .08, shape: 'triangle' },
    { kind: 'noise', frequency: 800, delay: .65, duration: .5, gain: .065 },
    { kind: 'tone', frequency: 82, endFrequency: 25, delay: 1.2, duration: 1.1, gain: .14, shape: 'triangle' },
    { kind: 'noise', frequency: 2600, delay: 1.2, duration: .42, gain: .12 },
    { kind: 'tone', frequency: 622, endFrequency: 155, delay: 1.3, duration: 1.2, gain: .055, shape: 'sine' },
  ],
  siegeReport: [
    { kind: 'noise', frequency: 950, delay: 0, duration: .18, gain: .035 },
    { kind: 'tone', frequency: 261.63, delay: .1, duration: .8, gain: .06, shape: 'sine' },
    { kind: 'tone', frequency: 392, delay: .27, duration: .8, gain: .04, shape: 'sine' },
  ],
  ink: [{ kind: 'noise', frequency: 1150, delay: 0, duration: .055, gain: .035 }],
};
