// app/components/MapRenderer.tsx
import React, {
  useCallback,
  useEffect,
  MutableRefObject,
  useState,
  useRef,
} from "react";
import * as THREE from "three";
import { HexagonTile } from "./HexagonTile";
import { Player } from "./Player";
import gsap from "gsap";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";

interface MapRendererProps {
  tiles: HexagonTile[];
  camera: THREE.PerspectiveCamera | null;
  cameraPosition: MutableRefObject<THREE.Vector3> | null;
  renderer: THREE.WebGLRenderer | null;
  mapLevel: number;
  player: Player | null;
  onMovePlayer: (q: number, r: number) => void;
  onDescend: (newMapData: { q: number; r: number; mapLevel: number; parentTile?: { q: number; r: number } }) => void;
  onAscend: (newMapData: { mapLevel: number; parentTile?: { q: number; r: number } }) => void;
}

const MapRenderer: React.FC<MapRendererProps> = ({
  tiles,
  camera,
  cameraPosition,
  renderer,
  mapLevel,
  player,
  onMovePlayer,
  onDescend,
  onAscend
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const dragStartPosition = useRef(new THREE.Vector2());
  const [infoBarOpen, setInfoBarOpen] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [focusedTile, setFocusedTile] = useState<HexagonTile | null>(null);
  const [quality, setQuality] = useState<"low" | "medium" | "high">("high");


  const handleMouseDown = useCallback((event: MouseEvent) => {
    dragStartPosition.current.set(event.clientX, event.clientY);
    setIsDragging(false);
  }, []);

  const handleMouseMove = useCallback((event: MouseEvent) => {
    if (
      Math.abs(event.clientX - dragStartPosition.current.x) > 5 ||
      Math.abs(event.clientY - dragStartPosition.current.y) > 5
    ) {
      setIsDragging(true);
    }
  }, []);

  const focusOnTile = useCallback(
    (tile: HexagonTile) => {
      if (focusedTile) {
        focusedTile.removeFocusBorder();
      }
  
      tile.addFocusBorder();
      setFocusedTile(tile);
      setInfoBarOpen(true);
  
      if (camera && cameraPosition) {
        const targetPosition = new THREE.Vector3();
        tile.getWorldPosition(targetPosition);
        gsap.to(cameraPosition.current, {
          duration: 1,
          x: targetPosition.x,
          z: targetPosition.z + camera.position.y, // Changed from - to +
          ease: "power2.inOut",
          onUpdate: () => {
            camera.position.copy(cameraPosition.current);
            camera.lookAt(
              cameraPosition.current.x,
              0,
              cameraPosition.current.z - camera.position.y // Changed from + to -
            );
          },
        });
      }
    },
    [focusedTile, setInfoBarOpen, camera, cameraPosition]
  );

  const moveToTile = useCallback((tile: HexagonTile) => {
    
    if (player) {
      const playerCoords = player.getCoordinates();
      const distance = Math.max(
        Math.abs(tile.q - playerCoords.q),
        Math.abs(tile.r - playerCoords.r),
        Math.abs(tile.q + tile.r - playerCoords.q - playerCoords.r)
      );

      if (distance < 4) {
        onMovePlayer(tile.q, tile.r);
      } else {
        console.log("Can't move there - too far!");
      }
    }
  }, [player, onMovePlayer]);

  const findNearestTile = (point: THREE.Vector3, tiles?: HexagonTile[]): HexagonTile | null => {
    if (!tiles || tiles.length === 0) return null;
  
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

  const handleClick = useCallback(
    (event: MouseEvent) => {

      if ((event.target as HTMLElement).closest('.ui-element')) return;
      if (isDragging || !camera || !tiles || tiles.length === 0) return;
  
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
        moveToTile(clickedTile);
        focusOnTile(clickedTile);        
        if(clickedTile == focusedTile){
          setDialogOpen(true);
        }
      } else {
        if (focusedTile) {
          focusedTile.reset();
          setFocusedTile(null);
          setInfoBarOpen(false);
          setDialogOpen(false);
        }
      }
    },
    [tiles, camera, isDragging, focusOnTile, focusedTile, setFocusedTile, setInfoBarOpen, setDialogOpen, moveToTile]
  );

  const handleDescend = useCallback(() => {
    console.log("Descend Pressed");
    
    if (focusedTile && mapLevel > 1) {
      const selectedTile = tiles.find(tile => tile.q === focusedTile.q && tile.r === focusedTile.r);
      
      if (selectedTile) {
        console.log("Selected Tile Recognized");
        const newMapLevel = Math.max(selectedTile.mapLevel - 1, 1);
        const newMapData = {
          q: 0,
          r: 0,
          mapLevel: newMapLevel,
          parentTile: { q: selectedTile.q, r: selectedTile.r }
        };
        onDescend(newMapData);
        //setCurrentMapLevel(newMapLevel);
      }
    }
    setFocusedTile(null);
    setInfoBarOpen(false);
  }, [focusedTile, tiles, onDescend, mapLevel]);

  const handleAscend = useCallback(() => {
    console.log("Ascend Pressed");
    
    if (focusedTile && mapLevel < 4) {  // Check if we're not at the maximum level
      const selectedTile = tiles.find(tile => tile.q === focusedTile.q && tile.r === focusedTile.r);
      
      if (selectedTile) {
        console.log("Selected Tile Recognized");
        const newMapLevel = Math.min(mapLevel + 1, 4);  // Increase level, but cap at 4
        const newMapData = {
          mapLevel: newMapLevel,
          parentTile: { q: selectedTile.q, r: selectedTile.r }
        };
        onAscend(newMapData);
      }
    }
    setInfoBarOpen(false);
  }, [focusedTile, tiles, onAscend, mapLevel]);

  const setGraphicsQuality = (newQuality: "low" | "medium" | "high") => {
    if (!renderer) return;

    setQuality(newQuality);
    switch (newQuality) {
      case "low":
        renderer.setPixelRatio(1);
        renderer.toneMapping = THREE.NoToneMapping;
        break;
      case "medium":
        renderer.setPixelRatio(
          Math.min(window.devicePixelRatio, 1.5)
        );
        renderer.toneMapping = THREE.ReinhardToneMapping;
        break;
      case "high":
        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        break;
    }
    renderer.setSize(window.innerWidth, window.innerHeight);
  };

  useEffect(() => {
    if (!tiles || tiles.length === 0) return;
  
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('click', handleClick);
    return () => {
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('click', handleClick);
    };
  }, [handleMouseDown, handleMouseMove, handleClick, tiles]);

  return <>
  <div className="absolute top-4 right-4 ui-element" onClick={(e) => e.stopPropagation()}>  
  <p>Player position: Q:{player?.getCoordinates().q}, R:{player?.getCoordinates().r}</p>     
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="outline" className="text-white hover:text-black">
              Settings
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]  bg-white/75" onClick={(e) => e.stopPropagation()}>
            <DialogHeader>
              <DialogTitle>Graphics Settings</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <Button
                className={`border hover:bg-white hover:text-black ${
                  quality == "low" ? "bg-white text-black" : ""
                }`}
                onClick={() => setGraphicsQuality("low")}
              >
                Low
              </Button>
              <Button
                className={`border hover:bg-white hover:text-black ${
                  quality == "medium" ? "bg-white text-black" : ""
                }`}
                onClick={() => setGraphicsQuality("medium")}
              >
                Medium
              </Button>
              <Button
                className={`border hover:bg-white hover:text-black ${
                  quality == "high" ? "bg-white text-black" : ""
                }`}
                onClick={() => setGraphicsQuality("high")}
              >
                High
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      <div className="ui-element">
      <Sheet open={infoBarOpen} onOpenChange={setInfoBarOpen}>
        <SheetContent side="right" className="ui-element bg-white/75 hover:bg-white" onClick={(e) => e.stopPropagation()}
        >
          <SheetHeader>
            <SheetTitle className="text-black">Tile Info</SheetTitle>
            <SheetDescription>
              {focusedTile && (
                <>
                  <p>
                    Position: ({focusedTile?.q}, {focusedTile?.r})
                    Level: {focusedTile?.mapLevel}
                  </p>

                  {/* Add more tile information here */}
                </>
              )}

              
              {mapLevel < 4 && <Button className="bg-blue-400" onClick={handleAscend}>Ascend</Button>}
              {mapLevel > 1 && <Button className="bg-red-400" onClick={handleDescend}>Descend</Button>}
            </SheetDescription>
          </SheetHeader>
        </SheetContent>
      </Sheet>
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-white/75 ui-element">
          <DialogHeader>
            <DialogTitle>Tile Actions</DialogTitle>
            <DialogDescription>
              Choose an action for this tile:
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <Button onClick={() => console.log("Action 1")}>Action 1</Button>
            <Button onClick={() => console.log("Action 2")}>Action 2</Button>
            <Button onClick={() => console.log("Action 3")}>Action 3</Button>
          </div>
        </DialogContent>
      </Dialog>
      </div>
  </>;
};

export default MapRenderer;
