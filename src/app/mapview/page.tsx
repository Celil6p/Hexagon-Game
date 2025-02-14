"use client";

import React, {
  useEffect,
  useRef,
  useState,
  useCallback
} from "react";
import { useAuth } from "@/app/auth/AuthContext"; // Adjust the import path if needed

/**
 * Example Next.js "page" component that:
 * 1. Fetches large hex map data from /procedural/512 using the access token from AuthContext.
 * 2. Draws the map on a scrollable HTML canvas in a flat-topped orientation.
 * 3. Provides a "Save Map" button to call /procedural/save.
 */

type TileData = {
  q: number;
  r: number;
  terrain: string;
};

export default function LargeHexCanvas() {
  const { accessToken } = useAuth(); // from your AuthContext
  const [tiles, setTiles] = useState<TileData[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Base tile radius for drawing
  const tileSize = 5;
  // Additional scale factor to compress the map
  const scaleFactor = 0.5;
  // Use your environment variable for the backend URL
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8080";

  // Convert axial (q,r) to pixel coords for a flat-topped hex layout
  // Reference: https://www.redblobgames.com/grids/hexagons/
  const axialToPixelFlat = (q: number, r: number) => {
    const x = (3 / 2) * q;
    const y = Math.sqrt(3) * (r + q / 2);
    return {
      x: x * tileSize * scaleFactor,
      y: y * tileSize * scaleFactor,
    };
  };

  // Assign colors by terrain type
  const getColorForTerrain = (terrain: string): string => {
    switch (terrain) {
      case "water":
        return "#2196F3";
      case "grass":
        return "#4CAF50";
      case "forest":
        return "#2E7D32";
      case "mountain":
        return "#795548";
      default:
        return "#9E9E9E";
    }
  };

  // Draw a single hex
  const drawHex = (
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    terrain: string
  ) => {
    const fillColor = getColorForTerrain(terrain);
    const r = tileSize * scaleFactor;

    // For flat-top, each vertex is 60° from the next
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 180) * 60 * i;
      const vx = cx + r * Math.cos(angle);
      const vy = cy + r * Math.sin(angle);
      if (i === 0) {
        ctx.moveTo(vx, vy);
      } else {
        ctx.lineTo(vx, vy);
      }
    }
    ctx.closePath();

    ctx.fillStyle = fillColor;
    ctx.fill();
  };

  // Compute bounding box
  const computeBoundingBox = useCallback(
    (tilesData: TileData[]) => {
      if (tilesData.length === 0) {
        return { minX: 0, maxX: 0, minY: 0, maxY: 0 };
      }
      let minX = Number.POSITIVE_INFINITY;
      let maxX = Number.NEGATIVE_INFINITY;
      let minY = Number.POSITIVE_INFINITY;
      let maxY = Number.NEGATIVE_INFINITY;

      for (const { q, r } of tilesData) {
        const { x, y } = axialToPixelFlat(q, r);
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
      return { minX, maxX, minY, maxY };
    },
    []
  );

  // Draw entire tile set
  const drawAllTiles = useCallback(() => {
    if (!canvasRef.current) return;
    if (tiles.length === 0) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const { minX, maxX, minY, maxY } = computeBoundingBox(tiles);
    const offsetX = -minX + tileSize;
    const offsetY = -minY + tileSize;

    for (const tile of tiles) {
      const { q, r, terrain } = tile;
      const { x, y } = axialToPixelFlat(q, r);
      const sx = x + offsetX;
      const sy = y + offsetY;
      drawHex(ctx, sx, sy, terrain);
    }
  }, [tiles, computeBoundingBox]);

  // Ensure canvas is sized to bounding box + some padding
  useEffect(() => {
    if (tiles.length === 0) return;
    const { minX, maxX, minY, maxY } = computeBoundingBox(tiles);
    const width = Math.ceil(maxX - minX + tileSize * 4);
    const height = Math.ceil(maxY - minY + tileSize * 4);

    if (canvasRef.current) {
      canvasRef.current.width = Math.max(width, 300);
      canvasRef.current.height = Math.max(height, 300);
    }
    drawAllTiles();
  }, [tiles, computeBoundingBox, drawAllTiles]);

  const handleFetchTiles = async () => {
    if (!accessToken) {
      alert("No access token found. Please log in first.");
      return;
    }
    setLoading(true);
    setTiles([]);

    try {
      const response = await fetch(`${backendUrl}/procedural/512`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        throw new Error(
          `Failed to fetch: ${response.status} ${response.statusText}`
        );
      }

      const data = await response.json();
      let tileArray: TileData[] = [];

      if (Array.isArray(data)) {
        tileArray = data;
      } else if (data && Array.isArray(data.tiles)) {
        tileArray = data.tiles;
      } else {
        console.warn("Unexpected data structure", data);
        throw new Error("Could not parse tile data from response");
      }

      setTiles(tileArray);
    } catch (err) {
      console.error(err);
      alert("Failed to fetch tile data. Check console for details.");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveMap = async () => {
    if (!accessToken) {
      alert("No access token found. Please log in first.");
      return;
    }
    setLoading(true);

    try {
      const resp = await fetch(`${backendUrl}/procedural/save`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!resp.ok) {
        throw new Error(`Failed to save map: ${resp.status} ${resp.statusText}`);
      }

      const data = await resp.json();
      alert(`Map saved successfully! ID: ${data.map_id}`);
    } catch (err) {
      console.error(err);
      alert("Failed to save map. Check console for details.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: "1rem" }}>
      <h2>Large Hex Canvas (Flat-Topped)</h2>
      <p>Access Token: {accessToken ? "Yes" : "No"}</p>

      <button onClick={handleFetchTiles} disabled={loading}>
        {loading ? "Fetching..." : "Fetch & Draw"}
      </button>
      {" "}
      <button onClick={handleSaveMap} disabled={loading || !tiles.length}>
        Save Map
      </button>

      <div
        style={{
          marginTop: "1rem",
          width: "100%",
          height: "80vh",
          overflow: "auto",
          border: "1px solid #ccc",
        }}
      >
        <canvas
          ref={canvasRef}
          style={{
            display: "block",
          }}
        />
      </div>
    </div>
  );
}