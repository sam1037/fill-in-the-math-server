// Entry point for the Fill-in-the-Math game server

import { instrument } from '@socket.io/admin-ui';
import cors from 'cors';
import dotenv from 'dotenv';
import express, { Express, Request, Response } from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import session from 'express-session';
import memorystore from 'memorystore';
import { setupSocketHandlers } from './socket/socket-handlers.js';
import authRoutes from './routes/auth.routes.js';
import { playerTimers, roomTimers } from './state/game-state.js';

dotenv.config();

// Global error handlers to prevent server crashes
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  // Don't exit the process, just log the error
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Don't exit the process, just log the error
});

const port = process.env.PORT || 3001; // Changed default to 3001 to avoid conflict with Next.js
const hostname = process.env.hostname || 'localhost';
const client_url = process.env.client_url || 'http://localhost:3000';

// Clean up function to clear all timers on server restart
const cleanupOnRestart = () => {
  console.log('Cleaning up timers before server exit...');
  // Clear all player timers
  for (const timer of playerTimers.values()) {
    clearInterval(timer);
  }
  playerTimers.clear();

  // Clear all room timers
  for (const timer of roomTimers.values()) {
    clearInterval(timer);
  }
  roomTimers.clear();
};

// Register cleanup handlers
process.on('SIGINT', () => {
  cleanupOnRestart();
  process.exit(0);
});

process.on('SIGTERM', () => {
  cleanupOnRestart();
  process.exit(0);
});

const app: Express = express();
// Create MemoryStore
const MemoryStore = memorystore(session);

// Middleware
app.use(express.json()); // Parse JSON bodies
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded bodies

app.use(
  cors({
    origin: [client_url, 'https://admin.socket.io', 'http://localhost:3000'],
    credentials: true,
  })
);

// Session configuration
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'fill-in-the-math-secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      maxAge: 86400000, // 24 hours in milliseconds
    },
    store: new MemoryStore({
      checkPeriod: 86400000, // Prune expired entries every 24h
    }),
  })
);

const httpServer = createServer(app);
console.log('client_url=', client_url);

const io = new Server(httpServer, {
  cors: {
    allowedHeaders: ['my-custom-header'],
    credentials: true,
    methods: ['GET', 'POST'],
    origin: [client_url, 'https://admin.socket.io', 'http://localhost:3000'],
  },
});

// Setup socket handlers
setupSocketHandlers(io);

// Setup Socket.IO Admin UI
instrument(io, {
  auth: false,
  mode: 'development',
});

// API routes
app.get('/', (req: Request, res: Response) => {
  res.send('Fill-in-the-Math Game Server');
});

// Auth routes
app.use('/api/auth', authRoutes);

// CORS setup for HTTP server
httpServer.prependListener('request', (req: Request, res: Response) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
});

// Start the server
httpServer
  .once('error', (err) => {
    console.error(err);
    process.exit(1);
  })
  .listen(port, () => {
    console.log(`> Ready on http://${hostname}:${port}`);
  });
