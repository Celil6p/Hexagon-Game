// app/types/gameTypes.ts

export type ResourceType = 'wood' | 'stone' | 'iron' | 'gold' | 'food';

export interface Resource {
  type: ResourceType;
  amount: number;
}

export interface TileData {
  q: number;
  r: number;
  terrain: string;
  ownerId: string | null;
  resources: Resource[];
  building: string | null;
  canInteract: boolean;
}

export interface PlayerData {
  id: string;
  name: string;
  color: string;
  resources: Resource[];
}

export interface GameState {
  tiles: TileData[];
  players: PlayerData[];
}