import React, { useRef, useEffect, useState, useCallback } from "react";
import * as THREE from "three";
import { HexagonTile } from "./HexagonTile";
import MapRenderer from "./MapRenderer";
import { gsap } from "gsap";
import { Player } from "./Player";


interface ThreeJSSceneManagerProps {
  mountRef: React.RefObject<HTMLDivElement>;
  scene: THREE.Scene;
  size: number;
  tiles: HexagonTile[];
  tileSize: number;
  tileHeight: number;
  mapLevel: number;
  onDescend: (newMapData: {
    q: number;
    r: number;
    mapLevel: number;
    parentTile?: { q: number; r: number };
  }) => void;
  onAscend: (newMapData: {
    mapLevel: number;
    parentTile?: { q: number; r: number };
  }) => void;
}

const ThreeJSSceneManager: React.FC<ThreeJSSceneManagerProps> = ({
  mountRef,
  scene,
  size,
  tiles,
  tileSize,
  tileHeight,
  mapLevel,
  onDescend,
  onAscend,
}) => {
  //Variables

  /************************************************************************************************************************************************** */
  /************************************************************************************************************************************************** */
  /************************************************************************************************************************************************** */

  const [camera, setCamera] = useState<THREE.PerspectiveCamera | null>(null);
  const [currentTiles, setCurrentTiles] = useState<HexagonTile[]>(tiles);
  const [overlayColor, setOverlayColor] = useState("#000000");
  const [player, setPlayer] = useState<Player | null>(null);
  const fadeOverlayRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraPositionRef = useRef(
    new THREE.Vector3(0, size * tileSize, -size * tileSize)
  );
  const isDraggingRef = useRef(false);
  const lastMousePositionRef = useRef(new THREE.Vector2());
  
  // const config = {
  //   isDevelopment: process.env.NODE_ENV !== "production",
  // };

  //Check These Later (Ai Generated)
  /************************************************************************************************************************************************** */
  /************************************************************************************************************************************************** */
  /************************************************************************************************************************************************** */

  const clearScene = useCallback(() => {
    scene.children = scene.children.filter(
      (child) => !(child instanceof HexagonTile)
    );
  }, [scene]);

  const updateScene = useCallback(
    (newTiles: HexagonTile[]) => {
      clearScene();
      newTiles.forEach((tile) => scene.add(tile));
      setCurrentTiles(newTiles);
    },
    [clearScene, scene]
  );

  useEffect(() => {
    updateScene(tiles);
  }, [tiles, updateScene]);

  //Ascend and Descend Logic
  /************************************************************************************************************************************************** */
  /************************************************************************************************************************************************** */
  /************************************************************************************************************************************************** */

  const disposeTiles = useCallback(() => {
    currentTiles.forEach((tile) => {
      tile.dispose();
      scene.remove(tile);
    });
    setCurrentTiles([]);
  }, [currentTiles, scene]);

  const handleDescend = useCallback(
    (newMapData: {
      q: number;
      r: number;
      mapLevel: number;
      parentTile?: { q: number; r: number };
    }) => {
      if (fadeOverlayRef.current && camera) {
        const focusedTile = currentTiles.find(
          (tile) =>
            tile.q === newMapData.parentTile?.q &&
            tile.r === newMapData.parentTile?.r
        );
  
        if (focusedTile) {
          const tilePosition = new THREE.Vector3();
          focusedTile.getWorldPosition(tilePosition);
  
          const tileColor = focusedTile.color || "#000000";
          setOverlayColor(tileColor);
  
          gsap
            .timeline()
            .to(
              camera.position,
              {
                duration: 1,
                x: tilePosition.x,
                y: tilePosition.y + tileSize * 2,
                z: tilePosition.z,
                onUpdate: () => {
                  camera.lookAt(tilePosition);
                },
              },
              0
            )
            .to(
              fadeOverlayRef.current,
              {
                duration: 1,
                opacity: 1,
              },
              0
            )
            .call(() => {
              disposeTiles();
              onDescend(newMapData);
  
              const newPosition = new THREE.Vector3(
                0,
                size * tileSize,
                -size * tileSize
              );
              camera.position.copy(newPosition);
              cameraPositionRef.current = newPosition;
              camera.lookAt(new THREE.Vector3(0, 0, 0));
  
              if (player) {
                player.moveTo(0, 0, new THREE.Vector3(0, player.position.y, 0));
              }
            })
            .call(() => {
              // Wait for the next frame to ensure new tiles are rendered
              requestAnimationFrame(() => {
                gsap.to(fadeOverlayRef.current, {
                  duration: 1,
                  opacity: 0,
                });
              });
            });
        } else {
          console.error("Focused tile not found");
        }
      } else {
        console.error("Fade overlay or camera is not available");
      }
    },
    [camera, size, tileSize, onDescend, currentTiles, player, disposeTiles]
  );
  
  const handleAscend = useCallback(
    (newMapData: {
      mapLevel: number;
      parentTile?: { q: number; r: number };
    }) => {
      if (fadeOverlayRef.current && camera) {
        const parentTilePosition = new THREE.Vector3(
          (newMapData.parentTile?.q || 0) * tileSize * 1.5,
          0,
          (newMapData.parentTile?.r || 0) * tileSize * Math.sqrt(3)
        );
  
        const cameraDirection = new THREE.Vector3();
        camera.getWorldDirection(cameraDirection);
  
        const newCameraPosition = new THREE.Vector3().addVectors(
          parentTilePosition,
          cameraDirection.multiplyScalar(-size * tileSize)
        );
        newCameraPosition.y = size * tileSize;
  
        const tileColor = "#000000";
        setOverlayColor(tileColor);
  
        gsap
          .timeline()
          .to(fadeOverlayRef.current, {
            duration: 1,
            opacity: 1,
          })
          .call(() => {
            disposeTiles();
            console.log("dispose call Ascend");
            onAscend(newMapData);
  
            camera.position.copy(newCameraPosition);
            cameraPositionRef.current = newCameraPosition;
            camera.lookAt(parentTilePosition);
  
            if (player && newMapData.parentTile) {
              player.moveTo(
                newMapData.parentTile.q,
                newMapData.parentTile.r,
                parentTilePosition
              );
            }
          })
          .call(() => {
            // Wait for the next frame to ensure new tiles are rendered
            requestAnimationFrame(() => {
              gsap.to(fadeOverlayRef.current, {
                duration: 1,
                opacity: 0,
              });
            });
          });
      } else {
        console.error("Fade overlay or camera is not available for Ascend");
      }
    },
    [camera, size, tileSize, onAscend, player, disposeTiles]
  );

  // Function to move the player
  /************************************************************************************************************************************************** */
  /************************************************************************************************************************************************** */
  /************************************************************************************************************************************************** */

  const movePlayer = useCallback(
    (targetQ: number, targetR: number) => {
      if (player) {
        const targetTile = currentTiles.find(
          (tile) => tile.q === targetQ && tile.r === targetR
        );
        if (targetTile) {
          const newPosition = new THREE.Vector3(
            targetTile.position.x,
            player.position.y,
            targetTile.position.z
          );
          gsap.to(player.position, {
            duration: 0.5,
            x: newPosition.x,
            z: newPosition.z,
            onComplete: () => {
              player.moveTo(targetQ, targetR, newPosition);
            },
          });
        }
      }
    },
    [player, currentTiles]
  );

  //Scene Loop
  /************************************************************************************************************************************************** */
  /************************************************************************************************************************************************** */
  /************************************************************************************************************************************************** */

  useEffect(() => {
    //Camera and lighting setup
    /************************************************************************************************************************************************** */

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

    if (!rendererRef.current) {
      const renderer = new THREE.WebGLRenderer({
        antialias: true,
        powerPreference: "high-performance",
        alpha: true,
      });
    renderer.setClearColor(0x000000, 0);

    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1;
    renderer.setPixelRatio(window.devicePixelRatio);
    mountRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;
    }

    // const ambientLightIntensity = config.isDevelopment ? 0.5 : 1.0;
    // const directionalLightIntensity = config.isDevelopment ? 0.8 : 1.6;

    const ambientLightIntensity = 0.8;
    const directionalLightIntensity = 1.2;

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

    //Skybox setup
    /************************************************************************************************************************************************** */

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

    // Create and add player
    /************************************************************************************************************************************************** */

    const newPlayer = new Player(0, 0, tileSize);
    scene.add(newPlayer);
    setPlayer(newPlayer);

    //Camera controllers
    /************************************************************************************************************************************************** */

    const updateCameraPosition = () => {
      const mapSize = size * tileSize;
      const extendedTopBoundary = mapSize * 3;
  
      cameraPositionRef.current.x = Math.max(
        -mapSize,
        Math.min(mapSize, cameraPositionRef.current.x)
      );
      cameraPositionRef.current.z = Math.max(
        0,
        Math.min(extendedTopBoundary, cameraPositionRef.current.z)
      );
  
      newCamera.position.copy(cameraPositionRef.current);
  
      const lookAtPoint = new THREE.Vector3(
        cameraPositionRef.current.x,
        0,
        cameraPositionRef.current.z - cameraPositionRef.current.y
      );
  
      newCamera.lookAt(lookAtPoint);
    };
  
    cameraPositionRef.current.set(0, size * tileSize, size * tileSize);
    newCamera.position.copy(cameraPositionRef.current);
    newCamera.lookAt(new THREE.Vector3(0, 0, 0))
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
      const newX = cameraPositionRef.current.x - deltaX * movementSpeed * cameraPositionRef.current.y;
      const newZ = cameraPositionRef.current.z - deltaY * movementSpeed * cameraPositionRef.current.y;

      const mapSize = size * tileSize;
      const extendedBottomBoundary = mapSize * 3;

      cameraPositionRef.current.x = Math.max(-mapSize, Math.min(mapSize, newX));
      cameraPositionRef.current.z = Math.max(
        0,
        Math.min(extendedBottomBoundary, newZ)
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

      const forward = new THREE.Vector3(0, -1, -1).normalize();

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

    const handleResize = () => {
      newCamera.aspect = window.innerWidth / window.innerHeight;
      newCamera.updateProjectionMatrix();
      if(rendererRef.current){
      rendererRef.current.setSize(window.innerWidth, window.innerHeight);
      }
    };

    // 3D object animations
    /************************************************************************************************************************************************** */

    let animationFrameId: number;

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      currentTiles.forEach((tile) => {
        if (tile.update) {
          tile.update();
        }
      });
      if(rendererRef.current){
      rendererRef.current.render(scene, newCamera);
      }
    };

    animate();
    // Event Listeners
    /************************************************************************************************************************************************** */

    window.addEventListener("mousedown", handleMouseDown);
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    window.addEventListener("wheel", handleWheel);
    window.addEventListener("resize", handleResize);

    return () => {
      cancelAnimationFrame(animationFrameId);
    
      window.removeEventListener("mousedown", handleMouseDown);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      window.removeEventListener("wheel", handleWheel);
      window.removeEventListener("resize", handleResize);
    
      // Dispose of the renderer
  if (rendererRef.current) {
    rendererRef.current.dispose();
    if (currentMount && currentMount.contains(rendererRef.current.domElement)) {
      currentMount.removeChild(rendererRef.current.domElement);
    }
    rendererRef.current = null;
  }

  // Dispose of geometries, materials, and textures
  scene.traverse((object) => {
    if (object instanceof THREE.Mesh) {
      if (object.geometry) object.geometry.dispose();
      if (object.material) {
        if (Array.isArray(object.material)) {
          object.material.forEach((material) => material.dispose());
        } else {
          object.material.dispose();
        }
      }
    }
  });

  // Clear the scene
  while (scene.children.length > 0) {
    scene.remove(scene.children[0]);
  }
  // Clear the player
  if (player) {
    scene.remove(player);
  }
  

  // Reset references
  setCamera(null);
  rendererRef.current = null;

    };
  }, [
    mountRef,
    scene,
    size,
    tileSize,
    tileHeight,
    currentTiles,
  ]);

  useEffect(() => {
    currentTiles.forEach((tile) => {
      if (!scene.children.includes(tile)) {
        scene.add(tile);
      }
    });
  }, [currentTiles, scene]);

  return (
    <>
      <div
        ref={fadeOverlayRef}
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          backgroundColor: overlayColor,
          opacity: 0,
          pointerEvents: "none",
          zIndex: 1000,
        }}
      />
      <MapRenderer
        tiles={currentTiles}
        camera={camera}
        cameraPosition={cameraPositionRef}
        renderer={rendererRef.current}
        mapLevel={mapLevel}
        player={player}
        onDescend={handleDescend}
        onAscend={handleAscend}
        onMovePlayer={movePlayer}
      />
    </>
  );
};

export default ThreeJSSceneManager;
