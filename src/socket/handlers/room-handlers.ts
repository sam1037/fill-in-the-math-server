import { Server, Socket } from 'socket.io';
import { ConnectionEvents, RoomEvents } from '../../events/events.js';
import {
  CreateRoomRequest,
  JoinRoomRequest,
  LeaveRoomRequest,
  QuickJoinRequest,
  UpdateSettingsRequest,
  DeleteRoomRequest,
  ContinueGameRequest,
} from '../../events/room.events.js';
import { broadcastRoomUpdate } from '../../utils/game-logic.js';
import {
  createRoom,
  joinRoom,
  leaveRoom,
  quickJoin,
  updateRoomSettings,
  deleteRoom,
  continueGame,
} from '../../services/room-service.js';

export const setupRoomHandlers = (io: Server, socket: Socket) => {
  socket.on(RoomEvents.CREATE_ROOM, (data: CreateRoomRequest) => {
    const room = createRoom(
      socket.id,
      data.username,
      data.roomName,
      data.config
    );

    // Join the socket to the room
    socket.join(room.id);

    socket.emit(RoomEvents.ROOM_CREATED, {
      timestamp: Date.now(),
      room,
    });

    // Broadcast room update to all
    broadcastRoomUpdate(room.id, io);
  });

  socket.on(RoomEvents.JOIN_ROOM, (data: JoinRoomRequest) => {
    const result = joinRoom(socket.id, data.roomId, data.username);

    if (!result) {
      return socket.emit(ConnectionEvents.ERROR, {
        timestamp: Date.now(),
        error: 'Room not found',
      });
    }

    if (result === 'IN_PROGRESS') {
      return socket.emit(ConnectionEvents.ERROR, {
        timestamp: Date.now(),
        error: 'Game already in progress',
      });
    }

    if (result === 'FULL') {
      return socket.emit(ConnectionEvents.ERROR, {
        timestamp: Date.now(),
        error: 'Room is full',
      });
    }

    // Join the socket to the room
    socket.join(data.roomId);

    // Notify the player
    socket.emit(RoomEvents.ROOM_JOINED, {
      timestamp: Date.now(),
      room: result,
    });

    // Notify others
    socket.to(data.roomId).emit(RoomEvents.PLAYER_JOINED, {
      timestamp: Date.now(),
      roomId: data.roomId,
      playerId: socket.id,
      username: data.username,
    });

    // Broadcast updated room info to all players
    broadcastRoomUpdate(data.roomId, io);
  });

  socket.on(RoomEvents.QUICK_JOIN, (data: QuickJoinRequest) => {
    const result = quickJoin(socket.id, data.username);

    if (!result) {
      return socket.emit(RoomEvents.NO_ROOMS_AVAILABLE, {
        timestamp: Date.now(),
      });
    }

    if (result === 'IN_PROGRESS' || result === 'FULL') {
      // This should not happen due to filtering in quickJoin function, but handle it just in case
      return socket.emit(ConnectionEvents.ERROR, {
        timestamp: Date.now(),
        error:
          result === 'IN_PROGRESS'
            ? 'Game already in progress'
            : 'Room is full',
      });
    }

    // Join the socket to the room
    socket.join(result.id);

    // Notify the player
    socket.emit(RoomEvents.ROOM_JOINED, {
      timestamp: Date.now(),
      room: result,
    });

    // Notify others
    socket.to(result.id).emit(RoomEvents.PLAYER_JOINED, {
      timestamp: Date.now(),
      roomId: result.id,
      playerId: socket.id,
      username: data.username,
    });

    // Broadcast updated room info to all players
    broadcastRoomUpdate(result.id, io);
  });

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  socket.on(RoomEvents.LEAVE_ROOM, (data: LeaveRoomRequest) => {
    const result = leaveRoom(socket.id, io);
    if (!result) return;

    socket.leave(result.roomId);

    // Notify player
    socket.emit(RoomEvents.ROOM_LEFT, {
      timestamp: Date.now(),
      roomId: result.roomId,
    });

    // Notify others if room still exists
    if (result.roomStillExists) {
      io.to(result.roomId).emit(RoomEvents.PLAYER_LEFT, {
        timestamp: Date.now(),
        roomId: result.roomId,
        playerId: socket.id,
      });

      // Broadcast updated room information to all
      broadcastRoomUpdate(result.roomId, io);
    }
  });

  socket.on(RoomEvents.UPDATE_SETTINGS, (data: UpdateSettingsRequest) => {
    const result = updateRoomSettings(socket.id, data.roomId, data.config);

    if (!result) {
      return socket.emit(ConnectionEvents.ERROR, {
        timestamp: Date.now(),
        error: 'Room not found',
      });
    }

    if (result === 'NOT_HOST') {
      return socket.emit(ConnectionEvents.ERROR, {
        timestamp: Date.now(),
        error: 'Only host can update settings',
      });
    }

    // Broadcast updated room info to all players
    broadcastRoomUpdate(data.roomId, io);
  });

  socket.on(RoomEvents.DELETE_ROOM, (data: DeleteRoomRequest) => {
    const result = deleteRoom(socket.id, data.roomId);

    if (!result) {
      return socket.emit(ConnectionEvents.ERROR, {
        timestamp: Date.now(),
        error: 'Room not found',
      });
    }

    if (result === 'NOT_HOST') {
      return socket.emit(ConnectionEvents.ERROR, {
        timestamp: Date.now(),
        error: 'Only host can delete the room',
      });
    }

    // Notify all players in the room that it has been deleted
    io.to(data.roomId).emit(RoomEvents.ROOM_DELETED, {
      timestamp: Date.now(),
      roomId: data.roomId,
    });

    // Each player will leave the room
    const clients = io.sockets.adapter.rooms.get(data.roomId);
    if (clients) {
      clients.forEach((clientId) => {
        const clientSocket = io.sockets.sockets.get(clientId);
        if (clientSocket) {
          clientSocket.leave(data.roomId);
        }
      });
    }
  });

  socket.on(RoomEvents.CONTINUE_GAME, (data: ContinueGameRequest) => {
    const result = continueGame(socket.id, data.roomId);

    if (!result) {
      return socket.emit(ConnectionEvents.ERROR, {
        timestamp: Date.now(),
        error: 'Room not found',
      });
    }

    if (result === 'NOT_HOST') {
      return socket.emit(ConnectionEvents.ERROR, {
        timestamp: Date.now(),
        error: 'Only host can continue the game',
      });
    }

    if (result === 'INVALID_STATE') {
      return socket.emit(ConnectionEvents.ERROR, {
        timestamp: Date.now(),
        error: 'Room is not in a finished state',
      });
    }

    // Broadcast the updated room status to all players
    broadcastRoomUpdate(data.roomId, io);
  });
};
