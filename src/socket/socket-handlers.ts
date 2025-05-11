import { Server } from 'socket.io';
import { setupRoomHandlers } from './handlers/room-handlers.js';
import { setupGameHandlers } from './handlers/game-handlers.js';
import { setupConnectionHandlers } from './handlers/connection-handlers.js';

// Socket middleware for tracking activity and rate limiting
const createSocketMiddleware = (io: Server) => {
  io.use((socket, next) => {
    // Initial connection setup
    socket.data.connectTime = Date.now();
    socket.data.messageCount = 0;

    // Proceed with connection
    next();
  });
};

export const setupSocketHandlers = (io: Server) => {
  // Apply middleware
  createSocketMiddleware(io);

  // Set server-wide event listeners to track all events
  const originalEmit = io.emit;
  io.emit = function (...args) {
    // Track all server emissions for debugging
    const event = args[0];
    console.debug(`[SERVER EMIT] ${event} to all clients`);
    return originalEmit.apply(this, args);
  };

  io.on('connection', (socket) => {
    console.log(`Server: user connected: ${socket.id}`);

    // Set up middleware to track all incoming events for this socket
    socket.use((event, next) => {
      const eventName =
        Array.isArray(event) && event.length > 0 ? event[0] : 'unknown';

      // Increment message count
      socket.data.messageCount = (socket.data.messageCount || 0) + 1;

      // Log high-frequency events for debugging
      if (socket.data.messageCount % 100 === 0) {
        console.log(
          `Socket ${socket.id} has sent ${socket.data.messageCount} messages`
        );
      }

      next();
    });

    // Setup handlers
    setupRoomHandlers(io, socket);
    setupGameHandlers(io, socket);
    setupConnectionHandlers(io, socket);
  });
};
