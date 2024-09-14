// app/components/CameraControls.tsx
import React, { useRef, useEffect, useState, ReactNode } from 'react';
import * as THREE from 'three';
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface CameraControlsProps {
  mountRef: React.RefObject<HTMLDivElement>;
  scene: THREE.Scene;
  size: number;
  tileSize: number;
  tileHeight: number;
  children: (camera: THREE.PerspectiveCamera | null, cameraPosition: React.MutableRefObject<THREE.Vector3>) => ReactNode;
}

const CameraControls: React.FC<CameraControlsProps> = ({
  mountRef,
  scene,
  size,
  tileSize,
  tileHeight,
  children,
}) => {
  const [camera, setCamera] = useState<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraPositionRef = useRef(new THREE.Vector3(0, size * tileSize, -size * tileSize));
  const isDraggingRef = useRef(false);
  const lastMousePositionRef = useRef(new THREE.Vector2());
  const [quality, setQuality] = useState<'low' | 'medium' | 'high'>('high');

  const setGraphicsQuality = (newQuality: 'low' | 'medium' | 'high') => {
    if (!rendererRef.current) return;

    setQuality(newQuality);
    switch(newQuality) {
      case 'low':
        rendererRef.current.setPixelRatio(1);
        rendererRef.current.toneMapping = THREE.NoToneMapping;
        break;
      case 'medium':
        rendererRef.current.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
        rendererRef.current.toneMapping = THREE.ReinhardToneMapping;
        break;
      case 'high':
        rendererRef.current.setPixelRatio(window.devicePixelRatio);
        rendererRef.current.toneMapping = THREE.ACESFilmicToneMapping;
        break;
    }
    rendererRef.current.setSize(window.innerWidth, window.innerHeight);
  };

  useEffect(() => {
    if (!mountRef.current) return;

    const newCamera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
    setCamera(newCamera);

    const renderer = new THREE.WebGLRenderer({ 
      antialias: true,
      powerPreference: "high-performance"
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMappingExposure = 1;
    mountRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    setGraphicsQuality('high');

    const updateCameraPosition = () => {
      newCamera.position.copy(cameraPositionRef.current);
      
      const lookAtPoint = new THREE.Vector3(
        cameraPositionRef.current.x,
        0,
        cameraPositionRef.current.z + cameraPositionRef.current.y
      );
      
      newCamera.lookAt(lookAtPoint);
    };
    updateCameraPosition();

    const handleMouseDown = (event: MouseEvent) => {
      if ((event.target as HTMLElement).closest('.ui-element')) return;
      event.preventDefault();
      isDraggingRef.current = true;
      lastMousePositionRef.current.set(event.clientX, event.clientY);
    };

    const handleMouseMove = (event: MouseEvent) => {
      if (!isDraggingRef.current) return;
    
      const deltaX = event.clientX - lastMousePositionRef.current.x;
      const deltaY = event.clientY - lastMousePositionRef.current.y;
    
      const movementSpeed = 0.01;
      cameraPositionRef.current.x += deltaX * movementSpeed * cameraPositionRef.current.y;
      cameraPositionRef.current.z += deltaY * movementSpeed * cameraPositionRef.current.y;
    
      updateCameraPosition();
      lastMousePositionRef.current.set(event.clientX, event.clientY);
    };

    const handleMouseUp = (event: MouseEvent) => {
      event.preventDefault();
      isDraggingRef.current = false;
    };

    const handleWheel = (event: WheelEvent) => {
      if ((event.target as HTMLElement).closest('.ui-element')) return;
      const zoomSpeed = 0.1;
      const zoomDelta = event.deltaY * zoomSpeed;
    
      const forward = new THREE.Vector3(0, -1, 1).normalize();
    
      const newPosition = cameraPositionRef.current.clone().addScaledVector(forward, zoomDelta);
    
      const distanceToGround = newPosition.y;
    
      if (distanceToGround > tileSize * 2 && distanceToGround < size * tileSize * 4) {
        cameraPositionRef.current.copy(newPosition);
      }
    
      updateCameraPosition();
    };

    document.addEventListener('wheel', handleWheel, { passive: false });

    const animate = () => {
      requestAnimationFrame(animate);
      renderer.render(scene, newCamera);
    };

    const handleResize = () => {
      newCamera.aspect = window.innerWidth / window.innerHeight;
      newCamera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };

    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('wheel', handleWheel);
    window.addEventListener('resize', handleResize);
    animate();

    return () => {
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('wheel', handleWheel);
      window.removeEventListener('resize', handleResize);
      mountRef.current?.removeChild(renderer.domElement);
      document.removeEventListener('wheel', handleWheel);
    };
  }, [mountRef, scene, size, tileSize, tileHeight]);

  const handleDialogClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  return (
    <>
      {children(camera, cameraPositionRef)}
      <div className="absolute top-4 right-4 ui-element" onClick={handleDialogClick}>
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="outline">Settings</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]" onClick={handleDialogClick}>
            <DialogHeader>
              <DialogTitle>Graphics Settings</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <Button className={`border hover:bg-white hover:text-black ${quality == "low" ? "bg-white text-black":""}`}  onClick={() => setGraphicsQuality('low')}>Low</Button>
              <Button className={`border hover:bg-white hover:text-black ${quality == "medium" ? "bg-white text-black":""}`} onClick={() => setGraphicsQuality('medium')}>Medium</Button>
              <Button className={`border hover:bg-white hover:text-black ${quality == "high" ? "bg-white text-black":""}`} onClick={() => setGraphicsQuality('high')}>High</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </>
  );
};

export default CameraControls;
