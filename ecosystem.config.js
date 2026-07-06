module.exports = {
  apps: [
    {
      name: "nilansu-backend",
      script: "./server/dist/index.js",
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      watch: false,
      max_memory_restart: "1G",
      kill_timeout: 10000,
      env: {
        NODE_ENV: "production",
        PORT: 5002,
        FRONTEND_URL: "https://nilansupublication.com"
      }
    }
  ]
};
