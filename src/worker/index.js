#!/usr/bin/env node

/**
 * Background Worker Entry Point
 *
 * This file serves as the entry point for the background worker process
 * when running under PM2. It loads and runs the TypeScript worker using tsx.
 */

const { spawn } = require('child_process');
const path = require('path');

console.log('[Worker] Starting background worker...');
console.log(`[Worker] Environment: ${process.env.NODE_ENV || 'development'}`);
console.log(`[Worker] Working directory: ${process.cwd()}`);

// Path to the actual TypeScript worker
const workerPath = path.join(__dirname, 'main.ts');

// Use tsx to run the TypeScript worker
console.log('[Worker] Launching TypeScript worker with tsx...');

const child = spawn('npx', ['tsx', workerPath], {
  stdio: 'inherit',
  env: process.env,
  cwd: process.cwd(),
});

child.on('error', (error) => {
  console.error('[Worker] Failed to start worker:', error);
  process.exit(1);
});

child.on('exit', (code, signal) => {
  if (code !== null) {
    console.log(`[Worker] Worker exited with code ${code}`);
    process.exit(code);
  } else if (signal !== null) {
    console.log(`[Worker] Worker killed with signal ${signal}`);
    process.exit(1);
  }
});

// Forward signals to child process
process.on('SIGTERM', () => {
  console.log('[Worker] SIGTERM received, forwarding to child...');
  child.kill('SIGTERM');
});

process.on('SIGINT', () => {
  console.log('[Worker] SIGINT received, forwarding to child...');
  child.kill('SIGINT');
});
