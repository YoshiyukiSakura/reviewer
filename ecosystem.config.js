module.exports = {
  apps: [
    {
      name: 'reviewer-web',
      script: 'src/web/index.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'development',
        PORT: 3000,
        HOSTNAME: 'localhost'
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000,
        HOSTNAME: '0.0.0.0'
      }
    },
    {
      name: 'reviewer-worker',
      script: 'src/worker/index.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'development',
        USE_TYPESCRIPT: 'true'
      },
      env_production: {
        NODE_ENV: 'production',
        USE_TYPESCRIPT: 'false'
      }
    }
  ]
};
