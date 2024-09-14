// app/hooks/useHexagonTiles.ts
import { useState, useEffect } from 'react';
import * as THREE from 'three';
import { HexagonTile, HexagonTileProps } from '../components/HexagonTile';

export const useHexagonTiles = (size: number, tileSize: number, tileHeight: number) => {
const [tiles, setTiles] = useState<HexagonTile[]>([]);
const [scene] = useState(() => new THREE.Scene());

useEffect(() => {
const newTiles: HexagonTile[] = [];

for (let q = -size; q <= size; q++) {
  for (let r = Math.max(-size, -q - size); r <= Math.min(size, -q + size); r++) {
    const tileProps: HexagonTileProps = {
      q,
      r,
      size: tileSize,
      height: tileHeight,
      color: getRandomColor(),
    };
    const tile = new HexagonTile(tileProps);
    scene.add(tile);
    newTiles.push(tile);
  }
}

setTiles(newTiles);

// Add lights
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
directionalLight.position.set(1, 1, 1);
scene.add(directionalLight);
}, [size, tileSize, tileHeight, scene]);

return { tiles, scene };
};

function getRandomColor(): string {
const colors = ['#4CAF50', '#2196F3', '#FFC107', '#E91E63', '#9C27B0'];
return colors[Math.floor(Math.random() * colors.length)];
}