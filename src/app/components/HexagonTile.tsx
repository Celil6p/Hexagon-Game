import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export interface HexagonTileProps {
  q: number;
  r: number;
  size: number;
  height: number;
  color: string;
  modelName: string;
  mapLevel: number;
}

export class HexagonTile extends THREE.Group {
  private focusBorder: THREE.LineSegments | null = null;
  public q: number;
  public r: number;
  public color: string;
  public mapLevel: number;
  public readonly isHexagonTile = true;
  private height: number;
  private size: number;
  private modelName: string;
  private modelInstance: THREE.Group | null = null;
  private static gltfLoader: GLTFLoader | null = null;
  private static loadedModels: { [key: string]: { model: THREE.Group; refCount: number } } = {};
  private static modelLoadPromises: { [key: string]: Promise<THREE.Group> } = {};
  
  constructor({ q, r, size, height, color, modelName, mapLevel }: HexagonTileProps) {
    super();

    this.q = q;
    this.r = r;
    this.height = height;
    this.size = size;
    this.mapLevel = mapLevel
    this.color = color;
    this.modelName = modelName;

    // Position the tile
    const x = size * 3/2 * q;
    const z = size * Math.sqrt(3) * (r + q/2);
    this.position.set(x, 0, z);

    // Add the GLTF model
    this.addGLTFModel(modelName, size, height);
  }

  update() {
    // Perform any per-frame updates here
    // For example, you could rotate the model, animate the focus border, etc.
    if (this.modelInstance) {
      // Example: slowly rotate the model
      // this.modelInstance.rotation.y += 0.01;
    }
  }

  reset() {
    this.removeFocusBorder();
  }

  private static getGLTFLoader() {
    if (!HexagonTile.gltfLoader) {
      HexagonTile.gltfLoader = new GLTFLoader();
      HexagonTile.gltfLoader.setPath('/data/');
    }
    return HexagonTile.gltfLoader;
  }

  private static loadGLTFModel(modelName: string): Promise<THREE.Group> {
    if (modelName in HexagonTile.loadedModels) {
      HexagonTile.loadedModels[modelName].refCount++;
      return Promise.resolve(HexagonTile.loadedModels[modelName].model);
    }

    if (!(modelName in HexagonTile.modelLoadPromises)) {
      HexagonTile.modelLoadPromises[modelName] = new Promise((resolve, reject) => {
        const loader = HexagonTile.getGLTFLoader();
        loader.load(
          `${modelName}.gltf`,
          (gltf) => {
            HexagonTile.loadedModels[modelName] = { model: gltf.scene, refCount: 1 };
            resolve(gltf.scene);
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

    return HexagonTile.modelLoadPromises[modelName];
  }

  private async addGLTFModel(modelName: string, size: number, height: number) {
    try {
      const model = await HexagonTile.loadGLTFModel(modelName);
      this.modelInstance = model.clone();
      
      const scale = size / 2;
      this.modelInstance.scale.set(size, scale, size);
      this.modelInstance.position.set(0, height, 0);
      
      this.modelInstance.rotation.y = 0;

      this.add(this.modelInstance);
    } catch (error) {
      console.error(`Failed to add model ${modelName}:`, error);
    }
  }

  public dispose() {
    console.log("dispose call tile");
    
    if (this.modelInstance) {
      this.remove(this.modelInstance);
      this.modelInstance = null;
    }

    if (this.modelName in HexagonTile.loadedModels) {
      HexagonTile.loadedModels[this.modelName].refCount--;
      if (HexagonTile.loadedModels[this.modelName].refCount === 0) {
        HexagonTile.loadedModels[this.modelName].model.traverse((object) => {
          if (object instanceof THREE.Mesh) {
            if (object.geometry) object.geometry.dispose();
            if (object.material) {
              if (Array.isArray(object.material)) {
                object.material.forEach(material => material.dispose());
              } else {
                object.material.dispose();
              }
            }
          }
        });
        delete HexagonTile.loadedModels[this.modelName];
      }
    }

    this.removeFocusBorder(); //suspicious
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

    const scale = this.size / 8;
  
    this.focusBorder = group as unknown as THREE.LineSegments;
    this.focusBorder.rotation.x = -Math.PI / 2;
    this.focusBorder.position.y = this.height + scale;  // 0.3; for free assets
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