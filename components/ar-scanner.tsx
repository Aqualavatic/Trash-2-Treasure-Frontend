"use client"

import { useEffect, useRef, useState } from "react"
import { Camera, X, Loader2, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"

export function ArScanner({
  onClose,
  onAnalyzeFile,
}: {
  onClose: () => void
  onAnalyzeFile: (file: File) => void
}) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isCapturing, setIsCapturing] = useState(false)

  // Khởi tạo Camera stream trên thiết bị
  useEffect(() => {
    let stream: MediaStream | null = null

    async function startCamera() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" }, // Ưu tiên Camera sau điện thoại
        })
        if (videoRef.current) {
          videoRef.current.srcObject = stream
        }
      } catch (err) {
        console.error("Không thể truy cập camera:", err)
        alert("Vui lòng cấp quyền truy cập Camera cho trình duyệt!")
      }
    }

    startCamera()

    return () => {
      // Dọn dẹp Stream Camera khi tắt modal
      if (stream) {
        stream.getTracks().forEach((track) => track.stop())
      }
    }
  }, [])

  // Chụp 1 frame từ Camera live và biến thành File để gửi sang API
  const handleCaptureFrame = () => {
    if (!videoRef.current || !canvasRef.current) return

    setIsCapturing(true)
    const video = videoRef.current
    const canvas = canvasRef.current

    canvas.width = video.videoWidth || 640
    canvas.height = video.videoHeight || 480

    const ctx = canvas.getContext("2d")
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
      canvas.toBlob((blob) => {
        if (blob) {
          const file = new File([blob], "ar-capture.jpg", { type: "image/jpeg" })
          onAnalyzeFile(file) // Gọi lại hàm phân tích của Page.tsx
          onClose() // Đóng camera modal
        }
        setIsCapturing(false)
      }, "image/jpeg")
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 backdrop-blur-md">
      <div className="relative flex h-full max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-3xl border border-white/20 bg-slate-900 shadow-2xl">
        {/* Nút Đóng Modal */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 rounded-full bg-black/50 p-2 text-white hover:bg-black/70"
        >
          <X className="size-6" />
        </button>

        {/* Khung Camera Stream Live */}
        <div className="relative flex-1 overflow-hidden bg-black">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="h-full w-full object-cover"
          />

          {/* Khung định vị AR lơ lửng */}
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="relative size-64 rounded-3xl border-2 border-dashed border-primary/80 bg-primary/5">
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-0.5 text-[10px] font-bold text-white uppercase tracking-wider">
                Quét Rác Thải AR
              </span>
            </div>
          </div>
        </div>

        <canvas ref={canvasRef} className="hidden" />

        {/* Thanh công cụ Chụp AR */}
        <div className="flex items-center justify-between gap-4 bg-slate-950 p-6">
          <p className="text-xs text-slate-400">
            Hướng camera về phía rác thải và bấm quét AR.
          </p>
          <Button
            onClick={handleCaptureFrame}
            disabled={isCapturing}
            className="gap-2 rounded-2xl px-6 font-semibold"
          >
            {isCapturing ? (
              <Loader2 className="size-5 animate-spin" />
            ) : (
              <>
                <Sparkles className="size-5" />
                Quét Ngay
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}