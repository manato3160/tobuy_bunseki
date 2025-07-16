import { NextResponse } from "next/server";
import pool from "@/lib/database";

export const runtime = 'nodejs';

export async function GET() {
  // SSL証明書検証を無効化
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
  
  try {
    const client = await pool.connect();
    try {
      // まずテーブルの存在確認
      const tableCheckQuery = `
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'reports'
        );
      `;
      
      const tableExists = await client.query(tableCheckQuery);
      console.log('Table exists:', tableExists.rows[0].exists);
      
      if (!tableExists.rows[0].exists) {
        return NextResponse.json({ error: 'Reports table does not exist' }, { status: 500 });
      }
      
      // シンプルなクエリでテスト
      const query = `SELECT reports.*, users.name as user_name FROM reports LEFT JOIN users ON reports.user_id = users.id ORDER BY reports.created_at DESC LIMIT 20`;
      
      const result = await client.query(query);
      console.log('Query result:', result.rows);
      return NextResponse.json(result.rows);
    } finally {
      client.release();
    }
  } catch (error) {
    // 詳細なエラー内容をコンソールに出力
    console.error('Database error details:', error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  // SSL証明書検証を無効化
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
  
  try {
    const { ids } = await request.json();
    
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'Invalid or empty ids array' }, { status: 400 });
    }
    
    const client = await pool.connect();
    try {
      // 複数のIDを削除するクエリ
      const placeholders = ids.map((_, index) => `$${index + 1}`).join(',');
      const query = `DELETE FROM reports WHERE id = ANY($1::int[]) RETURNING id`;
      
      const result = await client.query(query, [ids]);
      console.log(`Deleted ${result.rowCount} reports`);
      
      return NextResponse.json({ 
        success: true, 
        deletedCount: result.rowCount,
        deletedIds: result.rows.map(row => row.id)
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Delete error:', error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
} 