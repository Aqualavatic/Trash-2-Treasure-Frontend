"use client"

import { useEffect, useRef, useState } from "react"
import { X, Loader2, Sparkles, AlertCircle, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"

export function ArScanner({
  onClose,
  onAnalyzeFile,
}: {
  onClose: () => void
  onAnalyzeFile: (file: File) => void
}) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isCapturing, setIsCapturing] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment")

  useEffect(() => {
    let stream: MediaStream | null = null
    let isMounted = true // Cờ chống lỗi duplicate render của React Strict Mode

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

        // Kiểm tra xem Component có còn mount trên màn hình không trước khi gán
        if (videoRef.current && isMounted) {
          videoRef.current.srcObject = stream
          
          try {
            await videoRef.current.play()
          } catch (playErr: any) {
            // Bỏ qua AbortError do React Strict Mode ngắt luồng play giữa chừng
            if (playErr.name !== "AbortError") {
              throw playErr
            }
          }
        }

        if (isMounted) setIsLoading(false)
      } catch (err: any) {
        console.error("Lỗi Camera:", err)
        if (!isMounted) return

        if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
          setErrorMessage("Vui lòng cấp quyền truy cập Camera trên trình duyệt để quét!")
        } else if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
          setErrorMessage("Không tìm thấy thiết bị Camera nào trên máy tính/điện thoại!")
        } else if (err.name !== "AbortError") {
          setErrorMessage("Không thể kết nối với Camera. Vui lòng thử lại!")
        }
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

  const toggleCamera = () => {
    setFacingMode((prev) => (prev === "environment" ? "user" : "environment"))
  }

  const handleCaptureAndAnalyze = () => {
    if (!videoRef.current) return
    setIsCapturing(true)

    try {
      const video = videoRef.current
      const canvas = document.createElement("canvas")
      canvas.width = video.videoWidth || 640
      canvas.height = video.videoHeight || 480

      const ctx = canvas.getContext("2d")
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
        
        canvas.toBlob((blob) => {
          if (blob) {
            const file = new File([blob], "ar_capture.jpg", { type: "image/jpeg" })
            onAnalyzeFile(file)
            onClose()
          }
          setIsCapturing(false)
        }, "image/jpeg", 0.95)
      }
    } catch (e) {
      console.error("Lỗi chụp ảnh:", e)
      setIsCapturing(false)
      alert("Không thể chụp ảnh từ Camera!")
    }
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
              <p className="text-sm font-medium">Đang khởi động Camera AI...</p>
            </div>
          )}

          {errorMessage && (
            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center p-6 text-center bg-slate-900 text-red-400 gap-3 text-sm">
              <AlertCircle className="size-10 text-red-500" />
              <span className="font-semibold text-slate-200">{errorMessage}</span>
            </div>
          )}

          {!isLoading && !errorMessage && (
            <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center">
              <div className="relative size-64 rounded-3xl border-2 border-dashed border-emerald-400/80 bg-emerald-500/10 backdrop-blur-[1px] animate-pulse">
                <div className="absolute -top-1 -left-1 size-4 border-t-4 border-l-4 border-emerald-400 rounded-tl-lg" />
                <div className="absolute -top-1 -right-1 size-4 border-t-4 border-r-4 border-emerald-400 rounded-tr-lg" />
                <div className="absolute -bottom-1 -left-1 size-4 border-b-4 border-l-4 border-emerald-400 rounded-bl-lg" />
                <div className="absolute -bottom-1 -right-1 size-4 border-b-4 border-r-4 border-emerald-400 rounded-br-lg" />

                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-emerald-500 px-3 py-1 text-[11px] font-bold text-slate-950 uppercase tracking-wider shadow-lg">
                  AI Live Scanner
                </span>
              </div>
            </div>
          )}
        </div>

        <div className="z-30 flex items-center justify-between gap-4 bg-slate-900 p-5 border-t border-slate-800">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Sparkles className="size-4 shrink-0 text-emerald-400" />
            <span>Đưa rác vào khung hình và ấn Quét AI</span>
          </div>

          <Button
            onClick={handleCaptureAndAnalyze}
            disabled={isLoading || isCapturing || !!errorMessage}
            className="gap-2 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold px-6 py-5 shadow-lg shadow-emerald-500/20"
          >
            {isCapturing ? (
              <Loader2 className="size-5 animate-spin" />
            ) : (
              <>
                <Sparkles className="size-4" />
                Quét AI ngay
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}