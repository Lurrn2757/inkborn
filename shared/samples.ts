import { createEvidence, hashNotes } from './evidence.js';
import { validateLesson, type Concept, type Question, type Lesson } from './schema.js';

// Original teaching notes and questions, authored for this curated sample.
const notes = `A simple electric circuit needs a closed conducting path from one terminal of a cell, through its components, and back to the other terminal. In a single-loop circuit, opening a switch breaks that path and stops steady current everywhere in the loop. Copper conducts electricity; dry plastic is an insulator. A copper link can complete a gap in the path, while a dry plastic link cannot.

For an ideal resistor at a fixed temperature, Ohm's law is V = I × R. Voltage V is measured in volts, current I in amperes, and resistance R in ohms. Therefore I = V / R: a 6-volt supply across a 3-ohm resistor produces 2 amperes of current. At unchanged resistance, doubling the voltage doubles the current. At unchanged voltage, increasing the resistance reduces the current.

In a series circuit, components share a single path and the same current passes through them. Series resistances add: two 3-ohm resistors in series have a total resistance of 6 ohms. With the same supply voltage, adding a resistor in series reduces the current. Parallel branches provide separate conducting paths across the same two supply terminals. Opening one parallel branch leaves another closed branch able to carry current, assuming the supply remains connected.`;

const pathEvidence = createEvidence(notes, 'block-1', notes.split('\n\n')[0] ?? '', 'circuits-evidence-path');
const ohmEvidence = createEvidence(notes, 'block-2', notes.split('\n\n')[1] ?? '', 'circuits-evidence-ohm');
const branchesEvidence = createEvidence(notes, 'block-3', notes.split('\n\n')[2] ?? '', 'circuits-evidence-branches');

function options(texts: [string, string, string, string]): Question['options'] {
  return texts.map((text, index) => ({ id: `option-${index + 1}`, text }));
}

const concepts: Concept[] = [
  {
    id: 'closed-path',
    label: 'A closed conducting path',
    evidence: [pathEvidence],
    initial: {
      id: 'closed-path-initial', conceptId: 'closed-path', kind: 'initial', difficulty: 'easy',
      prompt: 'A lamp and cell form one loop. What happens to steady current when a switch in that loop is opened?',
      options: options(['It stops throughout the loop.', 'It flows only between the cell and the open switch.', 'It increases throughout the loop.', 'It reverses direction through the lamp.']),
      correctOptionId: 'option-1',
      explanation: 'Opening the switch breaks the only conducting path, so steady current stops everywhere in this single-loop circuit.',
      hint: 'Trace a complete path from one cell terminal to the other. An open switch leaves a gap.',
      evidence: [createEvidence(notes, 'block-1', 'In a single-loop circuit, opening a switch breaks that path and stops steady current everywhere in the loop.', 'closed-path-initial-evidence')],
    },
    followup: {
      id: 'closed-path-followup', conceptId: 'closed-path', kind: 'followup', difficulty: 'easy',
      prompt: 'The only gap in a cell-and-lamp loop can be bridged with either copper or dry plastic. Which choice completes a conducting path?',
      options: options(['Either material will complete it.', 'Dry plastic only.', 'Copper only.', 'Neither material can complete it.']),
      correctOptionId: 'option-3',
      explanation: 'Copper conducts and can bridge the gap. Dry plastic is an insulator, so it does not complete the conducting path.',
      hint: null,
      evidence: [createEvidence(notes, 'block-1', 'Copper conducts electricity; dry plastic is an insulator. A copper link can complete a gap in the path, while a dry plastic link cannot.', 'closed-path-followup-evidence')],
    },
  },
  {
    id: 'ohms-law',
    label: 'Voltage, current and resistance',
    evidence: [ohmEvidence],
    initial: {
      id: 'ohms-law-initial', conceptId: 'ohms-law', kind: 'initial', difficulty: 'medium',
      prompt: 'An ideal 3-ohm resistor is connected across a 6-volt supply. What current flows?',
      options: options(['18 amperes.', '2 amperes.', '0.5 amperes.', '9 amperes.']),
      correctOptionId: 'option-2',
      explanation: "Ohm's law gives I = V / R. Dividing 6 volts by 3 ohms gives 2 amperes.",
      hint: 'Use I = V / R: divide the voltage by the resistance.',
      evidence: [createEvidence(notes, 'block-2', 'Therefore I = V / R: a 6-volt supply across a 3-ohm resistor produces 2 amperes of current.', 'ohms-law-initial-evidence')],
    },
    followup: {
      id: 'ohms-law-followup', conceptId: 'ohms-law', kind: 'followup', difficulty: 'medium',
      prompt: 'A resistor stays at the same resistance and temperature. Its supply voltage doubles. How does the current change?',
      options: options(['It stays the same.', 'It halves.', 'It becomes zero.', 'It doubles.']),
      correctOptionId: 'option-4',
      explanation: 'With resistance unchanged, I = V / R means doubling voltage also doubles current.',
      hint: null,
      evidence: [createEvidence(notes, 'block-2', 'At unchanged resistance, doubling the voltage doubles the current.', 'ohms-law-followup-evidence')],
    },
  },
  {
    id: 'series-parallel',
    label: 'Series and parallel paths',
    evidence: [branchesEvidence],
    initial: {
      id: 'series-parallel-initial', conceptId: 'series-parallel', kind: 'initial', difficulty: 'easy',
      prompt: 'Two lamps occupy separate parallel branches across a connected supply. One branch is opened. What can happen in the other, still-closed branch?',
      options: options(['It must stop conducting because both branches share one path.', 'Its current must reverse.', 'It can continue carrying current.', 'Its resistance must become zero.']),
      correctOptionId: 'option-3',
      explanation: 'Parallel branches provide separate paths. Opening one branch leaves the other closed path available while the supply stays connected.',
      hint: 'Ask whether the other branch still has its own complete path across the supply.',
      evidence: [createEvidence(notes, 'block-3', 'Parallel branches provide separate conducting paths across the same two supply terminals. Opening one parallel branch leaves another closed branch able to carry current, assuming the supply remains connected.', 'series-parallel-initial-evidence')],
    },
    followup: {
      id: 'series-parallel-followup', conceptId: 'series-parallel', kind: 'followup', difficulty: 'medium',
      prompt: 'A second 3-ohm resistor is added in series with a 3-ohm resistor. The supply voltage stays the same. What happens to total resistance and current?',
      options: options(['Resistance becomes 6 ohms and current decreases.', 'Resistance becomes 6 ohms and current increases.', 'Resistance stays 3 ohms and current stays the same.', 'Resistance becomes zero and current stops.']),
      correctOptionId: 'option-1',
      explanation: 'Series resistances add, giving 3 + 3 = 6 ohms. At the same voltage, the greater resistance reduces current.',
      hint: null,
      evidence: [createEvidence(notes, 'block-3', 'Series resistances add: two 3-ohm resistors in series have a total resistance of 6 ohms. With the same supply voltage, adding a resistor in series reduces the current.', 'series-parallel-followup-evidence')],
    },
  },
];

export const sampleLessons: Lesson[] = [validateLesson({
  schemaVersion: 1,
  id: 'sample-electrical-circuits-v1',
  mode: 'sample',
  sampleId: 'electrical-circuits',
  title: 'Electrical circuits',
  notes,
  notesHash: hashNotes(notes),
  preparedAt: '2026-10-18T00:00:00.000Z',
  provider: null,
  model: null,
  concepts,
})];
