import { z } from 'zod';
import { choiceIdSchema, publicQuestionSchema, type ArenaQuestion } from '../../shared/arena/protocol.js';

/** Server-only answer bank. Never import this module from browser application code. */
export const bankQuestionSchema = publicQuestionSchema.extend({
  correctChoiceId: choiceIdSchema,
  explanation: z.string().trim().min(1).max(1000),
  source: z.string().trim().min(1).max(2000),
}).superRefine((question, context) => {
  if (new Set(question.choices.map(choice => choice.id)).size !== 4) context.addIssue({ code: 'custom', message: 'Every question needs four distinct choice IDs.' });
  const texts = question.choices.map(choice => choice.text.normalize('NFKC').trim().toLocaleLowerCase('en'));
  if (new Set(texts).size !== 4) context.addIssue({ code: 'custom', message: 'Every question needs four distinct answer texts.' });
  if (question.choices.filter(choice => choice.id === question.correctChoiceId).length !== 1) context.addIssue({ code: 'custom', message: 'Exactly one existing choice must be confirmed correct.' });
});
export type BankQuestion = z.infer<typeof bankQuestionSchema>;

type Entry = [id: string, category: ArenaQuestion['category'], difficulty: ArenaQuestion['difficulty'], text: string, answer: string, distractors: [string, string, string], explanation: string, source: string];
const planets = 'https://science.nasa.gov/solar-system/planets/';
const solarSystem = 'https://science.nasa.gov/solar-system/solar-system-facts/';
const units = 'https://www.bipm.org/en/measurement-units';

