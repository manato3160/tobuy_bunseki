-- 最適化されたデータベーススキーマ
-- 既存のテーブルを安全に更新するためのSQL

-- 1. user_idカラムの追加（存在しない場合のみ）
ALTER TABLE reports ADD COLUMN IF NOT EXISTS user_id INTEGER;

-- 2. user_idに外部キー制約を追加（usersテーブルが存在する場合）
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users') THEN
        -- 外部キー制約が存在しない場合のみ追加
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'fk_reports_user_id' 
            AND table_name = 'reports'
        ) THEN
            ALTER TABLE reports ADD CONSTRAINT fk_reports_user_id 
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;
        END IF;
    END IF;
END $$;

-- 3. パフォーマンス向上のためのインデックス追加
CREATE INDEX IF NOT EXISTS idx_reports_user_id ON reports(user_id);
CREATE INDEX IF NOT EXISTS idx_reports_kpi_target ON reports(kpi_target);
CREATE INDEX IF NOT EXISTS idx_reports_campaign_name ON reports(campaign_name);
CREATE INDEX IF NOT EXISTS idx_reports_product_category ON reports(product_category);
CREATE INDEX IF NOT EXISTS idx_reports_conversation_id ON reports(conversation_id);

-- 4. 複合インデックス（よく使われるクエリパターン用）
CREATE INDEX IF NOT EXISTS idx_reports_user_created ON reports(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reports_category_created ON reports(product_category, created_at DESC);

-- 5. ファイル関連カラムの型最適化（より長いファイルIDに対応）
ALTER TABLE reports ALTER COLUMN current_metrics_img TYPE VARCHAR(500);
ALTER TABLE reports ALTER COLUMN input_creative TYPE VARCHAR(500);

-- 6. 必須項目の制約追加（データ整合性向上）
ALTER TABLE reports ALTER COLUMN kpi_target SET NOT NULL;
ALTER TABLE reports ALTER COLUMN campaign_name SET NOT NULL;
ALTER TABLE reports ALTER COLUMN product_category SET NOT NULL;

-- 7. デフォルト値の設定
ALTER TABLE reports ALTER COLUMN current_metrics_img SET DEFAULT '';
ALTER TABLE reports ALTER COLUMN input_creative SET DEFAULT '';

-- 8. 既存のNULL値を空文字に更新（制約追加前の準備）
UPDATE reports SET current_metrics_img = '' WHERE current_metrics_img IS NULL;
UPDATE reports SET input_creative = '' WHERE input_creative IS NULL;

-- 9. テーブル統計情報の更新（クエリプランナーの最適化）
ANALYZE reports;

-- 10. パフォーマンス監視用のビュー作成
CREATE OR REPLACE VIEW reports_summary AS
SELECT 
    COUNT(*) as total_reports,
    COUNT(DISTINCT user_id) as unique_users,
    COUNT(CASE WHEN current_metrics_img != '' THEN 1 END) as reports_with_images,
    COUNT(CASE WHEN input_creative != '' THEN 1 END) as reports_with_videos,
    AVG(LENGTH(content)) as avg_content_length,
    MAX(created_at) as latest_report_date
FROM reports;

-- 11. 月別レポート統計ビュー
CREATE OR REPLACE VIEW monthly_reports_stats AS
SELECT 
    DATE_TRUNC('month', created_at) as month,
    COUNT(*) as report_count,
    COUNT(DISTINCT user_id) as active_users,
    COUNT(CASE WHEN current_metrics_img != '' THEN 1 END) as reports_with_images,
    COUNT(CASE WHEN input_creative != '' THEN 1 END) as reports_with_videos
FROM reports 
GROUP BY DATE_TRUNC('month', created_at)
ORDER BY month DESC;

-- 12. ユーザー別レポート統計ビュー
CREATE OR REPLACE VIEW user_reports_stats AS
SELECT 
    u.id,
    u.name,
    u.email,
    COUNT(r.id) as total_reports,
    MAX(r.created_at) as last_report_date,
    AVG(LENGTH(r.content)) as avg_content_length
FROM users u
LEFT JOIN reports r ON u.id = r.user_id
GROUP BY u.id, u.name, u.email
ORDER BY total_reports DESC;

-- 13. データベースの健全性チェック用クエリ
-- 以下のクエリでデータベースの状態を確認できます：
/*
-- レポート総数
SELECT COUNT(*) FROM reports;

-- ユーザー別レポート数
SELECT user_id, COUNT(*) FROM reports GROUP BY user_id;

-- 最新のレポート
SELECT * FROM reports ORDER BY created_at DESC LIMIT 5;

-- 統計情報
SELECT * FROM reports_summary;
*/ 