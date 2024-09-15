// app/hooks/useHexagonTiles.ts
import { useState, useEffect } from 'react';
import * as THREE from 'three';
import { HexagonTile, HexagonTileProps } from '../components/HexagonTile';
import { GameState, TileData } from '../types/gameTypes';
import { generateDummyGameState } from '../data/dummyGameData';

const modelNames = [
  'hex_road_A', 'hex_road_A_sloped_high', 'hex_road_A_sloped_low',
  'hex_road_B', 'hex_road_C', 'hex_road_D', 'hex_road_E', 'hex_road_F',
  'hex_road_G', 'hex_road_H', 'hex_road_I', 'hex_road_J', 'hex_road_K',
  'hex_road_L', 'hex_road_M'
];


export const useHexagonTiles = (size: number, tileSize: number, tileHeight: number) => {
  const [tiles, setTiles] = useState<HexagonTile[]>([]);
  const [scene] = useState(() => new THREE.Scene());
  const [gameState, setGameState] = useState<GameState | null>(null);

  // Generate the game state
  useEffect(() => {
    const newGameState = generateDummyGameState(size);
    setGameState(newGameState);
  }, [size]);

  // Create and update tiles based on game state
  useEffect(() => {
    if (!gameState) return;

    const newTiles: HexagonTile[] = [];

  
    gameState.tiles.forEach((tileData: TileData) => {
      const { q, r, terrain, ownerId } = tileData;
      
      const tileProps: HexagonTileProps = {
        q,
        r,
        size: tileSize,
        height: tileHeight,
        color: getColorForTerrain(terrain, ownerId, gameState.players),
        modelName: modelNames[Math.floor(Math.random() * modelNames.length)],
      };
      
      
      const tile = new HexagonTile(tileProps);
      scene.add(tile);
      newTiles.push(tile);
    });

    setTiles(newTiles);

    // Cleanup function to remove tiles from the scene
    return () => {
      newTiles.forEach(tile => scene.remove(tile));
    };
  }, [gameState, tileSize, tileHeight, scene]);

  return { tiles, scene, gameState };
};

function getColorForTerrain(terrain: string, ownerId: string | null, players: GameState['players']): string {
  if (ownerId) {
    const owner = players.find(player => player.id === ownerId);
    if (owner) return owner.color;
  }

  switch (terrain) {
    case 'grass':
      return '#4CAF50';
    case 'forest':
      return '#2E7D32';
    case 'mountain':
      return '#795548';
    case 'water':
      return '#2196F3';
    default:
      return '#9E9E9E';
  }
}