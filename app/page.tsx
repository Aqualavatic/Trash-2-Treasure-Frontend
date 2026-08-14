"use client"

import { useMemo, useState, useEffect, useRef } from "react"
import { Sparkles } from "lucide-react"
import type { ComponentProps } from "react"

import { SiteNavbar } from "@/components/site-navbar"
import { HeroUpload } from "@/components/hero-upload"
import { AiAnalysis } from "@/components/ai-analysis"
import { DiyGuide, type Guide } from "@/components/diy-guide"
import { dictionary, type Lang } from "@/lib/dictionary"

type Suggestion = ComponentProps<typeof AiAnalysis>["suggestions"][number]

// Lấy URL Backend từ biến môi trường Vercel, nếu không có sẽ tự động trỏ về Railway
const API_BASE_URL = 
  process.env.NEXT_PUBLIC_API_URL || 
  "https://trash-to-treasure-backend-production.up.railway.app"

export default function Page() {
  const [lang, setLang] = useState<Lang>("vi")
  const [childrenMode, setChildrenMode] = useState(true)
  const [selectedId, setSelectedId] = useState("")

  const [isLoading, setIsLoading] = useState(false)
  const [hasAnalyzed, setHasAnalyzed] = useState(false)
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null)
  
  // LƯU FILE ẢNH VỪA UPLOAD ĐỂ DÙNG LẠI KHI THAY ĐỔI LANG/KIDS MODE
  const [currentFile, setCurrentFile] = useState<File | null>(null)
  
  const [wasteInfo, setWasteInfo] = useState<{ wasteType: string; category: string } | null>(null)

  const [aiData, setAiData] = useState<{
    suggestions: Suggestion[]
    guides: Record<string, Guide>
  } | null>(null)

  const t = dictionary[lang] as any

  // Dùng Ref để tránh tự động gọi API ở lần render đầu tiên
  const isFirstRender = useRef(true)

  const guide = useMemo(
    () => (aiData ? aiData.guides[selectedId] ?? Object.values(aiData.guides)[0] : null),
    [aiData, selectedId],
  )

  const analyzeImage = async (file: File, currentLang: Lang, isKids: boolean) => {
    setIsLoading(true)
    const previewUrl = URL.createObjectURL(file)
    setUploadedImageUrl(previewUrl)

    const formData = new FormData()
    formData.append("file", file)
    formData.append("children_mode", String(isKids))
    formData.append("lang", currentLang)

    try {
      const response = await fetch(`${API_BASE_URL}/api/analyze`, {
        method: "POST",
        body: formData,
      })

      if (!response.ok) throw new Error("Lỗi kết nối Backend")

      const result = await response.json()

      if (result.has_waste === false) {
        alert(result.message || (currentLang === "en" ? "No waste detected!" : "Không tìm thấy rác thải!"))
        setHasAnalyzed(false)
        setAiData(null)
        return
      }

      setWasteInfo({
        wasteType: result.waste_type || (currentLang === "en" ? "Waste" : "Rác thải"),
        category: result.category || (currentLang === "en" ? "Recyclable" : "Tái chế"),
      })

      const dynamicSuggestions: Suggestion[] = (result.diy_ideas || []).map(
        (idea: any, index: number) => ({
          id: `idea_${index}`,
          icon: Sparkles,
          title: idea.title || idea,
          desc: idea.desc || (currentLang === "en" ? "Great recycling project" : "Dự án tái chế phù hợp"),
          difficulty: idea.difficulty || (isKids ? (currentLang === "en" ? "Super Easy" : "Rất Dễ") : (currentLang === "en" ? "Easy" : "Dễ")),
          time: idea.time || "15 mins",
        })
      )

      const dynamicGuides: Record<string, Guide> = {}
      ;(result.diy_ideas || []).forEach((idea: any, index: number) => {
        const id = `idea_${index}`
        dynamicGuides[id] = {
          id,
          title: idea.title || idea,
          materials: idea.materials || (currentLang === "en" ? ["Recycled item", "Tape / Crayons"] : ["Vật liệu tái chế", "Băng dính / Bút màu"]),
          steps: idea.steps || [],
        }
      })

      setAiData({
        suggestions: dynamicSuggestions,
        guides: dynamicGuides,
      })

      if (dynamicSuggestions.length > 0) {
        setSelectedId(dynamicSuggestions[0].id)
      }

      setHasAnalyzed(true)
    } catch (error) {
      console.error("Lỗi:", error)
      alert(currentLang === "en" ? "Failed to analyze image!" : "Không thể phân tích ảnh hoặc kết nối tới server thất bại!")
    } finally {
      setIsLoading(false)
    }
  }

  // Bắt đầu phân tích khi người dùng upload file mới
  const handleAnalyze = (file: File) => {
    setCurrentFile(file)
    analyzeImage(file, lang, childrenMode)
  }

  // TỰ ĐỘNG CHẠY LẠI KHI THAY ĐỔI NGÔN NGỮ HOẶC CHẾ ĐỘ TRẺ EM
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }

    if (currentFile && hasAnalyzed) {
      analyzeImage(currentFile, lang, childrenMode)
    }
  }, [lang, childrenMode])

  return (
    <div className={`min-h-screen transition-colors duration-500 ${
      childrenMode ? "bg-amber-50/40 text-slate-900" : "bg-background"
    }`}>
      <SiteNavbar lang={lang} onLangChange={setLang} />
      <main>
        <HeroUpload
          childrenMode={childrenMode}
          isLoading={isLoading}
          onAnalyze={handleAnalyze}
          onChildrenModeChange={setChildrenMode}
          t={t}
        />

        {hasAnalyzed && aiData && (
          <>
            <AiAnalysis
              category={wasteInfo?.category}
              childrenMode={childrenMode}
              onSelect={setSelectedId}
              selectedId={selectedId}
              suggestions={aiData.suggestions}
              t={t}
              uploadedImageUrl={uploadedImageUrl}
              wasteType={wasteInfo?.wasteType}
            />
            {guide && (
              <DiyGuide
                childrenMode={childrenMode}
                guide={guide}
                lang={lang}
                t={t}
              />
            )}
          </>
        )}
      </main>
      <footer className="border-t border-border py-8">
        <div className="mx-auto max-w-6xl px-4 text-center text-sm text-muted-foreground sm:px-6">
          Trash2Treasure Vision · Powered by Gemini 3.6 Flash & Railway
        </div>
      </footer>
    </div>
  )
}
