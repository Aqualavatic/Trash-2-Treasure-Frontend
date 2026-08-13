"use client"

import { Cpu, Globe, Recycle } from "lucide-react"

type Lang = "vi" | "en"

export function SiteNavbar({
  lang,
  onLangChange,
}: {
  lang: Lang
  onLangChange: (lang: Lang) => void
}) {
  return (
    <header className="sticky top-0 z-40 border-b border-border/80 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <div className="flex items-center gap-2.5">
          <span className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
            <Recycle className="size-5" aria-hidden="true" />
          </span>
          <span className="font-serif text-lg font-bold tracking-tight text-foreground">
            Trash2Treasure
            <span className="text-primary"> Vision</span>
          </span>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <span className="hidden items-center gap-1.5 rounded-full bg-info/10 px-3 py-1.5 text-xs font-semibold text-info sm:inline-flex">
            <Cpu className="size-3.5" aria-hidden="true" />
            Powered by Intel OpenVINO
          </span>

          <div
            role="group"
            aria-label="Language switcher"
            className="flex items-center rounded-full border border-border bg-card p-0.5"
          >
            <Globe className="mx-1.5 size-3.5 text-muted-foreground" aria-hidden="true" />
            {(["vi", "en"] as const).map((code) => (
              <button
                key={code}
                type="button"
                onClick={() => onLangChange(code)}
                aria-pressed={lang === code}
                className={`rounded-full px-2.5 py-1 text-xs font-semibold uppercase transition-colors ${
                  lang === code
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {code}
              </button>
            ))}
          </div>
        </div>
      </div>
    </header>
  )
}
