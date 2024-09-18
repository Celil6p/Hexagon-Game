// app/components/HexagonalMap.tsx
'use client';

import React, { useCallback, useRef, useState, useEffect } from 'react';
import ThreeJSSceneManager from './ThreeJSSceneManager';
import { useHexagonTiles } from '../hooks/useHexagonTiles';

interface HexagonalMapProps {
  size: number;
  tileSize: number;
  tileHeight: number;
  initialMapLevel: number;
}

const HexagonalMap: React.FC<HexagonalMapProps> = ({ size, tileSize, tileHeight, initialMapLevel }) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [mapLevel, setMapLevel] = useState(initialMapLevel);
  const { tiles, scene } = useHexagonTiles(size, tileSize, tileHeight, mapLevel);

  const handleDescend = useCallback((newMapData: { q: number; r: number; mapLevel: number; parentTile?: { q: number; r: number } }) => {
    console.log(`Data passed to HexagonalMap: newMapData: Level:${newMapData.mapLevel} Parent q:${newMapData.parentTile?.q} r:${newMapData.parentTile?.r}`);
    
    setMapLevel(newMapData.mapLevel);
  }, []);

  useEffect(() => {
    console.log(`Current map level: ${mapLevel}`);
    console.log(`Number of tiles: ${tiles.length}`);
  }, [mapLevel, tiles]);

  return (
    <div ref={mountRef} className="w-full h-screen">
      <ThreeJSSceneManager
        mountRef={mountRef}
        scene={scene}
        size={size}
        tileSize={tileSize}
        tileHeight={tileHeight}
        tiles={tiles}
        mapLevel={mapLevel}
        onDescend={handleDescend}>
      </ThreeJSSceneManager>
    </div>
  );
};

export default HexagonalMap;