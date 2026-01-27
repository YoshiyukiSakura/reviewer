const appDir = process.env.APP_DIR || __dirname
const isProd = process.env.NODE_ENV === 'production'

module.exports = {
  apps: [
    {
      name: 'reviewer-web',
      script: isProd ? 'node' : 'npm',
      args: isProd ? '.next/standalone/reviewer/server.js' : 'run dev',
      cwd: appDir,
      env_file: '.env',
      env: {
        NODE_ENV: 'development',
        PORT: 38964,
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 38964,
      },
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      max_memory_restart: '1G',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      error_file: './logs/web-error.log',
      out_file: './logs/web-out.log',
    },
    {
      name: 'reviewer-worker',
      script: 'npx',
      args: 'tsx src/index.ts',
      cwd: appDir,
      env_file: '.env',
      env: {
        NODE_ENV: 'development',
        PORT: 38965,
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 38965,
      },
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      max_memory_restart: '1G',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      error_file: './logs/worker-error.log',
      out_file: './logs/worker-out.log',
    },
  ],
}