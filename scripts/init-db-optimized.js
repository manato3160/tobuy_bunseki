const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// 環境変数を読み込み
require('dotenv').config({ path: '.env.local' });

// SSL証明書検証を無効化
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || process.env.SUPABASE_DB_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

async function initOptimizedDatabase() {
  const client = await pool.connect();
  
  try {
    console.log('データベースに接続しました');

    // 最適化されたスキーマを実行
    const optimizedSchemaPath = path.join(__dirname, '..', 'database', 'optimized_schema.sql');
    
    if (fs.existsSync(optimizedSchemaPath)) {
      console.log('最適化されたスキーマファイルを読み込み中...');
      const schemaSQL = fs.readFileSync(optimizedSchemaPath, 'utf8');
      
      // SQLを分割して実行（エラーハンドリングのため）
      const statements = schemaSQL
        .split(';')
        .map(stmt => stmt.trim())
        .filter(stmt => stmt.length > 0 && !stmt.startsWith('--') && !stmt.startsWith('/*'));

      for (const statement of statements) {
        try {
          if (statement.trim()) {
            await client.query(statement);
            console.log(`実行成功: ${statement.substring(0, 50)}...`);
          }
        } catch (error) {
          console.log(`実行スキップ（既に存在またはエラー）: ${statement.substring(0, 50)}...`);
          console.log(`エラー詳細: ${error.message}`);
        }
      }
    } else {
      console.log('最適化されたスキーマファイルが見つかりません。基本スキーマを実行します。');
      
      // 基本的なカラム追加（フォールバック）
      const basicAlterQueries = [
        'ALTER TABLE reports ADD COLUMN IF NOT EXISTS user_id INTEGER',
        'ALTER TABLE reports ADD COLUMN IF NOT EXISTS kpi_target VARCHAR(255)',
        'ALTER TABLE reports ADD COLUMN IF NOT EXISTS campaign_name VARCHAR(255)',
        'ALTER TABLE reports ADD COLUMN IF NOT EXISTS product_category VARCHAR(100)',
        'ALTER TABLE reports ADD COLUMN IF NOT EXISTS current_metrics_img VARCHAR(500)',
        'ALTER TABLE reports ADD COLUMN IF NOT EXISTS input_creative VARCHAR(500)',
        'CREATE INDEX IF NOT EXISTS idx_reports_user_id ON reports(user_id)',
        'CREATE INDEX IF NOT EXISTS idx_reports_created_at ON reports(created_at DESC)',
        'CREATE INDEX IF NOT EXISTS idx_reports_category ON reports(product_category)'
      ];

      for (const query of basicAlterQueries) {
        try {
          await client.query(query);
          console.log(`実行成功: ${query}`);
        } catch (error) {
          console.log(`実行スキップ（既に存在）: ${query}`);
        }
      }
    }

    // データベースの健全性チェック
    console.log('\n=== データベース健全性チェック ===');
    
    try {
      const reportCount = await client.query('SELECT COUNT(*) FROM reports');
      console.log(`レポート総数: ${reportCount.rows[0].count}`);
    } catch (error) {
      console.log('レポートテーブルが存在しません');
    }

    try {
      const userCount = await client.query('SELECT COUNT(*) FROM users');
      console.log(`ユーザー総数: ${userCount.rows[0].count}`);
    } catch (error) {
      console.log('ユーザーテーブルが存在しません');
    }

    try {
      const categoryCount = await client.query('SELECT COUNT(*) FROM categories');
      console.log(`カテゴリ総数: ${categoryCount.rows[0].count}`);
    } catch (error) {
      console.log('カテゴリテーブルが存在しません');
    }

    console.log('\nデータベースの最適化が完了しました');
    
  } catch (error) {
    console.error('データベース最適化エラー:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

// 実行
initOptimizedDatabase(); 