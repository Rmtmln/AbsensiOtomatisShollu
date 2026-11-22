const app = require('./src/server');
const scheduler = require('./src/scheduler');

const PORT = process.env.PORT || 8355;

app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════╗
║   🕌  Shollu Auto-Bot Manager v1.0          ║
║   Dashboard: http://localhost:${PORT}           ║
║   Status: Running                            ║
╚══════════════════════════════════════════════╝
  `);

  // Start the scheduler
  scheduler.startScheduler();
});
