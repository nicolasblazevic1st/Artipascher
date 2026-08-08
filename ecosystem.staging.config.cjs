/** PM2 — environnement dev/staging sur le VPS (port 3001). */
module.exports = {
  apps: [
    {
      name: "artipascher-dev",
      script: "node_modules/next/dist/bin/next",
      args: "start -p 3001",
      cwd: __dirname,
      instances: 1,
      autorestart: true,
      max_memory_restart: "768M",
      env: {
        NODE_ENV: "production",
        PORT: "3001",
        NEXT_PUBLIC_BETA_MODE: "false",
      },
    },
  ],
};
