"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { X, Loader2, Sparkles, AlertCircle, RefreshCw, ZoomIn, Zap, CheckCircle2 } from "lucide-react"
import type { Dict } from "@/lib/dictionary"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

export function ArScanner({
  onClose,
  t,
  lang,
}: {
  onClose: () => void
  t: Dict
  lang: "vi" | "en"
}) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isScanning, setIsScanning] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment")
  
  const [zoomLevel, setZoomLevel] = useState<number>(1)
  const [trackCapabilities, setTrackCapabilities] = useState<MediaTrackCapabilities | null>(null)

  // Cập nhật state lưu thêm danh sách các vật thể để vẽ Bounding Box
  const [liveData, setLiveData] = useState<{
    wasteType: string
    confidence: number
    objects: { waste_type: string; confidence: number; box: number[] }[]
    diyIdeas: { id: string, title: string, description: string }[]
  } | null>(null)

  useEffect(() => {
    let stream: MediaStream | null = null
    let isMounted = true

    const startCamera = async () => {
      setIsLoading(true)
      setErrorMessage(null)

      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          throw new Error(t.arCameraError)
        }

        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: facingMode,
            width: { ideal: 1280 },
            height: { ideal: 720 },
            advanced: [{ zoom: 1 } as any]
          },
          audio: false,
        })

        if (videoRef.current && isMounted) {
          videoRef.current.srcObject = stream
          try {
            await videoRef.current.play()
          } catch (playErr: any) {
            if (playErr.name !== "AbortError") throw playErr
          }

          const videoTrack = stream.getVideoTracks()[0]
          const capabilities = videoTrack.getCapabilities()
          setTrackCapabilities(capabilities)
          setZoomLevel(1)
        }

        if (isMounted) setIsLoading(false)
      } catch (err: any) {
        console.error("Lỗi Camera:", err)
        if (!isMounted) return
        setErrorMessage(t.arCameraError)
        setIsLoading(false)
      }
    }

    startCamera()

    return () => {
      isMounted = false
      if (stream) {
        stream.getTracks().forEach((track) => track.stop())
      }
    }
  }, [facingMode])

  const handleZoomChange = async (newZoom: number) => {
    setZoomLevel(newZoom)
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream
      const track = stream.getVideoTracks()[0]
      try {
        await track.applyConstraints({
          advanced: [{ zoom: newZoom } as any]
        })
      } catch (e) {
        console.warn("Zoom error", e)
      }
    }
  }

  const captureAndLiveScan = useCallback(async () => {
    if (!videoRef.current || isScanning || isLoading) return
    const video = videoRef.current
    if (video.videoWidth === 0 || video.videoHeight === 0) return

    setIsScanning(true)
    try {
      const canvas = document.createElement("canvas")
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      const ctx = canvas.getContext("2d")
      
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
        
        canvas.toBlob(async (blob) => {
          if (!blob) {
            setIsScanning(false)
            return
          }

          const file = new File([blob], "ar_live.jpg", { type: "image/jpeg" })
          const formData = new FormData()
          formData.append("file", file)
          formData.append("lang", lang)

          try {
            const response = await fetch(`${API_URL}/api/ar-detect`, {
              method: "POST",
              body: formData,
            })

            if (response.ok) {
              const result = await response.json()
              if (result.has_waste) {
                setLiveData({
                  wasteType: result.waste_type,
                  confidence: result.confidence,
                  objects: result.objects || [],
                  diyIdeas: result.diy_ideas || []
                })
              } else {
                setLiveData(null)
              }
            }
          } catch (err) {
            console.error("Lỗi kết nối AI Live:", err)
          } finally {
            setIsScanning(false)
          }
        }, "image/jpeg", 0.75)
      }
    } catch (e) {
      setIsScanning(false)
    }
  }, [isScanning, isLoading, lang])

  useEffect(() => {
    if (isLoading || errorMessage) return
    const interval = setInterval(() => {
      captureAndLiveScan()
    }, 3000) // Tăng lên 3s để tối ưu hiệu suất gọi API kết hợp vật thể
    return () => clearInterval(interval)
  }, [isLoading, errorMessage, captureAndLiveScan])

  const toggleCamera = () => {
    setFacingMode((prev) => (prev === "environment" ? "user" : "environment"))
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 p-2 sm:p-4 backdrop-blur-sm">
      <div className="relative flex h-full max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-3xl border border-white/20 bg-slate-950 shadow-2xl">
        <button onClick={onClose} className="absolute top-4 right-4 z-30 rounded-full bg-black/50 p-2 text-white hover:bg-black/70 transition-colors"><X className="size-4" /></button>
        <button onClick={toggleCamera} className="absolute top-4 left-4 z-30 rounded-full bg-black/50 p-2 text-white hover:bg-black/70 transition-colors" title={t.arSwitchCamera}><RefreshCw className="size-4" /></button>

        {/* Zoom controls */}
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-30 flex items-center gap-1.5 bg-black/50 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/10 text-white text-[11px] font-medium">
          <ZoomIn className="size-3 text-emerald-400" />
          <span>Zoom</span>
          {[1,2,3].map(z => (
             <button key={z} onClick={() => handleZoomChange(z)} className={`px-2 py-0.5 rounded-full transition-colors ${zoomLevel === z ? 'bg-emerald-500 text-slate-950 font-bold' : 'hover:bg-white/20'}`}>{z}x</button>
          ))}
        </div>

        <div className="relative flex-1 overflow-hidden bg-black w-full h-full flex items-center justify-center">
          <video ref={videoRef} playsInline muted className="h-full w-full object-cover" />
          
          {/* VẼ BOUNDING BOX KHÔNG HIỆN TÊN (CHỈ HIỆN KHUNG KHOANH VẬT THỂ) */}
          {liveData?.objects && liveData.objects.map((obj, idx) => {
            // box format từ backend trả về dạng [ymin, xmin, ymax, xmax] theo phần trăm (%)
            const [ymin, xmin, ymax, xmax] = obj.box;
            return (
              <div
                key={idx}
                className="absolute border-2 border-emerald-400 bg-emerald-400/10 rounded-md pointer-events-none transition-all duration-300 z-10 shadow-[0_0_15px_rgba(52,211,153,0.4)]"
                style={{
                  top: `${ymin}%`,
                  left: `${xmin}%`,
                  height: `${ymax - ymin}%`,
                  width: `${xmax - xmin}%`,
                }}
              />
            )
          })}

          {isLoading && (!errorMessage) && <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-2 bg-slate-950/80 text-white"><Loader2 className="size-6 animate-spin text-emerald-400" /><p className="text-xs">{t.arLoading}</p></div>}
          {errorMessage && <div className="absolute inset-0 z-20 flex flex-col items-center justify-center p-6 text-center bg-slate-950/80 text-red-400 gap-2 text-xs"><AlertCircle className="size-8 text-red-500" /><span className="font-semibold text-slate-200">{errorMessage}</span></div>}

          {/* KHUNG THÔNG TIN TỔNG HỢP Ở GÓC MÀN HÌNH */}
          {(!isLoading && !errorMessage && liveData) ? (
            <div className="absolute bottom-3 left-3 z-20 rounded-xl bg-slate-950/85 border border-white/15 p-2.5 text-white text-[10px] shadow-xl backdrop-blur-md w-[85vw] max-w-[260px] animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="flex items-center gap-1.5 mb-2 pb-1.5 border-b border-white/10">
                <div className="p-1 rounded bg-emerald-500/20 text-emerald-300">
                  <CheckCircle2 className="size-3.5" />
                </div>
                <div>
                  <h3 className="font-bold text-xs text-white capitalize line-clamp-1">{liveData.wasteType}</h3>
                  <p className="text-[9px] text-slate-400">Đã nhận diện các vật thể kết hợp</p>
                </div>
              </div>

              <div className="space-y-1.5 max-h-[140px] overflow-y-auto pr-1">
                <p className="font-semibold text-slate-300 flex items-center gap-1 text-[10px]">
                  <Zap className="size-3 text-amber-400" /> Ý tưởng UpcycleDIY:
                </p>
                
                {liveData.diyIdeas.map((idea, index) => (
                  <div key={idea.id || index} className="p-1.5 rounded-lg bg-white/5 border border-white/5">
                    <span className="font-semibold text-emerald-300 block text-[10px]">
                      {index + 1}. {idea.title}
                    </span>
                    <p className="text-[9px] text-slate-400 line-clamp-1 mt-0.5">
                      {idea.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="pointer-events-none absolute inset-0 z-20 flex flex-col items-center justify-center p-6">
              <div className="relative w-40 h-40 rounded-2xl border-2 border-dashed border-white/20 bg-transparent flex items-center justify-center">
                <span className="rounded-full bg-black/60 px-2.5 py-1 text-[10px] font-medium text-white backdrop-blur-md">
                  {isScanning ? t.arScanning : t.arAimCamera}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Footer bar */}
        <div className="z-30 flex items-center justify-between gap-2 bg-slate-950 px-3 py-2 border-t border-white/10">
          <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
            <Sparkles className="size-3.5 shrink-0 text-emerald-400" />
            <span>{liveData ? "Đã khoanh vùng vật thể trong khung hình." : t.arFrameHint}</span>
          </div>
          <button onClick={onClose} className="rounded-lg bg-white/5 hover:bg-white/10 text-slate-200 font-medium px-3 py-1 text-[11px] transition-all border border-white/10">
            {t.arClose}
          </button>
        </div>
      </div>
    </div>
  )
}
