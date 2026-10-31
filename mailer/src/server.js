import { loadConfig, validateConfig } from './config.js';
import { createApp } from './app.js';

const config = loadConfig();
const { errors, warnings } = validateConfig(config);
for (const w of warnings) console.warn(`⚠ ${w}`);
if (errors.length) {
  for (const e of errors) console.error(`✗ ${e}`);
  console.error('Copia .env.example a .env y rellénalo.');
  process.exit(1);
}

const { server, ctx, start } = createApp(config);
server.listen(config.port, () => {
  console.log(`Mailer en ${config.baseUrl} (puerto ${config.port})${ctx.resend.dryRun ? ' — MODO SIMULACIÓN' : ''}`);
  start();
});

for (const sig of ['SIGINT', 'SIGTERM']) {
  process.on(sig, () => server.close(() => process.exit(0)));
}
