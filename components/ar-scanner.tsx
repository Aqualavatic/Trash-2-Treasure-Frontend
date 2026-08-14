"use client"

import { useEffect, useRef, useState } from "react"
import { X, Loader2, Sparkles } from "lucide-react"
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
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    let mindarThree: any = null

    const loadMindARScript = async () => {
      try {
        // 1. Load Three.js
        if (!(window as any).THREE) {
          await new Promise((resolve, reject) => {
            const script3 = document.createElement("script")
            script3.src = "https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"
            script3.onload = resolve
            script3.onerror = reject
            document.head.appendChild(script3)
          })
        }

        // 2. Load MindAR
        if (!(window as any).MINDAR) {
          await new Promise((resolve, reject) => {
            const scriptAR = document.createElement("script")
            scriptAR.src = "https://cdn.jsdelivr.net/npm/mind-ar@1.2.5/dist/mindar-image-three.prod.js"
            scriptAR.onload = resolve
            scriptAR.onerror = reject
            document.head.appendChild(scriptAR)
          })
        }

        const THREE = (window as any).THREE
        const MINDAR = (window as any).MINDAR

        if (containerRef.current && MINDAR) {
          // Khởi tạo MindAR Engine
          mindarThree = new MINDAR.IMAGE.MindARThree({
            container: containerRef.current,
            imageTargetSrc: "https://cdn.jsdelivr.net/npm/mind-ar@1.2.5/examples/image-tracking/assets/card-example/card.mind",
            uiLoading: "no", // Tắt màn hình loading mặc định của MindAR để không che video
            uiScanning: "no"
          })

          const { renderer, scene, camera } = mindarThree

          // Tạo khối 3D màu xanh lá
          const geometry = new THREE.BoxGeometry(0.5, 0.5, 0.5)
          const material = new THREE.MeshBasicMaterial({ color: 0x10b981, wireframe: true })
          const cube = new THREE.Mesh(geometry, material)

          const anchor = mindarThree.addAnchor(0)
          anchor.group.add(cube)

          // Bắt đầu bật camera
          await mindarThree.start()

          // FIX ĐEN MÀN HÌNH: Cấu hình lại CSS cho thẻ video do MindAR tạo ra
          const videoElem = containerRef.current.querySelector("video")
          if (videoElem) {
            videoElem.style.position = "absolute"
            videoElem.style.top = "0"
            videoElem.style.left = "0"
            videoElem.style.width = "100%"
            videoElem.style.height = "100%"
            videoElem.style.objectFit = "cover"
            videoElem.style.zIndex = "0"
          }

          const canvasElem = containerRef.current.querySelector("canvas")
          if (canvasElem) {
            canvasElem.style.position = "absolute"
            canvasElem.style.top = "0"
            canvasElem.style.left = "0"
            canvasElem.style.width = "100%"
            canvasElem.style.height = "100%"
            canvasElem.style.zIndex = "1"
          }

          setIsLoadingMindAR(false)

          renderer.setAnimationLoop(() => {
            cube.rotation.x += 0.01
            cube.rotation.y += 0.01
            renderer.render(scene, camera)
          })
        }
      } catch (err: any) {
        console.error("Lỗi khi nạp MindAR:", err)
        setErrorMessage("Không thể mở Camera. Vui lòng cấp quyền camera cho trình duyệt!")
        setIsLoadingMindAR(false)
      }
    }

    loadMindARScript()

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
            onAnalyzeFile(file)
            onClose()
          }
          setIsCapturing(false)
        }, "image/jpeg")
      }
    } else {
      setIsCapturing(false)
      alert("Không tìm thấy dữ liệu Camera!")
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 p-4 backdrop-blur-md">
      <div className="relative flex h-full max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-3xl border border-white/20 bg-slate-950 shadow-2xl">
        
        {/* Nút Đóng */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-30 rounded-full bg-black/60 p-2.5 text-white hover:bg-black/80 transition-colors"
        >
          <X className="size-5" />
        </button>

        {/* Khung Render MindAR Camera Live */}
        <div ref={containerRef} className="relative flex-1 overflow-hidden bg-black w-full h-full">
          {isLoadingMindAR && (
            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-slate-900 text-white">
              <Loader2 className="size-8 animate-spin text-emerald-400" />
              <p className="text-sm font-medium">Đang khởi tạo Camera AR...</p>
            </div>
          )}

          {errorMessage && (
            <div className="absolute inset-0 z-20 flex items-center justify-center p-6 text-center bg-slate-900 text-red-400 text-sm">
              {errorMessage}
            </div>
          )}

          {/* Vùng chỉ dẫn tâm ngắm AR */}
          <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center">
            <div className="relative size-64 rounded-3xl border-2 border-dashed border-emerald-400/80 bg-emerald-500/5">
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-emerald-500 px-3 py-1 text-[11px] font-bold text-slate-950 uppercase tracking-wider">
                MindAR Live Scanner
              </span>
            </div>
          </div>
        </div>

        {/* Bảng công cụ bên dưới */}
        <div className="z-30 flex items-center justify-between gap-4 bg-slate-900 p-5 border-t border-slate-800">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Sparkles className="size-4 shrink-0 text-emerald-400" />
            <span>Hướng camera vào rác và bấm Quét AI</span>
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
