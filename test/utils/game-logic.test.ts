import {
  applyWrongAnswerPenalty,
  broadcastRoomUpdate,
} from '../../src/utils/game-logic.js';
import { rooms } from '../../src/state/game-state.js';
import { Server } from 'socket.io';
import { RoomStatus } from '../../src/types/game.types.js';
import { Difficulty } from '../../src/types/question.enum.js';

// Mock socket.io Server
const mockIo = {
  to: (roomId: string) => ({
    emit: (event: string, data: unknown) => {
      // Mock emit function
      console.log(`Emitting ${event} to room ${roomId} with data:`, data);
    },
  }),
} as unknown as Server;

describe('Game Logic', () => {
  let roomId: string;
  let socketId1: string;
  let socketId2: string;
  let emitSpy: jest.SpyInstance; // Spy to track emit calls

  beforeEach(() => {
    roomId = 'testRoom';
    socketId1 = 'player1';
    socketId2 = 'player2';

    // Initialize a mock room
    rooms.set(roomId, {
      id: roomId,
      name: 'Test Room',
      hostId: socketId1, // Added hostId
      status: RoomStatus.IN_PROGRESS,
      config: {
        timeLimit: 60,
        Difficulty: Difficulty.EASY,
        maxPlayers: 2,
        attackDamage: 1, // Added attackDamage
        healAmount: 1, // Added healAmount
        wrongAnswerPenalty: 3,
        isPublic: true, // Added isPublic
      },
      players: [
        {
          id: socketId1,
          username: 'Player1',
          health: 10,
          score: 0,
          currentQuestionIndex: 0, // Added currentQuestionIndex
          isHost: true, // Added isHost
        },
        {
          id: socketId2,
          username: 'Player2',
          health: 10,
          score: 0,
          currentQuestionIndex: 0, // Added currentQuestionIndex
          isHost: false, // Added isHost
        },
      ],
    });

    // Spy on the emit function
    emitSpy = jest.spyOn(mockIo.to(roomId), 'emit');
  });

  afterEach(() => {
    rooms.clear(); // Clean up rooms after each test
    emitSpy.mockRestore(); // Restore the original emit function
  });

  //TODO
  it('should send health updates to all players in a room', () => {
    console.log('TODO');
  });

  it('should apply wrong answer penalty to a player', () => {
    const room = rooms.get(roomId);
    const initialHealth = room?.players[0].health;
    applyWrongAnswerPenalty(socketId1, roomId, mockIo as Server);
    const player = room?.players.find((p) => p.id === socketId1);
    expect(player?.health).toBeLessThan(initialHealth!);
  });

  it('should broadcast room updates to all players in the room', () => {
    broadcastRoomUpdate(roomId, mockIo as Server);
  });
});
