# Arena prepared question bank

`server/arena/questions.ts` supplies 40 original multiple-choice questions: five in each requested category, with 10 authored keys in each of positions A–D. It is a **server-only module**. It is not imported by browser application code and is not a public question-key endpoint. The server must project only `id`, `category`, `difficulty`, `text` and `choices` while a round is open; the answer, explanation and source belong in the closed-round record.

The bank has enough distinct questions for the longest supported match (nine normal rounds plus five bounded sudden-death rounds). Selection without replacement is the match engine's responsibility. No live LLM request creates or grades competitive questions. Prepared questions improve reliability; they do not provide tournament-grade anti-cheat against someone researching facts or reading the server source.

## Verification method and limits

On **26 October 2026**, the implementation agent checked the factual anchors against the 29 primary-source URLs below. Six questions use explicit arithmetic or positional-notation derivations instead. Questions and short explanations were written for this game; source paragraphs, artwork, photographs and rulebook prose were not copied into the bank. This is documented agent source verification, **not independent human editorial certification**. A human reviewer can use this ledger before a public competitive release. The facts deliberately avoid changing officeholders, athlete records, rankings, population counts and disputed superlatives. The basic sports rules still warrant periodic review.

Difficulty labels are editorial `easy`/`medium` estimates, not measured learner difficulty. The server may randomize the authored answer positions again. Question difficulty, category and animation selection never authorize a point; the match engine evaluates the one confirmed key.

## Source ledger

