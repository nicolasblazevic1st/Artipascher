/** PM2 — environnement dev/staging sur le VPS (port 3002). */
const path = require("path");

const STAGING_DIR = "/var/www/artipascher-dev";

module.exports = {
  apps: [
    {
      name: "artipascher-dev",
      script: path.join(STAGING_DIR, "deploy/start-staging.sh"),
      cwd: STAGING_DIR,
      interpreter: "bash",
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      max_restarts: 20,
      min_uptime: "5s",
      kill_timeout: 8000,
      max_memory_restart: "768M",
      env: {
        NODE_ENV: "production",
        PORT: "3002",
        ARTIPASCHER_STAGING: "1",
        BETA_MODE: "false",
        NEXT_PUBLIC_BETA_MODE: "false",
        NEXT_PUBLIC_ARTIPASCHER_STAGING: "1",
        NEXT_PUBLIC_SITE_URL: "https://dev.nord-artisan-pro.com",
        ARTIPASCHER_BUILD_ID: process.env.ARTIPASCHER_BUILD_ID || "staging",
      },
    },
  ],
};
