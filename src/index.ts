// src/index.js

import { instrument } from '@socket.io/admin-ui';
import cors from 'cors';
import dotenv from 'dotenv';
import express, { Express, Request, Response } from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';

dotenv.config();

const port = process.env.PORT || 3000;
const hostname = process.env.hostname || 'localhost';
const client_url = process.env.client_url || 'http://localhost:3000';

const app: Express = express();

app.use(cors());
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

io.on('connection', (socket) => {
  console.log(`Server: user connected: ${socket.id}`);
});

instrument(io, {
  auth: false,
  mode: 'development',
});

app.get('/', (req: Request, res: Response) => {
  res.send('SunnyQ Socket.io Express + TypeScript Server');
});

httpServer.prependListener('request', (req: Request, res: Response) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
});

httpServer
  .once('error', (err) => {
    console.error(err);
    process.exit(1);
  })
  .listen(port, () => {
    console.log(`> Ready on http://${hostname}:${port}`);
  });