| Question ID | Confirmed answer / verification anchor | Primary source or checked derivation |
| --- | --- | --- |
| gk-science-001 | Mercury occupies the innermost planetary orbit. | [NASA, About the Planets](https://science.nasa.gov/solar-system/planets/), Mercury section. |
| gk-science-002 | Jupiter is the largest solar-system planet. | [NASA, About the Planets](https://science.nasa.gov/solar-system/planets/), Jupiter section. |
| gk-science-003 | Earth is third outward from the Sun. | [NASA, About the Planets](https://science.nasa.gov/solar-system/planets/), Earth section. |
| gk-science-004 | The solar-system star is the Sun. | [NASA, Solar System Facts](https://science.nasa.gov/solar-system/solar-system-facts/), introduction and formation. |
| gk-science-005 | Our system belongs to the Milky Way. | [NASA, Solar System Facts](https://science.nasa.gov/solar-system/solar-system-facts/), introduction. |
| gk-history-001 | Congress adopted the declaration in 1776. | [U.S. National Archives, Declaration milestone](https://www.archives.gov/milestone-documents/declaration-of-independence), adoption dated 4 July; the question does not conflate adoption with signing. |
| gk-history-002 | The Philadelphia Constitution was signed in 1787. | [U.S. National Archives, Constitution milestone](https://www.archives.gov/milestone-documents/constitution), signature date 17 September; ratification is a separate event. |
| gk-history-003 | Apollo 11's lunar landing occurred in 1969. | [NASA, Apollo 11](https://www.nasa.gov/mission/apollo-11/), mission chronology and July 1969 lunar-surface records. |
| gk-history-004 | The Wrights' successful powered flights were in 1903. | [NASA Glenn, Wright Brothers Aircraft](https://www1.grc.nasa.gov/beginners-guide-to-aeronautics/wright-brothers-aircraft/), flights dated 17 December 1903. |
| gk-history-005 | The first Magna Carta was issued in 1215. | [UK Parliament, Magna Carta](https://www.parliament.uk/about/living-heritage/evolutionofparliament/originsofparliament/birthofparliament/overview/magnacarta/), first-version date. |
| gk-geography-001 | Great Wall: China. | [UNESCO World Heritage property 438](https://whc.unesco.org/en/list/438/), country metadata and Chinese historical setting. |
| gk-geography-002 | Taj Mahal: India. | [UNESCO property 252](https://whc.unesco.org/en/list/252/), Agra/India location. |
| gk-geography-003 | Machu Picchu: Peru. | [UNESCO property 274](https://whc.unesco.org/en/list/274/), Peruvian Andes and country metadata. |
| gk-geography-004 | Great Barrier Reef: Australia. | [UNESCO property 154](https://whc.unesco.org/en/list/154/), northeast Australian coast and Queensland location. |
| gk-geography-005 | Fujisan: Japan. | [UNESCO property 1418](https://whc.unesco.org/en/list/1418/), country metadata. |
| gk-mathematics-001 | 56. | Direct derivation: seven groups of eight sum to 56. |
| gk-mathematics-002 | 30. | Direct derivation: 200 × 15 / 100 = 30. |
| gk-mathematics-003 | 29. | Its possible prime divisors up to its square root are 2, 3 and 5, none divides it; distractors 21, 27 and 39 are multiples of 3. |
| gk-mathematics-004 | 5. | Direct derivation: positive square root of 3² + 4² = √25 = 5. |
| gk-mathematics-005 | 8. | Direct derivation: (4 + 8 + 12) / 3 = 24 / 3 = 8. |
| gk-technology-001 | HyperText Markup Language. | [W3C, What is HTML](https://www.w3.org/wiki/HTML/Training/What_is_HTML), acronym and purpose. |
| gk-technology-002 | Cascading Style Sheets. | [W3C CSS Working Group home](https://www.w3.org/Style/CSS/Overview.en.html), acronym and presentation role. |
| gk-technology-003 | Tim Berners-Lee. | [CERN, Where the web was born](https://home.cern/science/computing/the-birth-of-the-web/where-web-was-born/), inventor and 1989 attribution. |
| gk-technology-004 | Seven bits. | [RFC Editor, RFC 20](https://www.rfc-editor.org/info/rfc20/), ASCII code and its enclosing eight-bit transport byte; the question explicitly asks code width. |
| gk-technology-005 | Decimal two. | Direct binary derivation: 1 × 2¹ + 0 × 2⁰ = 2. |
| gk-sports-001 | Eleven, including goalkeeper. | [IFAB Law 3](https://theifab.com/laws/latest/the-players/), section 3.1 maximum on-field team size; bench substitutes are excluded. |
| gk-sports-002 | Sixty-four squares. | [FIDE Laws effective 1 January 2023](https://handbook.fide.com/chapter/E012023), Article 2.1, eight-by-eight board. |
| gk-sports-003 | 42.195 km. | [World Athletics, Marathon](https://worldathletics.org/disciplines/race-walks/marathon), event-distance description. |
| gk-sports-004 | Five players per team normally on court. | [FIBA/WABC Coaches Manual](https://assets.fiba.basketball/image/upload/documents-corporate-wabc-coaches-manual-eng.pdf), basic basketball rules, Playing the Game. This is standard basketball, not the distinct 3x3 format. |
| gk-sports-005 | Five interlaced rings. | [IOC, Olympic rings](https://www.olympics.com/ioc/olympic-rings), Rule 8 definition. No claim is made about a unique continent-count model. |
| gk-art-001 | Leonardo da Vinci. | [Louvre, Mona Lisa/Salle des États](https://www.louvre.fr/en/explore/the-palace/from-the-mona-lisa-to-the-wedding-feast-at-cana), work attribution. |
| gk-art-002 | Vincent van Gogh. | [MoMA collection work 79802](https://www.moma.org/collection/works/79802), artist field. The question does not depend on a disputed exact painting date. |
| gk-art-003 | Katsushika Hokusai. | [Metropolitan Museum, object 45434](https://www.metmuseum.org/art/collection/search/45434), Great Wave artist field. |
| gk-art-004 | Sandro Botticelli. | [Uffizi, Birth of Venus](https://www.uffizi.it/en/artworks/birth-of-venus), artist field. |
| gk-art-005 | Michelangelo Buonarroti. | [Galleria dell'Accademia di Firenze](https://www.galleriaaccademiafirenze.it/), David listing. The particular marble work and museum are specified to exclude other artists' Davids. |
| gk-general-001 | Metre. | [BIPM, International System of Units](https://www.bipm.org/en/measurement-units), base unit associated with length. |
| gk-general-002 | Ampere. | [BIPM, International System of Units](https://www.bipm.org/en/measurement-units), base unit associated with electric current. |
| gk-general-003 | Kelvin. | [BIPM, International System of Units](https://www.bipm.org/en/measurement-units), base temperature unit. Celsius is not the base-unit answer. |
| gk-general-004 | 1945. | [United Nations, UN Day](https://www.un.org/en/observances/un-day), Charter entry into force on 24 October 1945. |
| gk-general-005 | Geneva. | [ICRC, Our history](https://www.icrc.org/en/our-history), founding committee's February 1863 first meeting. |

## Mechanical checks

`bankQuestionSchema` validates prompt/category/difficulty, four distinct choice IDs, four distinct normalized answer texts, exactly one matching correct key, explanation and verification evidence. The bank-level parser rejects repeated question IDs/prompts and validates all 40 entries at server startup. Each public question must be built explicitly: the strict public-question schema rejects an object still containing its answer, explanation or source.

`npm exec -- vitest run tests/unit/arena-questions.test.ts` passed all five focused tests. They check bank coverage and size, key balance, malformed questions, deliberate public projection, and independently recomputed arithmetic. Source verification is separately recorded above: passing schema tests alone does not prove trivia correctness.

No source verification or bank test is proof of internet deployment, two-device connectivity, latency fairness or human acceptance. Those are separate Arena release checks.
