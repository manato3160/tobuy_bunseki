import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/database';
import bcrypt from 'bcryptjs';

export const runtime = 'nodejs';

// PUT: ユーザー情報更新
export async function PUT(req: NextRequest) {
  try {
    const { userId, name, email, password } = await req.json();
    if (!userId) return NextResponse.json({ error: 'userIdは必須です' }, { status: 400 });
    const client = await pool.connect();
    let query = 'UPDATE users SET';
    const params: any[] = [];
    let idx = 1;
    if (name) { query += ` name = $${idx++},`; params.push(name); }
    if (email) { query += ` email = $${idx++},`; params.push(email); }
    if (password) {
      const hashed = await bcrypt.hash(password, 10);
      query += ` password = $${idx++},`; params.push(hashed);
    }
    if (params.length === 0) {
      client.release();
      return NextResponse.json({ error: '更新項目がありません' }, { status: 400 });
    }
    query = query.replace(/,$/, ''); // 最後のカンマを除去
    query += ` WHERE id = $${idx} RETURNING id, name, email`;
    params.push(userId);
    const result = await client.query(query, params);
    client.release();
    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'ユーザーが見つかりません' }, { status: 404 });
    }
    return NextResponse.json({ user: result.rows[0] });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
} 