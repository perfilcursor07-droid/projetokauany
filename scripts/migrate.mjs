// ===========================================================================
// scripts/migrate.mjs
// Executa os arquivos .sql da pasta migrations/ em ordem, uma unica vez cada.
// Cria o banco se nao existir e registra o que ja foi aplicado.
//
// Uso:
//   npm run migrate           -> aplica migrations pendentes
//   npm run migrate:status    -> apenas mostra o que ja foi aplicado
// ===========================================================================

import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import 'dotenv/config';
import mysql from 'mysql2/promise';

const __dirname = dirname(fileURLToPath(import.meta.url));
const migrationsDir = join(__dirname, '..', 'migrations');

const statusOnly = process.argv.includes('--status');

// --- Resolve conexao a partir do .env (DB_* tem prioridade; senao DATABASE_URL)
function resolveConnection() {
  if (process.env.DB_HOST || process.env.DB_NAME) {
    return {
      host: process.env.DB_HOST || 'localhost',
      port: Number(process.env.DB_PORT || 3306),
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'nails_agenda',
    };
  }
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error('Defina DB_HOST/DB_NAME ou DATABASE_URL no .env');
  }
  const u = new URL(url);
  return {
    host: u.hostname || 'localhost',
    port: Number(u.port || 3306),
    user: decodeURIComponent(u.username || 'root'),
    password: decodeURIComponent(u.password || ''),
    database: u.pathname.replace(/^\//, '') || 'nails_agenda',
  };
}

async function main() {
  const cfg = resolveConnection();

  // Conecta sem selecionar o banco para poder cria-lo.
  const root = await mysql.createConnection({
    host: cfg.host,
    port: cfg.port,
    user: cfg.user,
    password: cfg.password,
    multipleStatements: true,
  });

  await root.query(
    `CREATE DATABASE IF NOT EXISTS \`${cfg.database}\` ` +
      `CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`
  );
  await root.end();

  const db = await mysql.createConnection({
    host: cfg.host,
    port: cfg.port,
    user: cfg.user,
    password: cfg.password,
    database: cfg.database,
    multipleStatements: true,
  });

  await db.query(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      filename VARCHAR(255) NOT NULL UNIQUE,
      applied_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  const [appliedRows] = await db.query('SELECT filename FROM _migrations');
  const applied = new Set(appliedRows.map((r) => r.filename));

  const files = readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  if (statusOnly) {
    console.log(`\nBanco: ${cfg.database} @ ${cfg.host}:${cfg.port}\n`);
    for (const f of files) {
      console.log(`  ${applied.has(f) ? '[x]' : '[ ]'} ${f}`);
    }
    console.log('');
    await db.end();
    return;
  }

  const pending = files.filter((f) => !applied.has(f));
  if (pending.length === 0) {
    console.log('Nenhuma migration pendente. Banco atualizado. ✅');
    await db.end();
    return;
  }

  for (const file of pending) {
    const sql = readFileSync(join(migrationsDir, file), 'utf8');
    process.stdout.write(`Aplicando ${file} ... `);
    try {
      await db.query(sql);
      await db.query('INSERT INTO _migrations (filename) VALUES (?)', [file]);
      console.log('ok');
    } catch (err) {
      console.log('FALHOU');
      console.error(err.message);
      await db.end();
      process.exit(1);
    }
  }

  console.log('\nMigrations aplicadas com sucesso. ✅');
  await db.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
