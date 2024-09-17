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
import gsap from "gsap";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";

interface MapRendererProps {
  tiles?: HexagonTile[];
  camera: THREE.PerspectiveCamera | null;
  cameraPosition: MutableRefObject<THREE.Vector3>;
  renderer: THREE.WebGLRenderer | null;
}

const MapRenderer: React.FC<MapRendererProps> = ({
  tiles,
  camera,
  cameraPosition,
  renderer,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const dragStartPosition = useRef(new THREE.Vector2());
  const [infoBarOpen, setInfoBarOpen] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedTilePosition, setSelectedTilePosition] = useState<{
    q: number;
    r: number;
  } | null>(null);
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
      setSelectedTilePosition({ q: tile.q, r: tile.r });
      setInfoBarOpen(true);

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
            camera.lookAt(
              cameraPosition.current.x,
              0,
              cameraPosition.current.z + camera.position.y
            );
          },
        });
      }
    },
    [
      focusedTile,
      setSelectedTilePosition,
      setInfoBarOpen,
      camera,
      cameraPosition,
    ]
  );

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
        focusOnTile(clickedTile);        
      } else {
        if (focusedTile) {
          focusedTile.reset();
          setFocusedTile(null);
          setSelectedTilePosition(null);
          setInfoBarOpen(false);
          setDialogOpen(false);
        }
      }
    },
    [tiles, camera, isDragging, focusOnTile, focusedTile, setSelectedTilePosition, setInfoBarOpen, setDialogOpen]
  );

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
            <SheetTitle>Tile Info</SheetTitle>
            <SheetDescription>
              {selectedTilePosition && (
                <>
                  <p>
                    Position: ({selectedTilePosition.q}, {selectedTilePosition.r})
                  </p>
                  {/* Add more tile information here */}
                </>
              )}
            </SheetDescription>
          </SheetHeader>
        </SheetContent>
      </Sheet>
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
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
