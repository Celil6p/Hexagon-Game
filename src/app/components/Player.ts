// app/components/Player.ts
import * as THREE from 'three';

export class Player extends THREE.Mesh {
  private q: number;
  private r: number;

  constructor(q: number, r: number, size: number) {
    const geometry = new THREE.CylinderGeometry(size * 0.3, size * 0.3, size * 0.8, 32);
    const material = new THREE.MeshPhongMaterial({ color: 0xff0000 });
    super(geometry, material);

    this.q = q;
    this.r = r;

    this.position.y = size * 0.8; // Place the player on top of the tile
  }

  moveTo(q: number, r: number, position: THREE.Vector3) {
    this.q = q;
    this.r = r;
    this.position.x = position.x;
    this.position.z = position.z;
  }

  getCoordinates() {
    return { q: this.q, r: this.r };
  }
}