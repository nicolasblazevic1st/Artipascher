/** PM2 — lancer avec : pm2 start ecosystem.config.cjs */
module.exports = {
  apps: [
    {
      name: "artipascher",
      script: "node_modules/next/dist/bin/next",
      args: "start -p 3000",
      cwd: __dirname,
      instances: 1,
      autorestart: true,
      max_memory_restart: "512M",
      env: {
        NODE_ENV: "production",
        PORT: "3000",
        // Ne pas forcer NEXT_PUBLIC_BETA_MODE ici : lu depuis .env.local au build.
        // Défaut applicatif = bêta ON (préouverture) sauf false explicite.
      },
    },
  ],
};
