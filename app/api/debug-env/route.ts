import { NextResponse } from "next/server";

export async function GET() {
  try {
    // 環境変数の詳細確認
    const envDetails = {
      NEXT_PUBLIC_DIFY_API_BASE_URL: process.env.NEXT_PUBLIC_DIFY_API_BASE_URL,
      DIFY_API_KEY_PREFIX: process.env.DIFY_API_KEY ? process.env.DIFY_API_KEY.substring(0, 10) + '...' : 'NOT_SET',
      DATABASE_URL_PREFIX: process.env.DATABASE_URL ? process.env.DATABASE_URL.substring(0, 20) + '...' : 'NOT_SET',
      DB_SSL: process.env.DB_SSL,
      NODE_ENV: process.env.NODE_ENV,
    };

    // Dify APIのベースURLをテスト（複数のパターン）
    const baseUrl = 'https://dify.aibase.buzz';
    const testUrls = [
      `${baseUrl}/v1`,
      `${baseUrl}/api/v1`,
      `${baseUrl}/v1/api`,
      `${baseUrl}`,
      'https://api.dify.ai/v1',
      process.env.NEXT_PUBLIC_DIFY_API_BASE_URL
    ].filter(Boolean);

    const urlTests = [];
    
    for (const url of testUrls) {
      try {
        console.log(`Testing URL: ${url}/workspaces/current`);
        const response = await fetch(`${url}/workspaces/current`, {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${process.env.DIFY_API_KEY}`,
            "Content-Type": "application/json",
          },
        });
        
        let responseText = '';
        try {
          responseText = await response.text();
        } catch (e) {
          responseText = 'Could not read response text';
        }
        
        urlTests.push({
          url: `${url}/workspaces/current`,
          status: response.status,
          ok: response.ok,
          statusText: response.statusText,
          responsePreview: responseText.substring(0, 200) + (responseText.length > 200 ? '...' : '')
        });
      } catch (error) {
        urlTests.push({
          url: `${url}/workspaces/current`,
          status: 'ERROR',
          ok: false,
          statusText: error instanceof Error ? error.message : 'Unknown error',
          responsePreview: ''
        });
      }
    }

    return NextResponse.json({
      envDetails,
      urlTests,
      message: 'Environment variables debug information'
    });

  } catch (error) {
    return NextResponse.json({ 
      error: `Debug error: ${error instanceof Error ? error.message : 'Unknown error'}` 
    }, { status: 500 });
  }
} 