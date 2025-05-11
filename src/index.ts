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

// Memory usage tracking function
const trackMemoryUsage = (label = 'Memory Usage') => {
  const memUsage = process.memoryUsage();
  console.log(
    `${label}: ${JSON.stringify({
      rss: `${Math.round(memUsage.rss / 1024 / 1024)} MB`,
      heapTotal: `${Math.round(memUsage.heapTotal / 1024 / 1024)} MB`,
      heapUsed: `${Math.round(memUsage.heapUsed / 1024 / 1024)} MB`,
      external: `${Math.round(memUsage.external / 1024 / 1024)} MB`,
      arrayBuffers: `${Math.round(memUsage.arrayBuffers / 1024 / 1024)} MB`,
    })}`
  );

  // Enable explicit garbage collection if v8 flags are set
  if (global.gc) {
    try {
      global.gc();
      console.log('Manual garbage collection executed');
    } catch (e) {
      console.error('Failed to run manual garbage collection', e);
    }
  }
};

// Initial memory tracking interval (will be replaced by memory-manager)
let memoryTrackingInterval: NodeJS.Timeout | null = null;

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
  console.log('Cleaning up resources before server exit...');
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

  // Clear memory tracking interval if it exists
  if (memoryTrackingInterval) {
    clearInterval(memoryTrackingInterval);
  }

  // Force a final garbage collection if available
  if (global.gc) {
    try {
      global.gc();
      console.log('Final garbage collection executed');
    } catch (e) {
      console.error('Failed to run final garbage collection', e);
    }
  }
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
  perMessageDeflate: false, // Disable WebSocket compression
  maxHttpBufferSize: 9e999999, // Increase max buffer size
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

// Memory usage endpoint
app.get('/api/memory', (req: Request, res: Response) => {
  const memUsage = process.memoryUsage();
  res.json({
    rss: Math.round(memUsage.rss / 1024 / 1024),
    heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
    heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
    external: Math.round(memUsage.external / 1024 / 1024),
    arrayBuffers: Math.round(memUsage.arrayBuffers / 1024 / 1024),
    units: 'MB',
  });
});

// Server health check endpoint
app.get('/api/health', (req: Request, res: Response) => {
  const memUsage = process.memoryUsage();
  const uptime = process.uptime();

  res.json({
    status: 'ok',
    uptime: {
      seconds: Math.floor(uptime),
      formatted: `${Math.floor(uptime / 3600)}h ${Math.floor((uptime % 3600) / 60)}m ${Math.floor(uptime % 60)}s`,
    },
    memory: {
      rss: Math.round(memUsage.rss / 1024 / 1024),
      heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
      heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
      units: 'MB',
    },
    activePlayers: playerTimers.size,
    activeRooms: roomTimers.size,
    timestamp: Date.now(),
  });
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
    trackMemoryUsage('Initial Memory Usage'); // Log initial memory usage

    console.log('Server optimization systems initialized');
  });
