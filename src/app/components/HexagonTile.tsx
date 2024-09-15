import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export interface HexagonTileProps {
  q: number;
  r: number;
  size: number;
  height: number;
  color: string;
  modelName: string;
}

export class HexagonTile extends THREE.Group {
  private focusBorder: THREE.LineSegments | null = null;
  public q: number;
  public r: number;
  private height: number;
  private size: number;
  private modelInstance: THREE.Group | null = null;
  private static gltfLoader: GLTFLoader | null = null;
  private static loadedModels: { [key: string]: THREE.Group } = {};
  private static modelLoadPromises: { [key: string]: Promise<THREE.Group> } = {};

  constructor({ q, r, size, height, color, modelName }: HexagonTileProps) {
    super();

    this.q = q;
    this.r = r;
    this.height = height;
    this.size = size;

    // Create the base hexagon
    const shape = new THREE.Shape();
    for (let i = 0; i <= 6; i++) {
      const angle = (Math.PI / 3) * i;
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
      color: new THREE.Color(color),
      metalness: 0.1,
      roughness: 0.7,
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.rotation.x = -Math.PI / 2; // Rotate to lay flat
    this.add(mesh);

    // Position the tile
    const x = size * 3/2 * q;
    const y = 0;
    const z = size * Math.sqrt(3) * (r + q/2);
    this.position.set(x, y, z);

    // Add the GLTF model
    this.addGLTFModel(modelName, size, height);
  }

  private static getGLTFLoader() {
    if (!HexagonTile.gltfLoader) {
      HexagonTile.gltfLoader = new GLTFLoader();
      HexagonTile.gltfLoader.setPath('/data/');
    }
    return HexagonTile.gltfLoader;
  }

  private static loadGLTFModel(modelName: string): Promise<THREE.Group> {
    // If the model is already loaded, return it immediately
    if (modelName in HexagonTile.loadedModels) {
      return Promise.resolve(HexagonTile.loadedModels[modelName]);
    }

    // If there's no existing load promise, create one
    if (!(modelName in HexagonTile.modelLoadPromises)) {
      HexagonTile.modelLoadPromises[modelName] = new Promise((resolve, reject) => {
        const loader = HexagonTile.getGLTFLoader();
        loader.load(
          `${modelName}.gltf`,
          (gltf) => {
            HexagonTile.loadedModels[modelName] = gltf.scene;
            resolve(HexagonTile.loadedModels[modelName]);
          },
          (progress) => {
            console.log(`Loading model ${modelName}: ${(progress.loaded / progress.total * 100)}% loaded`);
          },
          (error) => {
            console.error(`An error happened while loading the model ${modelName}:`, error);
            reject(error);
          }
        );
      });
    }

    // Return the promise (either existing or newly created)
    return HexagonTile.modelLoadPromises[modelName];
  }

  private async addGLTFModel(modelName: string, size: number, height: number) {
    try {
      const model = await HexagonTile.loadGLTFModel(modelName);
      this.modelInstance = model.clone();
      
      const scale = size / 2;
      this.modelInstance.scale.set(0.86, scale, 0.86);
      this.modelInstance.position.set(0, height + 0.3, 0);
      
      this.modelInstance.rotation.y = 10.993;

      this.add(this.modelInstance);
    } catch (error) {
      console.error(`Failed to add model ${modelName}:`, error);
    }
  }

  addFocusBorder() {
    if (this.focusBorder) return;
  
    const shape = new THREE.Shape();
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 3) * i;
      const x = this.size * Math.cos(angle);
      const y = this.size * Math.sin(angle);
      if (i === 0) shape.moveTo(x, y);
      else shape.lineTo(x, y);
    }
    shape.lineTo(this.size, 0);

    const geometry = new THREE.BufferGeometry().setFromPoints(shape.getPoints());
    
    const group = new THREE.Group();
    const offsets = [
      [0, 0, 0],
      [0.005, 0, 0],
      [-0.005, 0, 0],
      [0.01, 0, 0],
      [-0.01, 0, 0],
      [0, 0.005, 0],
      [0, -0.005, 0],
      [0, 0.01, 0],
      [0, -0.01, 0]
    ];
  
    offsets.forEach(offset => {
      const line = new THREE.LineLoop(
        geometry,
        new THREE.LineBasicMaterial({ color: 0xffff00, linewidth: 1 })
      );
      line.position.set(offset[0], offset[1], offset[2]);
      group.add(line);
    });
  
    this.focusBorder = group as unknown as THREE.LineSegments;
    this.focusBorder.rotation.x = -Math.PI / 2;
    this.focusBorder.position.y = this.height + 0.3;
    this.focusBorder.scale.set(this.scale.x, this.scale.y, this.scale.z);
    this.add(this.focusBorder);
  }

  removeFocusBorder() {
    if (this.focusBorder) {
      this.remove(this.focusBorder);
      this.focusBorder = null;
    }
  }
}