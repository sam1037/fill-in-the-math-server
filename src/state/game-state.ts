import { Room } from '../types/game.types.js';

// Game state - to be imported in other files
export const rooms: Map<string, Room> = new Map();
export const playerRooms: Map<string, string> = new Map();
export const playerTimers: Map<string, NodeJS.Timeout> = new Map();
