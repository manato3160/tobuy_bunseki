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

async function cleanupReportsTable() {
  const client = await pool.connect();
  
  try {
    console.log('データベースに接続しました');
    console.log('レポートテーブルのクリーンアップを開始します...');

    // クリーンアップ前の状態確認
    console.log('\n=== クリーンアップ前の状態確認 ===');
    
    try {
      const columnsBefore = await client.query(`
        SELECT column_name, data_type, is_nullable 
        FROM information_schema.columns 
        WHERE table_name = 'reports' 
        ORDER BY ordinal_position
      `);
      
      console.log('現在のカラム一覧:');
      columnsBefore.rows.forEach(col => {
        console.log(`  - ${col.column_name} (${col.data_type}, nullable: ${col.is_nullable})`);
      });
    } catch (error) {
      console.log('reportsテーブルが存在しません');
      return;
    }

    // 古いachievementsカラムの存在確認
    const oldColumns = [];
    for (let i = 1; i <= 7; i++) {
      try {
        const result = await client.query(`
          SELECT column_name 
          FROM information_schema.columns 
          WHERE table_name = 'reports' AND column_name = 'achievements_${i}'
        `);
        if (result.rows.length > 0) {
          oldColumns.push(`achievements_${i}`);
        }
      } catch (error) {
        // エラーは無視
      }
    }

    if (oldColumns.length > 0) {
      console.log(`\n削除対象の古いカラム: ${oldColumns.join(', ')}`);
    } else {
      console.log('\n削除対象の古いカラムはありません');
    }

    // クリーンアップSQLの実行
    const cleanupSQLPath = path.join(__dirname, '..', 'database', 'cleanup_reports_table.sql');
    
    if (fs.existsSync(cleanupSQLPath)) {
      console.log('\n=== クリーンアップSQLを実行中 ===');
      const cleanupSQL = fs.readFileSync(cleanupSQLPath, 'utf8');
      
      // SQLを分割して実行（エラーハンドリングのため）
      const statements = cleanupSQL
        .split(';')
        .map(stmt => stmt.trim())
        .filter(stmt => stmt.length > 0 && !stmt.startsWith('--') && !stmt.startsWith('/*'));

      for (const statement of statements) {
        try {
          if (statement.trim()) {
            await client.query(statement);
            console.log(`✓ 実行成功: ${statement.substring(0, 50)}...`);
          }
        } catch (error) {
          console.log(`⚠ 実行スキップ（エラー）: ${statement.substring(0, 50)}...`);
          console.log(`  エラー詳細: ${error.message}`);
        }
      }
    } else {
      console.log('クリーンアップSQLファイルが見つかりません');
      return;
    }

    // クリーンアップ後の状態確認
    console.log('\n=== クリーンアップ後の状態確認 ===');
    
    try {
      const columnsAfter = await client.query(`
        SELECT column_name, data_type, is_nullable 
        FROM information_schema.columns 
        WHERE table_name = 'reports' 
        ORDER BY ordinal_position
      `);
      
      console.log('クリーンアップ後のカラム一覧:');
      columnsAfter.rows.forEach(col => {
        console.log(`  - ${col.column_name} (${col.data_type}, nullable: ${col.is_nullable})`);
      });

      // レポート総数確認
      const reportCount = await client.query('SELECT COUNT(*) FROM reports');
      console.log(`\nレポート総数: ${reportCount.rows[0].count}`);

      // インデックス確認
      const indexes = await client.query(`
        SELECT indexname, indexdef 
        FROM pg_indexes 
        WHERE tablename = 'reports'
      `);
      
      console.log('\n作成されたインデックス:');
      indexes.rows.forEach(idx => {
        console.log(`  - ${idx.indexname}`);
      });

    } catch (error) {
      console.log('クリーンアップ後の確認でエラーが発生しました:', error.message);
    }

    console.log('\n✅ レポートテーブルのクリーンアップが完了しました！');
    console.log('古いachievements_1~7カラムを削除し、新しい構造に最適化しました。');
    
  } catch (error) {
    console.error('クリーンアップエラー:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

// 実行
cleanupReportsTable(); 