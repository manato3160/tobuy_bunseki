export const runtime = 'nodejs';
import { NextRequest, NextResponse } from "next/server";
import { Readable } from "stream";
import pool, { testDatabaseConnection } from "@/lib/database";

// SSL証明書検証を無効化
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

// PostgreSQLにレポートを保存する関数
async function saveReportToDatabase(report: any) {
  console.log('Saving report to database:', report);
  
  const client = await pool.connect();
  try {
    const query = `
      INSERT INTO reports (
        title, category, summary, content, conversation_id,
        kpi_target, campaign_name, product_category,
        current_metrics_img, input_creative, user_id
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING id, created_at
    `;
    
    const values = [
      report.title,
      report.category,
      report.summary,
      report.content,
      report.conversation_id,
      report.kpi_target,
      report.campaign_name,
      report.product_category,
      report.current_metrics_img,
      report.input_creative,
      report.user_id || null
    ];
    
    const result = await client.query(query, values);
    console.log('Report saved to database:', result.rows[0]);
    return result.rows[0];
  } finally {
    client.release();
  }
}

// Dify APIにファイルをアップロードするヘルパー関数
async function uploadFileToDify(file: File, user: string): Promise<string> {
  console.log('Uploading file to Dify:', {
    fileName: file.name,
    fileSize: file.size,
    fileType: file.type,
    user: user
  });

  const formData = new FormData();
  formData.append("file", file);
  formData.append("user", user);

  const uploadUrl = `${process.env.NEXT_PUBLIC_DIFY_API_BASE_URL}/files/upload`;
  console.log('Upload URL:', uploadUrl);

  const response = await fetch(uploadUrl, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${process.env.DIFY_API_KEY}`,
    },
    body: formData,
  });

  console.log('Upload response status:', response.status);
  console.log('Upload response headers:', Object.fromEntries(response.headers.entries()));

  if (!response.ok) {
    const contentType = response.headers.get("content-type");
    let errorBody = "";
    if (contentType && contentType.includes("application/json")) {
      const errorJson = await response.json();
      errorBody = errorJson.message || JSON.stringify(errorJson);
      console.error('Dify API JSON error:', errorJson);
    } else {
      errorBody = await response.text();
      console.error("Dify API returned non-JSON response:", errorBody);
    }
    throw new Error(`File upload failed with status ${response.status}: ${errorBody}`);
  }

  const result = await response.json();
  console.log('Upload successful, file ID:', result.id);
  return result.id; // アップロードされたファイルのIDを返す
}

export async function POST(req: NextRequest) {
  try {
    console.log('API endpoint called');
    
    // 環境変数の確認
    console.log('Environment variables check:');
    console.log('NEXT_PUBLIC_DIFY_API_BASE_URL:', process.env.NEXT_PUBLIC_DIFY_API_BASE_URL);
    console.log('DIFY_API_KEY exists:', !!process.env.DIFY_API_KEY);
    console.log('DATABASE_URL exists:', !!process.env.DATABASE_URL);
    
    // 環境変数の検証
    if (!process.env.NEXT_PUBLIC_DIFY_API_BASE_URL) {
      throw new Error('NEXT_PUBLIC_DIFY_API_BASE_URL environment variable is not set');
    }
    if (!process.env.DIFY_API_KEY) {
      throw new Error('DIFY_API_KEY environment variable is not set');
    }
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL environment variable is not set');
    }
    
    // データベース接続テスト
    console.log('Testing database connection...');
    const dbConnected = await testDatabaseConnection();
    if (!dbConnected) {
      throw new Error('Database connection failed');
    }
    
    const formData = await req.formData();
    console.log('Form data received');
    
    // フロントエンドから送信されたフォームデータを取得
    const kpiTarget = formData.get("kpiTarget") as string;
    const campaignName = formData.get("campaignName") as string;
    const productCategory = formData.get("productCategory") as string;
    const currentMetricsImg = formData.get("currentMetricsImg") as File | null;
    const inputCreative = formData.get("inputCreative") as File | null;
    const conversationId = formData.get("conversationId") as string | null;
    const editInstructions = formData.get("editInstructions") as string | null;
    const userId = formData.get("userId") ? Number(formData.get("userId")) : null;
    const comment = formData.get("comment") as string | null; // コメント欄を追加

    console.log('Form data parsed:', {
      kpiTarget,
      campaignName,
      productCategory,
      hasCurrentMetricsImg: !!currentMetricsImg,
      hasInputCreative: !!inputCreative,
    });

    // ファイルをDifyにアップロード
    let currentMetricsImgId = null;
    let inputCreativeId = null;
    const uploadedFileIds: { type: string, transfer_method: string, upload_file_id: string }[] = [];

    if (currentMetricsImg) {
      console.log('Uploading current metrics image to Dify...');
      try {
        const imageId = await uploadFileToDify(currentMetricsImg, "tobuy-report-user");
        console.log('Current metrics image uploaded successfully, ID:', imageId);
        uploadedFileIds.push({
          type: "image",
          transfer_method: "local_file",
          upload_file_id: imageId,
        });
        currentMetricsImgId = imageId;
      } catch (error) {
        console.error('Current metrics image upload failed:', error);
        throw error;
      }
    }

    if (inputCreative) {
      console.log('Uploading input creative (video) to Dify...');
      try {
        const videoId = await uploadFileToDify(inputCreative, "tobuy-report-user");
        console.log('Input creative uploaded successfully, ID:', videoId);
        uploadedFileIds.push({
          type: "video",
          transfer_method: "local_file",
          upload_file_id: videoId,
        });
        inputCreativeId = videoId;
      } catch (error) {
        console.error('Input creative upload failed:', error);
        throw error;
      }
    }
    
    // Difyの`/chat-messages`に送信するリクエストボディを構築
    const difyRequestBody = {
      inputs: {
        kpi_target: kpiTarget,
        campaign_name: campaignName,
        product_category: productCategory,
        current_metrics_img: uploadedFileIds.find(file => file.type === "image") || null,
        input_creative: uploadedFileIds.find(file => file.type === "video") || null,
        ...(comment ? { comment } : {}), // コメントがあれば追加
      },
      query: editInstructions ? `内容: ${editInstructions}` : "レポート作成開始",
      user: "tobuy-report-user",
      response_mode: "streaming",
      conversation_id: conversationId || "",
      files: uploadedFileIds,
    };

    console.log('Sending request to Dify API...');
    console.log('Dify request body:', JSON.stringify(difyRequestBody, null, 2));

    // Dify APIを呼び出す
    const difyResponse = await fetch(`${process.env.NEXT_PUBLIC_DIFY_API_BASE_URL}/chat-messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.DIFY_API_KEY}`,
      },
      body: JSON.stringify(difyRequestBody),
    });

    console.log('Dify API response status:', difyResponse.status);

    if (!difyResponse.ok || !difyResponse.body) {
      const errorText = await difyResponse.text();
      console.error('Dify API error response:', errorText);
      throw new Error(`Dify API error: ${difyResponse.statusText} - ${errorText}`);
    }

    console.log('Dify API response successful, starting stream processing...');

    // ストリームを処理してPostgreSQLに保存しつつ、クライアントにも中継する
    const reader = difyResponse.body.getReader();
    const decoder = new TextDecoder();
    let fullReportContent = "";
    let finalConversationId = conversationId || "";

    const stream = new ReadableStream({
      async start(controller) {
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            
            const chunk = decoder.decode(value, { stream: true });
            // クライアントにチャンクをそのまま送信
            controller.enqueue(value);

            // サーバー側で完全なレポートを構築
            const lines = chunk.split('\n\n').filter(line => line.startsWith('data: '));
            for (const line of lines) {
              const jsonStr = line.replace('data: ', '');
              try {
                const parsed = JSON.parse(jsonStr);
                if (parsed.event === 'message') {
                  fullReportContent += parsed.answer;
                }
                if (parsed.conversation_id) {
                  finalConversationId = parsed.conversation_id;
                }
                // ストリームの最後にPostgreSQLへ保存
                if (parsed.event === 'message_end') {
                  console.log('Saving report to database...');
                  try {
                    await saveReportToDatabase({
                      title: campaignName,
                      category: productCategory,
                      summary: `KPI目標: ${kpiTarget}`,
                      content: fullReportContent,
                      conversation_id: finalConversationId,
                      kpi_target: kpiTarget,
                      campaign_name: campaignName,
                      product_category: productCategory,
                      current_metrics_img: currentMetricsImgId,
                      input_creative: inputCreativeId,
                      user_id: userId
                    });
                    console.log('Report saved to database successfully');
                  } catch (dbError) {
                    console.error('Database save error:', dbError);
                    // データベースエラーでもストリームは継続
                  }
                }
              } catch (e) { 
                console.error('JSON parse error:', e);
                // ignore parse errors 
              }
            }
          }
          controller.close();
        } catch (streamError) {
          console.error('Stream processing error:', streamError);
          controller.error(streamError);
        }
      }
    });

    return new Response(stream, {
      headers: { "Content-Type": "text/event-stream; charset=utf-8" },
    });
  } catch (error) {
    console.error('API endpoint error:', error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
} 