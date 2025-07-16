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

async function initDatabase() {
  const client = await pool.connect();
  
  try {
    console.log('データベースに接続しました');

    // 既存のテーブルに新しいカラムを追加（存在しない場合のみ）
    const alterQueries = [
      'ALTER TABLE reports ADD COLUMN IF NOT EXISTS kpi_target VARCHAR(255)',
      'ALTER TABLE reports ADD COLUMN IF NOT EXISTS campaign_name VARCHAR(255)',
      'ALTER TABLE reports ADD COLUMN IF NOT EXISTS product_category VARCHAR(100)',
      'ALTER TABLE reports ADD COLUMN IF NOT EXISTS current_metrics_img VARCHAR(255)',
      'ALTER TABLE reports ADD COLUMN IF NOT EXISTS input_creative VARCHAR(255)',
      'ALTER TABLE reports ADD COLUMN IF NOT EXISTS user_id INTEGER'
    ];

    for (const query of alterQueries) {
      try {
        await client.query(query);
        console.log(`カラム追加成功: ${query}`);
      } catch (error) {
        console.log(`カラム追加スキップ（既に存在）: ${query}`);
      }
    }

    console.log('データベースの初期化が完了しました');
    
  } catch (error) {
    console.error('データベース初期化エラー:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

initDatabase(); 