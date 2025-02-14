// app/hooks/useHexagonTiles.ts
import { useState, useEffect, useCallback, useRef } from 'react';
import * as THREE from 'three';
import { HexagonTile, HexagonTileProps } from '../components/HexagonTile';
import { GameState, TileData } from '../types/gameTypes';
import { useAuthenticatedRequest } from '../utils/api';
import { InstancedMesh } from 'three';


interface APITileData {
  q: number;
  r: number;
  terrain: string;
}

export const useHexagonTiles = (size: number, tileSize: number, tileHeight: number, mapLevel: number) => {
  const [tiles, setTiles] = useState<HexagonTile[]>([]);
  const [scene] = useState(() => new THREE.Scene());
  const [gameState, setGameState] = useState<GameState | null>(null);
  const authenticatedRequest = useAuthenticatedRequest();
  const prevMapLevelRef = useRef(mapLevel);
  const isFetchingRef = useRef(false);
  const isInitialMountRef = useRef(true);
  const instancedMeshesRef = useRef<{ [key: string]: InstancedMesh }>({});


  const fetchTileData = useCallback(async () => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;

    try {
      console.log(`Fetching data for level: ${mapLevel}`);
      const response = await authenticatedRequest(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/maps/procedural/${size}?level=${mapLevel}`);
      if (!response.ok) {
        throw new Error(`Network response was not ok: ${response.status} ${response.statusText}`);
      }
      const data = await response.json();
      console.log('API Response:', data);

      let apiTileData: APITileData[];

      if (Array.isArray(data)) {
        apiTileData = data;
      } else if (typeof data === 'object' && data !== null) {
        if (Array.isArray(data.tiles)) {
          apiTileData = data.tiles;
        } else if (Array.isArray(data.data)) {
          apiTileData = data.data;
        } else {
          console.error('Unexpected data structure. Object keys:', Object.keys(data));
          throw new Error('Unable to find tile data in the API response');
        }
      } else {
        throw new Error(`Unexpected data type: ${typeof data}`);
      }

      const newGameState: GameState = {
        tiles: apiTileData.map(tile => ({
          ...tile,
          ownerId: null,
          resources: [],
          building: null,
          canInteract: true
        } as TileData)),
        players: []
      };
      
      setGameState(newGameState);
    } catch (error) {
      console.error('Failed to fetch tile data:', error);
      // Handle error (e.g., show error message to user)
    } finally {
      isFetchingRef.current = false;
    }
  }, [size, mapLevel, authenticatedRequest]);

  useEffect(() => {
    if (isInitialMountRef.current) {
      console.log('Initial mount, fetching data');
      fetchTileData();
      isInitialMountRef.current = false;
    } else if (prevMapLevelRef.current !== mapLevel) {
      console.log(`Map level changed from ${prevMapLevelRef.current} to ${mapLevel}`);
      fetchTileData();
    }
    prevMapLevelRef.current = mapLevel;
  }, [mapLevel, fetchTileData]);

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

    return () => {
      newTiles.forEach(tile => scene.remove(tile));
    };
  }, [gameState, tileSize, tileHeight, scene, mapLevel]);

  const refreshTiles = useCallback(() => {
    fetchTileData();
  }, [fetchTileData]);

  return { tiles, scene, gameState, refreshTiles };
};


function getColorForTerrain(terrain: string, ownerId: string | null, players: GameState['players']): string {
  if (ownerId) {
    const owner = players.find(player => player.id === ownerId);
    if (owner) return owner.color;
  }

  switch (terrain) {
    case 'grass': return '#4CAF50';
    case 'forest': return '#2E7D32';
    case 'mountain': return '#795548';
    case 'water': return '#2196F3';
    default: return '#9E9E9E';
  }
}

function getModelNameForTerrain(terrain: string): string {
  switch (terrain) {
    case 'grass': return 'simple_tile_grass';
    case 'forest': return 'simple_tile_forest';
    case 'mountain': return 'simple_tile_mountain';
    case 'water': return 'simple_tile_water';
    default: return 'simple_tile_grass';
  }
}