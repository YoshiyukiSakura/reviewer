module.exports = {
  apps: [
    {
      name: 'reviewer-web',
      script: 'npm',
      args: 'start',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      cwd: '.',
      out_file: 'logs/reviewer-web-out.log',
      error_file: 'logs/reviewer-web-err.log',
      log_file: 'logs/reviewer-web.log',
      env: {
        NODE_ENV: 'development',
        PORT: 3000
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 8080
      }
    },
    {
      name: 'reviewer-worker',
      script: 'npx',
      args: 'tsx src/index.ts',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      cwd: '.',
      out_file: 'logs/reviewer-worker-out.log',
      error_file: 'logs/reviewer-worker-err.log',
      log_file: 'logs/reviewer-worker.log',
      env: {
        NODE_ENV: 'development',
        PORT: 3001,
        OPENAI_API_KEY: 'your-openai-api-key',
        PR_MONITOR_REPOSITORIES: 'owner/repo',
        GITHUB_TOKEN: ''
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 8081
      }
    }
  ]
};