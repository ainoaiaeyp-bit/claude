/* Rellena una base de datos NUEVA con datos de ejemplo para probar el panel: `npm run demo`. */
import path from 'node:path';
import crypto from 'node:crypto';
import { createApp } from '../server/index.js';
import { seedDemo } from '../server/core/demo.js';

const dataDir = process.env.DATA_DIR || path.resolve('data-demo');
const app = await createApp({ dataDir, adminPassword: process.env.ADMIN_PASSWORD || 'demo-1234', quiet: true });
if (app.store.list('clients').length) { console.error('La base de datos ya tiene datos. Usa DATA_DIR con una carpeta nueva.'); process.exit(1); }
// saveFile síncrono para el generador: guardamos en disco con el mismo formato que el servidor
import fs from 'node:fs';
const filesDir = path.join(dataDir, 'files'); fs.mkdirSync(filesDir, { recursive: true });
const n = seedDemo(app.store, new Date(), { saveFile: (bytes) => { const id = crypto.randomBytes(16).toString('hex'); fs.writeFileSync(path.join(filesDir, id), bytes); return id; } });
console.log(`Datos de ejemplo creados en ${dataDir}: ${n.clients} clientas, ${n.bookings} citas.`);
console.log(`Arranca con: DATA_DIR=${dataDir} npm start   (contraseña del panel: ${process.env.ADMIN_PASSWORD || 'demo-1234'})`);
app.close();
