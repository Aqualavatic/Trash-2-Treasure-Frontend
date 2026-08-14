"use client"

import { useEffect, useRef, useState } from "react"
import { X, Loader2, Sparkles, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"

export function ArScanner({
  onClose,
  onAnalyzeFile,
}: {
  onClose: () => void
  onAnalyzeFile: (file: File) => void
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [isLoadingMindAR, setIsLoadingMindAR] = useState(true)
  const [isCapturing, setIsCapturing] = useState(false)

  useEffect(() => {
    let mindarThree: any = null

    // 1. Tải linh hoạt CDNMindAR & Three.js từ Trình Duyệt
    const loadMindARScript = async () => {
      try {
        // Tải Three.js nếu chưa có
        if (!(window as any).THREE) {
          await new Promise((resolve) => {
            const script3 = document.createElement("script")
            script3.src = "https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"
            script3.onload = resolve
            document.head.appendChild(script3)
          })
        }

        // Tải MindAR Image Three CDN
        if (!(window as any).MINDAR) {
          await new Promise((resolve) => {
            const scriptAR = document.createElement("script")
            scriptAR.src = "https://cdn.jsdelivr.net/npm/mind-ar@1.2.5/dist/mindar-image-three.prod.js"
            scriptAR.onload = resolve
            document.head.appendChild(scriptAR)
          })
        }

        setIsLoadingMindAR(false)

        // 2. Khởi tạo MindAR Engine (Dùng Camera sau)
        const THREE = (window as any).THREE
        const MINDAR = (window as any).MINDAR

        if (containerRef.current && MINDAR) {
          mindarThree = new MINDAR.IMAGE.MindARThree({
            container: containerRef.current,
            // Sử dụng file target AR đơn giản (hoặc mock target)
            imageTargetSrc: "https://cdn.jsdelivr.net/npm/mind-ar@1.2.5/examples/image-tracking/assets/card-example/card.mind",
          })

          const { renderer, scene, camera } = mindarThree

          // Tạo một khối 3D AR lơ lửng màu xanh lục lá tái chế
          const geometry = new THREE.BoxGeometry(0.5, 0.5, 0.5)
          const material = new THREE.MeshBasicMaterial({ color: 0x10b981, wireframe: true })
          const cube = new THREE.Mesh(geometry, material)

          // Gắn khối 3D vào điểm nhận diện AR
          const anchor = mindarThree.addAnchor(0)
          anchor.group.add(cube)

          // Bắt đầu bật camera
          await mindarThree.start()

          // Hiệu ứng xoay khối 3D
          renderer.setAnimationLoop(() => {
            cube.rotation.x += 0.01
            cube.rotation.y += 0.01
            renderer.render(scene, camera)
          })
        }
      } catch (err) {
        console.error("Lỗi khi nạp MindAR:", err)
        setIsLoadingMindAR(false)
      }
    }

    loadMindARScript()

    // 3. Dọn dẹp Camera khi đóng Modal
    return () => {
      if (mindarThree) {
        try {
          mindarThree.stop()
        } catch (e) {
          console.log("Stop AR stream", e)
        }
      }
    }
  }, [])

  // Chụp lại frame ảnh hiện tại từ Camera để gửi sang FastAPI / Gemini
  const handleCaptureAndAnalyze = () => {
    setIsCapturing(true)
    const videoElem = containerRef.current?.querySelector("video")

    if (videoElem) {
      const canvas = document.createElement("canvas")
      canvas.width = videoElem.videoWidth || 640
      canvas.height = videoElem.videoHeight || 480
      const ctx = canvas.getContext("2d")

      if (ctx) {
        ctx.drawImage(videoElem, 0, 0, canvas.width, canvas.height)
        canvas.toBlob((blob) => {
          if (blob) {
            const file = new File([blob], "ar_capture.jpg", { type: "image/jpeg" })
            onAnalyzeFile(file) // Bắn dữ liệu về cho main page phân tích
            onClose() // Đóng modal AR
          }
          setIsCapturing(false)
        }, "image/jpeg")
      }
    } else {
      setIsCapturing(false)
      alert("Không tìm thấy dữ liệu Camera. Vui lòng thử lại!")
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 p-4 backdrop-blur-md">
      <div className="relative flex h-full max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-3xl border border-white/20 bg-slate-950 shadow-2xl">
        
        {/* Nút Đóng Modal */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-20 rounded-full bg-black/60 p-2.5 text-white hover:bg-black/80 transition-colors"
        >
          <X className="size-5" />
        </button>

        {/* Khung Render MindAR Camera Live */}
        <div ref={containerRef} className="relative flex-1 overflow-hidden bg-black">
          {isLoadingMindAR && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-slate-900 text-white">
              <Loader2 className="size-8 animate-spin text-primary" />
              <p className="text-sm font-medium">Đang khởi tạo Camera AR Engine...</p>
            </div>
          )}

          {/* Vùng chỉ dẫn tâm ngắm AR */}
          <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
            <div className="relative size-64 rounded-3xl border-2 border-dashed border-emerald-400/80 bg-emerald-500/5">
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-emerald-500 px-3 py-1 text-[11px] font-bold text-slate-950 uppercase tracking-wider">
                MindAR Live Scanner
              </span>
            </div>
          </div>
        </div>

        {/* Bảng công cụ bên dưới */}
        <div className="flex items-center justify-between gap-4 bg-slate-900 p-5 border-t border-slate-800">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Sparkles className="size-4 shrink-0 text-emerald-400" />
            <span>Hướng camera vào rác thải và bấm Quét AI</span>
          </div>

          <Button
            onClick={handleCaptureAndAnalyze}
            disabled={isLoadingMindAR || isCapturing}
            className="gap-2 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold px-6"
          >
            {isCapturing ? (
              <Loader2 className="size-5 animate-spin" />
            ) : (
              <>
                <Sparkles className="size-4" />
                Quét AR ngay
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}