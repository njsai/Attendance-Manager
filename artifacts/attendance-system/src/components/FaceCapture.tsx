import { useRef, useEffect, useState, useCallback } from "react";
import { Camera, X, CheckCircle, AlertCircle, Loader2, ScanFace } from "lucide-react";

interface FaceCaptureProps {
  mode: "enroll" | "verify";
  onCapture?: (descriptor: number[]) => void;
  onVerify?: (result: { matched: boolean; employeeId?: number; employeeName?: string }) => void;
  knownDescriptors?: { id: number; fullName: string; faceDescriptor: number[] }[];
  onClose: () => void;
}

let faceapi: any = null;
let modelsLoaded = false;
let modelsLoading = false;
let modelsLoadPromise: Promise<any> | null = null;

async function loadFaceApi() {
  if (modelsLoaded && faceapi) return faceapi;
  if (modelsLoading && modelsLoadPromise) return modelsLoadPromise;

  modelsLoading = true;
  modelsLoadPromise = (async () => {
    const fa = await import("face-api.js");
    faceapi = fa;
    const MODEL_URL = "https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model";
    await Promise.all([
      fa.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
      fa.nets.faceLandmark68TinyNet.loadFromUri(MODEL_URL),
      fa.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
    ]);
    modelsLoaded = true;
    modelsLoading = false;
    return fa;
  })();

  return modelsLoadPromise;
}

const euclideanDist = (a: number[], b: number[]) =>
  Math.sqrt(a.reduce((sum, val, i) => sum + (val - b[i]) ** 2, 0));

const DETECTOR_OPTIONS = () =>
  new (faceapi as any).TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.5 });

