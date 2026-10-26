import { validateExam, type Exam, type ExamQuestion } from './engine.js';

/** Original arithmetic exercises. Explanations show the full computation used by the key. */
export function makeSampleExam(count: number, passThreshold = 30): Exam {
  const questions: ExamQuestion[] = Array.from({ length: count }, (_, index) => {
    const n = index + 1, a = n + 2, b = n % 7 + 2;
    let text: string, result: number, explanation: string, topic: string;
    if (index % 4 === 0) {
      text = `Calculate ${a} + ${b}.`; result = a + b; topic = 'Addition';
      explanation = `${a} + ${b} = ${result}. Add the two whole-number quantities.`;
    } else if (index % 4 === 1) {
      text = `A rectangle is ${a} cm long and ${b} cm wide. What is its area in square centimetres?`; result = a * b; topic = 'Area and multiplication';
      explanation = `Rectangle area = length × width = ${a} × ${b} = ${result} cm².`;
    } else if (index % 4 === 2) {
      text = `Solve x + ${b} = ${a + b}. Enter the value of x.`; result = a; topic = 'One-step equations';
      explanation = `Subtract ${b} from both sides: x = ${a + b} − ${b} = ${result}.`;
    } else {
      text = `${a * b} counters are shared equally among ${b} students. How many counters does each student receive?`; result = a; topic = 'Division';
      explanation = `${a * b} ÷ ${b} = ${result}; check: ${result} × ${b} = ${a * b}.`;
    }
    const values = [result, result + 1, result + 3, Math.max(0, result - 1)];
    const offset = index % 4;
    const options = Array.from({ length: 4 }, (_, i) => ({ id: String.fromCharCode(65 + i), text: `${values[(i + offset) % 4]}` }));
    const correctAnswer = options.find(o => o.text === `${result}`)!.id;
    return { id: `arithmetic-${n}`, number: `${n}`, text, options, correctAnswer, marks: count === 5 ? [1, 2, 1, 2, 4][index]! : 1, topic, topicReviewed: true, explanation,
      source: { page: null, label: 'INKBORN original arithmetic sample · worked derivation', evidence: explanation }, keyStatus: 'curated', excluded: false };
  });
  return validateExam({ id: `sample-arithmetic-${count}`, title: count === 5 ? 'Quick Battle · The Arithmetic Sigil' : `Full Examination · ${count} arithmetic questions`, questions, passThreshold, marking: 'positive-only' });
}
export const quickExam = makeSampleExam(5);
export const fullExam = makeSampleExam(30);
export const sampleExams = [quickExam, fullExam, makeSampleExam(50), makeSampleExam(100)];
