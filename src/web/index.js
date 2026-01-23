#!/usr/bin/env node

/**
 * Next.js Web Server Entry Point
 *
 * This file serves as the entry point for the Next.js web application
 * when running under PM2. It starts the Next.js production server.
 */

const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');

const dev = process.env.NODE_ENV !== 'production';
const hostname = process.env.HOSTNAME || 'localhost';
const port = parseInt(process.env.PORT || '3000', 10);

console.log(`[Web] Starting Next.js server...`);
console.log(`[Web] Environment: ${process.env.NODE_ENV || 'development'}`);
console.log(`[Web] Hostname: ${hostname}`);
console.log(`[Web] Port: ${port}`);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('[Web] Error handling request:', err);
      res.statusCode = 500;
      res.end('Internal Server Error');
    }
  }).listen(port, hostname, (err) => {
    if (err) {
      console.error('[Web] Failed to start server:', err);
      process.exit(1);
    }
    console.log(`[Web] Server ready on http://${hostname}:${port}`);
  });
}).catch((err) => {
  console.error('[Web] Failed to prepare Next.js app:', err);
  process.exit(1);
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('[Web] SIGTERM received, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('[Web] SIGINT received, shutting down gracefully...');
  process.exit(0);
});