// Original questions and explanations; sources/derivations checked 26 October 2026.
// Stable subjects deliberately avoid current officeholders, records and changing counts.
const entries: Entry[] = [
  ['gk-science-001', 'Science', 'easy', 'Which planet orbits nearest to the Sun?', 'Mercury', ['Venus', 'Earth', 'Mars'], 'Mercury has the innermost planetary orbit in our solar system.', planets],
  ['gk-science-002', 'Science', 'easy', 'Which is the largest planet in our solar system?', 'Jupiter', ['Earth', 'Saturn', 'Neptune'], 'Jupiter is larger than every other planet in the solar system.', planets],
  ['gk-science-003', 'Science', 'easy', 'Counting outward from the Sun, which planet is third?', 'Earth', ['Mercury', 'Venus', 'Mars'], 'The first three planets in order are Mercury, Venus and Earth.', planets],
  ['gk-science-004', 'Science', 'easy', 'Which star lies at the centre of our solar system?', 'The Sun', ['Sirius', 'Polaris', 'Vega'], 'The planets of our solar system orbit the Sun.', solarSystem],
  ['gk-science-005', 'Science', 'medium', 'Which galaxy contains our solar system?', 'The Milky Way', ['Andromeda', 'The Whirlpool Galaxy', 'The Sombrero Galaxy'], 'Our Sun and its planets are part of the Milky Way galaxy.', solarSystem],

  ['gk-history-001', 'History', 'easy', 'In which year did the Continental Congress adopt the U.S. Declaration of Independence?', '1776', ['1492', '1787', '1812'], 'The declaration was adopted on 4 July 1776; adoption and the later signing were separate events.', 'https://www.archives.gov/milestone-documents/declaration-of-independence'],
  ['gk-history-002', 'History', 'medium', 'In which year was the U.S. Constitution signed at the Philadelphia convention?', '1787', ['1776', '1791', '1804'], 'The convention document was signed on 17 September 1787, before the later ratification process.', 'https://www.archives.gov/milestone-documents/constitution'],
  ['gk-history-003', 'History', 'easy', 'In which year did Apollo 11 first land people on the Moon?', '1969', ['1957', '1961', '1972'], 'Apollo 11 reached the lunar surface in July 1969.', 'https://www.nasa.gov/mission/apollo-11/'],
  ['gk-history-004', 'History', 'medium', 'In which year did the Wright brothers make their successful powered flights at Kitty Hawk?', '1903', ['1889', '1914', '1927'], 'The Wright brothers made their successful powered Flyer flights on 17 December 1903.', 'https://www1.grc.nasa.gov/beginners-guide-to-aeronautics/wright-brothers-aircraft/'],
  ['gk-history-005', 'History', 'medium', 'In which year was the first Magna Carta issued?', '1215', ['1066', '1415', '1649'], 'The first Magna Carta was issued in June 1215; later versions followed.', 'https://www.parliament.uk/about/living-heritage/evolutionofparliament/originsofparliament/birthofparliament/overview/magnacarta/'],

  ['gk-geography-001', 'Geography', 'easy', 'In which country is the Great Wall listed by UNESCO?', 'China', ['India', 'Japan', 'Peru'], 'UNESCO identifies the Great Wall as a Chinese World Heritage property.', 'https://whc.unesco.org/en/list/438/'],
  ['gk-geography-002', 'Geography', 'easy', 'In which country is the Taj Mahal?', 'India', ['Nepal', 'Egypt', 'Thailand'], 'The Taj Mahal stands in Agra, India.', 'https://whc.unesco.org/en/list/252/'],
  ['gk-geography-003', 'Geography', 'easy', 'In which country is Machu Picchu?', 'Peru', ['Mexico', 'Brazil', 'Chile'], 'The historic sanctuary is in the Peruvian Andes.', 'https://whc.unesco.org/en/list/274/'],
  ['gk-geography-004', 'Geography', 'easy', 'The Great Barrier Reef lies off the coast of which country?', 'Australia', ['South Africa', 'Canada', 'Indonesia'], 'The reef is off the northeast coast of Australia, beside Queensland.', 'https://whc.unesco.org/en/list/154/'],
  ['gk-geography-005', 'Geography', 'easy', 'In which country is Mount Fuji, also called Fujisan?', 'Japan', ['China', 'South Korea', 'New Zealand'], 'Fujisan is the Japanese mountain recognised in UNESCO property 1418.', 'https://whc.unesco.org/en/list/1418/'],

  ['gk-mathematics-001', 'Mathematics', 'easy', 'What is 7 multiplied by 8?', '56', ['48', '54', '64'], 'Seven groups of eight total 56.', 'Derivation checked: 7 × 8 = 8 + 8 + 8 + 8 + 8 + 8 + 8 = 56.'],
  ['gk-mathematics-002', 'Mathematics', 'medium', 'What is 15% of 200?', '30', ['15', '20', '35'], 'Multiply 200 by 15/100 to obtain 30.', 'Derivation checked: 200 × 15 ÷ 100 = 30.'],
  ['gk-mathematics-003', 'Mathematics', 'medium', 'Which of these whole numbers is prime?', '29', ['21', '27', '39'], '29 is not divisible by 2, 3 or 5, the primes no larger than its square root. The other choices are divisible by 3.', 'Derivation checked: √29 < 6; trial divisors 2, 3 and 5 fail. 21 = 3 × 7; 27 = 3 × 9; 39 = 3 × 13.'],
  ['gk-mathematics-004', 'Mathematics', 'medium', 'A right triangle has perpendicular sides of length 3 and 4. How long is its hypotenuse?', '5', ['6', '7', '8'], 'The Pythagorean theorem gives the hypotenuse as the square root of 9 + 16.', 'Derivation checked: c² = 3² + 4² = 25; a side length is positive, so c = 5.'],
  ['gk-mathematics-005', 'Mathematics', 'easy', 'What is the arithmetic mean of 4, 8 and 12?', '8', ['6', '9', '12'], 'The sum is 24. Dividing by three numbers gives a mean of 8.', 'Derivation checked: (4 + 8 + 12) ÷ 3 = 24 ÷ 3 = 8.'],

  ['gk-technology-001', 'Technology', 'easy', 'What does HTML stand for?', 'HyperText Markup Language', ['High Transfer Machine Language', 'Hyperlink Text Management Layer', 'Home Tool Markup Library'], 'HTML names the markup language used to structure web pages.', 'https://www.w3.org/wiki/HTML/Training/What_is_HTML'],
  ['gk-technology-002', 'Technology', 'easy', 'What does CSS stand for in web development?', 'Cascading Style Sheets', ['Computer Symbol System', 'Central Script Service', 'Common Structure Syntax'], 'CSS describes presentation such as colours, fonts and spacing on web documents.', 'https://www.w3.org/Style/CSS/Overview.en.html'],
  ['gk-technology-003', 'Technology', 'medium', 'Who invented the World Wide Web at CERN in 1989?', 'Tim Berners-Lee', ['Alan Turing', 'Grace Hopper', 'Ada Lovelace'], 'CERN credits Tim Berners-Lee with inventing the Web there in 1989.', 'https://home.cern/science/computing/the-birth-of-the-web/where-web-was-born/'],
  ['gk-technology-004', 'Technology', 'medium', 'How many bits are used by the standard ASCII character code described in RFC 20?', '7', ['4', '8', '16'], 'The ASCII code uses seven bits. RFC 20 places that code in an eight-bit byte with the highest bit set to zero.', 'https://www.rfc-editor.org/info/rfc20/'],
  ['gk-technology-005', 'Technology', 'easy', 'In binary notation, the number 10 represents which decimal value?', '2', ['1', '8', '10'], 'The left digit occupies the twos place, so binary 10 equals decimal 2.', 'Derivation checked: binary 10 = 1 × 2¹ + 0 × 2⁰ = 2.'],

  ['gk-sports-001', 'Sports', 'easy', 'Under association football Law 3, what is the maximum number of players from one team on the field?', '11', ['9', '10', '12'], 'The maximum is eleven, including the goalkeeper. Substitutes are not extra on-field players.', 'https://theifab.com/laws/latest/the-players/'],
  ['gk-sports-002', 'Sports', 'easy', 'How many squares are on a standard chessboard?', '64', ['36', '81', '100'], 'A standard board has eight rows and eight columns: 8 × 8 = 64 squares.', 'https://handbook.fide.com/chapter/E012023'],
  ['gk-sports-003', 'Sports', 'medium', 'What is the standard marathon distance in kilometres?', '42.195', ['21.0975', '40', '50'], 'The standard marathon distance is 42.195 km.', 'https://worldathletics.org/disciplines/race-walks/marathon'],
  ['gk-sports-004', 'Sports', 'easy', 'In standard basketball, how many players from each team normally play on court at once?', '5', ['4', '6', '7'], 'Each team normally has five players on court; substitutes remain off court until substituted.', 'https://assets.fiba.basketball/image/upload/documents-corporate-wabc-coaches-manual-eng.pdf'],
  ['gk-sports-005', 'Sports', 'easy', 'How many interlaced rings make up the Olympic symbol?', '5', ['4', '6', '7'], 'The Olympic symbol consists of five interlaced rings.', 'https://www.olympics.com/ioc/olympic-rings'],

  ['gk-art-001', 'Art and culture', 'easy', 'Who painted the Mona Lisa?', 'Leonardo da Vinci', ['Claude Monet', 'Pablo Picasso', 'Rembrandt van Rijn'], 'The Louvre attributes the Mona Lisa to Leonardo da Vinci.', 'https://www.louvre.fr/en/explore/the-palace/from-the-mona-lisa-to-the-wedding-feast-at-cana'],
  ['gk-art-002', 'Art and culture', 'easy', 'Who painted The Starry Night?', 'Vincent van Gogh', ['Paul Cézanne', 'Henri Matisse', 'Edvard Munch'], 'MoMA identifies Vincent van Gogh as the artist of The Starry Night.', 'https://www.moma.org/collection/works/79802'],
  ['gk-art-003', 'Art and culture', 'medium', 'Who created the woodblock print commonly called The Great Wave off Kanagawa?', 'Katsushika Hokusai', ['Utagawa Hiroshige', 'Kitagawa Utamaro', 'Ogata Kōrin'], 'The Metropolitan Museum credits this print to Katsushika Hokusai.', 'https://www.metmuseum.org/art/collection/search/45434'],
  ['gk-art-004', 'Art and culture', 'medium', 'Who painted The Birth of Venus held by the Uffizi Galleries?', 'Sandro Botticelli', ['Raphael', 'Titian', 'Caravaggio'], 'The Uffizi catalogue attributes The Birth of Venus to Sandro Botticelli.', 'https://www.uffizi.it/en/artworks/birth-of-venus'],
  ['gk-art-005', 'Art and culture', 'easy', 'Who sculpted the marble David at the Galleria dell’Accademia in Florence?', 'Michelangelo Buonarroti', ['Donatello', 'Gian Lorenzo Bernini', 'Auguste Rodin'], 'The Accademia identifies this particular marble David as Michelangelo’s work; other artists made different Davids.', 'https://www.galleriaaccademiafirenze.it/'],

  ['gk-general-001', 'General knowledge', 'easy', 'What is the SI base unit of length?', 'metre', ['litre', 'gram', 'second'], 'The SI base unit associated with length is the metre, symbol m.', units],
  ['gk-general-002', 'General knowledge', 'medium', 'Which SI base unit measures electric current?', 'ampere', ['volt', 'watt', 'ohm'], 'Electric current has the SI base unit ampere, symbol A.', units],
  ['gk-general-003', 'General knowledge', 'medium', 'Which SI base unit is associated with thermodynamic temperature?', 'kelvin', ['degree Celsius', 'joule', 'pascal'], 'The SI base unit of thermodynamic temperature is the kelvin, symbol K.', units],
  ['gk-general-004', 'General knowledge', 'easy', 'In which year did the United Nations officially come into existence when its Charter took effect?', '1945', ['1919', '1939', '1955'], 'The UN Charter entered into force on 24 October 1945.', 'https://www.un.org/en/observances/un-day'],
  ['gk-general-005', 'General knowledge', 'medium', 'In which Swiss city did the founding committee of the Red Cross first meet in 1863?', 'Geneva', ['Bern', 'Zurich', 'Basel'], 'The committee that became the ICRC first met in Geneva in February 1863.', 'https://www.icrc.org/en/our-history'],
];

/** The authored answer position is balanced; the match engine may shuffle choices again. */
export const questionBank: BankQuestion[] = z.array(bankQuestionSchema).min(14).max(256).superRefine((questions, context) => {
  if (new Set(questions.map(question => question.id)).size !== questions.length) context.addIssue({ code: 'custom', message: 'Question bank IDs must be unique.' });
  if (new Set(questions.map(question => question.text.normalize('NFKC').trim().toLocaleLowerCase('en'))).size !== questions.length) context.addIssue({ code: 'custom', message: 'Question prompts must not be duplicated.' });
}).parse(entries.map(([id, category, difficulty, text, answer, distractors, explanation, source], index) => {
  const answers: string[] = [...distractors];
  const correctIndex = index % 4;
  answers.splice(correctIndex, 0, answer);
  return { id, category, difficulty, text, choices: answers.map((value, position) => ({ id: ['A', 'B', 'C', 'D'][position]!, text: value })), correctChoiceId: ['A', 'B', 'C', 'D'][correctIndex]!, explanation, source };
}));
