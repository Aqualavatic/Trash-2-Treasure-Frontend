"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { X, Loader2, Sparkles, AlertCircle, RefreshCw, CheckCircle2 } from "lucide-react"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

export function ArScanner({
  onClose,
}: {
  onClose: () => void
  onAnalyzeFile?: (file: File) => void
}) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isScanning, setIsScanning] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment")

  // Trạng thái lưu kết quả Live AR từ server trả về
  const [liveData, setLiveData] = useState<{
    wasteType: string
    category: string
    confidence: number
    box: [number, number, number, number] // [ymin, xmin, ymax, xmax] theo %
    quickGuide: string
  } | null>(null)

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

  // Vòng lặp quét ngầm liên tục Real-time (Live AR Loop)
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
                  category: result.category,
                  confidence: result.confidence,
                  box: result.box,
                  quickGuide: result.quick_guide,
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
  }, [isScanning, isLoading])

  // Tự động kích hoạt quét mỗi 1.2 giây để tạo độ mượt chuyển động AR trực tiếp
  useEffect(() => {
    if (isLoading || errorMessage) return
    const interval = setInterval(() => {
      captureAndLiveScan()
    }, 1200)
    return () => clearInterval(interval)
  }, [isLoading, errorMessage, captureAndLiveScan])

  const toggleCamera = () => {
    setFacingMode((prev) => (prev === "environment" ? "user" : "environment"))
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 p-4 backdrop-blur-md">
      <div className="relative flex h-full max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-3xl border border-white/20 bg-slate-950 shadow-2xl">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-30 rounded-full bg-black/60 p-2.5 text-white hover:bg-black/80 transition-colors"
        >
          <X className="size-5" />
        </button>

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
              <p className="text-sm font-medium">Đang khởi động Camera Live AR...</p>
            </div>
          )}

          {errorMessage && (
            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center p-6 text-center bg-slate-900 text-red-400 gap-3 text-sm">
              <AlertCircle className="size-10 text-red-500" />
              <span className="font-semibold text-slate-200">{errorMessage}</span>
            </div>
          )}

          {/* LỚP PHỦ AR LIVE BÁM SÁT VẬT THỂ & HIỂN THỊ HƯỚNG DẪN TRỰC TIẾP */}
          {!isLoading && !errorMessage && liveData && liveData.box ? (
            <div 
              className="absolute z-20 pointer-events-none border-2 border-emerald-400 bg-emerald-500/15 rounded-xl transition-all duration-300 shadow-[0_0_25px_rgba(52,211,153,0.5)]"
              style={{
                top: `${liveData.box[0]}%`,
                left: `${liveData.box[1]}%`,
                height: `${liveData.box[2] - liveData.box[0]}%`,
                width: `${liveData.box[3] - liveData.box[1]}%`,
              }}
            >
              {/* Nhãn tên rác bay lơ lửng phía trên vật thể */}
              <div className="absolute -top-11 left-0 flex items-center gap-1.5 rounded-xl bg-emerald-500 px-3 py-1.5 text-slate-950 font-bold text-xs shadow-xl whitespace-nowrap">
                <CheckCircle2 className="size-4" />
                <span>{liveData.wasteType} ({Math.round(liveData.confidence * 100)}%)</span>
              </div>

              {/* Bảng hướng dẫn trực tiếp hiển thị ngay bên trong không gian AR */}
              <div className="absolute -bottom-16 left-1/2 -translate-x-1/2 rounded-2xl bg-slate-900/90 border border-emerald-500/40 px-3 py-2 text-center text-white text-xs shadow-2xl backdrop-blur-md w-48 whitespace-nowrap">
                <p className="font-bold text-emerald-400">💡 Hướng dẫn nhanh:</p>
                <p className="text-[11px] text-slate-200 mt-0.5">{liveData.quickGuide}</p>
              </div>
            </div>
          ) : (
            <div className="pointer-events-none absolute inset-0 z-20 flex flex-col items-center justify-center p-6">
              <div className="relative w-64 h-64 rounded-3xl border-2 border-dashed border-white/30 bg-white/5 flex items-center justify-center">
                <span className="rounded-full bg-black/70 px-3 py-1 text-xs font-medium text-white backdrop-blur-md">
                  {isScanning ? "AI đang quét không gian..." : "Lia camera vào rác để nhận hướng dẫn AR"}
                </span>
              </div>
            </div>
          )}
        </div>

        <div className="z-30 flex items-center justify-between gap-4 bg-slate-900 p-5 border-t border-slate-800">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Sparkles className="size-4 shrink-0 text-emerald-400" />
            <span>{liveData ? "Đang hướng dẫn trực tiếp trên AR Live!" : "Đưa rác vào khung hình camera"}</span>
          </div>

          <button
            onClick={onClose}
            className="rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold px-6 py-3 text-sm transition-all"
          >
            Đóng AR
          </button>
        </div>
      </div>
    </div>
  )
}
