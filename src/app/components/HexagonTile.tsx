// app/components/HexagonTile.tsx
import * as THREE from 'three';

export interface HexagonTileProps {
  q: number;
  r: number;
  size: number;
  height: number;
  color?: string;
}

export class HexagonTile extends THREE.Group {
  private focusBorder: THREE.LineSegments | null = null;
  public q: number;
  public r: number;

  constructor({ q, r, size, height, color = '#4CAF50' }: HexagonTileProps) {
    super();

    this.q = q;
    this.r = r;

    const shape = new THREE.Shape();
    const segments = 6; // Back to 6 segments for a true hexagon shape
    for (let i = 0; i <= segments; i++) {
      const angle = (Math.PI / 3) * (i / (segments / 6));
      const x = size * Math.cos(angle);
      const y = size * Math.sin(angle);
      if (i === 0) shape.moveTo(x, y);
      else shape.lineTo(x, y);
    }

    const extrudeSettings = {
      steps: 1,
      depth: height,
      bevelEnabled: false
    };
    const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);

    const material = new THREE.MeshStandardMaterial({ 
      color: color,
      metalness: 0.1,
      roughness: 0.7,
    });
    const mesh = new THREE.Mesh(geometry, material);

    // Position the tile (flat orientation)
    const x = size * 3/2 * q;
    const y = 0;
    const z = size * Math.sqrt(3) * (r + q/2);
    this.position.set(x, y, z);

    // Rotate the tile to be flat on the ground
    mesh.rotation.x = -Math.PI / 2;

    this.add(mesh);

    // Add coordinate text
    this.addCoordinateText(q, r, size, height);
  }

  private addCoordinateText(q: number, r: number, size: number, height: number) {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = 'white';
      ctx.font = 'bold 48px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`(${q},${r})`, 128, 128);
  
      ctx.strokeStyle = 'black';
      ctx.lineWidth = 3;
      ctx.strokeText(`(${q},${r})`, 128, 128);
  
      const texture = new THREE.CanvasTexture(canvas);
      texture.anisotropy = 16;
      const material = new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,
        side: THREE.DoubleSide,
      });
  
      const plane = new THREE.PlaneGeometry(size * 0.8, size * 0.8);
      const textMesh = new THREE.Mesh(plane, material);
      textMesh.rotation.x = -Math.PI / 2;
      textMesh.rotation.z = Math.PI; // This line inverts the text
      textMesh.position.y = height + 0.01;
  
      this.add(textMesh);
    }
  }

  addFocusBorder() {
    if (this.focusBorder) return;
  
    const children = this.children[0] as THREE.Mesh;
    const geometry = children.geometry;
    const edges = new THREE.EdgesGeometry(geometry);
    
    // Create multiple line segments with slight offsets
    const group = new THREE.Group();
    const offsets = [
      [0, 0, 0],
      [0.005, 0, 0],
      [-0.005, 0, 0],
      [0, 0.005, 0],
      [0, -0.005, 0]
    ];
  
    offsets.forEach(offset => {
      const line = new THREE.LineSegments(
        edges,
        new THREE.LineBasicMaterial({ color: 0xffff00, linewidth: 1 })
      );
      line.position.set(offset[0], offset[1], offset[2]);
      group.add(line);
    });
  
    this.focusBorder = group as unknown as THREE.LineSegments;
    this.focusBorder.rotation.x = -Math.PI / 2;
    this.focusBorder.position.y = 0.01; // Slightly raise the border to prevent z-fighting
    this.add(this.focusBorder);
  }

  removeFocusBorder() {
    if (this.focusBorder) {
      this.remove(this.focusBorder);
      this.focusBorder = null;
    }
  }
}