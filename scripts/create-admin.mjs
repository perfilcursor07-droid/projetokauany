// ===========================================================================
// scripts/create-admin.mjs
// Cria (ou atualiza) o usuario administrador do painel com senha via bcrypt.
//
// Uso:
//   node scripts/create-admin.mjs "Juliana" "juliana@email.com" "minhaSenha"
//   npm run create-admin -- "Juliana" "juliana@email.com" "minhaSenha"
//
// Se os argumentos nao forem passados, usa valores padrao (troque depois!).
// ===========================================================================

import 'dotenv/config';
import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';

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
  const u = new URL(process.env.DATABASE_URL);
  return {
    host: u.hostname || 'localhost',
    port: Number(u.port || 3306),
    user: decodeURIComponent(u.username || 'root'),
    password: decodeURIComponent(u.password || ''),
    database: u.pathname.replace(/^\//, ''),
  };
}

const name = process.argv[2] || 'Administradora';
const email = process.argv[3] || 'admin@studio.com';
const password = process.argv[4] || 'admin123';
const businessId = Number(process.env.SEED_BUSINESS_ID || 1);

const hash = await bcrypt.hash(password, 10);
const db = await mysql.createConnection(resolveConnection());

await db.query(
  `INSERT INTO users (business_id, name, email, password_hash, role)
   VALUES (?, ?, ?, ?, 'owner')
   ON DUPLICATE KEY UPDATE name = VALUES(name),
                           password_hash = VALUES(password_hash),
                           business_id = VALUES(business_id)`,
  [businessId, name, email, hash]
);

console.log('Admin pronto:');
console.log('  email:', email);
console.log('  senha:', password);
console.log('\nFaca login em POST /api/auth/login');

await db.end();
