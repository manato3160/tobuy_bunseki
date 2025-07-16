"use client"
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

interface Report {
  id: number;
  title: string;
  category: string;
  created_at: string;
  summary: string;
  content?: string;
}

export default function DashboardPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Report | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [editData, setEditData] = useState<Partial<Report>>({});
  const [saving, setSaving] = useState(false);

  const fetchReports = async () => {
    setLoading(true);
    const res = await fetch("/api/reports");
    const json = await res.json();
    setReports(json.reports || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchReports();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 py-12">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold mb-8 text-navy-900">レポートダッシュボード</h1>
        {loading ? (
          <div className="text-center text-lg text-slate-600">読み込み中...</div>
        ) : reports.length === 0 ? (
          <div className="text-center text-lg text-slate-600">レポートがありません</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {reports.map((report) => (
              <Card key={report.id} className="shadow-lg border-0 bg-white/90 cursor-pointer" onClick={() => setSelected(report)}>
                <CardHeader>
                  <CardTitle className="text-xl font-bold text-navy-900">{report.title}</CardTitle>
                  <div className="text-sm text-slate-500 mt-1">{report.category} | {new Date(report.created_at).toLocaleString("ja-JP")}</div>
                </CardHeader>
                <CardContent>
                  <div className="text-slate-700 text-base line-clamp-3">{report.summary}</div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* 詳細モーダル */}
        {selected && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full p-8 relative">
              <button className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 text-2xl" onClick={() => { setSelected(null); setEditMode(false); }}>×</button>
              {!editMode ? (
                <>
                  <h2 className="text-2xl font-bold mb-2">{selected.title}</h2>
                  <div className="text-sm text-slate-500 mb-4">{selected.category} | {new Date(selected.created_at).toLocaleString("ja-JP")}</div>
                  <div className="prose max-w-none mb-6 whitespace-pre-wrap">{selected.content || selected.summary}</div>
                  <div className="flex gap-4">
                    <Button variant="outline" disabled>編集（API未実装）</Button>
                    <Button variant="destructive" disabled>削除（API未実装）</Button>
                  </div>
                </>
              ) : (
                <div className="space-y-4">
                  <Input value={editData.title || ""} onChange={e => setEditData({ ...editData, title: e.target.value })} placeholder="タイトル" />
                  <Input value={editData.category || ""} onChange={e => setEditData({ ...editData, category: e.target.value })} placeholder="カテゴリ" />
                  <Textarea value={editData.content || ""} onChange={e => setEditData({ ...editData, content: e.target.value })} rows={10} placeholder="本文" />
                  <div className="flex gap-4">
                    <Button onClick={() => { setSelected(null); setEditMode(false); }} disabled={saving}>保存</Button>
                    <Button variant="outline" onClick={() => setEditMode(false)}>キャンセル</Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 