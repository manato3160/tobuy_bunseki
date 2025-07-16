import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/database';
import bcrypt from 'bcryptjs';

export async function POST(req: NextRequest) {
  try {
    const { name, email, password } = await req.json();
    if (!name || !email || !password) {
      return NextResponse.json({ error: '全ての項目を入力してください' }, { status: 400 });
    }
    // 既存ユーザー確認
    const client = await pool.connect();
    const userCheck = await client.query('SELECT id FROM users WHERE email = $1', [email]);
    if (userCheck.rows.length > 0) {
      client.release();
      return NextResponse.json({ error: 'このメールアドレスは既に登録されています' }, { status: 409 });
    }
    // パスワードハッシュ化
    const hashed = await bcrypt.hash(password, 10);
    // ユーザー登録
    const result = await client.query(
      'INSERT INTO users (name, email, password) VALUES ($1, $2, $3) RETURNING id, name, email',
      [name, email, hashed]
    );
    client.release();
    return NextResponse.json({ user: result.rows[0] });
  } catch (error) {
    console.error('register error:', error);
    return NextResponse.json({ error: 'サーバーエラー' }, { status: 500 });
  }
} 