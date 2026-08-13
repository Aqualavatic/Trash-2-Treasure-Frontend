"use client"

import { useEffect, useRef, useState } from "react"
import { Check, ShieldAlert, Volume2 } from "lucide-react"
import type { Dict, Lang } from "@/lib/dictionary"

export type Guide = {
  id: string
  title: string
  materials: string[]
  steps: string[]
}

function cleanStepText(text: string) {
  if (!text) return ""
  return text.replace(/^(bước|step)\s*\d+[:.]?\s*/i, "").trim()
}

export function DiyGuide({
  t,
  lang,
  guide,
  childrenMode,
}: {
  t: Dict
  lang: Lang
  guide: Guide
  childrenMode: boolean
}) {
  const [speaking, setSpeaking] = useState(false)
  const [checked, setChecked] = useState<boolean[]>(() => guide?.steps?.map(() => false) || [])
  const supportRef = useRef(false)

  useEffect(() => {
    supportRef.current = typeof window !== "undefined" && "speechSynthesis" in window
    return () => {
      if (supportRef.current) window.speechSynthesis.cancel()
    }
  }, [])

  useEffect(() => {
    if (guide?.steps) {
      setChecked(guide.steps.map(() => false))
    }
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel()
      setSpeaking(false)
    }
  }, [guide])

  // XỬ LÝ LOGIC: Ép gạch chéo theo đúng thứ tự (Sequential Step Completion)
  const handleStepClick = (index: number) => {
    const isCurrentChecked = checked[index]

    if (isCurrentChecked) {
      // Bỏ chọn: Chỉ cho phép bỏ chọn nếu là bước đã tích cuối cùng
      const isLastChecked = index === checked.lastIndexOf(true)
      if (isLastChecked) {
        setChecked((prev) => prev.map((c, i) => (i === index ? false : c)))
      }
    } else {
      // Đánh dấu xong: Chỉ cho phép tích nếu tất cả các bước trước đó ĐÃ HOÀN THÀNH
      const firstUncheckedIndex = checked.findIndex((c) => !c)
      if (index === firstUncheckedIndex) {
        setChecked((prev) => prev.map((c, i) => (i === index ? true : c)))
      }
    }
  }

  function toggleSpeech() {
    if (!supportRef.current || !guide) return
    const synth = window.speechSynthesis
    if (speaking) {
      synth.cancel()
      setSpeaking(false)
      return
    }

    const materialsText = guide.materials && guide.materials.length > 0 
      ? `${lang === "en" ? "Materials needed:" : "Vật liệu cần chuẩn bị bao gồm:"} ${guide.materials.join(", ")}.`
      : ""

    const stepsText = guide.steps
      .map((s, i) => `${t.stepLabel} ${i + 1}. ${cleanStepText(s)}`)
      .join(". ")

    const text = [guide.title, materialsText, stepsText].filter(Boolean).join(" ")

    const utter = new SpeechSynthesisUtterance(text)
    utter.lang = lang === "vi" ? "vi-VN" : "en-US"
    utter.rate = 0.9
    utter.onend = () => setSpeaking(false)
    utter.onerror = () => setSpeaking(false)
    synth.cancel()
    synth.speak(utter)
    setSpeaking(true)
  }

  if (!guide) return null

  const done = checked.filter(Boolean).length
  const nextStepIndex = checked.findIndex((c) => !c)

  return (
    <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-6 animate-in fade-in slide-in-from-bottom-8 duration-700">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-primary">{t.guideKicker}</p>
          <h2 className="mt-1 font-serif text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            {guide.title}
          </h2>
        </div>
      </div>

      <div className={`overflow-hidden rounded-3xl border transition-all duration-300 shadow-sm ${
        childrenMode ? "border-amber-400 bg-amber-50/30 dark:bg-amber-950/10 ring-4 ring-amber-200/50" : "border-border bg-card"
      }`}>
        {/* Nút Đọc Giọng Nói */}
        <button
          type="button"
          onClick={toggleSpeech}
          aria-pressed={speaking}
          className="flex w-full items-center justify-between gap-3 bg-warn px-5 py-4 text-left text-warn-foreground transition-opacity hover:opacity-95"
        >
          <span className="flex items-center gap-3 font-semibold">
            <span className="flex size-9 items-center justify-center rounded-full bg-warn-foreground/15">
              <Volume2 aria-hidden="true" className="size-5"/>
            </span>
            {speaking 
              ? (lang === "en" ? "Reading instructions & materials..." : "Đang đọc hướng dẫn & vật liệu...") 
              : (lang === "en" ? "🔊 Read materials & steps aloud" : "🔊 Đọc vật liệu & các bước làm")}
          </span>
          <span className="flex items-center gap-1">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className={`w-1 rounded-full bg-warn-foreground ${speaking ? "animate-pulse" : ""}`}
                style={{ height: speaking ? `${10 + i * 6}px` : "10px" }}
              />
            ))}
          </span>
        </button>

        {childrenMode && (
          <div
            role="alert"
            className="flex items-center gap-3 border-b border-amber-300 bg-amber-100/80 px-5 py-3 text-sm font-bold text-amber-900"
          >
            <ShieldAlert aria-hidden="true" className="size-5 shrink-0 text-amber-600"/>
            {lang === "en" 
              ? "🎈 Kids Mode Active — Dangerous tools are removed! Ask a parent for help!" 
              : "🎈 Đang chọn Chế độ Trẻ em — Các dụng cụ sắc nhọn đã được loại bỏ & luôn có sự giám sát của phụ huynh!"}
          </div>
        )}

        <div className="grid gap-8 p-6 sm:p-8 lg:grid-cols-[280px_1fr]">
          {/* Cột trái: Vật liệu */}
          <div>
            <h3 className="font-serif text-sm font-bold uppercase tracking-wide text-muted-foreground">
              {t.materialsNeeded}
            </h3>
            <ul className="mt-4 space-y-2.5">
              {(guide.materials || []).map((m, idx) => (
                <li key={idx} className="flex items-start gap-2.5 text-sm font-semibold text-foreground">
                  <span className="mt-1.5 size-2 shrink-0 rounded-full bg-primary" aria-hidden="true" />
                  {m}
                </li>
              ))}
            </ul>
          </div>

          {/* Cột phải: Các bước làm theo thứ tự */}
          <div>
            <div className="mb-4 flex items-center justify-between gap-3">
              <span className="text-sm font-medium text-muted-foreground">
                {done}/{(guide.steps || []).length} {t.steps}
              </span>
              <div className="h-2 w-32 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-300"
                  style={{ width: `${((guide.steps?.length ? done / guide.steps.length : 0) * 100)}%` }}
                />
              </div>
            </div>

            <ol className="space-y-3">
              {(guide.steps || []).map((step, i) => {
                const isChecked = checked[i]
                const isNext = i === nextStepIndex
                const isDisabled = !isChecked && !isNext
                const stepContent = cleanStepText(step)

                return (
                  <li key={i}>
                    <button
                      type="button"
                      onClick={() => handleStepClick(i)}
                      disabled={isDisabled}
                      className={`flex w-full items-center gap-4 rounded-2xl border p-4 text-left transition-all ${
                        isChecked
                          ? "border-primary/40 bg-primary/5 opacity-75 cursor-pointer"
                          : isNext
                          ? "border-primary bg-background shadow-sm ring-2 ring-primary/20 cursor-pointer"
                          : "border-border/50 bg-muted/30 opacity-50 cursor-not-allowed"
                      }`}
                    >
                      <span
                        className={`flex size-9 shrink-0 items-center justify-center rounded-full text-sm font-bold transition-colors ${
                          isChecked 
                            ? "bg-primary text-primary-foreground" 
                            : isNext 
                            ? "bg-primary text-primary-foreground animate-bounce" 
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {isChecked ? <Check className="size-5"/> : i + 1}
                      </span>
                      <span
                        className={`text-sm leading-relaxed ${
                          isChecked ? "text-muted-foreground line-through" : "text-foreground font-medium"
                        }`}
                      >
                        <span className="font-bold">{t.stepLabel} {i + 1}:</span> {stepContent}
                      </span>
                    </button>
                  </li>
                )
              })}
            </ol>
          </div>
        </div>
      </div>
    </section>
  )
}