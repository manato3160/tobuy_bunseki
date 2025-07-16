-- レポートテーブルのクリーンアップと最適化SQL
-- 古いachievements_1~7カラムを削除し、新しい構造に変更

-- 1. 古いカラムの削除（安全に実行）
DO $$
BEGIN
    -- achievements_1からachievements_7のカラムを削除
    FOR i IN 1..7 LOOP
        EXECUTE format('ALTER TABLE reports DROP COLUMN IF EXISTS achievements_%s', i);
        RAISE NOTICE 'achievements_% カラムを削除しました', i;
    END LOOP;
END $$;

-- 2. 新しいカラムの追加（存在しない場合のみ）
ALTER TABLE reports ADD COLUMN IF NOT EXISTS user_id INTEGER;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS kpi_target VARCHAR(255);
ALTER TABLE reports ADD COLUMN IF NOT EXISTS campaign_name VARCHAR(255);
ALTER TABLE reports ADD COLUMN IF NOT EXISTS product_category VARCHAR(100);
ALTER TABLE reports ADD COLUMN IF NOT EXISTS current_metrics_img VARCHAR(500);
ALTER TABLE reports ADD COLUMN IF NOT EXISTS input_creative VARCHAR(500);

-- 3. カラムの型最適化
ALTER TABLE reports ALTER COLUMN current_metrics_img TYPE VARCHAR(500);
ALTER TABLE reports ALTER COLUMN input_creative TYPE VARCHAR(500);

-- 4. デフォルト値の設定
ALTER TABLE reports ALTER COLUMN current_metrics_img SET DEFAULT '';
ALTER TABLE reports ALTER COLUMN input_creative SET DEFAULT '';

-- 5. 既存のNULL値を空文字に更新
UPDATE reports SET current_metrics_img = '' WHERE current_metrics_img IS NULL;
UPDATE reports SET input_creative = '' WHERE input_creative IS NULL;

-- 6. 必須項目の制約追加（データ整合性向上）
-- 注意: 既存データがある場合は、まずデータを確認してから実行
DO $$
BEGIN
    -- kpi_targetがNULLでないレコードのみ制約を追加
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'reports_kpi_target_not_null' 
        AND table_name = 'reports'
    ) THEN
        -- 一時的に制約を追加（既存のNULLデータがある場合は失敗する）
        BEGIN
            ALTER TABLE reports ALTER COLUMN kpi_target SET NOT NULL;
            RAISE NOTICE 'kpi_targetにNOT NULL制約を追加しました';
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'kpi_targetにNOT NULL制約を追加できませんでした（NULLデータが存在）';
        END;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'reports_campaign_name_not_null' 
        AND table_name = 'reports'
    ) THEN
        BEGIN
            ALTER TABLE reports ALTER COLUMN campaign_name SET NOT NULL;
            RAISE NOTICE 'campaign_nameにNOT NULL制約を追加しました';
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'campaign_nameにNOT NULL制約を追加できませんでした（NULLデータが存在）';
        END;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'reports_product_category_not_null' 
        AND table_name = 'reports'
    ) THEN
        BEGIN
            ALTER TABLE reports ALTER COLUMN product_category SET NOT NULL;
            RAISE NOTICE 'product_categoryにNOT NULL制約を追加しました';
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'product_categoryにNOT NULL制約を追加できませんでした（NULLデータが存在）';
        END;
    END IF;
END $$;

-- 7. 外部キー制約の追加（usersテーブルが存在する場合）
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users') THEN
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'fk_reports_user_id' 
            AND table_name = 'reports'
        ) THEN
            ALTER TABLE reports ADD CONSTRAINT fk_reports_user_id 
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;
            RAISE NOTICE 'user_idに外部キー制約を追加しました';
        END IF;
    END IF;
END $$;

-- 8. インデックスの最適化
-- 古いインデックスを削除（存在する場合）
DROP INDEX IF EXISTS idx_reports_achievements_1;
DROP INDEX IF EXISTS idx_reports_achievements_2;
DROP INDEX IF EXISTS idx_reports_achievements_3;
DROP INDEX IF EXISTS idx_reports_achievements_4;
DROP INDEX IF EXISTS idx_reports_achievements_5;
DROP INDEX IF EXISTS idx_reports_achievements_6;
DROP INDEX IF EXISTS idx_reports_achievements_7;

-- 新しいインデックスを作成
CREATE INDEX IF NOT EXISTS idx_reports_user_id ON reports(user_id);
CREATE INDEX IF NOT EXISTS idx_reports_kpi_target ON reports(kpi_target);
CREATE INDEX IF NOT EXISTS idx_reports_campaign_name ON reports(campaign_name);
CREATE INDEX IF NOT EXISTS idx_reports_product_category ON reports(product_category);
CREATE INDEX IF NOT EXISTS idx_reports_conversation_id ON reports(conversation_id);
CREATE INDEX IF NOT EXISTS idx_reports_created_at ON reports(created_at DESC);

-- 複合インデックス（よく使われるクエリパターン用）
CREATE INDEX IF NOT EXISTS idx_reports_user_created ON reports(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reports_category_created ON reports(product_category, created_at DESC);

-- 9. テーブル統計情報の更新
ANALYZE reports;

-- 10. クリーンアップ後の確認クエリ
-- 以下のクエリでテーブル構造を確認できます：
/*
-- 現在のカラム一覧
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'reports' 
ORDER BY ordinal_position;

-- レポート総数
SELECT COUNT(*) as total_reports FROM reports;

-- ユーザー別レポート数
SELECT user_id, COUNT(*) as report_count 
FROM reports 
GROUP BY user_id 
ORDER BY report_count DESC;

-- 最新のレポート
SELECT id, title, campaign_name, product_category, created_at 
FROM reports 
ORDER BY created_at DESC 
LIMIT 5;

-- ファイル添付状況
SELECT 
    COUNT(*) as total_reports,
    COUNT(CASE WHEN current_metrics_img != '' THEN 1 END) as with_images,
    COUNT(CASE WHEN input_creative != '' THEN 1 END) as with_videos
FROM reports;
*/

-- 11. 完了メッセージ
DO $$
BEGIN
    RAISE NOTICE 'レポートテーブルのクリーンアップが完了しました！';
    RAISE NOTICE '古いachievements_1~7カラムを削除し、新しい構造に最適化しました。';
END $$; 