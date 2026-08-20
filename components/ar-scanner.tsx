"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { X, Loader2, Sparkles, AlertCircle, RefreshCw, CheckCircle2, ZoomIn, Zap } from "lucide-react"
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

  const [liveData, setLiveData] = useState<{
    wasteType: string
    confidence: number
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
        console.warn("Dùng scale CSS dự phòng cho zoom", e)
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
                  diyIdeas: result.diy_ideas || [
                    { id: '1', title: 'Làm chậu cây mini', description: 'Cắt phần đầu chai...' },
                    { id: '2', title: 'Hộp đựng bút', description: 'Sơn màu trang trí...' },
                    { id: '3', title: 'Vòng đeo tay DIY', description: 'Cắt vòng từ thân chai...' }
                  ]
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
    }, 1500)
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
          <video ref={videoRef} playsInline muted className="h-full w-full object-cover" style={{ transform: trackCapabilities && !(trackCapabilities as any).zoom ? `scale(${zoomLevel})` : 'scale(1)' }} />
          
          {isLoading && (!errorMessage) && <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-2 bg-slate-950/80 text-white"><Loader2 className="size-6 animate-spin text-emerald-400" /><p className="text-xs">{t.arLoading}</p></div>}
          {errorMessage && <div className="absolute inset-0 z-20 flex flex-col items-center justify-center p-6 text-center bg-slate-950/80 text-red-400 gap-2 text-xs"><AlertCircle className="size-8 text-red-500" /><span className="font-semibold text-slate-200">{errorMessage}</span></div>}

          {/* KHUNG GỌN VÀ TRONG SUỐT Ở GÓC DƯỚI TRÁI */}
          {(!isLoading && !errorMessage && liveData) ? (
            <div className="absolute bottom-4 left-4 z-20 rounded-2xl bg-slate-950/70 border border-white/10 p-3 text-white text-[11px] shadow-2xl backdrop-blur-xl w-[90vw] max-w-sm animate-in fade-in slide-in-from-bottom-3 duration-300">
              <div className="flex items-center gap-2 mb-2.5 pb-2.5 border-b border-white/10">
                <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  <CheckCircle2 className="size-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-white">{liveData.wasteType}</h3>
                  <p className="text-[10px] text-slate-400">Độ chính xác: {Math.round(liveData.confidence * 100)}%</p>
                </div>
              </div>

              <div className="space-y-2">
                <p className="font-semibold text-slate-300 flex items-center gap-1.5 text-xs mb-2">
                  <Zap className="size-3.5 text-amber-400" /> Bạn muốn tái chế thành gì?
                </p>
                
                {liveData.diyIdeas.map((idea, index) => (
                  <button 
                    key={idea.id} 
                    className="w-full text-left p-2.5 rounded-xl bg-white/5 hover:bg-white/15 border border-white/10 transition-all group active:scale-[0.98]"
                  >
                    <div className="flex justify-between items-start gap-2">
                      <span className="font-semibold text-white group-hover:text-emerald-300">
                        {index + 1}. {idea.title}
                      </span>
                      <span className="text-[9px] uppercase px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">Chọn</span>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1 pr-6 line-clamp-2">
                      {idea.description}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            // Đã xóa backdrop-blur ở đây để màn hình camera ở giữa hoàn toàn trong suốt không bị mờ
            <div className="pointer-events-none absolute inset-0 z-20 flex flex-col items-center justify-center p-6">
              <div className="relative w-48 h-48 rounded-3xl border-2 border-dashed border-white/20 bg-transparent flex items-center justify-center">
                <span className="rounded-full bg-black/60 px-3 py-1 text-[11px] font-medium text-white backdrop-blur-md">
                  {isScanning ? t.arScanning : t.arAimCamera}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Footer bar */}
        <div className="z-30 flex items-center justify-between gap-4 bg-slate-950 p-3 border-t border-white/10">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Sparkles className="size-4 shrink-0 text-emerald-400" />
            <span>{liveData ? "Quét thành công. Vui lòng chọn ý tưởng bên trái." : t.arFrameHint}</span>
          </div>
          <button onClick={onClose} className="rounded-xl bg-white/5 hover:bg-white/10 text-slate-200 font-medium px-4 py-2 text-xs transition-all border border-white/10">
            {t.arClose}
          </button>
        </div>
      </div>
    </div>
  )
}
