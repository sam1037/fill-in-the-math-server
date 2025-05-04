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

dotenv.config();

const port = process.env.PORT || 3001; // Changed default to 3001 to avoid conflict with Next.js
const hostname = process.env.hostname || 'localhost';
const client_url = process.env.client_url || 'http://localhost:3000';

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
