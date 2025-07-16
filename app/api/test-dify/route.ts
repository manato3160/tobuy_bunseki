import { NextResponse } from "next/server";

export async function GET() {
  try {
    // 環境変数の確認
    const envCheck = {
      NEXT_PUBLIC_DIFY_API_BASE_URL: process.env.NEXT_PUBLIC_DIFY_API_BASE_URL,
      DIFY_API_KEY_EXISTS: !!process.env.DIFY_API_KEY,
      DATABASE_URL_EXISTS: !!process.env.DATABASE_URL,
      DB_SSL: process.env.DB_SSL,
    };

    console.log('Environment variables check:', envCheck);

    // 必須環境変数の検証
    if (!process.env.NEXT_PUBLIC_DIFY_API_BASE_URL) {
      return NextResponse.json({ 
        error: 'NEXT_PUBLIC_DIFY_API_BASE_URL is not set',
        envCheck 
      }, { status: 500 });
    }

    if (!process.env.DIFY_API_KEY) {
      return NextResponse.json({ 
        error: 'DIFY_API_KEY is not set',
        envCheck 
      }, { status: 500 });
    }

    // Dify APIの接続テスト
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_DIFY_API_BASE_URL}/workspaces/current`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${process.env.DIFY_API_KEY}`,
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        const data = await response.json();
        return NextResponse.json({ 
          success: true, 
          message: 'Dify API connection successful',
          workspace: data,
          envCheck 
        });
      } else {
        const errorText = await response.text();
        return NextResponse.json({ 
          error: `Dify API connection failed: ${response.status} - ${errorText}`,
          envCheck 
        }, { status: 500 });
      }
    } catch (apiError) {
      return NextResponse.json({ 
        error: `Dify API connection error: ${apiError instanceof Error ? apiError.message : 'Unknown error'}`,
        envCheck 
      }, { status: 500 });
    }

  } catch (error) {
    return NextResponse.json({ 
      error: `Server error: ${error instanceof Error ? error.message : 'Unknown error'}` 
    }, { status: 500 });
  }
} 