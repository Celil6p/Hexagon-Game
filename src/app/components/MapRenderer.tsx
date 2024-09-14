// app/components/MapRenderer.tsx
import React, { useCallback, useEffect, MutableRefObject, useState, useRef } from 'react';
import * as THREE from 'three';
import { HexagonTile } from './HexagonTile';
import gsap from 'gsap';

interface MapRendererProps {
  tiles: HexagonTile[];
  focusedTile: HexagonTile | null;
  setFocusedTile: (tile: HexagonTile | null) => void;
  tileHeight: number;
  camera: THREE.PerspectiveCamera | null;
  cameraPosition: MutableRefObject<THREE.Vector3>;
}

const MapRenderer: React.FC<MapRendererProps> = ({
  tiles,
  focusedTile,
  setFocusedTile,
  tileHeight,
  camera,
  cameraPosition,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const dragStartPosition = useRef(new THREE.Vector2());

  const handleMouseDown = useCallback((event: MouseEvent) => {
    dragStartPosition.current.set(event.clientX, event.clientY);
    setIsDragging(false);
  }, []);

  const handleMouseMove = useCallback((event: MouseEvent) => {
    if (Math.abs(event.clientX - dragStartPosition.current.x) > 5 ||
        Math.abs(event.clientY - dragStartPosition.current.y) > 5) {
      setIsDragging(true);
    }
  }, []);

  const handleClick = useCallback(
    (event: MouseEvent) => {
      if ((event.target as HTMLElement).closest('.ui-element')) return;
      if (isDragging || !camera) return;

      const mouse = new THREE.Vector2();
      mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
      mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(mouse, camera);

      const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
      const intersectionPoint = new THREE.Vector3();
      raycaster.ray.intersectPlane(plane, intersectionPoint);

      const clickedTile = findNearestTile(intersectionPoint, tiles);

      if (clickedTile) {
        focusOnTile(clickedTile);
      }
    },
    [tiles, focusedTile, setFocusedTile, tileHeight, camera, isDragging]
  );

  const findNearestTile = (point: THREE.Vector3, tiles: HexagonTile[]): HexagonTile | null => {
    let nearestTile: HexagonTile | null = null;
    let minDistance = Infinity;

    tiles.forEach(tile => {
      const distance = point.distanceTo(tile.position);
      if (distance < minDistance) {
        minDistance = distance;
        nearestTile = tile;
      }
    });

    return nearestTile;
  };

  const focusOnTile = useCallback((tile: HexagonTile) => {
    if (focusedTile) {
      focusedTile.removeFocusBorder();
    }

    tile.addFocusBorder();
    setFocusedTile(tile);

    if (camera) {
      const targetPosition = new THREE.Vector3();
      tile.getWorldPosition(targetPosition);

      gsap.to(cameraPosition.current, {
        duration: 1,
        x: targetPosition.x,
        z: targetPosition.z - camera.position.y,
        ease: "power2.inOut",
        onUpdate: () => {
          camera.position.copy(cameraPosition.current);
          camera.lookAt(cameraPosition.current.x, 0, cameraPosition.current.z + camera.position.y);
        },
      });
    }
  }, [focusedTile, setFocusedTile, tileHeight, camera, cameraPosition]);

  useEffect(() => {
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('click', handleClick);
    return () => {
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('click', handleClick);
    };
  }, [handleMouseDown, handleMouseMove, handleClick]);

  return null;
};

export default MapRenderer;