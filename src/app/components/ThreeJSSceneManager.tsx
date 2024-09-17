// app/components/CameraControls.tsx
import React, { useRef, useEffect, useState } from "react";
import * as THREE from "three";
import { HexagonTile } from "./HexagonTile";
import MapRenderer from "./MapRenderer";

interface ThreeJSSceneManagerProps {
  mountRef: React.RefObject<HTMLDivElement>;
  scene: THREE.Scene;
  size: number;
  tiles?: HexagonTile[];
  tileSize: number;
  tileHeight: number;

}

const ThreeJSSceneManager: React.FC<ThreeJSSceneManagerProps> = ({
  mountRef,
  scene,
  size,
  tiles,
  tileSize,
  tileHeight,
}) => {
  const [camera, setCamera] = useState<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraPositionRef = useRef(
    new THREE.Vector3(0, size * tileSize, -size * tileSize)
  );
  const isDraggingRef = useRef(false);
  const lastMousePositionRef = useRef(new THREE.Vector2());
  const config = {
    isDevelopment: process.env.NODE_ENV !== "production",
  };

  useEffect(() => {
    THREE.ColorManagement.enabled = true;
    const currentMount = mountRef.current;
    if (!mountRef.current) return;

    const newCamera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    setCamera(newCamera);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: "high-performance",
    });

    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1;
    renderer.setPixelRatio(window.devicePixelRatio);
    mountRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const ambientLightIntensity = config.isDevelopment ? 0.5 : 1.0;
    const directionalLightIntensity = config.isDevelopment ? 0.8 : 1.6;

    const ambientLight = new THREE.AmbientLight(
      0xffffff,
      ambientLightIntensity
    ); // Dev mode renders ligthing twice so dont for get to set this so 1.0 in the production
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(
      0xffffff,
      directionalLightIntensity
    ); // Dev mode renders ligthing twice so dont for get to set this so 1.6 in the production
    directionalLight.position.set(
      size * tileSize,
      size * tileSize,
      size * tileSize
    );
    scene.add(directionalLight);

    // Log lighting setup
    console.log("Lighting setup:", {
      ambientLight: ambientLight.intensity,
      directionalLight: directionalLight.intensity,
      directionalLightPosition: directionalLight.position,
    });

    const addLandscapeSkybox = () => {
      const skyGeometry = new THREE.SphereGeometry(
        size * tileSize * 10,
        64,
        64
      );
      const uniforms = {
        skyColor: { value: new THREE.Color(0x87ceeb) }, // Sky blue
        groundColor: { value: new THREE.Color(0x228b22) }, // Forest green
        horizonColor: { value: new THREE.Color(0xadd8e6) }, // Light blue for horizon
        offset: { value: -0.2 }, // Adjust this to change the size of the green area
        exponent: { value: 0.6 }, // Adjust this to change the smoothness of the transition
      };
      const skyMaterial = new THREE.ShaderMaterial({
        uniforms: uniforms,
        vertexShader: `
      varying vec3 vWorldPosition;
      void main() {
        vec4 worldPosition = modelMatrix * vec4(position, 1.0);
        vWorldPosition = worldPosition.xyz;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
        fragmentShader: `
      uniform vec3 skyColor;
      uniform vec3 groundColor;
      uniform vec3 horizonColor;
      uniform float offset;
      uniform float exponent;
      varying vec3 vWorldPosition;
      void main() {
        float h = normalize(vWorldPosition).y + offset;
        float t = pow(max(0.0, min(1.0, (h * 0.5 + 0.5))), exponent);
        vec3 color = mix(groundColor, horizonColor, smoothstep(0.0, 0.1, t));
        color = mix(color, skyColor, smoothstep(0.1, 1.0, t));
        gl_FragColor = vec4(color, 1.0);
      }
    `,
        side: THREE.BackSide,
      });
      const sky = new THREE.Mesh(skyGeometry, skyMaterial);
      scene.add(sky);
    };

    addLandscapeSkybox();

    const updateCameraPosition = () => {
      const mapSize = size * tileSize;
      const extendedBottomBoundary = mapSize * 3;

      cameraPositionRef.current.x = Math.max(
        -mapSize,
        Math.min(mapSize, cameraPositionRef.current.x)
      );
      cameraPositionRef.current.z = Math.max(
        -extendedBottomBoundary,
        Math.min(mapSize, cameraPositionRef.current.z)
      );

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
      if ((event.target as HTMLElement).closest(".ui-element")) return;
      event.preventDefault();
      isDraggingRef.current = true;
      lastMousePositionRef.current.set(event.clientX, event.clientY);
    };

    const handleMouseMove = (event: MouseEvent) => {
      if (!isDraggingRef.current) return;

      const deltaX = event.clientX - lastMousePositionRef.current.x;
      const deltaY = event.clientY - lastMousePositionRef.current.y;

      const movementSpeed = 0.01;
      const newX = (cameraPositionRef.current.x +=
        deltaX * movementSpeed * cameraPositionRef.current.y);
      const newZ = (cameraPositionRef.current.z +=
        deltaY * movementSpeed * cameraPositionRef.current.y);

      const mapSize = size * tileSize;
      const extendedBottomBoundary = mapSize * 3;

      cameraPositionRef.current.x = Math.max(-mapSize, Math.min(mapSize, newX));
      cameraPositionRef.current.z = Math.max(
        -extendedBottomBoundary,
        Math.min(mapSize, newZ)
      );

      updateCameraPosition();
      lastMousePositionRef.current.set(event.clientX, event.clientY);
    };

    const handleMouseUp = (event: MouseEvent) => {
      event.preventDefault();
      isDraggingRef.current = false;
    };

    const handleWheel = (event: WheelEvent) => {
      if ((event.target as HTMLElement).closest(".ui-element")) return;
      const zoomSpeed = 0.1;
      const zoomDelta = event.deltaY * zoomSpeed;

      const forward = new THREE.Vector3(0, -1, 1).normalize();

      const newPosition = cameraPositionRef.current
        .clone()
        .addScaledVector(forward, zoomDelta);

      const distanceToGround = newPosition.y;

      if (
        distanceToGround > tileSize * 2 &&
        distanceToGround < size * tileSize * 4
      ) {
        cameraPositionRef.current.copy(newPosition);
      }

      updateCameraPosition();
    };

    document.addEventListener("wheel", handleWheel, { passive: false });

    const animate = () => {
      requestAnimationFrame(animate);
      renderer.render(scene, newCamera);
    };

    const handleResize = () => {
      newCamera.aspect = window.innerWidth / window.innerHeight;
      newCamera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };

    window.addEventListener("mousedown", handleMouseDown);
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    window.addEventListener("wheel", handleWheel);
    window.addEventListener("resize", handleResize);

    animate();

    return () => {
      window.removeEventListener("mousedown", handleMouseDown);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      window.removeEventListener("wheel", handleWheel);
      window.removeEventListener("resize", handleResize);

      if (currentMount && renderer.domElement) {
        currentMount.removeChild(renderer.domElement);
      }
      document.removeEventListener("wheel", handleWheel);
    };
  }, [ config.isDevelopment, mountRef, scene, size, tileSize, tileHeight]);

  return (
    <>
      <MapRenderer
        tiles={tiles}
        camera={camera}
        cameraPosition={cameraPositionRef}
        renderer={rendererRef.current}      />
    </>
  );
};

export default ThreeJSSceneManager;
