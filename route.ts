import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/database';

export const runtime = 'nodejs';

// GET: 全カテゴリ取得
export async function GET() {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT * FROM categories ORDER BY id ASC');
    client.release();
    return NextResponse.json(result.rows);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST: カテゴリ追加
export async function POST(req: NextRequest) {
  try {
    const { name } = await req.json();
    if (!name) return NextResponse.json({ error: 'カテゴリ名は必須です' }, { status: 400 });
    const client = await pool.connect();
    const result = await client.query('INSERT INTO categories (name) VALUES ($1) RETURNING *', [name]);
    client.release();
    return NextResponse.json(result.rows[0]);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT: カテゴリ名編集
export async function PUT(req: NextRequest) {
  try {
    const { id, name } = await req.json();
    if (!id || !name) return NextResponse.json({ error: 'IDと新しいカテゴリ名は必須です' }, { status: 400 });
    const client = await pool.connect();
    const result = await client.query('UPDATE categories SET name = $1 WHERE id = $2 RETURNING *', [name, id]);
    client.release();
    return NextResponse.json(result.rows[0]);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE: カテゴリ削除
export async function DELETE(req: NextRequest) {
  try {
    const { id } = await req.json();
    if (!id) return NextResponse.json({ error: 'IDは必須です' }, { status: 400 });
    const client = await pool.connect();
    await client.query('DELETE FROM categories WHERE id = $1', [id]);
    client.release();
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
} 