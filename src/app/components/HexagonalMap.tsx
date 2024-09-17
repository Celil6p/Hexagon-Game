// app/components/HexagonalMap.tsx
'use client';

import React, { useRef } from 'react';
import ThreeJSSceneManager from './ThreeJSSceneManager';
import { useHexagonTiles } from '../hooks/useHexagonTiles';

interface HexagonalMapProps {
  size: number;
  tileSize: number;
  tileHeight: number;
}

const HexagonalMap: React.FC<HexagonalMapProps> = ({ size, tileSize, tileHeight }) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const { tiles, scene } = useHexagonTiles(size, tileSize, tileHeight);

  return (
    <div ref={mountRef} className="w-full h-screen">
      <ThreeJSSceneManager
        mountRef={mountRef}
        scene={scene}
        size={size}
        tileSize={tileSize}
        tileHeight={tileHeight}
        tiles={tiles}>
      </ThreeJSSceneManager>
    </div>
  );
};

export default HexagonalMap;