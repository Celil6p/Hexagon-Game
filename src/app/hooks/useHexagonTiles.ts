// app/hooks/useHexagonTiles.ts
import { useState, useEffect } from 'react';
import * as THREE from 'three';
import { HexagonTile, HexagonTileProps } from '../components/HexagonTile';
import { GameState, TileData } from '../types/gameTypes';

interface APITileData {
  q: number;
  r: number;
  terrain: string;
}

export const useHexagonTiles = (size: number, tileSize: number, tileHeight: number, mapLevel: number) => {
  const [tiles, setTiles] = useState<HexagonTile[]>([]);
  const [scene] = useState(() => new THREE.Scene());
  const [gameState, setGameState] = useState<GameState | null>(null);

  // Fetch tile data from API
  useEffect(() => {
    const fetchTileData = async () => {
      try {
        const response = await fetch(`http://localhost:8080/procedural/${size}`);
        if (!response.ok) {
          throw new Error('Network response was not ok');
        }
        const apiTileData: APITileData[] = await response.json();
        
        // Convert API data to GameState
        const newGameState: GameState = {
          tiles: apiTileData.map(tile => ({
            ...tile,
            ownerId: null,
            resources: [],  // Add default values for missing properties
            building: null,
            canInteract: true
          } as TileData)),
          players: [] // Assuming no players initially
        };
        
        setGameState(newGameState);
      } catch (error) {
        console.error('Failed to fetch tile data:', error);
      }
    };

    fetchTileData();
  }, [size, mapLevel]);

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
        modelName: getModelNameForTerrain(terrain),
        mapLevel,
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
  }, [gameState, tileSize, tileHeight, scene, mapLevel]);

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

function getModelNameForTerrain(terrain: string): string {
  switch (terrain) {
    case 'grass':
      return 'simple_tile_grass';
    case 'forest':
      return 'simple_tile_forest';
    case 'mountain':
      return 'simple_tile_mountain';
    case 'water':
      return 'simple_tile_water';
    default:
      return 'simple_tile_grass'; // Default to grass if unknown terrain
  }
}