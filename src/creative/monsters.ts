/** INKBORN original generated monster art direction/catalog. Protected; see ASSETS-LICENSE.md. */
export const monsterPresets = [
  { id: 'cathedral-wraith', name: 'The Cathedral Wraith', epithet: 'KEEPER OF THE FORBIDDEN PAPER', description: 'An antler-crowned specter in engraved obsidian, torn scripture and a thousand tiny gilded relics.', src: '/art/monsters/cathedral-wraith.png' },
  { id: 'thorn-devourer', name: 'The Thorn Devourer', epithet: 'HUNGER BENEATH THE THORNS', description: 'A snarling six-limbed nightmare with serrated armor, thorn teeth and a barbed crystal tail.', src: '/art/monsters/thorn-devourer.png' },
  { id: 'abyssal-oracle', name: 'The Abyssal Oracle', epithet: 'THE EYE THAT REMEMBERS', description: 'A cyclopean horror of gilded masks, violet crystal veins and endlessly curling armored tentacles.', src: '/art/monsters/abyssal-oracle.png' },
] as const;
export type MonsterPreset = (typeof monsterPresets)[number];
