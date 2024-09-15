// app/data/dummyGameData.ts

import { GameState, TileData, PlayerData } from '../types/gameTypes';

const generateTiles = (size: number): TileData[] => {
  const tiles: TileData[] = [];
  const terrainTypes = ['grass', 'forest', 'mountain', 'water'];

  for (let q = -size; q <= size; q++) {
    for (let r = Math.max(-size, -q - size); r <= Math.min(size, -q + size); r++) {
      tiles.push({
        q,
        r,
        terrain: terrainTypes[Math.floor(Math.random() * terrainTypes.length)],
        ownerId: null,
        resources: [
          { type: 'wood', amount: Math.floor(Math.random() * 100) },
          { type: 'stone', amount: Math.floor(Math.random() * 50) },
        ],
        building: null,
        canInteract: true,
      });
    }
  }

  return tiles;
};

const dummyPlayers: PlayerData[] = [
  {
    id: '1',
    name: 'Player 1',
    color: '#FF0000',
    resources: [
      { type: 'wood', amount: 100 },
      { type: 'stone', amount: 50 },
      { type: 'gold', amount: 1000 },
    ],
  },
  {
    id: '2',
    name: 'Player 2',
    color: '#0000FF',
    resources: [
      { type: 'wood', amount: 120 },
      { type: 'stone', amount: 60 },
      { type: 'gold', amount: 1200 },
    ],
  },
];

export const generateDummyGameState = (mapSize: number): GameState => {
  return {
    tiles: generateTiles(mapSize),
    players: dummyPlayers,
  };
};