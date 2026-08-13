"use client"

import Image from "next/image"
import { ArrowRight, Clock, Gauge, ScanLine, Sprout, PencilRuler } from "lucide-react"
import type { Dict } from "@/lib/dictionary"

type Suggestion = {
  id: string
  icon: typeof Sprout
  title: string
  desc: string
  difficulty: string
  time: string
}

export function AiAnalysis({
  t,
  suggestions,
  selectedId,
  onSelect,
  uploadedImageUrl,
  wasteType,
  category,
  childrenMode,
}: {
  t: Dict
  suggestions: Suggestion[]
  selectedId: string
  onSelect: (id: string) => void
  uploadedImageUrl?: string | null
  wasteType?: string
  category?: string
  childrenMode?: boolean
}) {
  const displayImage = uploadedImageUrl || "/waste-sample.png"
  const tagLabel = wasteType ? `#${wasteType}` : "#RácThải"

  return (
    // FIX FEEDBACK 5: Hiệu ứng Slide In/Fade In khi hiện Panel
    <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6 animate-in fade-in slide-in-from-bottom-6 duration-700">
      <div className="mb-8">
        <p className="text-sm font-semibold uppercase tracking-wide text-primary">{t.analysisKicker}</p>
        <h2 className="mt-1 font-serif text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          {t.analysisTitle}
        </h2>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left: image with DYNAMIC HIGH-CONTRAST Bounding Box */}
        <div className={`rounded-3xl border p-3 shadow-md transition-all ${
          childrenMode ? "border-amber-300 bg-amber-50/50" : "border-border bg-card"
        }`}>
          <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-black/5">
            <Image
              src={displayImage}
              alt="Ảnh rác thải đã tải lên"
              fill
              className="object-cover"
              priority
              unoptimized={displayImage.startsWith("blob:")}
            />

            {/* FIX FEEDBACK 2: Dynamic Dynamic Glow Bounding Box Nổi Bật */}
            <div className="absolute inset-6 rounded-2xl border-4 border-emerald-400 shadow-[0_0_20px_rgba(52,211,153,0.8)] transition-all">
              <span className="absolute -top-4 left-4 inline-flex items-center gap-1.5 rounded-lg bg-emerald-500 px-3 py-1 text-xs font-black text-white shadow-lg backdrop-blur-md">
                <span className="size-2 rounded-full bg-white animate-ping" />
                {tagLabel}
              </span>
            </div>

            <span className="absolute bottom-3 left-3 inline-flex items-center gap-1.5 rounded-full bg-black/80 px-3.5 py-1.5 text-xs font-bold text-white backdrop-blur-md border border-white/20">
              <ScanLine className="size-3.5 text-emerald-400" />
              Gemini Vision · {category || "Đã nhận diện"}
            </span>
          </div>

          <div className="flex flex-wrap gap-2 p-3">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 border border-primary/20 px-3.5 py-1 text-sm font-bold text-primary">
              {tagLabel}
            </span>
          </div>
        </div>

        {/* Right: suggestion cards */}
        <div className="flex flex-col">
          <div className="mb-4">
            <h3 className="font-serif text-lg font-bold text-foreground">{t.suggestionsTitle}</h3>
            <p className="text-sm text-muted-foreground">{t.suggestionsHint}</p>
          </div>

          <div className="flex flex-1 flex-col gap-4">
            {suggestions.map((s) => {
              const active = s.id === selectedId
              const Icon = s.icon || Sprout
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => onSelect(s.id)}
                  aria-pressed={active}
                  className={`group flex items-start gap-4 rounded-2xl border p-5 text-left transition-all ${
                    active
                      ? "border-primary bg-primary/10 ring-2 ring-primary/40 shadow-sm"
                      : "border-border bg-card hover:border-primary/40 hover:shadow-sm"
                  }`}
                >
                  <span
                    className={`flex size-12 shrink-0 items-center justify-center rounded-xl transition-colors ${
                      active ? "bg-primary text-primary-foreground" : "bg-primary/10 text-primary"
                    }`}
                  >
                    <Icon className="size-6" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-serif text-base font-bold text-foreground">{s.title}</p>
                    <p className="mt-0.5 text-sm leading-relaxed text-muted-foreground">{s.desc}</p>
                    <div className="mt-3 flex flex-wrap items-center gap-4 text-xs font-medium text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <Gauge className="size-3.5" />
                        {t.difficulty}: {s.difficulty}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Clock className="size-3.5" />
                        {t.time}: {s.time}
                      </span>
                    </div>
                  </div>
                  <ArrowRight
                    className={`mt-1 size-5 shrink-0 transition-transform ${
                      active ? "text-primary" : "text-muted-foreground group-hover:translate-x-0.5"
                    }`}
                  />
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}