export default function FaceCapture({ mode, onCapture, onVerify, knownDescriptors, onClose }: FaceCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const matchedRef = useRef(false);

  const [status, setStatus] = useState<"loading" | "ready" | "detecting" | "success" | "error">("loading");
  const [message, setMessage] = useState("جاري تحميل نماذج التعرف...");
  const [faceDetected, setFaceDetected] = useState(false);
  const [confidence, setConfidence] = useState(0);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
  }, []);

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: "user", frameRate: { ideal: 30 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    } catch {
      setStatus("error");
      setMessage("لا يمكن الوصول إلى الكاميرا — يرجى منح الإذن");
    }
  }, []);

  const drawBox = useCallback((box: any, color: string, label?: string) => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const sx = canvas.width / (video.videoWidth || 640);
    const sy = canvas.height / (video.videoHeight || 480);
    const { x, y, width, height } = box;
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.strokeRect(x * sx, y * sy, width * sx, height * sy);
    if (label) {
      ctx.fillStyle = color;
      ctx.font = "bold 14px sans-serif";
      ctx.fillText(label, x * sx, y * sy - 6);
    }
  }, []);

  const detectFace = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current || !faceapi || matchedRef.current) return;
    try {
      const detection = await faceapi
        .detectSingleFace(videoRef.current, DETECTOR_OPTIONS())
        .withFaceLandmarks(true)
        .withFaceDescriptor();

      if (!detection) {
        setFaceDetected(false);
        setConfidence(0);
        const ctx = canvasRef.current?.getContext("2d");
        ctx?.clearRect(0, 0, canvasRef.current!.width, canvasRef.current!.height);
        setMessage(mode === "enroll" ? "قرّب وجهك من الكاميرا" : "انظر إلى الكاميرا للتحقق التلقائي");
        return;
      }

      setFaceDetected(true);
      const score = Math.round((detection.detection.score || 0) * 100);
      setConfidence(score);

      if (mode === "enroll") {
        drawBox(detection.detection.box, "#22c55e");
        setMessage("تم اكتشاف الوجه ✓ — اضغط 'تسجيل' لحفظ البصمة");
      } else if (mode === "verify" && knownDescriptors && knownDescriptors.length > 0) {
        const descriptor = Array.from(detection.descriptor) as number[];
        let best: { id: number; fullName: string; dist: number } | null = null;

        for (const known of knownDescriptors) {
          const dist = euclideanDist(descriptor, known.faceDescriptor);
          if (!best || dist < best.dist) best = { id: known.id, fullName: known.fullName, dist };
        }

        const THRESHOLD = 0.52;
        if (best && best.dist < THRESHOLD) {
          matchedRef.current = true;
          drawBox(detection.detection.box, "#22c55e", best.fullName);
          setStatus("success");
          setMessage(`✓ تم التعرف: ${best.fullName}`);
          if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
          setTimeout(() => onVerify?.({ matched: true, employeeId: best!.id, employeeName: best!.fullName }), 500);
        } else {
          drawBox(detection.detection.box, "#f97316");
          setMessage(best ? `لم يتطابق الوجه (مسافة: ${best.dist.toFixed(2)})` : "لم يتم التعرف على الوجه");
        }
      } else if (mode === "verify" && (!knownDescriptors || knownDescriptors.length === 0)) {
        drawBox(detection.detection.box, "#f59e0b");
        setMessage("⚠️ لا توجد بصمات مسجّلة للموظفين");
      }
    } catch (err) {
      console.error("Face detection error:", err);
    }
  }, [mode, knownDescriptors, onVerify, drawBox]);

  const handleEnroll = useCallback(async () => {
    if (!videoRef.current || !faceapi) return;
    setStatus("detecting");
    setMessage("جاري التقاط البصمة...");
    try {
      const detection = await faceapi
        .detectSingleFace(videoRef.current, DETECTOR_OPTIONS())
        .withFaceLandmarks(true)
        .withFaceDescriptor();
      if (!detection) {
        setMessage("لم يتم اكتشاف وجه — حاول مجدداً");
        setStatus("ready");
        return;
      }
      stopCamera();
      setStatus("success");
      setMessage("✓ تم تسجيل بصمة الوجه بنجاح!");
      onCapture?.(Array.from(detection.descriptor));
    } catch {
      setStatus("error");
      setMessage("خطأ في التقاط البصمة");
    }
  }, [onCapture, stopCamera]);

  useEffect(() => {
    let cancelled = false;
    matchedRef.current = false;
    (async () => {
      try {
        setMessage("جاري تحميل نماذج التعرف على الوجه...");
        await loadFaceApi();
        if (cancelled) return;
        setMessage("جاري تفعيل الكاميرا...");
        await startCamera();
        if (cancelled) return;
        setStatus("ready");
        setMessage(mode === "enroll" ? "قرّب وجهك من الكاميرا" : "انظر إلى الكاميرا للتحقق التلقائي");
        intervalRef.current = setInterval(detectFace, 200);
      } catch {
        if (!cancelled) { setStatus("error"); setMessage("خطأ في تهيئة نظام التعرف"); }
      }
    })();
    return () => { cancelled = true; stopCamera(); };
  }, [startCamera, stopCamera, detectFace, mode]);

  const isDark = true;
  const C = {
    bg: "rgba(10,12,28,0.98)",
    border: "rgba(255,255,255,0.08)",
    header: "rgba(255,255,255,0.04)",
  };

  return (
    <div
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999, padding: 16 }}
      dir="rtl"
    >
      <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 24, overflow: "hidden", width: "100%", maxWidth: 480, boxShadow: "0 24px 80px rgba(0,0,0,0.6)" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", borderBottom: `1px solid ${C.border}`, background: C.header }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: mode === "enroll" ? "rgba(168,85,247,0.15)" : "rgba(0,245,255,0.12)", display: "flex", alignItems: "center", justifyContent: "center", border: `1px solid ${mode === "enroll" ? "rgba(168,85,247,0.3)" : "rgba(0,245,255,0.25)"}` }}>
              <ScanFace size={18} style={{ color: mode === "enroll" ? "#a855f7" : "#00f5ff" }} />
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#fff" }}>
                {mode === "enroll" ? "تسجيل بصمة الوجه" : "التحقق بالوجه"}
              </div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginTop: 1 }}>
                {mode === "enroll" ? "كل موظف له بصمة واحدة فقط" : "مسح تلقائي في الوقت الفعلي"}
              </div>
            </div>
          </div>
          <button
            onClick={() => { stopCamera(); onClose(); }}
            style={{ width: 32, height: 32, borderRadius: 8, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.6)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
          >
            <X size={16} />
          </button>
        </div>

        <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 14 }}>
          {/* Camera view */}
          <div style={{ position: "relative", background: "#000", borderRadius: 16, overflow: "hidden", aspectRatio: "4/3" }}>
            <video ref={videoRef} style={{ width: "100%", height: "100%", objectFit: "cover" }} muted autoPlay playsInline />
            <canvas ref={canvasRef} style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} width={640} height={480} />

            {/* Loading overlay */}
            {status === "loading" && (
              <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12 }}>
                <Loader2 size={40} style={{ color: "#a855f7", animation: "spin 1s linear infinite" }} />
                <span style={{ color: "rgba(255,255,255,0.7)", fontSize: 13 }}>{message}</span>
              </div>
            )}

            {/* Face detected badge */}
            {faceDetected && status !== "loading" && status !== "success" && (
              <div style={{ position: "absolute", top: 10, right: 10, display: "flex", alignItems: "center", gap: 6, background: "rgba(34,197,94,0.2)", border: "1px solid rgba(34,197,94,0.4)", color: "#22c55e", fontSize: 11, fontWeight: 600, padding: "4px 10px", borderRadius: 20 }}>
                <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#22c55e", animation: "pulse 1s infinite" }} />
                وجه مكتشف {confidence > 0 ? `— ${confidence}%` : ""}
              </div>
            )}

            {/* Success overlay */}
            {status === "success" && (
              <div style={{ position: "absolute", inset: 0, background: "rgba(34,197,94,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <CheckCircle size={64} style={{ color: "#22c55e", filter: "drop-shadow(0 0 20px #22c55e)" }} />
              </div>
            )}
          </div>

          {/* Status bar */}
          <div style={{
            display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", borderRadius: 12, fontSize: 13, fontWeight: 500,
            background: status === "success" ? "rgba(34,197,94,0.1)" : status === "error" ? "rgba(239,68,68,0.1)" : "rgba(255,255,255,0.04)",
            border: `1px solid ${status === "success" ? "rgba(34,197,94,0.25)" : status === "error" ? "rgba(239,68,68,0.25)" : "rgba(255,255,255,0.08)"}`,
            color: status === "success" ? "#22c55e" : status === "error" ? "#f87171" : "rgba(255,255,255,0.7)",
          }}>
            {status === "success" ? <CheckCircle size={16} style={{ flexShrink: 0 }} /> :
             status === "error" ? <AlertCircle size={16} style={{ flexShrink: 0 }} /> :
             status === "loading" || status === "detecting" ? <Loader2 size={16} style={{ flexShrink: 0, animation: "spin 1s linear infinite" }} /> :
             <div style={{ width: 8, height: 8, borderRadius: "50%", flexShrink: 0, background: faceDetected ? "#22c55e" : "#f59e0b" }} />}
            {message}
          </div>

          {/* Enroll button */}
          {mode === "enroll" && status !== "success" && (
            <button
              onClick={handleEnroll}
              disabled={!faceDetected || status === "detecting" || status === "loading" || status === "error"}
              style={{
                width: "100%", padding: "14px", borderRadius: 14, border: "none",
                background: (!faceDetected || status === "detecting" || status === "loading")
                  ? "rgba(168,85,247,0.3)" : "linear-gradient(135deg,#a855f7,#7c3aed)",
                color: "#fff", fontWeight: 700, fontSize: 14, cursor: (!faceDetected || status === "detecting" || status === "loading") ? "not-allowed" : "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                transition: "all 0.2s", fontFamily: "'Tajawal','Inter',sans-serif",
              }}
            >
              {status === "detecting"
                ? <><Loader2 size={18} style={{ animation: "spin 1s linear infinite" }} /> جاري الالتقاط...</>
                : <><Camera size={18} /> تسجيل بصمة الوجه</>}
            </button>
          )}

          {/* Hint */}
          {mode === "verify" && status !== "success" && status !== "error" && (
            <div style={{ textAlign: "center", fontSize: 11, color: "rgba(255,255,255,0.3)" }}>
              التحقق يتم تلقائياً • لكل موظف بصمة واحدة فقط
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
