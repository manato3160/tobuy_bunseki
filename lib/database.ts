import { Pool } from 'pg';

// SSL設定を環境変数で切り替え
const isProduction = process.env.NODE_ENV === 'production';
const sslOption = process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false;
console.log('DB_SSL:', process.env.DB_SSL, 'sslOption:', sslOption); // デバッグ用出力

// PostgreSQL接続プールを作成
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || process.env.SUPABASE_DB_URL,
  ssl: sslOption,
});

// 接続テスト
pool.on('connect', () => {
  console.log('Connected to PostgreSQL database');
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  // process.exit(-1); // アプリケーションを終了させない
});

// 接続テスト関数
export async function testDatabaseConnection() {
  try {
    const client = await pool.connect();
    await client.query('SELECT NOW()');
    client.release();
    console.log('Database connection test successful');
    return true;
  } catch (error) {
    console.error('Database connection test failed:', error);
    return false;
  }
}

export default pool; 