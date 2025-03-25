import { Server } from 'socket.io';
import { setupRoomHandlers } from './handlers/room-handlers.js';
import { setupGameHandlers } from './handlers/game-handlers.js';
import { setupConnectionHandlers } from './handlers/connection-handlers.js';

export const setupSocketHandlers = (io: Server) => {
  io.on('connection', (socket) => {
    console.log(`Server: user connected: ${socket.id}`);

    // Setup room event handlers
    setupRoomHandlers(io, socket);

    // Setup game event handlers
    setupGameHandlers(io, socket);

    // Setup connection event handlers
    setupConnectionHandlers(io, socket);
  });
};
