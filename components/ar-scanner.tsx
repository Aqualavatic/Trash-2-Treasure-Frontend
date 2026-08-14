"use client"

import { useEffect, useRef, useState } from "react"
import { X, Loader2, Sparkles, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import * as THREE from "three"

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

    const initAR = async () => {
      try {
        if (!containerRef.current) return

        // Gán THREE vào window để MindAR nhận diện đối tượng toàn cục
        if (typeof window !== "undefined") {
          ;(window as any).THREE = THREE
        }

        // Import động module MindAR chỉ ở phía Client (tránh lỗi SSR & Turbopack build)
        // @ts-ignore
        await import("mind-ar-ts/dist/mindar-image-three.prod.js")

        const MINDAR = (window as any).MINDAR
        if (!MINDAR || !MINDAR.IMAGE || !MINDAR.IMAGE.MindARThree) {
          throw new Error("Không thể tải đối tượng MindAR.IMAGE.MindARThree")
        }

        // 1. Khởi tạo MindAR Instance từ window global
        mindarThree = new MINDAR.IMAGE.MindARThree({
          container: containerRef.current,
          imageTargetSrc:
            "https://cdn.jsdelivr.net/npm/mind-ar@1.2.5/examples/image-tracking/assets/card-example/card.mind",
          uiLoading: "no",
          uiScanning: "no",
        })

        const { renderer, scene, camera } = mindarThree

        // 2. Tạo khối 3D AR
        const geometry = new THREE.BoxGeometry(0.5, 0.5, 0.5)
        const material = new THREE.MeshBasicMaterial({ color: 0x10b981, wireframe: true })
        const cube = new THREE.Mesh(geometry, material)

        const anchor = mindarThree.addAnchor(0)
        anchor.group.add(cube)

        // 3. Khởi chạy AR Stream & Camera
        await mindarThree.start()

        // 4. CSS Fix: Đảm bảo Video/Canvas mở toàn màn hình
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
      } catch (err: any) {
        console.error("Lỗi khởi tạo AR:", err)
        setErrorMessage("Không thể khởi động Camera. Vui lòng cấp quyền Camera trên trình duyệt!")
        setIsLoadingMindAR(false)
      }
    }

    initAR()

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
      alert("Không tìm thấy luồng Camera!")
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
              <p className="text-sm font-medium">Đang kết nối Camera AR...</p>
            </div>
          )}

          {errorMessage && (
            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center p-6 text-center bg-slate-900 text-red-400 gap-2 text-sm">
              <AlertCircle className="size-8" />
              <span>{errorMessage}</span>
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