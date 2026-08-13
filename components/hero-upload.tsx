"use client"

import { useState, useRef } from "react"
import { Camera, ImageUp, Leaf, Sparkles, Loader2, RefreshCw, Scan } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { Dict } from "@/lib/dictionary"
import { ArScanner } from "@/components/ar-scanner"

export function HeroUpload({
  t,
  childrenMode,
  onChildrenModeChange,
  onAnalyze,
  isLoading,
}: {
  t: Dict
  childrenMode: boolean
  onChildrenModeChange: (value: boolean) => void
  onAnalyze: (file: File) => void
  isLoading: boolean
}) {
  const [dragActive, setDragActive] = useState(false)
  const [preview, setPreview] = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [showArModal, setShowArModal] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = (file: File | undefined) => {
    if (file && file.type.startsWith("image/")) {
      setSelectedFile(file)
      setPreview(URL.createObjectURL(file))
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragActive(false)
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange(e.dataTransfer.files[0])
    }
  }

  const handleStartAnalyze = () => {
    if (selectedFile) {
      onAnalyze(selectedFile)
    }
  }

  return (
    <section className="relative overflow-hidden">
      {/* Modal Quét AR Live */}
      {showArModal && (
        <ArScanner
          onClose={() => setShowArModal(false)}
          onAnalyzeFile={(file) => {
            handleFileChange(file)
            onAnalyze(file)
          }}
        />
      )}

      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(60%_50%_at_50%_0%,color-mix(in_oklab,var(--color-primary)_14%,transparent),transparent)]" />
      <div className="mx-auto max-w-6xl px-4 pt-14 pb-10 sm:px-6 sm:pt-20">
        <div className="mx-auto max-w-2xl text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            <Leaf className="size-3.5" aria-hidden="true" />
            {t.heroBadge}
          </span>
          <h1 className="mt-5 text-balance font-serif text-4xl font-extrabold leading-[1.1] tracking-tight text-foreground sm:text-5xl">
            {t.heroTitle}
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-pretty leading-relaxed text-muted-foreground">
            {t.heroSubtitle}
          </p>
        </div>

        <div className="mx-auto mt-10 max-w-2xl">
          <input
            type="file"
            ref={fileInputRef}
            accept="image/*"
            className="hidden"
            onChange={(e) => handleFileChange(e.target.files?.[0])}
          />

          <div
            onDragOver={(e) => {
              e.preventDefault()
              setDragActive(true)
            }}
            onDragLeave={() => setDragActive(false)}
            onDrop={handleDrop}
            className={`rounded-3xl border-2 border-dashed bg-card p-8 text-center transition-colors sm:p-12 ${
              dragActive ? "border-primary bg-primary/5" : "border-border"
            }`}
          >
            {preview ? (
              <div className="space-y-4">
                <div className="relative mx-auto max-w-xs overflow-hidden rounded-2xl border border-border shadow-md">
                  <img src={preview} alt="Preview" className="max-h-60 w-full object-cover" />
                </div>
                <div className="flex flex-wrap justify-center gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isLoading}
                    className="gap-2"
                  >
                    <RefreshCw className="size-4" />
                    Đổi ảnh khác
                  </Button>
                  <Button
                    type="button"
                    onClick={handleStartAnalyze}
                    disabled={isLoading}
                    className="gap-2 font-semibold"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="size-5 animate-spin" />
                        AI đang phân tích...
                      </>
                    ) : (
                      <>
                        <Sparkles className="size-5" />
                        Phân Tích AI
                      </>
                    )}
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <span className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <ImageUp className="size-8" aria-hidden="true" />
                </span>
                <p className="mt-5 font-serif text-lg font-semibold text-foreground">{t.dropTitle}</p>
                <p className="mt-1 text-sm text-muted-foreground">{t.dropHint}</p>

                <div className="mt-6 flex flex-wrap justify-center gap-3">
                  <Button
                    type="button"
                    size="lg"
                    onClick={() => fileInputRef.current?.click()}
                    className="h-12 gap-2 px-6 text-base font-semibold"
                  >
                    <Camera className="size-5 shrink-0" aria-hidden="true" />
                    <span>{t.uploadButton}</span>
                  </Button>

                  <Button
                    type="button"
                    size="lg"
                    variant="secondary"
                    onClick={() => setShowArModal(true)}
                    className="h-12 gap-2 bg-primary/10 px-6 text-base font-semibold text-primary hover:bg-primary/20"
                  >
                    <Scan className="size-5 shrink-0" />
                    <span>Quét AR Live</span>
                  </Button>
                </div>
              </>
            )}

            {/* Switch Chế độ Trẻ em */}
            <div className="mt-8 flex items-center justify-center">
              <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-border bg-background px-4 py-3">
                <span className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <Sparkles className="size-4 text-primary" aria-hidden="true" />
                  {t.childrenMode}
                  <span className="hidden text-xs font-normal text-muted-foreground sm:inline">
                    · {t.childrenModeHint}
                  </span>
                </span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={childrenMode}
                  aria-label={t.childrenMode}
                  onClick={() => onChildrenModeChange(!childrenMode)}
                  className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full px-0.5 transition-colors ${
                    childrenMode ? "bg-primary" : "bg-muted-foreground/30"
                  }`}
                >
                  <span
                    className={`inline-block size-5 transform rounded-full bg-card shadow transition-transform ${
                      childrenMode ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </label>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}