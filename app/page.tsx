"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import {
  FileText,
  CheckCircle,
  Edit,
  Sparkles,
  BarChart3,
  Target,
  Users,
  ImageIcon,
  Video,
  MessageSquare,
  ArrowRight,
  Zap,
  Menu,
  X,
  TrendingUp,
  Clock,
  Shield,
  Star,
  Check,
  RefreshCw,
  Settings,
} from "lucide-react"
import {
  SidebarProvider,
  Sidebar,
  SidebarMenu,
  SidebarMenuButton,
  SidebarContent,
} from "@/components/ui/sidebar"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion"

interface FormData {
  kpiTarget: string
  campaignName: string
  productCategory: string
  currentMetricsImg: File | null
  inputCreative: File | null
}

// reportHistoryの型をDBのカラムに合わせる
interface ReportHistoryItem {
  id: number;
  title: string;
  category: string | null;
  created_at: string;
  summary: string | null;
  content: string | null;
  conversation_id: string | null;
  user_id?: number | null;
  user_name?: string | null;
}

type AppState = "home" | "dashboard" | "report" | "generating" | "generated"

export default function TobuyReportTool() {
  const [currentState, setCurrentState] = useState<AppState>("home")
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [formData, setFormData] = useState<FormData>({
    kpiTarget: "",
    campaignName: "",
    productCategory: "",
    currentMetricsImg: null,
    inputCreative: null,
  })
  const [generatedReport, setGeneratedReport] = useState("")
  const [editInstructions, setEditInstructions] = useState("")
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [progress, setProgress] = useState(0)
  const [reportHistory, setReportHistory] = useState<ReportHistoryItem[]>([])
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [authView, setAuthView] = useState<'none' | 'login' | 'register'>('none')
  const [authForm, setAuthForm] = useState({ name: '', email: '', password: '' })
  const [authError, setAuthError] = useState('')
  const passwordRef = useRef<HTMLInputElement>(null)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [user, setUser] = useState<{ id: number; name: string; email: string } | null>(null)
  const [selectedReport, setSelectedReport] = useState<ReportHistoryItem | null>(null)
  const [copied, setCopied] = useState(false)
  const [showCompleteMsg, setShowCompleteMsg] = useState(false)
  const [lastGeneratedReport, setLastGeneratedReport] = useState<any>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [settingsTab, setSettingsTab] = useState<'report' | 'account'>('report')
  const [categories, setCategories] = useState<{id: number, name: string}[]>([])
  const [categoriesLoading, setCategoriesLoading] = useState(false)
  const [newCategory, setNewCategory] = useState('')
  const [editAccount, setEditAccount] = useState<{ name: string; email: string; password: string }>({ name: '', email: '', password: '' })
  const [accountEditMsg, setAccountEditMsg] = useState<string | null>(null)
  const [selectedReports, setSelectedReports] = useState<number[]>([])
  const [selectAll, setSelectAll] = useState(false)

  // ダッシュボード表示時にレポート履歴を取得する
  useEffect(() => {
    const fetchReports = async () => {
      try {
        const response = await fetch('/api/reports');
        if (!response.ok) {
          throw new Error('Failed to fetch reports');
        }
        const data = await response.json();
        setReportHistory(data);
      } catch (error) {
        console.error(error);
      }
    };

    if (currentState === 'dashboard') {
      fetchReports();
    }
  }, [currentState]); // currentStateが変更されるたびに実行

  // カテゴリ一覧取得
  const fetchCategories = async () => {
    setCategoriesLoading(true);
    try {
      const res = await fetch('/api/categories');
      if (res.ok) {
        const data = await res.json();
        setCategories(data);
      }
    } finally {
      setCategoriesLoading(false);
    }
  };

  // 設定モーダルを開いた時にカテゴリ取得
  useEffect(() => {
    if (settingsOpen) fetchCategories();
  }, [settingsOpen]);

  // 初回マウント時にも取得
  useEffect(() => { fetchCategories(); }, []);

  useEffect(() => {
    if (settingsTab === 'account' && user) {
      setEditAccount({ name: user.name, email: user.email, password: '' });
    }
  }, [settingsTab, user]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.kpiTarget) newErrors.kpiTarget = "KPI（再生数）は必須項目です"
    else if (!/^\d+$/.test(formData.kpiTarget)) newErrors.kpiTarget = "KPI（再生数）は数字のみ入力してください"
    
    if (!formData.campaignName) newErrors.campaignName = "施策タイトル／商品名は必須項目です"
    if (!formData.productCategory) newErrors.productCategory = "商品カテゴリは必須項目です"
    if (!formData.currentMetricsImg) newErrors.currentMetricsImg = "現在のメトリクス画像は必須項目です"
    if (!formData.inputCreative) newErrors.inputCreative = "入力クリエイティブは必須項目です"

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleFileUpload = (field: "currentMetricsImg" | "inputCreative", file: File | null) => {
    setFormData((prev) => ({ ...prev, [field]: file }))
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }))
    }
  }

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }))
    }
  }

  const generateReport = async () => {
    if (!validateForm()) return

    setCurrentState("generating")
    setProgress(0)
    setGeneratedReport("")

    const body = new FormData()
    body.append("kpiTarget", formData.kpiTarget)
    body.append("campaignName", formData.campaignName)
    body.append("productCategory", formData.productCategory)
    if (formData.currentMetricsImg) body.append("currentMetricsImg", formData.currentMetricsImg)
    if (formData.inputCreative) body.append("inputCreative", formData.inputCreative)
    if (user && user.id) body.append("userId", String(user.id))
    
    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        body: body,
      })

      if (!response.ok || !response.body) {
        throw new Error("API request failed")
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let chunkCount = 0;
      const maxChunks = 30; // 仮の最大チャンク数
      let fullReport = "";
      let lastParsed: any = null;

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        chunkCount++;
        setProgress(Math.min(90, Math.round((chunkCount / maxChunks) * 90)));
        const chunk = decoder.decode(value)
        const lines = chunk.split("\n\n").filter(line => line.startsWith("data: "))

        for (const line of lines) {
          const jsonStr = line.replace("data: ", "")
          try {
            const parsed = JSON.parse(jsonStr)
            lastParsed = parsed;
            if (parsed.event === "message") {
              setGeneratedReport((prev) => prev + parsed.answer)
              fullReport += parsed.answer;
            }
            if (parsed.conversation_id) {
              setConversationId(parsed.conversation_id)
            }
            if (parsed.event === 'message_end') {
              // ストリーム終了
            }
          } catch (e) {
            // console.error("Failed to parse stream chunk:", jsonStr)
          }
        }
      }
      setProgress(100);
      setCurrentState("generated")
      // 直近の生成レポート情報を保存
      setLastGeneratedReport({
        title: formData.campaignName,
        category: formData.productCategory,
        created_at: new Date().toISOString(),
        summary: `KPI目標: ${formData.kpiTarget}`,
        content: fullReport,
        conversation_id: lastParsed?.conversation_id || null,
        id: Date.now(), // 仮ID
        user_id: user?.id || null,
        user_name: user?.name || null,
      });
    } catch (error) {
      console.error("Report generation failed:", error)
      // エラーメッセージをユーザーに表示
      alert(`レポート生成に失敗しました: ${error instanceof Error ? error.message : '不明なエラー'}`)
      setCurrentState("report")
    }
  }

  const handleEdit = () => {
    setCurrentState("report")
  }

  const submitEdit = async () => {
    if (!editInstructions.trim() || !conversationId) return

    setCurrentState("generating")
    setProgress(0)

    const body = new FormData()
    body.append("kpiTarget", formData.kpiTarget)
    body.append("campaignName", formData.campaignName)
    body.append("productCategory", formData.productCategory)
    if (formData.currentMetricsImg) body.append("currentMetricsImg", formData.currentMetricsImg)
    if (formData.inputCreative) body.append("inputCreative", formData.inputCreative)
    body.append("conversationId", conversationId)
    body.append("editInstructions", editInstructions)
    if (user && user.id) body.append("userId", String(user.id))

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        body: body,
      })

      if (!response.ok || !response.body) {
        throw new Error("API request failed")
      }
      
      setGeneratedReport("")

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let chunkCount = 0;
      const maxChunks = 30; // 仮の最大チャンク数

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        chunkCount++;
        setProgress(Math.min(90, Math.round((chunkCount / maxChunks) * 90)));
        const chunk = decoder.decode(value)
        const lines = chunk.split("\n\n").filter(line => line.startsWith("data: "))

        for (const line of lines) {
          const jsonStr = line.replace("data: ", "")
          try {
            const parsed = JSON.parse(jsonStr)
            if (parsed.event === "message") {
              setGeneratedReport((prev) => prev + parsed.answer)
            }
          } catch (e) {
            // console.error("Failed to parse stream chunk:", jsonStr)
          }
        }
      }
      setProgress(100);
      setCurrentState("generated")
      setEditInstructions("")
    } catch(error) {
      console.error("Report editing failed:", error)
      // エラーメッセージをユーザーに表示
      alert(`修正依頼に失敗しました: ${error instanceof Error ? error.message : '不明なエラー'}`)
      setCurrentState("generated")
    }
  }

  const completeProcess = async () => {
    // 直近の生成レポートがある場合のみ履歴を再取得
    if (lastGeneratedReport) {
      setShowCompleteMsg(true);
      setTimeout(() => setShowCompleteMsg(false), 1800);
      setLastGeneratedReport(null);
      // DBから最新の履歴を取得
      try {
        const response = await fetch('/api/reports');
        if (response.ok) {
          const data = await response.json();
          setReportHistory(data);
        }
      } catch (error) {
        // エラー時は何もしない
      }
    }
    setCurrentState("dashboard")
  }

  const resetForm = () => {
    setCurrentState("home")
    setFormData({
      kpiTarget: "",
      campaignName: "",
      productCategory: "",
      currentMetricsImg: null,
      inputCreative: null,
    })
    setGeneratedReport("")
    setEditInstructions("")
    setErrors({})
    setProgress(0)
  }

  const getFormProgress = () => {
    const requiredFields = [
      formData.kpiTarget,
      formData.campaignName,
      formData.productCategory,
      formData.currentMetricsImg,
      formData.inputCreative,
    ]
    const filledFields = requiredFields.filter(Boolean).length
    return Math.round((filledFields / requiredFields.length) * 100)
  }

  const isFormValid = Boolean(
    formData.kpiTarget &&
      formData.campaignName &&
      formData.productCategory &&
      formData.currentMetricsImg &&
      formData.inputCreative,
  )

  // デバッグ用の情報を追加
  const getValidationStatus = () => {
    return {
      kpiTarget: Boolean(formData.kpiTarget),
      campaignName: Boolean(formData.campaignName),
      productCategory: Boolean(formData.productCategory),
      currentMetricsImg: Boolean(formData.currentMetricsImg),
      inputCreative: Boolean(formData.inputCreative),
    }
  }

  // 今月の生成数をカウント
  const getCurrentMonthCount = () => {
    const now = new Date();
    const thisMonth = now.getMonth();
    const thisYear = now.getFullYear();
    return reportHistory.filter(item => {
      const d = new Date(item.created_at);
      return d.getFullYear() === thisYear && d.getMonth() === thisMonth;
    }).length;
  };

  // レポート削除処理
  const handleDeleteReport = async (id: number) => {
    if (!window.confirm('本当にこのレポートを削除しますか？')) return;
    try {
      const res = await fetch('/api/reports', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      if (res.ok) {
        // 削除後に履歴を再取得
        const response = await fetch('/api/reports');
        if (response.ok) {
          const data = await response.json();
          setReportHistory(data);
        }
      } else {
        alert('削除に失敗しました');
      }
    } catch (e) {
      alert('削除時にエラーが発生しました');
    }
  };

  // レポート選択処理
  const handleReportSelect = (id: number) => {
    setSelectedReports(prev => {
      if (prev.includes(id)) {
        return prev.filter(reportId => reportId !== id);
      } else {
        return [...prev, id];
      }
    });
  };

  // 選択状態が変更されたときに全選択状態を更新
  useEffect(() => {
    if (reportHistory.length === 0) {
      setSelectAll(false);
      return;
    }
    
    const allSelected = reportHistory.every(report => selectedReports.includes(report.id));
    setSelectAll(allSelected);
  }, [selectedReports, reportHistory]);

  // 全選択/全解除処理
  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedReports([]);
      setSelectAll(false);
    } else {
      setSelectedReports(reportHistory.map(report => report.id));
      setSelectAll(true);
    }
  };

  // 選択したレポートを削除
  const handleDeleteSelected = async () => {
    if (selectedReports.length === 0) {
      alert('削除するレポートを選択してください');
      return;
    }
    
    if (!window.confirm(`選択した${selectedReports.length}件のレポートを削除しますか？`)) {
      return;
    }
    
    try {
      const res = await fetch('/api/reports', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedReports }),
      });
      
      if (res.ok) {
        // 削除後に履歴を再取得
        const response = await fetch('/api/reports');
        if (response.ok) {
          const data = await response.json();
          setReportHistory(data);
        }
        setSelectedReports([]);
        setSelectAll(false);
        alert(`${selectedReports.length}件のレポートを削除しました`);
      } else {
        alert('削除に失敗しました');
      }
    } catch (e) {
      alert('削除時にエラーが発生しました');
    }
  };

  // セクションまでスムーズにゆっくりスクロールする関数
  const smoothScrollTo = (id: string) => {
    const target = document.getElementById(id);
    if (!target) return;
    const headerOffset = 88; // ヘッダーの高さ(px)
    const elementPosition = target.getBoundingClientRect().top + window.pageYOffset;
    const offsetPosition = elementPosition - headerOffset;
    const start = window.scrollY;
    const distance = offsetPosition - start;
    const duration = 800; // ms
    let startTime: number | null = null;
    function animation(currentTime: number) {
      if (startTime === null) startTime = currentTime;
      const timeElapsed = currentTime - startTime;
      const progress = Math.min(timeElapsed / duration, 1);
      // easeInOutQuad
      const ease = progress < 0.5
        ? 2 * progress * progress
        : -1 + (4 - 2 * progress) * progress;
      window.scrollTo(0, start + distance * ease);
      if (timeElapsed < duration) {
        requestAnimationFrame(animation);
      }
    }
    requestAnimationFrame(animation);
  };

  // ページトップへスムーズにスクロールする関数
  const smoothScrollToTop = () => {
    const duration = 800; // ms
    const start = window.scrollY;
    const distance = -start;
    let startTime: number | null = null;
    function animation(currentTime: number) {
      if (startTime === null) startTime = currentTime;
      const timeElapsed = currentTime - startTime;
      const progress = Math.min(timeElapsed / duration, 1);
      // easeInOutQuad
      const ease = progress < 0.5
        ? 2 * progress * progress
        : -1 + (4 - 2 * progress) * progress;
      window.scrollTo(0, start + distance * ease);
      if (timeElapsed < duration) {
        requestAnimationFrame(animation);
      }
    }
    requestAnimationFrame(animation);
  };

  // ホーム画面（サイドバーなし・中央寄せ）
  if (currentState === "home") {
    return (
      <div className="min-h-screen flex flex-col bg-gradient-to-br from-white via-blue-100 to-blue-300">
        {/* ヘッダー */}
        <header className="w-full flex items-center justify-between px-8 py-4 bg-white/80 backdrop-blur-md shadow-md border-b border-slate-200/60 z-20 fixed top-0 left-0 right-0">
          <div className="flex items-center gap-2 cursor-pointer select-none" onClick={smoothScrollToTop}>
            <img src="/tobuypro_logo.svg" alt="to buy分析Pro" className="h-12 w-auto mr-2" />
          </div>
          <div className="flex items-center gap-8 ml-auto">
            <nav className="flex gap-8">
              <span onClick={() => smoothScrollTo('features')} className="text-slate-800 hover:text-blue-700 font-medium transition-colors cursor-pointer">特徴</span>
              <span onClick={() => smoothScrollTo('howto')} className="text-slate-800 hover:text-blue-700 font-medium transition-colors cursor-pointer">使い方</span>
              <span onClick={() => smoothScrollTo('faq')} className="text-slate-800 hover:text-blue-700 font-medium transition-colors cursor-pointer">よくある質問</span>
            </nav>
            <Button onClick={() => setAuthView('login')} className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 px-6 py-2 text-base font-semibold shadow-sm ml-8">ログイン</Button>
          </div>
        </header>

        {/* ヒーローセクション */}
        <section className="flex flex-col items-center justify-center py-16 px-4 text-center mt-24">
          <div className="inline-flex items-center space-x-2 bg-white/80 backdrop-blur-sm rounded-full px-4 py-2 mb-6 border border-slate-200/60 shadow-sm">
            <img src="/favicon.jpeg" alt="to buy分析Pro" className="w-6 h-6 rounded-full object-cover" />
            <span className="text-sm font-medium text-slate-700">AIが施策結果を自動分析</span>
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-navy-900 mb-4">
            さぁ、to buy分析の
            <span className="bg-gradient-to-r from-blue-800 to-navy-900 bg-clip-text text-transparent inline-block align-middle ml-2">Pro</span>
            になろう。
          </h1>
          <p className="text-lg sm:text-xl text-slate-600 max-w-2xl mx-auto mb-8">
            必要な情報を入力するだけで、<br />
            プロフェッショナルな施策結果レポートを自動生成します。
          </p>
          <Button onClick={() => setAuthView('login')} size="lg" className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 px-10 py-4 text-lg font-bold shadow-lg">
            レポート生成する
          </Button>
        </section>

        {/* 特徴セクション */}
        <section id="features" className="py-12 px-4 bg-white/70">
          <h2 className="text-2xl sm:text-3xl font-bold text-navy-900 text-center mb-10">特徴</h2>
          <div className="max-w-5xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="flex flex-col items-center p-6 text-center shadow-md">
              <BarChart3 className="w-10 h-10 text-blue-600 mb-4" />
              <CardTitle className="mb-2">AI自動分析</CardTitle>
              <CardContent className="p-0 text-slate-600">入力内容からAIが最適なレポートを自動生成。専門知識不要で高品質なアウトプット。</CardContent>
            </Card>
            <Card className="flex flex-col items-center p-6 text-center shadow-md">
              <FileText className="w-10 h-10 text-indigo-600 mb-4" />
              <CardTitle className="mb-2">レポート即納品</CardTitle>
              <CardContent className="p-0 text-slate-600">必要な情報を入力後、すぐにレポートが完成。スピーディな業務推進をサポート。</CardContent>
            </Card>
            <Card className="flex flex-col items-center p-6 text-center shadow-md">
              <Shield className="w-10 h-10 text-blue-500 mb-4" />
              <CardTitle className="mb-2">セキュアな管理</CardTitle>
              <CardContent className="p-0 text-slate-600">ユーザーごとにレポートやカテゴリを安全に管理。情報漏洩リスクを最小化。</CardContent>
            </Card>
            <Card className="flex flex-col items-center p-6 text-center shadow-md">
              <Star className="w-10 h-10 text-yellow-500 mb-4" />
              <CardTitle className="mb-2">直感的なUI</CardTitle>
              <CardContent className="p-0 text-slate-600">シンプルで分かりやすい操作画面。誰でも迷わず使えるデザイン。</CardContent>
            </Card>
          </div>
        </section>

        {/* 使い方セクション */}
        <section id="howto" className="py-16 px-4 bg-gradient-to-br from-blue-50 via-white to-blue-100">
          <h2 className="text-2xl sm:text-3xl font-bold text-navy-900 text-center mb-10">使い方はとても簡単</h2>
          <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card className="flex flex-col items-center p-6 text-center shadow">
              <Badge className="mb-4">STEP 1</Badge>
              <CardTitle className="mb-2">情報を入力</CardTitle>
              <CardContent className="p-0 text-slate-600">KPIや施策タイトル、動画ファイルなど必要な情報をフォームに入力します。</CardContent>
            </Card>
            <Card className="flex flex-col items-center p-6 text-center shadow">
              <Badge className="mb-4">STEP 2</Badge>
              <CardTitle className="mb-2">AIが自動生成</CardTitle>
              <CardContent className="p-0 text-slate-600">AIが入力内容をもとに、最適なレポートを自動で作成します。</CardContent>
            </Card>
            <Card className="flex flex-col items-center p-6 text-center shadow">
              <Badge className="mb-4">STEP 3</Badge>
              <CardTitle className="mb-2">すぐにダウンロード</CardTitle>
              <CardContent className="p-0 text-slate-600">完成したレポートはすぐにダウンロード・共有が可能です。</CardContent>
            </Card>
          </div>
        </section>

        {/* FAQセクション */}
        <section id="faq" className="py-16 px-4 bg-white/80">
          <h2 className="text-2xl sm:text-3xl font-bold text-navy-900 text-center mb-10">よくあるご質問</h2>
          <div className="max-w-2xl mx-auto">
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="q1">
                <AccordionTrigger>本当に無料で使えますか？</AccordionTrigger>
                <AccordionContent>はい、基本機能は無料でご利用いただけます。今後有料プランも予定しています。</AccordionContent>
              </AccordionItem>
              <AccordionItem value="q2">
                <AccordionTrigger>どんなレポートが作れますか？</AccordionTrigger>
                <AccordionContent>施策タイトルやKPI、動画データなどをもとに、AIがプロフェッショナルな分析レポートを自動生成します。</AccordionContent>
              </AccordionItem>
              <AccordionItem value="q3">
                <AccordionTrigger>セキュリティは大丈夫ですか？</AccordionTrigger>
                <AccordionContent>はい。ユーザーごとにデータを分離し、安全に管理しています。</AccordionContent>
              </AccordionItem>
              <AccordionItem value="q4">
                <AccordionTrigger>サポートはありますか？</AccordionTrigger>
                <AccordionContent>ご質問やご要望はお問い合わせフォームよりお気軽にご連絡ください。</AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        </section>

        {/* フッター */}
        <footer className="w-full bg-white/90 border-t border-slate-200/60 py-4 px-8 flex flex-col md:flex-row items-center md:items-start justify-between gap-8 text-slate-700 text-sm relative">
          <div className="flex items-start gap-4 w-full md:w-auto">
            <img src="/tobuypro_logo.svg" alt="to buy分析Pro" className="h-10 w-auto" />
            <div className="leading-relaxed">
              <div className="font-bold text-base text-navy-900 mb-1">株式会社サイバー・バズ</div>
              <div>〒150-0031<br />東京都渋谷区桜丘町12番10号<br />住友不動産渋谷インフォスアネックス4,5,6F</div>
            </div>
          </div>
          <div className="hidden md:block"></div>
          <span className="text-right text-slate-500 text-sm block md:absolute md:right-8 md:bottom-4">©2025 CyberBuzz Inc.</span>
        </footer>

        {/* 認証モーダル */}
        {authView !== 'none' && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="bg-white rounded-xl shadow-2xl p-8 w-full max-w-sm relative">
              <button className="absolute top-3 right-3 text-slate-400 hover:text-slate-600" onClick={() => { setAuthView('none'); setAuthForm({ name: '', email: '', password: '' }); setAuthError(''); }}>&times;</button>
              {authView === 'login' ? (
                <>
                  <h2 className="text-xl font-bold mb-4 text-navy-900">ログイン</h2>
                  <form onSubmit={async e => {
                    e.preventDefault();
                    setAuthError('');
                    try {
                      const res = await fetch('/api/auth/login', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ email: authForm.email, password: authForm.password })
                      });
                      const data = await res.json();
                      if (!res.ok) throw new Error(data.error || 'ログインに失敗しました');
                      setAuthView('none');
                      setAuthForm({ name: '', email: '', password: '' });
                      setCurrentState('report');
                      setIsLoggedIn(true);
                      setUser(data.user);
                    } catch (err: any) {
                      setAuthError(err.message);
                    }
                  }} className="space-y-4">
                    <div>
                      <Label htmlFor="login-email">メールアドレス</Label>
                      <Input id="login-email" type="email" autoComplete="email" value={authForm.email} onChange={e => setAuthForm(f => ({ ...f, email: e.target.value }))} className="mt-1 w-full" required />
                    </div>
                    <div>
                      <Label htmlFor="login-password">パスワード</Label>
                      <Input id="login-password" type="password" autoComplete="current-password" value={authForm.password} onChange={e => setAuthForm(f => ({ ...f, password: e.target.value }))} className="mt-1 w-full" required ref={passwordRef} />
                    </div>
                    {authError && <p className="text-red-500 text-sm">{authError}</p>}
                    <Button type="submit" className="w-full">ログイン</Button>
                  </form>
                  <div className="mt-4 text-sm text-center">
                    アカウントをお持ちでない方は{' '}
                    <button className="text-blue-600 hover:underline" onClick={() => { setAuthView('register'); setAuthForm({ name: '', email: '', password: '' }); setAuthError(''); }}>新規作成</button>
                  </div>
                </>
              ) : (
                <>
                  <h2 className="text-xl font-bold mb-4 text-navy-900">アカウント新規作成</h2>
                  <form onSubmit={async e => {
                    e.preventDefault();
                    setAuthError('');
                    try {
                      const res = await fetch('/api/auth/register', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ name: authForm.name, email: authForm.email, password: authForm.password })
                      });
                      const data = await res.json();
                      if (!res.ok) throw new Error(data.error || 'アカウント作成に失敗しました');
                      setAuthView('none');
                      setAuthForm({ name: '', email: '', password: '' });
                      setCurrentState('report');
                      setIsLoggedIn(true);
                      setUser(data.user);
                    } catch (err: any) {
                      setAuthError(err.message);
                    }
                  }} className="space-y-4">
                    <div>
                      <Label htmlFor="register-name">氏名</Label>
                      <Input id="register-name" type="text" value={authForm.name} onChange={e => setAuthForm(f => ({ ...f, name: e.target.value }))} className="mt-1 w-full" required />
                    </div>
                    <div>
                      <Label htmlFor="register-email">メールアドレス</Label>
                      <Input id="register-email" type="email" autoComplete="email" value={authForm.email} onChange={e => setAuthForm(f => ({ ...f, email: e.target.value }))} className="mt-1 w-full" required />
                    </div>
                    <div>
                      <Label htmlFor="register-password">パスワード</Label>
                      <Input id="register-password" type="password" autoComplete="new-password" value={authForm.password} onChange={e => setAuthForm(f => ({ ...f, password: e.target.value }))} className="mt-1 w-full" required />
                    </div>
                    {authError && <p className="text-red-500 text-sm">{authError}</p>}
                    <Button type="submit" className="w-full">アカウント作成</Button>
                  </form>
                  <div className="mt-4 text-sm text-center">
                    すでにアカウントをお持ちの方は{' '}
                    <button className="text-blue-600 hover:underline" onClick={() => { setAuthView('login'); setAuthForm({ name: '', email: '', password: '' }); setAuthError(''); }}>ログイン</button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    )
  }

  // 2カラム画面（サイドバー＋右カラム）
  if (!isLoggedIn) {
    // ログインしていない場合は何も表示しない or ログインを促すUIを表示
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg text-slate-600">ログインしてください</div>
      </div>
    );
  }
  return (
    <div className="w-full flex min-h-screen">
      {/* サイドバー（固定） */}
      <aside className="fixed left-0 top-0 w-72 h-screen bg-white border-r border-slate-200/60 flex-shrink-0 p-0 z-10 flex flex-col justify-between">
        <div>
          <div className="bg-gradient-to-b from-blue-900 to-blue-700 px-4 pt-4 pb-3">
            <h1
              className="text-xl font-bold text-white mb-2 text-center select-none"
              style={{marginBottom: 0}}
            >
              to buy分析Pro
            </h1>
          </div>
          <div className="px-4 pt-4">
            <nav className="flex flex-col gap-2">
              <button
                className={`flex items-center gap-2 rounded-md p-2 text-left text-sm font-medium ${currentState === 'dashboard' ? 'bg-gray-100 text-black font-bold' : 'hover:bg-gray-50 text-black'}`}
                onClick={() => { setCurrentState('dashboard'); }}
              >
                <BarChart3 className="w-5 h-5 mr-2 text-black" />ダッシュボード
              </button>
              <button
                className={`flex items-center gap-2 rounded-md p-2 text-left text-sm font-medium ${currentState === 'report' || currentState === 'generating' || currentState === 'generated' ? 'bg-gray-100 text-black font-bold' : 'hover:bg-gray-50 text-black'}`}
                onClick={() => { setCurrentState('report'); }}
              >
                <FileText className="w-5 h-5 mr-2 text-black" />レポート作成
              </button>
              <button
                className="flex items-center gap-2 rounded-md p-2 text-left text-sm font-medium hover:bg-gray-50 text-black"
                onClick={() => setSettingsOpen(true)}
              >
                <Settings className="w-5 h-5 mr-2 text-black" />設定
              </button>
            </nav>
          </div>
        </div>
        {user && (
          <div className="p-4 border-t border-gray-200 w-full max-w-[280px] mx-auto bg-white">
            <div className="flex items-center space-x-3">
              <img src="/placeholder-user.jpg" alt={user.name} className="w-10 h-10 rounded-full" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{user.name}</p>
                <p className="text-xs text-gray-500 truncate">{user.email}</p>
              </div>
            </div>
            <div className="mt-3">
              <Button
                asChild
                className="block w-full text-center px-4 py-2 text-sm text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
                variant="ghost"
                onClick={() => { setIsLoggedIn(false); setUser(null); setCurrentState('home'); }}
              >
                <span>ログアウト</span>
              </Button>
            </div>
          </div>
        )}
      </aside>
      {/* メインビュー（サイドバーの幅分オフセット） */}
      <main className="ml-72 flex-1 min-w-0 min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-8 overflow-y-auto w-full">
        {showCompleteMsg && (
          <div className="fixed top-8 left-1/2 -translate-x-1/2 z-50 bg-emerald-500 text-white px-6 py-3 rounded-xl shadow-lg text-lg font-bold animate-fadeInUp">
            レポートが履歴に記録されました！
          </div>
        )}
        <div className="w-full h-full">
          {currentState === 'dashboard' ? (
            <div className="w-full h-full">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8 w-full">
                <div>
                  <h2 className="text-3xl font-bold text-navy-900 mb-2">ダッシュボード</h2>
                  <p className="text-slate-600">過去に生成したレポートの履歴を確認できます</p>
                </div>
                <Button
                  onClick={() => { setCurrentState('report'); }}
                  className="mt-4 sm:mt-0 bg-gradient-to-r from-navy-600 to-blue-600 hover:from-navy-700 hover:to-blue-700 px-6 py-3"
                >
                  <FileText className="w-4 h-4 mr-2" />
                  レポート作成
                </Button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8 w-full">
                <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg w-full">
                  <CardContent className="p-6 w-full">
                    <div className="flex items-center justify-between w-full">
                      <div>
                        <p className="text-sm text-slate-600 mb-1">総レポート数</p>
                        <p className="text-3xl font-bold text-navy-900">{reportHistory.length}</p>
                      </div>
                      <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                        <FileText className="w-6 h-6 text-blue-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg w-full">
                  <CardContent className="p-6 w-full">
                    <div className="flex items-center justify-between w-full">
                      <div>
                        <p className="text-sm text-slate-600 mb-1">今月の生成数</p>
                        <p className="text-3xl font-bold text-navy-900">{getCurrentMonthCount()}</p>
                      </div>
                      <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center">
                        <TrendingUp className="w-6 h-6 text-emerald-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg w-full">
                  <CardContent className="p-6 w-full">
                    <div className="flex items-center justify-between w-full">
                      <div>
                        <p className="text-sm text-slate-600 mb-1">システム稼働状況</p>
                        <p className="text-3xl font-bold text-navy-900">稼働中</p>
                      </div>
                      <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                        <Shield className="w-6 h-6 text-purple-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
              <div className="bg-white/90 rounded-xl shadow-lg p-6 w-full">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold text-navy-900">レポート履歴</h3>
                  {reportHistory.length > 0 && (
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleSelectAll}
                        className="text-xs"
                      >
                        {selectAll ? '全解除' : '全選択'}
                      </Button>
                      {selectedReports.length > 0 && (
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={handleDeleteSelected}
                          className="text-xs"
                        >
                          選択削除 ({selectedReports.length})
                        </Button>
                      )}
                    </div>
                  )}
                </div>
                {reportHistory.length === 0 ? (
                  <p className="text-slate-500">まだレポートがありません。</p>
                ) : (
                  <ul className="divide-y divide-slate-200 w-full">
                    {reportHistory.map((item) => (
                      <li key={item.id} className="py-4 w-full hover:bg-slate-50 rounded transition">
                        <div className="flex items-start gap-3 w-full">
                          <div className="flex-shrink-0 mt-1">
                            <input
                              type="checkbox"
                              checked={selectedReports.includes(item.id)}
                              onChange={() => handleReportSelect(item.id)}
                              className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                            />
                          </div>
                          <div className="flex-1 cursor-pointer" onClick={() => setSelectedReport(item)}>
                            <p className="font-semibold text-navy-900">{item.title}</p>
                            <p className="text-slate-500 text-sm">{item.category} | {item.created_at}</p>
                            <p className="text-xs text-slate-400 mt-1">作成者: {item.user_name || '不明なユーザー'}</p>
                          </div>
                          <div className="flex gap-2 flex-shrink-0">
                            <Button size="sm" variant="outline" onClick={e => { e.stopPropagation(); setSelectedReport(item); }}>詳細</Button>
                            <Button size="sm" variant="destructive" onClick={e => { e.stopPropagation(); handleDeleteReport(item.id); }}>削除</Button>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
                {/* レポート詳細モーダル */}
                {selectedReport && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
                    <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full p-8 relative">
                      <button className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 text-2xl" onClick={() => setSelectedReport(null)}>×</button>
                      <h2 className="text-2xl font-bold mb-2">{selectedReport.title}</h2>
                      <div className="text-sm text-slate-500 mb-2">{selectedReport.category} | {new Date(selectedReport.created_at).toLocaleString("ja-JP")}</div>
                      <div className="text-xs text-slate-400 mb-4">作成者: {selectedReport.user_name || '不明なユーザー'}</div>
                      <div className="prose max-w-none mb-6 whitespace-pre-wrap max-h-[60vh] overflow-y-auto pr-2">{selectedReport.content || selectedReport.summary}</div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : currentState === 'report' ? (
            <div className="w-full h-full">
              <form className="bg-white/95 rounded-2xl shadow-2xl p-8 w-full space-y-8 border border-slate-200">
                {/* KPI・キャンペーン情報 */}
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <Target className="w-5 h-5 text-blue-600" />
                    <h3 className="text-lg font-bold text-navy-900">KPI・キャンペーン情報</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <Label htmlFor="kpiTarget">KPI目標（再生回数など）</Label>
                      <Input 
                        id="kpiTarget" 
                        type="number" 
                        min="0"
                        value={formData.kpiTarget} 
                        onChange={e => handleInputChange('kpiTarget', e.target.value)} 
                        className="mt-1 w-full" 
                        placeholder="例: 10000"
                      />
                      <p className="text-xs text-slate-500 mt-1">目標とする再生数を入力</p>
                      {errors.kpiTarget && <p className="text-red-500 text-sm mt-1">{errors.kpiTarget}</p>}
                    </div>
                    <div>
                      <Label htmlFor="campaignName">施策タイトル／商品名</Label>
                      <Input id="campaignName" value={formData.campaignName} onChange={e => handleInputChange('campaignName', e.target.value)} className="mt-1 w-full" placeholder="例: DUOクレンジングバーム" />
                      <p className="text-xs text-slate-500 mt-1">施策タイトルや商品名</p>
                      {errors.campaignName && <p className="text-red-500 text-sm mt-1">{errors.campaignName}</p>}
                    </div>
                  </div>
                  <div className="mt-6">
                    <Label htmlFor="productCategory">商品カテゴリ</Label>
                    <Select value={formData.productCategory} onValueChange={(value) => handleInputChange('productCategory', value)}>
                      <SelectTrigger className="mt-1 w-full">
                        <SelectValue placeholder="商品カテゴリを選択してください" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((cat) => (
                          <SelectItem key={cat.id} value={cat.name}>{cat.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-slate-500 mt-1">該当するカテゴリを選択</p>
                    {errors.productCategory && <p className="text-red-500 text-sm mt-1">{errors.productCategory}</p>}
                  </div>
                </div>
                <hr className="my-4 border-slate-200" />
                {/* 今回実績画像 */}
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <ImageIcon className="w-5 h-5 text-indigo-600" />
                    <h3 className="text-lg font-bold text-navy-900">今回実績画像</h3>
                  </div>
                  <Input 
                    id="currentMetricsImg" 
                    type="file" 
                    accept="image/*"
                    onChange={e => handleFileUpload('currentMetricsImg', e.target.files?.[0] || null)} 
                    className="mt-1 w-full" 
                  />
                  <p className="text-xs text-slate-500 mt-1">今回実績画像をアップロード</p>
                  {errors.currentMetricsImg && <p className="text-red-500 text-sm mt-1">{errors.currentMetricsImg}</p>}
                </div>
                <hr className="my-4 border-slate-200" />
                {/* 対象動画 */}
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <Video className="w-5 h-5 text-indigo-600" />
                    <h3 className="text-lg font-bold text-navy-900">対象動画を添付してください</h3>
                  </div>
                      <Input 
                    id="inputCreative" 
                    type="file" 
                    accept="video/*"
                    onChange={e => handleFileUpload('inputCreative', e.target.files?.[0] || null)} 
                        className="mt-1 w-full" 
                      />
                  <p className="text-xs text-slate-500 mt-1">対象動画をアップロード</p>
                  {errors.inputCreative && <p className="text-red-500 text-sm mt-1">{errors.inputCreative}</p>}
                </div>
                <div className="pt-6">
                  <Button 
                    type="button" 
                    onClick={generateReport} 
                    disabled={!isFormValid}
                    className={`w-full text-lg py-4 font-bold shadow-md ${!isFormValid ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <Sparkles className="w-5 h-5 mr-2" />レポート生成
                  </Button>
                </div>
              </form>
            </div>
          ) : currentState === 'generating' ? (
            <div className="w-full h-full flex items-center justify-center">
              <div className="bg-white/90 rounded-xl shadow-lg p-8 w-full max-w-2xl text-center">
                <div className="mb-6">
                  <div className="flex items-center justify-center mx-auto mb-4">
                    <img src="/favicon.jpeg" alt="分析中" className="w-16 h-16 animate-cute-spin object-cover rounded-full shadow" />
                  </div>
                  <h2 className="text-2xl font-bold text-navy-900 mb-2">レポート生成中...</h2>
                  <p className="text-slate-600">AIがあなたのデータを分析してレポートを作成しています</p>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-2 mb-4">
                  <div 
                    className="bg-gradient-to-r from-blue-600 to-indigo-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  ></div>
                </div>
                <p className="text-sm text-slate-500">{progress}% 完了</p>
              </div>
            </div>
          ) : currentState === 'generated' ? (
            <div className="w-full h-full">
              <div className="bg-white/90 rounded-xl shadow-lg p-8 w-full">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 w-full">
                  <div>
                    <h2 className="text-2xl font-bold text-navy-900 mb-2">生成されたレポート</h2>
                    <p className="text-slate-600">AIが生成したレポートをご確認ください</p>
                  </div>
                  <div className="flex gap-2 mt-4 sm:mt-0">
                    <Button
                      onClick={completeProcess}
                      className="bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700"
                    >
                      <Check className="w-4 h-4 mr-2" />
                      完了
                    </Button>
                  </div>
                </div>
                
                <div className="bg-slate-50 rounded-lg p-6 w-full mb-6 relative">
                  <button
                    className="absolute top-4 right-4 bg-white border border-slate-200 rounded px-3 py-1 text-xs text-slate-600 hover:bg-slate-100 transition"
                    onClick={async () => {
                      if (generatedReport) {
                        await navigator.clipboard.writeText(generatedReport);
                        setCopied(true);
                        setTimeout(() => setCopied(false), 1200);
                      }
                    }}
                  >
                    {copied ? "コピーされました！" : "コピー"}
                  </button>
                  {generatedReport && (
                    <div className="prose max-w-none">
                      <pre className="whitespace-pre-wrap text-sm text-slate-800 font-sans">{generatedReport}</pre>
                    </div>
                  )}
                </div>
                
                <div className="w-full">
                  <Label htmlFor="editInstructions">修正依頼（必要に応じて）</Label>
                  <Textarea 
                    id="editInstructions"
                    value={editInstructions}
                    onChange={e => setEditInstructions(e.target.value)}
                    placeholder="レポートの修正点があれば、具体的に記入してください..."
                    className="mt-1 w-full min-h-[100px]"
                  />
                  <div className="flex gap-2 mt-4">
                    <Button
                      onClick={submitEdit}
                      disabled={!editInstructions.trim()}
                      className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                    >
                      <RefreshCw className="w-4 h-4 mr-2" />
                      修正依頼を送信
                    </Button>
                    <Button
                      onClick={() => setEditInstructions('')}
                      variant="outline"
                    >
                      クリア
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </main>
      {/* 設定モーダル */}
      {settingsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full p-8 relative">
            <button className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 text-2xl" onClick={() => setSettingsOpen(false)}>×</button>
            <div className="flex gap-4 mb-6 border-b pb-2">
              <button className={`text-lg font-bold pb-1 border-b-2 ${settingsTab === 'report' ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-500'}`} onClick={() => setSettingsTab('report')}>レポート設定</button>
              <button className={`text-lg font-bold pb-1 border-b-2 ${settingsTab === 'account' ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-500'}`} onClick={() => setSettingsTab('account')}>アカウント設定</button>
            </div>
            {settingsTab === 'report' && (
              <div>
                <h3 className="text-lg font-bold mb-2">商品カテゴリー編集</h3>
                {categoriesLoading ? (
                  <div className="text-slate-400 mb-4">読み込み中...</div>
                ) : (
                  <ul className="mb-4">
                    {categories.map((cat) => (
                      <li key={cat.id} className="flex items-center gap-2 mb-2">
                        <input
                          className="border rounded px-2 py-1 flex-1"
                          value={cat.name}
                          onChange={async e => {
                            const newName = e.target.value;
                            if (!newName) return;
                            await fetch('/api/categories', {
                              method: 'PUT',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ id: cat.id, name: newName }),
                            });
                            fetchCategories();
                          }}
                        />
                        <button className="text-red-500 text-sm" onClick={async () => {
                          await fetch('/api/categories', {
                            method: 'DELETE',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ id: cat.id }),
                          });
                          fetchCategories();
                        }}>削除</button>
                      </li>
                    ))}
                  </ul>
                )}
                <div className="flex gap-2">
                  <input
                    className="border rounded px-2 py-1 flex-1"
                    placeholder="新しいカテゴリ名"
                    value={newCategory}
                    onChange={e => setNewCategory(e.target.value)}
                  />
                  <button
                    className="bg-blue-600 text-white px-4 py-1 rounded"
                    onClick={async e => {
                      e.preventDefault();
                      if (newCategory && !categories.some(c => c.name === newCategory)) {
                        await fetch('/api/categories', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ name: newCategory }),
                        });
                        setNewCategory('');
                        fetchCategories();
                      }
                    }}
                  >追加</button>
                </div>
              </div>
            )}
            {settingsTab === 'account' && (
              <div>
                <h3 className="text-lg font-bold mb-4">アカウント設定</h3>
                <form
                  className="space-y-4"
                  onSubmit={async e => {
                    e.preventDefault();
                    if (!user) return;
                    setAccountEditMsg(null);
                    const res = await fetch('/api/auth/user', {
                      method: 'PUT',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        userId: user.id,
                        name: editAccount.name,
                        email: editAccount.email,
                        password: editAccount.password || undefined,
                      }),
                    });
                    const data = await res.json();
                    if (res.ok && data.user) {
                      setUser({ ...user, name: data.user.name, email: data.user.email });
                      setAccountEditMsg('アカウント情報を更新しました');
                      setEditAccount(a => ({ ...a, password: '' }));
                      setTimeout(() => setAccountEditMsg(null), 2000);
                    } else {
                      setAccountEditMsg(data.error || '更新に失敗しました');
                    }
                  }}
                >
                  <div>
                    <label className="block text-sm font-medium mb-1">ユーザー名</label>
                    <input
                      className="border rounded px-2 py-1 w-full"
                      value={editAccount.name}
                      onChange={e => setEditAccount(a => ({ ...a, name: e.target.value }))}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">メールアドレス</label>
                    <input
                      className="border rounded px-2 py-1 w-full"
                      type="email"
                      value={editAccount.email}
                      onChange={e => setEditAccount(a => ({ ...a, email: e.target.value }))}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">新しいパスワード（空欄で変更なし）</label>
                    <input
                      className="border rounded px-2 py-1 w-full"
                      type="password"
                      value={editAccount.password}
                      onChange={e => setEditAccount(a => ({ ...a, password: e.target.value }))}
                      autoComplete="new-password"
                    />
                  </div>
                  <button className="bg-blue-600 text-white px-4 py-2 rounded w-full mt-2" type="submit">保存</button>
                  {accountEditMsg && <div className="mt-2 text-center text-sm text-emerald-600">{accountEditMsg}</div>}
                </form>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
