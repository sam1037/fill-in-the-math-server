import { Server, Socket } from 'socket.io';
import { RoomEvents } from '../../events/events.js';
import { broadcastRoomUpdate, endGame } from '../../utils/game-logic.js';
import { rooms, playerRooms, playerTimers } from '../../state/game-state.js';
import { Player, RoomStatus } from '../../types/game.types.js';

// Import the roomTimers map from game-logic
import { roomTimers } from '../../state/game-state.js';

export const setupConnectionHandlers = (io: Server, socket: Socket) => {
  // Handle disconnections
  socket.on('disconnect', () => {
    console.log(`Server: user disconnected: ${socket.id}`);

    const roomId = playerRooms.get(socket.id);
    if (roomId) {
      const room = rooms.get(roomId);
      if (room) {
        // Remove player from room
        room.players = room.players.filter((p: Player) => p.id !== socket.id);

        // If host leaves, assign a new host or delete the room
        if (socket.id === room.hostId && room.players.length > 0) {
          room.hostId = room.players[0].id;
          room.players[0].isHost = true;
        }

        // Stop player timer if exists
        if (playerTimers.has(socket.id)) {
          clearInterval(playerTimers.get(socket.id)!);
          playerTimers.delete(socket.id);
        }

        // Notify others about player leaving
        io.to(roomId).emit(RoomEvents.PLAYER_LEFT, {
          timestamp: Date.now(),
          roomId,
          playerId: socket.id,
        });

        // If room is empty, delete it and clean up all related resources
        if (room.players.length === 0) {
          // Clear room timer if exists
          if (roomTimers.has(roomId)) {
            clearInterval(roomTimers.get(roomId)!);
            roomTimers.delete(roomId);
          }
          rooms.delete(roomId);
        } else {
          // Check if game is over
          if (room.status === RoomStatus.IN_PROGRESS) {
            const alivePlayers = room.players.filter(
              (p: Player) => p.health > 0
            );
            if (alivePlayers.length <= 1) {
              endGame(roomId, io);
            }
          }

          // Broadcast updated room info
          broadcastRoomUpdate(roomId, io);
        }
      }

      // Remove player from room mapping
      playerRooms.delete(socket.id);
    }

    // Remove all listeners for this socket to prevent memory leaks
    socket.removeAllListeners();
  });
};
