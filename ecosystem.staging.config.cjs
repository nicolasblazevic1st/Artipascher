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
        ARTIPASCHER_STAGING: "1",
        BETA_MODE: "false",
        NEXT_PUBLIC_BETA_MODE: "false",
        NEXT_PUBLIC_ARTIPASCHER_STAGING: "1",
        NEXT_PUBLIC_SITE_URL: "https://dev.artipascher.fr",
        ARTIPASCHER_BUILD_ID: process.env.ARTIPASCHER_BUILD_ID || "staging",
      },
    },
  ],
};
