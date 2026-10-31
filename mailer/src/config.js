const bool = (v, d) => (v === undefined || v === '' ? d : /^(1|true|yes|si|sí)$/i.test(v));

export function loadConfig(env = process.env) {
  const port = Number(env.PORT || 3000);
  return {
    port,
    baseUrl: (env.BASE_URL || `http://localhost:${port}`).replace(/\/+$/, ''),
    adminUser: env.ADMIN_USER || 'admin',
    adminPassword: env.ADMIN_PASSWORD || '',
    resendApiKey: env.RESEND_API_KEY || '',
    webhookSecret: env.RESEND_WEBHOOK_SECRET || '',
    fromEmail: env.FROM_EMAIL || '',
    fromName: env.FROM_NAME || '',
    replyTo: env.REPLY_TO || '',
    companyAddress: env.COMPANY_ADDRESS || '',
    doubleOptIn: bool(env.DOUBLE_OPT_IN, true),
    trustProxy: bool(env.TRUST_PROXY, false),
    dbPath: env.DB_PATH || './data/mailer.db',
    sendIntervalMs: Number(env.SEND_INTERVAL_MS ?? 600),
  };
}

/** Devuelve { errors, warnings }. Los errores impiden arrancar. */
export function validateConfig(c) {
  const errors = [];
  const warnings = [];
  if (c.adminPassword.length < 8) errors.push('ADMIN_PASSWORD es obligatorio (mínimo 8 caracteres).');
  if (!c.resendApiKey) warnings.push('Sin RESEND_API_KEY: modo simulación, no se envía ningún email real.');
  if (!c.webhookSecret) warnings.push('Sin RESEND_WEBHOOK_SECRET: el webhook se rechazará y no habrá estadísticas de entrega/aperturas.');
  if (c.doubleOptIn && !c.fromEmail) warnings.push('Sin FROM_EMAIL: no se podrán enviar los emails de confirmación (doble opt-in).');
  if (!c.companyAddress) warnings.push('Sin COMPANY_ADDRESS: el pie de los emails no llevará dirección postal.');
  if (!/^https:/.test(c.baseUrl) && !/localhost|127\.0\.0\.1/.test(c.baseUrl))
    warnings.push('BASE_URL no es HTTPS: la baja con un clic (List-Unsubscribe-Post) exige HTTPS.');
  return { errors, warnings };
}
