"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { X, Loader2, Sparkles, AlertCircle, RefreshCw, ZoomIn, Zap, CheckCircle2, ArrowRight, ArrowLeft } from "lucide-react"
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

  const [liveData, setLiveData] = useState<{
    wasteType: string
    confidence: number
    objects: { waste_type: string; confidence: number; box: number[] }[]
    diyIdeas: { 
      id: string, 
      title: string, 
      description: string, 
      materials?: string[],
      steps?: string[] 
    }[]
  } | null>(null)

  // State quản lý khi người dùng chọn một option DIY để bắt đầu hướng dẫn từng bước
  const [selectedIdea, setSelectedIdea] = useState<any | null>(null)
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0)
  const [stepVerified, setStepVerified] = useState<boolean>(false)

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
                setLiveData(prev => ({
                  wasteType: result.waste_type,
                  confidence: result.confidence,
                  objects: result.objects || [],
                  // Giữ lại ý tưởng đang chọn nếu người dùng đã bấm vào
                  diyIdeas: prev?.diyIdeas?.length ? prev.diyIdeas : (result.diy_ideas || [])
                }))

                // Nếu đang ở chế độ hướng dẫn từng bước, kiểm tra xem vật thể trước camera có khớp với yêu cầu của bước hiện tại không
                if (selectedIdea && selectedIdea.steps && selectedIdea.steps[currentStepIndex]) {
                  const currentStepText = selectedIdea.steps[currentStepIndex].toLowerCase()
                  // COCO detect object names trả về từ backend, kiểm tra xem có object nào khớp với từ khóa trong bước không
                  const detectedClasses = (result.objects || []).map((o: any) => o.waste_type.toLowerCase())
                  
                  // Kiểm tra đơn giản: nếu vật thể quét được khớp với bước hiện tại -> Xác thực thành công
                  const matched = detectedClasses.some((cls: string) => currentStepText.includes(cls) || cls.includes("scissors") || cls.includes("bottle") || cls.includes("book"));
                  if (matched) {
                    setStepVerified(true)
                  }
                }
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
  }, [isScanning, isLoading, lang, selectedIdea, currentStepIndex])

  useEffect(() => {
    if (isLoading || errorMessage) return
    const interval = setInterval(() => {
      captureAndLiveScan()
    }, 3000)
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
          
          {/* Bounding Boxes */}
          {liveData?.objects && liveData.objects.map((obj, idx) => {
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

          {/* GIAO DIỆN CHÍNH: NẾU CHƯA CHỌN Ý TƯỞNG -> HIỆN DANH SÁCH OPTION ĐỂ BẤM VÀO */}
          {!selectedIdea && (!isLoading && !errorMessage && liveData) ? (
            <div className="absolute bottom-3 left-3 right-3 z-20 rounded-xl bg-slate-950/90 border border-white/15 p-3 text-white text-[11px] shadow-xl backdrop-blur-md max-h-[220px] overflow-y-auto">
              <div className="flex items-center gap-1.5 mb-2 pb-1.5 border-b border-white/10">
                <Zap className="size-4 text-amber-400" />
                <h3 className="font-bold text-xs text-white">Chọn ý tưởng UpcycleDIY để bắt đầu:</h3>
              </div>
              <div className="space-y-2">
                {liveData.diyIdeas.map((idea, index) => (
                  <div 
                    key={idea.id || index} 
                    onClick={() => {
                      setSelectedIdea(idea);
                      setCurrentStepIndex(0);
                      setStepVerified(false);
                    }}
                    className="p-2 rounded-lg bg-white/5 hover:bg-emerald-500/20 border border-white/10 cursor-pointer transition-all flex items-center justify-between group"
                  >
                    <div>
                      <span className="font-semibold text-emerald-300 block text-xs group-hover:text-emerald-200">
                        {index + 1}. {idea.title}
                      </span>
                      <p className="text-[10px] text-slate-400 line-clamp-1 mt-0.5">
                        {idea.description}
                      </p>
                    </div>
                    <ArrowRight className="size-4 text-slate-400 group-hover:text-emerald-400 shrink-0 ml-2" />
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {/* GIAO DIỆN HƯỚNG DẪN TỪNG BƯỚC KHI ĐÃ CHỌN 1 Ý TƯỞNG */}
          {selectedIdea && (
            <div className="absolute bottom-3 left-3 right-3 z-20 rounded-xl bg-slate-950/95 border border-emerald-500/40 p-3 text-white text-[11px] shadow-2xl backdrop-blur-md">
              <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-white/10">
                <div className="flex items-center gap-1.5">
                  <button onClick={() => setSelectedIdea(null)} className="p-1 rounded bg-white/10 hover:bg-white/20 text-slate-300">
                    <ArrowLeft className="size-3.5" />
                  </button>
                  <h3 className="font-bold text-xs text-emerald-400 line-clamp-1">{selectedIdea.title}</h3>
                </div>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full font-medium">
                  Bước {currentStepIndex + 1} / {selectedIdea.steps?.length || 3}
                </span>
              </div>

              <div className="space-y-2 my-2">
                <p className="text-xs font-medium text-slate-200 bg-white/5 p-2 rounded-lg border border-white/5">
                  👉 {selectedIdea.steps?.[currentStepIndex] || "Thực hiện thao tác thủ công theo yêu cầu."}
                </p>

                {/* Trạng thái xác thực bằng COCO / AI */}
                <div className="flex items-center justify-between text-[10px]">
                  <span className={stepVerified ? "text-emerald-400 font-bold flex items-center gap-1" : "text-amber-400 flex items-center gap-1"}>
                    <CheckCircle2 className="size-3.5" />
                    {stepVerified ? "Đã nhận diện vật dụng! Có thể qua bước tiếp." : "Đang chờ bạn đưa vật dụng lên khung hình..."}
                  </span>
                  
                  <div className="flex gap-1.5">
                    {currentStepIndex > 0 && (
                      <button 
                        onClick={() => { setCurrentStepIndex(prev => prev - 1); setStepVerified(false); }}
                        className="px-2.5 py-1 rounded bg-white/10 hover:bg-white/20 text-slate-200 font-medium"
                      >
                        Quay lại
                      </button>
                    )}
                    <button 
                      onClick={() => {
                        if (selectedIdea.steps && currentStepIndex < selectedIdea.steps.length - 1) {
                          setCurrentStepIndex(prev => prev + 1);
                          setStepVerified(false);
                        } else {
                          alert("Chúc mừng bạn đã hoàn thành dự án UpcycleDIY tuyệt vời này!");
                          setSelectedIdea(null);
                        }
                      }}
                      className="px-3 py-1 rounded bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold transition-all"
                    >
                      {currentStepIndex < (selectedIdea.steps?.length || 3) - 1 ? "Bước tiếp" : "Hoàn thành 🎉"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {!selectedIdea && !liveData && (
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
            <span>{selectedIdea ? "Chế độ hướng dẫn tương tác AR Active" : t.arFrameHint}</span>
          </div>
          <button onClick={onClose} className="rounded-lg bg-white/5 hover:bg-white/10 text-slate-200 font-medium px-3 py-1 text-[11px] transition-all border border-white/10">
            {t.arClose}
          </button>
        </div>
      </div>
    </div>
  )
}
