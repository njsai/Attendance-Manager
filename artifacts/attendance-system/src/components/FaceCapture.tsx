import { useRef, useEffect, useState, useCallback } from "react";
import { Camera, X, CheckCircle, AlertCircle, Loader2 } from "lucide-react";

interface FaceCaptureProps {
  mode: "enroll" | "verify";
  onCapture?: (descriptor: number[]) => void;
  onVerify?: (result: { matched: boolean; employeeId?: number; employeeName?: string }) => void;
  knownDescriptors?: { id: number; fullName: string; faceDescriptor: number[] }[];
  onClose: () => void;
}

let faceapi: any = null;
let modelsLoaded = false;

async function loadFaceApi() {
  if (modelsLoaded) return faceapi;
  const fa = await import("face-api.js");
  faceapi = fa;
  const MODEL_URL = "https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model";
  await Promise.all([
    fa.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
    fa.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
    fa.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
  ]);
  modelsLoaded = true;
  return faceapi;
}

export default function FaceCapture({ mode, onCapture, onVerify, knownDescriptors, onClose }: FaceCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const intervalRef = useRef<any>(null);

  const [status, setStatus] = useState<"loading" | "ready" | "detecting" | "success" | "error">("loading");
  const [message, setMessage] = useState("جاري تحميل نماذج الذكاء الاصطناعي...");
  const [faceDetected, setFaceDetected] = useState(false);

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480, facingMode: "user" } });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    } catch {
      setStatus("error");
      setMessage("لا يمكن الوصول إلى الكاميرا. يرجى منح الإذن.");
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (intervalRef.current) clearInterval(intervalRef.current);
  }, []);

  const euclideanDist = (a: number[], b: number[]) => {
    return Math.sqrt(a.reduce((sum, val, i) => sum + (val - b[i]) ** 2, 0));
  };

  const detectFace = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current || !faceapi) return;
    try {
      const detection = await faceapi
        .detectSingleFace(videoRef.current, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.5 }))
        .withFaceLandmarks()
        .withFaceDescriptor();

      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (!detection) {
        setFaceDetected(false);
        setMessage("لم يتم اكتشاف وجه — قرّب وجهك من الكاميرا");
        return;
      }

      setFaceDetected(true);
      // Draw face box
      const { x, y, width, height } = detection.detection.box;
      const scaleX = canvas.width / videoRef.current.videoWidth;
      const scaleY = canvas.height / videoRef.current.videoHeight;
      ctx.strokeStyle = "#22c55e";
      ctx.lineWidth = 3;
      ctx.strokeRect(x * scaleX, y * scaleY, width * scaleX, height * scaleY);

      if (mode === "enroll") {
        setMessage("تم اكتشاف الوجه — اضغط 'تسجيل' لحفظ البصمة");
      } else if (mode === "verify" && knownDescriptors) {
        // Find best match
        const descriptor = Array.from(detection.descriptor);
        let bestMatch: { id: number; fullName: string; dist: number } | null = null;

        for (const known of knownDescriptors) {
          const dist = euclideanDist(descriptor, known.faceDescriptor);
          if (!bestMatch || dist < bestMatch.dist) {
            bestMatch = { id: known.id, fullName: known.fullName, dist };
          }
        }

        const THRESHOLD = 0.55;
        if (bestMatch && bestMatch.dist < THRESHOLD) {
          setStatus("success");
          setMessage(`تم التعرف: ${bestMatch.fullName}`);
          clearInterval(intervalRef.current);
          onVerify?.({ matched: true, employeeId: bestMatch.id, employeeName: bestMatch.fullName });
        } else {
          setMessage("لم يتم التعرف على الوجه — حاول مجدداً");
        }
      }
    } catch (err) {
      console.error("Face detection error:", err);
    }
  }, [mode, knownDescriptors, onVerify]);

  const handleEnroll = useCallback(async () => {
    if (!videoRef.current || !faceapi) return;
    setStatus("detecting");
    setMessage("جاري التقاط البصمة...");
    try {
      const detection = await faceapi
        .detectSingleFace(videoRef.current, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.5 }))
        .withFaceLandmarks()
        .withFaceDescriptor();
      if (!detection) {
        setMessage("لم يتم اكتشاف وجه — حاول مجدداً");
        setStatus("ready");
        return;
      }
      setStatus("success");
      setMessage("تم تسجيل بصمة الوجه بنجاح!");
      onCapture?.(Array.from(detection.descriptor));
    } catch {
      setStatus("error");
      setMessage("خطأ في التقاط البصمة");
    }
  }, [onCapture]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await loadFaceApi();
        if (cancelled) return;
        await startCamera();
        setStatus("ready");
        setMessage(mode === "enroll" ? "قرّب وجهك من الكاميرا ثم اضغط 'تسجيل'" : "انظر إلى الكاميرا للتحقق التلقائي");
        intervalRef.current = setInterval(detectFace, 500);
      } catch {
        if (!cancelled) { setStatus("error"); setMessage("خطأ في تحميل النماذج"); }
      }
    })();
    return () => { cancelled = true; stopCamera(); };
  }, [startCamera, stopCamera, detectFace, mode]);

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4" dir="rtl">
      <div className="bg-slate-900 border border-white/10 rounded-3xl overflow-hidden w-full max-w-lg shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-white/10">
          <div className="flex items-center gap-3">
            <Camera className="w-6 h-6 text-primary" />
            <h2 className="text-white font-bold text-lg">
              {mode === "enroll" ? "تسجيل بصمة الوجه" : "التحقق بالوجه"}
            </h2>
          </div>
          <button onClick={() => { stopCamera(); onClose(); }} className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="relative bg-black rounded-2xl overflow-hidden aspect-video">
            <video ref={videoRef} className="w-full h-full object-cover" muted autoPlay playsInline />
            <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" width={640} height={480} />
            {status === "loading" && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                <Loader2 className="w-10 h-10 text-primary animate-spin" />
              </div>
            )}
            {faceDetected && (
              <div className="absolute top-3 right-3 flex items-center gap-1.5 bg-green-500/20 border border-green-500/40 text-green-400 text-xs px-2 py-1 rounded-full">
                <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                وجه مكتشف
              </div>
            )}
          </div>

          <div className={`flex items-center gap-3 p-4 rounded-xl text-sm font-medium ${
            status === "success" ? "bg-green-500/10 border border-green-500/20 text-green-400" :
            status === "error" ? "bg-red-500/10 border border-red-500/20 text-red-400" :
            "bg-white/5 border border-white/10 text-slate-300"
          }`}>
            {status === "success" ? <CheckCircle className="w-5 h-5 flex-shrink-0" /> :
             status === "error" ? <AlertCircle className="w-5 h-5 flex-shrink-0" /> :
             status === "loading" ? <Loader2 className="w-5 h-5 animate-spin flex-shrink-0" /> :
             <div className={`w-2 h-2 rounded-full flex-shrink-0 ${faceDetected ? "bg-green-400 animate-pulse" : "bg-yellow-400"}`} />}
            {message}
          </div>

          {mode === "enroll" && status !== "success" && (
            <button
              onClick={handleEnroll}
              disabled={!faceDetected || status === "detecting" || status === "loading"}
              className="w-full py-3.5 bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2"
            >
              {status === "detecting" ? <Loader2 className="w-5 h-5 animate-spin" /> : <Camera className="w-5 h-5" />}
              تسجيل بصمة الوجه
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
