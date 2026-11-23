// PM2 config for the Hostinger VPS (serves lifeofkittukun.com).
// Started by hostinger-deploy/server/release.sh, or by hand:  pm2 start ecosystem.config.js
// Listens on 127.0.0.1 only; Caddy (ports 80/443) forwards the domain here.
// Cron jobs (health ping, AI posts) are run by the server's crontab: see hostinger-deploy.
module.exports = {
  apps: [
    {
      name: "kittukun",
      cwd: __dirname,
      script: "node_modules/next/dist/bin/next",
      args: "start -p 3001 -H 127.0.0.1",
      instances: 1,
      exec_mode: "fork",
      env: { NODE_ENV: "production" },
      max_memory_restart: "900M",
      time: true,
    },
  ],
};
