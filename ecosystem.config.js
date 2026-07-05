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
      env: {
        NODE_ENV: "production",
        PORT: 5002
      }
    }
  ]
};
