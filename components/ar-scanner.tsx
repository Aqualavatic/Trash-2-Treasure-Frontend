"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { X, Loader2, Sparkles, AlertCircle, RefreshCw, CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

export function ArScanner({
  onClose,
  onAnalyzeFile,
  lang = "vi",
  childrenMode = true,
}: {
  onClose: () => void
  onAnalyzeFile: (file: File) => void
  lang?: "vi" | "en"
  childrenMode?: boolean
}) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isScanning, setIsScanning] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment")
  
  // Trạng thái kết quả AR Real-time
  const [detectedResult, setDetectedResult] = useState<{
    wasteType: string
    category: string
    confidence?: number
  } | null>(null)

  // Khởi động Camera
  useEffect(() => {
    let stream: MediaStream | null = null
    let isMounted = true

    const startCamera = async () => {
      setIsLoading(true)
      setErrorMessage(null)

      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          throw new Error("Trình duyệt không hỗ trợ truy cập Camera!")
        }

        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: facingMode,
            width: { ideal: 1280 },
            height: { ideal: 720 },
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
        }

        if (isMounted) setIsLoading(false)
      } catch (err: any) {
        console.error("Lỗi Camera:", err)
        if (!isMounted) return
        setErrorMessage("Không thể kết nối với Camera. Vui lòng cấp quyền!")
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

  // HÀM GỬI FRAME NGẦM LÊN SERVER ĐỂ QUÉT REAL-TIME
  const captureAndAutoScan = useCallback(async () => {
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

          const file = new File([blob], "ar_autoscan.jpg", { type: "image/jpeg" })
          const formData = new FormData()
          formData.append("file", file)
          formData.append("children_mode", String(childrenMode))
          formData.append("lang", lang)

          try {
            const response = await fetch(`${API_URL}/api/analyze`, {
              method: "POST",
              body: formData,
            })

            if (response.ok) {
              const result = await response.json()
              if (result.has_waste) {
                setDetectedResult({
                  wasteType: result.waste_type || "Rác thải",
                  category: result.category || "Tái chế",
                  confidence: result.confidence,
                })
              } else {
                setDetectedResult(null)
              }
            }
          } catch (err) {
            console.error("Lỗi tự động quét AR:", err)
          } finally {
            setIsScanning(false)
          }
        }, "image/jpeg", 0.85)
      }
    } catch (e) {
      setIsScanning(false)
    }
  }, [isScanning, isLoading, childrenMode, lang])

  // CHẠY VÒNG LẶP TỰ ĐỘNG QUÉT MỖI 2.5 GIÂY
  useEffect(() => {
    if (isLoading || errorMessage) return

    const interval = setInterval(() => {
      captureAndAutoScan()
    }, 2500) // Cứ 2.5s quét 1 lần để không bị nghẽn mạng server

    return () => clearInterval(interval)
  }, [isLoading, errorMessage, captureAndAutoScan])

  const toggleCamera = () => {
    setFacingMode((prev) => (prev === "environment" ? "user" : "environment"))
  }

  // Khi người dùng bấm vào khung AR đang nhận diện thành công để xem kết quả chính thức
  const handleLockAndSelect = () => {
    if (!videoRef.current) return
    const video = videoRef.current
    const canvas = document.createElement("canvas")
    canvas.width = video.videoWidth || 640
    canvas.height = video.videoHeight || 480
    const ctx = canvas.getContext("2d")
    
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
      canvas.toBlob((blob) => {
        if (blob) {
          const file = new File([blob], "ar_locked.jpg", { type: "image/jpeg" })
          onAnalyzeFile(file)
          onClose()
        }
      }, "image/jpeg", 0.95)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 p-4 backdrop-blur-md">
      <div className="relative flex h-full max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-3xl border border-white/20 bg-slate-950 shadow-2xl">
        {/* Nút đóng */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-30 rounded-full bg-black/60 p-2.5 text-white hover:bg-black/80 transition-colors"
        >
          <X className="size-5" />
        </button>

        {/* Nút đổi camera trước/sau */}
        <button
          onClick={toggleCamera}
          className="absolute top-4 left-4 z-30 rounded-full bg-black/60 p-2.5 text-white hover:bg-black/80 transition-colors"
          title="Đổi camera"
        >
          <RefreshCw className="size-5" />
        </button>

        <div className="relative flex-1 overflow-hidden bg-black w-full h-full flex items-center justify-center">
          <video
            ref={videoRef}
            playsInline
            muted
            className="h-full w-full object-cover"
          />

          {isLoading && !errorMessage && (
            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-slate-900 text-white">
              <Loader2 className="size-8 animate-spin text-emerald-400" />
              <p className="text-sm font-medium">Đang khởi động Camera AI...</p>
            </div>
          )}

          {errorMessage && (
            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center p-6 text-center bg-slate-900 text-red-400 gap-3 text-sm">
              <AlertCircle className="size-10 text-red-500" />
              <span className="font-semibold text-slate-200">{errorMessage}</span>
            </div>
          )}

          {/* HIỆU ỨNG KHUNG AR OVERLAY REAL-TIME */}
          {!isLoading && !errorMessage && (
            <div className="pointer-events-none absolute inset-0 z-20 flex flex-col items-center justify-center p-6">
              <div className={`relative w-72 h-72 rounded-3xl border-2 transition-all duration-300 ${
                detectedResult ? "border-emerald-400 bg-emerald-500/10 shadow-[0_0_30px_rgba(52,211,153,0.5)]" : "border-dashed border-white/40 bg-white/5"
              }`}>
                {/* 4 góc khung ngắm */}
                <div className={`absolute -top-1 -left-1 size-5 border-t-4 border-l-4 rounded-tl-lg ${detectedResult ? "border-emerald-400" : "border-white"}`} />
                <div className={`absolute -top-1 -right-1 size-5 border-t-4 border-r-4 rounded-tr-lg ${detectedResult ? "border-emerald-400" : "border-white"}`} />
                <div className={`absolute -bottom-1 -left-1 size-5 border-b-4 border-l-4 rounded-bl-lg ${detectedResult ? "border-emerald-400" : "border-white"}`} />
                <div className={`absolute -bottom-1 -right-1 size-5 border-b-4 border-r-4 rounded-br-lg ${detectedResult ? "border-emerald-400" : "border-white"}`} />

                {/* Nhãn hiển thị kết quả AI ngay trên khung AR */}
                {detectedResult ? (
                  <div className="absolute -top-12 left-1/2 -translate-x-1/2 flex items-center gap-2 rounded-2xl bg-emerald-500 px-4 py-2 text-slate-950 font-bold shadow-xl animate-bounce">
                    <CheckCircle2 className="size-5" />
                    <span>#{detectedResult.wasteType}</span>
                  </div>
                ) : (
                  <div className="absolute -top-10 left-1/2 -translate-x-1/2 rounded-full bg-black/70 px-3 py-1 text-xs font-medium text-white backdrop-blur-md">
                    {isScanning ? "AI đang quét..." : "Đưa rác vào khung"}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Thanh điều khiển đáy */}
        <div className="z-30 flex items-center justify-between gap-4 bg-slate-900 p-5 border-t border-slate-800">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Sparkles className="size-4 shrink-0 text-emerald-400" />
            <span>{detectedResult ? "Đã nhận diện! Bấm để lấy ý tưởng" : "Lia camera vào rác để AI tự nhận diện"}</span>
          </div>

          <Button
            onClick={handleLockAndSelect}
            disabled={isLoading || !!errorMessage}
            className={`gap-2 rounded-2xl font-bold px-6 py-5 shadow-lg transition-all ${
              detectedResult 
                ? "bg-emerald-500 hover:bg-emerald-600 text-slate-950 shadow-emerald-500/30 scale-105" 
                : "bg-slate-800 text-slate-200 hover:bg-slate-700"
            }`}
          >
            <Sparkles className="size-4" />
            {detectedResult ? "Chọn vật thể này" : "Chụp & Phân tích"}
          </Button>
        </div>
      </div>
    </div>
  )
}
