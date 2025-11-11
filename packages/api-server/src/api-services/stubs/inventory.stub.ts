export const RapidApiPokemonSearchStub = [
  {
    id: 'base1-4',
    nome: 'Charizard',
    serie: 'Base',
    setName: 'Base Set',
    setCode: 'BASE',
    collectorNumber: '4/102',
    rarity: 'Holo Rare',
    supertype: 'Pokémon',
    subtypes: ['Stage 2'],
    smallImageUrl: 'https://images.pokemontcg.io/base1/4.png',
    largeImageUrl: 'https://images.pokemontcg.io/base1/4_hires.png',
    raw: {
      hp: '120',
      types: ['Fire'],
      evolvesFrom: 'Charmeleon',
    },
  },
  {
    id: 'sv3pt5-35',
    nome: 'Squirtle',
    serie: 'Scarlet & Violet',
    setName: '151',
    setCode: 'SV3pt5',
    collectorNumber: '35/165',
    rarity: 'Common',
    supertype: 'Pokémon',
    subtypes: ['Basic'],
    smallImageUrl: 'https://images.pokemontcg.io/sv3pt5/35.png',
    largeImageUrl: 'https://images.pokemontcg.io/sv3pt5/35_hires.png',
    raw: {
      hp: '70',
      types: ['Water'],
    },
  },
];

export const JustTcgPriceHistoryStub = {
  cardId: 'base1-4',
  currency: 'USD',
  points: [
    { date: '2024-12-01', low: 350.0, mid: 420.0, high: 500.0 },
    { date: '2024-12-08', low: 360.0, mid: 430.0, high: 520.0 },
    { date: '2024-12-15', low: 355.0, mid: 440.0, high: 530.0 },
  ],
};

export const RoboflowScanStub = {
  image: 'scan-placeholder',
  predictions: [
    {
      cardDefinitionId: 'base1-4',
      confidence: 0.92,
      boundingBox: { x: 0.5, y: 0.5, width: 0.4, height: 0.6 },
      label: 'Charizard',
    },
    {
      cardDefinitionId: 'sv3pt5-35',
      confidence: 0.61,
      boundingBox: { x: 0.2, y: 0.6, width: 0.35, height: 0.55 },
      label: 'Squirtle',
    },
  ],
};
