// app/components/HexagonalMap.tsx
'use client';

import React, { useRef, useState } from 'react';
import ThreeJSSceneManager from './ThreeJSSceneManager';
import MapRenderer from './MapRenderer';
import { useHexagonTiles } from '../hooks/useHexagonTiles';
import { HexagonTile } from './HexagonTile';

interface HexagonalMapProps {
  size: number;
  tileSize: number;
  tileHeight: number;
}

const HexagonalMap: React.FC<HexagonalMapProps> = ({ size, tileSize, tileHeight }) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [focusedTile, setFocusedTile] = useState<HexagonTile | null>(null);
  const { tiles, scene } = useHexagonTiles(size, tileSize, tileHeight);

  return (
    <div ref={mountRef} className="w-full h-screen">
      <ThreeJSSceneManager
        mountRef={mountRef}
        scene={scene}
        size={size}
        tileSize={tileSize}
        tileHeight={tileHeight}
      >
        {(camera, cameraPosition) => (
          <MapRenderer
            tiles={tiles}
            focusedTile={focusedTile}
            setFocusedTile={setFocusedTile}
            tileHeight={tileHeight}
            camera={camera}
            cameraPosition={cameraPosition}
          />
        )}
      </ThreeJSSceneManager>
    </div>
  );
};

export default HexagonalMap;