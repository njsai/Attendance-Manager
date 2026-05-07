import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, Eye, EyeOff } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { getAndClearCompanyInactiveFlag } from "@/lib/auth";
import * as THREE from "three";
import gsap from "gsap";

const BASE = import.meta.env.BASE_URL;

// ── Static particle data (seeded so it's deterministic) ───────────────────────
const CSS_PARTICLES = Array.from({ length: 55 }, (_, i) => {
  const seed = (i * 9301 + 49297) % 233280;
  const r = (n: number) => ((seed * n) % 1000) / 1000;
  return {
    x: (r(1) * 100).toFixed(2),
    y: (r(2) * 100).toFixed(2),
    size: 1.5 + r(3) * 3.5,
    blur: r(4) < 0.4 ? 0 : r(4) * 1.5,
    dur: 3 + r(5) * 6,
    delay: -(r(6) * 8),
    anim: (i % 4) + 1,
    coldColor: i % 3 === 0 ? "rgba(0,180,255,0.9)" : i % 3 === 1 ? "rgba(120,80,255,0.9)" : "rgba(0,100,200,0.8)",
    warmColor: i % 3 === 0 ? "rgba(255,190,40,0.9)"  : i % 3 === 1 ? "rgba(255,140,20,0.9)"  : "rgba(255,220,80,0.8)",
    coldOpacity: 0.12 + r(7) * 0.35,
    warmOpacity: 0.18 + r(8) * 0.45,
  };
});

async function fetchWithTimeout(input: RequestInfo, init: RequestInit = {}, ms = 12000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try { return await fetch(input, { ...init, signal: ctrl.signal }); }
  catch (e: any) { if (e?.name === "AbortError") throw new Error("timeout"); throw e; }
  finally { clearTimeout(t); }
}
async function apiPost(url: string, body: object) {
  const res = await fetchWithTimeout(url, { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify(body) });
  const d = await res.json(); if (!res.ok) throw new Error(d?.message || "error"); return d;
}
async function apiFetch(url: string) {
  const res = await fetchWithTimeout(url, { credentials: "include" });
  if (!res.ok) throw new Error("unauthorized"); return res.json();
}

function playClickSound() {
  try {
    const ctx = new AudioContext();
    // sharp click transient
    const buf = ctx.createBuffer(1, ctx.sampleRate * 0.12, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.015));
    }
    const src = ctx.createBufferSource();
    src.buffer = buf;
    // small resonant body
    const filt = ctx.createBiquadFilter();
    filt.type = "bandpass"; filt.frequency.value = 380; filt.Q.value = 2;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.45, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
    src.connect(filt); filt.connect(gain); gain.connect(ctx.destination);
    src.start(); src.stop(ctx.currentTime + 0.12);
    // subtle metallic ring
    const osc = ctx.createOscillator();
    const g2 = ctx.createGain();
    osc.type = "sine"; osc.frequency.value = 1200;
    g2.gain.setValueAtTime(0.08, ctx.currentTime);
    g2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
    osc.connect(g2); g2.connect(ctx.destination);
    osc.start(); osc.stop(ctx.currentTime + 0.15);
  } catch {}
}

export default function Login() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { t, dir } = useI18n();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState("");
  const [isPending, setIsPending] = useState(false);
  const [lampOn, setLampOn] = useState(false);
  const [swinging, setSwinging] = useState(false);

  // DOM refs
  const canvasRef     = useRef<HTMLCanvasElement>(null);
  const wrapRef       = useRef<HTMLDivElement>(null);
  const chainRef      = useRef<HTMLDivElement>(null);
  const glowRef       = useRef<HTMLDivElement>(null);
  const coneRef       = useRef<HTMLDivElement>(null);
  const formCardRef   = useRef<HTMLDivElement>(null);
  const bulbGlowRef   = useRef<HTMLDivElement>(null);

  // Three.js refs
  const rendererRef   = useRef<THREE.WebGLRenderer | null>(null);
  const matRef        = useRef<THREE.PointsMaterial | null>(null);
  const pointLitRef   = useRef<THREE.PointLight | null>(null);
  const animRef       = useRef<number>(0);
  const elapsedRef    = useRef<number>(0);
  const lastTimeRef   = useRef<number>(0);

  // ── Company inactive flag ────────────────────────────────────────────────────
  useEffect(() => {
    if (getAndClearCompanyInactiveFlag()) setError(t("companyInactive"));
  }, []);

  // ── Three.js – ambient particles (with WebGL fallback) ──────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Test WebGL availability first
    const testCanvas = document.createElement("canvas");
    const gl = testCanvas.getContext("webgl") || testCanvas.getContext("experimental-webgl");
    if (!gl) {
      // No WebGL – hide canvas, CSS particles handle the atmosphere
      canvas.style.display = "none";
      return;
    }

    let disposed = false;
    const W = window.innerWidth, H = window.innerHeight;

    try {
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(60, W / H, 0.1, 100);
      camera.position.z = 5;

      const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: false });
      renderer.setClearColor(0x000000, 0);
      renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
      renderer.setSize(W, H);
      rendererRef.current = renderer;

      const COUNT = 600;
      const pos = new Float32Array(COUNT * 3);
      for (let i = 0; i < COUNT; i++) {
        pos[i * 3]     = (Math.random() - 0.5) * 22;
        pos[i * 3 + 1] = (Math.random() - 0.5) * 14;
        pos[i * 3 + 2] = (Math.random() - 0.5) * 10;
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));

      const mat = new THREE.PointsMaterial({
        size: 0.035, color: 0x0044cc,
        transparent: true, opacity: 0.7,
        blending: THREE.AdditiveBlending, depthWrite: false,
      });
      matRef.current = mat;

      const points = new THREE.Points(geo, mat);
      scene.add(points);

      scene.add(new THREE.AmbientLight(0x020817, 0.5));
      const ptLight = new THREE.PointLight(0xffaa33, 0, 25);
      ptLight.position.set(0, 5, 3);
      pointLitRef.current = ptLight;
      scene.add(ptLight);

      const loop = (now: number) => {
        if (disposed) return;
        animRef.current = requestAnimationFrame(loop);
        const delta = (now - lastTimeRef.current) / 1000;
        lastTimeRef.current = now;
        elapsedRef.current += delta;
        const t = elapsedRef.current;
        points.rotation.y = t * 0.018;
        points.rotation.x = Math.sin(t * 0.009) * 0.04;
        renderer.render(scene, camera);
      };
      loop(performance.now());

      const onResize = () => {
        const w = innerWidth, h = innerHeight;
        camera.aspect = w / h; camera.updateProjectionMatrix();
        renderer.setSize(w, h);
      };
      addEventListener("resize", onResize);

      return () => {
        disposed = true;
        cancelAnimationFrame(animRef.current);
        removeEventListener("resize", onResize);
        renderer.dispose(); geo.dispose(); mat.dispose();
      };
    } catch {
      canvas.style.display = "none";
    }
  }, []);

  // ── Mouse parallax on form ──────────────────────────────────────────────────
  useEffect(() => {
    const move = (e: MouseEvent) => {
      if (!formCardRef.current) return;
      const rx = (e.clientX / innerWidth  - 0.5) * 6;
      const ry = (e.clientY / innerHeight - 0.5) * -4;
      gsap.to(formCardRef.current, { rotateY: rx, rotateX: ry, duration: 1, ease: "power2.out" });
    };
    addEventListener("mousemove", move);
    return () => removeEventListener("mousemove", move);
  }, []);

  // ── Initial chain sway ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!chainRef.current) return;
    gsap.fromTo(chainRef.current,
      { rotate: 4, transformOrigin: "50% 0%" },
      { rotate: 0, duration: 2.5, ease: "elastic.out(1, 0.35)", delay: 0.6 }
    );
  }, []);

  // ── Toggle lamp ─────────────────────────────────────────────────────────────
  const toggleLamp = () => {
    if (swinging) return;
    setSwinging(true);
    playClickSound();

    const on = !lampOn;
    setLampOn(on);

    // Chain swing
    if (chainRef.current) {
      gsap.timeline({ onComplete: () => setSwinging(false) })
        .to(chainRef.current, { rotate: -20, transformOrigin: "50% 0%", duration: 0.11, ease: "power3.out" })
        .to(chainRef.current, { rotate: 11, duration: 0.26, ease: "power2.inOut" })
        .to(chainRef.current, { rotate: -5, duration: 0.2,  ease: "power2.inOut" })
        .to(chainRef.current, { rotate: 2,  duration: 0.18, ease: "power2.inOut" })
        .to(chainRef.current, { rotate: 0,  duration: 0.22, ease: "power2.out" });
    }

    // Three.js particle color
    if (matRef.current) {
      const target = on ? { r: 1.0, g: 0.55, b: 0.05 } : { r: 0.0, g: 0.05, b: 0.6 };
      gsap.to(matRef.current.color, { ...target, duration: on ? 1.4 : 0.9, ease: on ? "power2.out" : "power2.in" });
      gsap.to(matRef.current, { size: on ? 0.05 : 0.035, duration: 1.2, ease: "power2.out" });
    }

    // Three.js point light
    if (pointLitRef.current) {
      gsap.to(pointLitRef.current, { intensity: on ? 4 : 0, duration: on ? 1.2 : 0.6, ease: on ? "power2.out" : "power2.in" });
    }

    // Warm glow overlay
    if (glowRef.current) {
      gsap.to(glowRef.current, { opacity: on ? 1 : 0, duration: on ? 1.6 : 0.8, ease: on ? "power2.out" : "power2.in" });
    }

    // Light cone
    if (coneRef.current) {
      gsap.to(coneRef.current, {
        opacity: on ? 1 : 0,
        scaleY: on ? 1 : 0.3,
        duration: on ? 0.9 : 0.4,
        ease: on ? "power2.out" : "power2.in",
        delay: on ? 0.05 : 0,
        transformOrigin: "50% 0%",
      });
    }

    // Bulb glow pulse
    if (bulbGlowRef.current) {
      if (on) {
        gsap.timeline()
          .to(bulbGlowRef.current, { opacity: 1, scale: 1.3, duration: 0.15, ease: "power3.out" })
          .to(bulbGlowRef.current, { scale: 1, duration: 0.6, ease: "elastic.out(1, 0.4)" });
      } else {
        gsap.to(bulbGlowRef.current, { opacity: 0, scale: 0.6, duration: 0.3, ease: "power2.in" });
      }
    }
  };

  // ── Form submit ──────────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); setIsPending(true);
    try {
      await apiPost(`${BASE}api/auth/login`, { username, password });
      const user = await apiFetch(`${BASE}api/auth/me`);
      queryClient.setQueryData(["/api/auth/me"], user);
      setLocation("/");
    } catch (err: any) {
      const msg = err?.message || "";
      if (msg === "timeout") setError(t("connectionTimeout"));
      else setError(t("invalidCredentials"));
    } finally { setIsPending(false); }
  };

  // ── Derived theme ─────────────────────────────────────────────────────────────
  const A = lampOn ? "#ffb930" : "#00f5ff"; // accent
  const cardBg     = lampOn ? "rgba(22,12,2,0.82)"  : "rgba(5,13,31,0.85)";
  const cardBorder = lampOn ? "rgba(255,185,60,0.28)" : "rgba(0,245,255,0.15)";
  const cardShadow = lampOn
    ? "0 0 90px rgba(255,140,20,0.22), 0 40px 80px rgba(0,0,0,0.65), inset 0 1px 0 rgba(255,210,80,0.18)"
    : "0 0 60px rgba(0,245,255,0.06), 0 32px 80px rgba(0,0,0,0.5)";
  const topLine    = lampOn
    ? "linear-gradient(90deg,transparent,#ffb930,#ff7700,transparent)"
    : "linear-gradient(90deg,transparent,#00f5ff,#a855f7,transparent)";
  const inputBg    = lampOn ? "rgba(255,150,30,0.05)" : "rgba(0,245,255,0.03)";
  const inputBd    = lampOn ? "rgba(255,180,50,0.2)"  : "rgba(0,245,255,0.12)";
  const iconC      = lampOn ? "rgba(255,185,60,0.5)"  : "rgba(0,245,255,0.4)";
  const subC       = lampOn ? "rgba(255,185,60,0.65)" : "rgba(0,245,255,0.5)";
  const btnBg      = lampOn
    ? "linear-gradient(135deg,rgba(255,165,30,0.92),rgba(200,90,0,0.88))"
    : "linear-gradient(135deg,rgba(0,220,255,0.8),rgba(59,130,246,0.8))";
  const btnColor   = lampOn ? "#1a0900" : "#020817";
  const btnShadow  = lampOn
    ? "0 6px 28px rgba(255,140,30,0.45), 0 0 50px rgba(255,120,0,0.15)"
    : "0 4px 20px rgba(0,200,255,0.3)";

  const CHAIN_BEADS = 16;

  return (
    <div
      dir={dir}
      ref={wrapRef}
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        position: "relative",
        overflow: "hidden",
        fontFamily: "'Tajawal', sans-serif",
        background: lampOn ? "#080400" : "linear-gradient(135deg,#020817 0%,#050d1f 50%,#080318 100%)",
        transition: "background 1.6s ease",
      }}
    >

      {/* ── Three.js canvas ───────────────────────────────────────────── */}
      <canvas
        ref={canvasRef}
        style={{
          position: "fixed", inset: 0, width: "100%", height: "100%",
          pointerEvents: "none", zIndex: 0,
        }}
      />

      {/* ── Warm glow overlay ─────────────────────────────────────────── */}
      <div
        ref={glowRef}
        style={{
          position: "fixed", inset: 0, pointerEvents: "none", zIndex: 1, opacity: 0,
          background: "radial-gradient(ellipse 110% 75% at 50% -5%, rgba(255,145,25,0.55) 0%, rgba(255,75,0,0.18) 30%, transparent 62%)",
        }}
      />

      {/* ── CSS floating particles (WebGL fallback atmosphere) ──────────── */}
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 2, overflow: "hidden" }}>
        {CSS_PARTICLES.map((p, i) => (
          <div
            key={i}
            style={{
              position: "absolute",
              left: `${p.x}%`, top: `${p.y}%`,
              width: p.size, height: p.size,
              borderRadius: "50%",
              background: lampOn ? p.warmColor : p.coldColor,
              opacity: lampOn ? p.warmOpacity : p.coldOpacity,
              animation: `cssParticle${p.anim} ${p.dur}s ease-in-out ${p.delay}s infinite`,
              transition: "background 1.4s ease, opacity 1.4s ease",
              boxShadow: lampOn
                ? `0 0 ${p.size * 2}px ${p.warmColor}`
                : `0 0 ${p.size}px ${p.coldColor}`,
              filter: `blur(${p.blur}px)`,
            }}
          />
        ))}
      </div>

      {/* ── Lamp assembly ─────────────────────────────────────────────── */}
      <div style={{
        position: "relative", zIndex: 15,
        display: "flex", flexDirection: "column", alignItems: "center",
        paddingBottom: 0,
      }}>

        {/* Wire from top edge */}
        <div style={{
          width: 2.5, height: 64,
          background: lampOn
            ? "linear-gradient(to bottom,rgba(255,200,70,0.8),rgba(255,170,40,0.35))"
            : "linear-gradient(to bottom,rgba(255,255,255,0.18),rgba(255,255,255,0.06))",
          transition: "background 1.2s ease",
        }} />

        {/* Lamp SVG body */}
        <div style={{ position: "relative" }}>
          {/* Outer glow ring when ON */}
          <div
            ref={bulbGlowRef}
            style={{
              position: "absolute",
              inset: -16,
              borderRadius: "50%",
              background: "radial-gradient(circle,rgba(255,200,50,0.45) 0%,rgba(255,140,0,0.15) 50%,transparent 75%)",
              filter: "blur(12px)",
              opacity: 0,
              pointerEvents: "none",
              zIndex: -1,
            }}
          />

          <svg
            width={110} height={100}
            viewBox="0 0 110 100"
            style={{
              filter: lampOn
                ? "drop-shadow(0 0 18px rgba(255,200,60,0.9)) drop-shadow(0 0 50px rgba(255,130,10,0.5))"
                : "drop-shadow(0 2px 6px rgba(0,0,0,0.5))",
              transition: "filter 1s ease",
            }}
          >
            <defs>
              <radialGradient id="bulb" cx="50%" cy="50%" r="50%">
                <stop offset="0%"   stopColor={lampOn ? "#fff8e0" : "#555"} />
                <stop offset="60%"  stopColor={lampOn ? "#ffcc44" : "#333"} />
                <stop offset="100%" stopColor={lampOn ? "#ff9500" : "#1a1a1a"} />
              </radialGradient>
              <linearGradient id="shade" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%"   stopColor={lampOn ? "#7a5208" : "#2a2a2a"} />
                <stop offset="35%"  stopColor={lampOn ? "#c08a18" : "#4a4a4a"} />
                <stop offset="65%"  stopColor={lampOn ? "#c08a18" : "#4a4a4a"} />
                <stop offset="100%" stopColor={lampOn ? "#7a5208" : "#2a2a2a"} />
              </linearGradient>
              <linearGradient id="shadeSheen" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%"   stopColor={lampOn ? "rgba(255,230,100,0.35)" : "rgba(255,255,255,0.06)"} />
                <stop offset="100%" stopColor="transparent" />
              </linearGradient>
              <linearGradient id="socket" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%"   stopColor={lampOn ? "#b8850f" : "#3c3c3c"} />
                <stop offset="100%" stopColor={lampOn ? "#7a5208" : "#222"} />
              </linearGradient>
              <filter id="bloom">
                <feGaussianBlur stdDeviation="3" result="blur"/>
                <feComposite in="SourceGraphic" in2="blur" operator="over"/>
              </filter>
            </defs>

            {/* Socket top */}
            <rect x="40" y="2" width="30" height="18" rx="6" fill="url(#socket)" />
            <rect x="46" y="18" width="18" height="8" rx="3" fill={lampOn ? "#9a6a10" : "#252525"} />

            {/* Shade (trapezoid) */}
            <path d="M 20,26 L 4,80 L 106,80 L 90,26 Z" fill="url(#shade)" />
            {/* Shade sheen */}
            <path d="M 20,26 L 4,80 L 30,80 L 42,26 Z" fill="url(#shadeSheen)" opacity="0.6" />

            {/* Shade rim */}
            <rect x="4" y="78" width="102" height="6" rx="3" fill={lampOn ? "#6a4608" : "#202020"} />

            {/* Bulb glow spill under shade */}
            {lampOn && (
              <ellipse cx="55" cy="80" rx="30" ry="8" fill="rgba(255,190,50,0.25)" />
            )}

            {/* Bulb */}
            <ellipse cx="55" cy="70" rx="20" ry="13" fill="url(#bulb)" />
            {/* Bulb inner bright spot */}
            {lampOn && (
              <>
                <ellipse cx="55" cy="69" rx="12" ry="8"  fill="rgba(255,255,220,0.7)" />
                <ellipse cx="50" cy="66" rx="4"  rx2="3" ry="3" fill="rgba(255,255,255,0.9)" />
              </>
            )}

            {/* Transition glow rings */}
            <ellipse cx="55" cy="70" rx="24" ry="16" fill="none"
              stroke={lampOn ? "rgba(255,200,80,0.35)" : "transparent"} strokeWidth="2.5" />
            <ellipse cx="55" cy="70" rx="30" ry="20" fill="none"
              stroke={lampOn ? "rgba(255,170,40,0.12)" : "transparent"} strokeWidth="4" />
          </svg>

          {/* CSS glow bloom under lamp when ON */}
          {lampOn && (
            <div style={{
              position: "absolute",
              bottom: -8, left: "50%", transform: "translateX(-50%)",
              width: 80, height: 20,
              background: "radial-gradient(ellipse,rgba(255,180,40,0.6),transparent 75%)",
              filter: "blur(6px)", pointerEvents: "none",
            }} />
          )}
        </div>

        {/* Light cone (volumetric beam) */}
        <div
          ref={coneRef}
          style={{
            position: "absolute",
            top: 156, left: "50%",
            transform: "translateX(-50%) scaleY(0.3)",
            transformOrigin: "50% 0%",
            width: 420, height: 520,
            pointerEvents: "none", opacity: 0,
            background: "conic-gradient(from 256deg at 50% 0%, transparent 0deg, rgba(255,180,40,0.10) 10deg, rgba(255,210,70,0.07) 18deg, transparent 21deg, transparent 339deg, rgba(255,210,70,0.07) 342deg, rgba(255,180,40,0.10) 350deg, transparent 360deg)",
            zIndex: -1,
          }}
        />

        {/* Chain */}
        <div
          ref={chainRef}
          onClick={toggleLamp}
          title={lampOn ? "اسحب للإطفاء" : "اسحب للإضاءة"}
          style={{
            display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
            marginTop: 2, cursor: "pointer", userSelect: "none",
            transformOrigin: "50% 0%", zIndex: 20, position: "relative",
          }}
        >
          {/* Bead chain */}
          {Array.from({ length: CHAIN_BEADS }, (_, i) => {
            const isWide = i % 2 === 0;
            return (
              <div
                key={i}
                style={{
                  width:  isWide ? 9 : 6,
                  height: isWide ? 11 : 8,
                  borderRadius: "50%",
                  background: lampOn
                    ? `radial-gradient(circle at 35% 35%, rgba(${200+i*2},${145+i},${30},1), rgba(${110+i},${60+i},${8},1))`
                    : `radial-gradient(circle at 35% 35%, rgba(${150+i*4},${150+i*4},${165+i*3},0.8), rgba(${70+i*4},${70+i*4},${80+i*3},0.7))`,
                  border: lampOn ? "1px solid rgba(255,205,80,0.45)" : "1px solid rgba(180,180,200,0.18)",
                  boxShadow: lampOn
                    ? `0 0 5px rgba(255,160,30,0.4), inset 0 1px 0 rgba(255,230,100,0.3)`
                    : "0 1px 2px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.08)",
                  transition: "all 0.9s ease",
                }}
              />
            );
          })}

          {/* Handle ball */}
          <div style={{
            marginTop: 2,
            width: 24, height: 24, borderRadius: "50%",
            background: lampOn
              ? "radial-gradient(circle at 35% 30%, #ffe588, #c88010, #7a4f08)"
              : "radial-gradient(circle at 35% 30%, #808090, #404050, #1e1e28)",
            border: lampOn ? "2px solid rgba(255,220,80,0.55)" : "2px solid rgba(180,180,200,0.2)",
            boxShadow: lampOn
              ? "0 0 14px rgba(255,170,30,0.7), 0 4px 8px rgba(0,0,0,0.4), inset 0 2px 0 rgba(255,240,130,0.35)"
              : "0 3px 6px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.08)",
            transition: "all 0.9s ease",
          }} />

          {/* Hover hint */}
          <span style={{
            marginTop: 10, fontSize: 10,
            color: lampOn ? "rgba(255,195,70,0.7)" : "rgba(255,255,255,0.18)",
            letterSpacing: 1.2, textTransform: "uppercase",
            transition: "color 0.9s ease", whiteSpace: "nowrap",
            fontWeight: 600,
          }}>
            {lampOn ? "اسحب للإطفاء" : "اسحب للإضاءة"}
          </span>
        </div>
      </div>

      {/* ── Login card ────────────────────────────────────────────────── */}
      <div
        style={{
          width: "100%", maxWidth: 420, padding: "0 16px",
          position: "relative", zIndex: 10,
          marginTop: 36, marginBottom: 40,
          perspective: "900px",
        }}
      >
        <div
          ref={formCardRef}
          style={{
            background: cardBg,
            backdropFilter: "blur(40px) saturate(1.5)",
            WebkitBackdropFilter: "blur(40px) saturate(1.5)",
            border: `1px solid ${cardBorder}`,
            borderRadius: 26,
            overflow: "hidden",
            boxShadow: cardShadow,
            transformStyle: "preserve-3d",
            transition: "background 1.3s ease, border-color 1.3s ease, box-shadow 1.3s ease",
            position: "relative",
          }}
        >
          {/* Top accent line */}
          <div style={{ height: 2, background: topLine, transition: "background 1.3s ease" }} />

          {/* Glass reflection sheen */}
          <div style={{
            position: "absolute", top: 2, left: 0, right: 0, height: 90,
            background: lampOn
              ? "linear-gradient(180deg,rgba(255,220,100,0.09) 0%,transparent 100%)"
              : "linear-gradient(180deg,rgba(0,245,255,0.05) 0%,transparent 100%)",
            pointerEvents: "none", zIndex: 1,
            transition: "background 1.3s ease",
          }} />

          {/* Right-edge specular */}
          <div style={{
            position: "absolute", top: 0, right: 0, width: 1, height: "100%",
            background: lampOn
              ? "linear-gradient(to bottom,rgba(255,200,80,0.25),transparent 60%)"
              : "linear-gradient(to bottom,rgba(0,245,255,0.18),transparent 60%)",
            pointerEvents: "none", zIndex: 1,
            transition: "background 1.3s ease",
          }} />

          {/* Header */}
          <div style={{
            padding: "34px 32px 26px", textAlign: "center",
            borderBottom: `1px solid ${lampOn ? "rgba(255,180,50,0.1)" : "rgba(0,245,255,0.07)"}`,
            position: "relative", zIndex: 2,
            transition: "border-color 1.3s ease",
          }}>
            {/* Logo icon */}
            <div style={{
              width: 72, height: 72, borderRadius: 20, margin: "0 auto 20px",
              background: lampOn
                ? "linear-gradient(135deg,rgba(255,160,30,0.22),rgba(255,90,0,0.12))"
                : "linear-gradient(135deg,rgba(0,245,255,0.15),rgba(59,130,246,0.1))",
              border: `1.5px solid ${lampOn ? "rgba(255,185,60,0.45)" : "rgba(0,245,255,0.32)"}`,
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: lampOn
                ? "0 0 32px rgba(255,160,30,0.35)"
                : "0 0 22px rgba(0,245,255,0.22)",
              transition: "all 1.3s ease",
            }}>
              <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
                <circle cx="18" cy="18" r="7" fill={A} style={{ transition: "fill 1.3s" }} />
                <path d="M18 4V10M18 26V32M4 18H10M26 18H32" stroke={A} strokeWidth="2.5" strokeLinecap="round" style={{ transition: "stroke 1.3s" }} />
                <path d="M8.3 8.3L12.5 12.5M23.5 23.5L27.7 27.7M27.7 8.3L23.5 12.5M12.5 23.5L8.3 27.7" stroke={A} strokeWidth="1.5" strokeLinecap="round" opacity="0.5" style={{ transition: "stroke 1.3s" }} />
              </svg>
            </div>

            <h1 style={{
              fontSize: 22, fontWeight: 800, color: "#fff", margin: 0,
              textShadow: lampOn ? "0 0 32px rgba(255,180,50,0.35)" : "0 0 28px rgba(0,245,255,0.22)",
              transition: "text-shadow 1.3s ease",
            }}>
              {t("systemName")}
            </h1>
            <p style={{ fontSize: 13, color: subC, margin: "7px 0 0", transition: "color 1.3s ease" }}>
              {t("enterCredentials")}
            </p>
          </div>

          {/* Form */}
          <div style={{ padding: "26px 32px 30px", position: "relative", zIndex: 2 }}>
            {error && (
              <div style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "11px 14px", borderRadius: 12, marginBottom: 20,
                background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.25)",
                color: "#f87171", fontSize: 13,
              }}>
                <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#f87171", flexShrink: 0, boxShadow: "0 0 6px #f87171" }} />
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 18 }}>

              {/* Username */}
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.5)", marginBottom: 8 }}>
                  {t("usernameField")}
                </label>
                <div style={{ position: "relative" }}>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none"
                    style={{ position: "absolute", insetInlineEnd: 14, top: "50%", transform: "translateY(-50%)", transition: "opacity 1s" }}>
                    <circle cx="8" cy="5.5" r="3" stroke={iconC} strokeWidth="1.5" style={{ transition: "stroke 1.3s" }} />
                    <path d="M2 14.5c0-3 2.7-5.5 6-5.5s6 2.5 6 5.5" stroke={iconC} strokeWidth="1.5" strokeLinecap="round" style={{ transition: "stroke 1.3s" }} />
                  </svg>
                  <input
                    type="text" required
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    placeholder={t("enterUsername")}
                    style={{
                      width: "100%",
                      paddingInlineEnd: 42, paddingInlineStart: 14,
                      paddingTop: 12, paddingBottom: 12,
                      borderRadius: 13, fontSize: 14,
                      background: inputBg, border: `1px solid ${inputBd}`,
                      color: "#fff", outline: "none", boxSizing: "border-box",
                      transition: "background 1.3s ease, border-color 1.3s ease",
                    }}
                    onFocus={e => { e.target.style.borderColor = A; e.target.style.boxShadow = `0 0 0 3px ${A}25, 0 0 20px ${A}18`; }}
                    onBlur={e  => { e.target.style.borderColor = inputBd; e.target.style.boxShadow = "none"; }}
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.5)", marginBottom: 8 }}>
                  {t("passwordField")}
                </label>
                <div style={{ position: "relative" }}>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none"
                    style={{ position: "absolute", insetInlineEnd: 14, top: "50%", transform: "translateY(-50%)" }}>
                    <rect x="2.5" y="7" width="11" height="7.5" rx="2" stroke={iconC} strokeWidth="1.5" style={{ transition: "stroke 1.3s" }} />
                    <path d="M5 7V5.5a3 3 0 016 0V7" stroke={iconC} strokeWidth="1.5" strokeLinecap="round" style={{ transition: "stroke 1.3s" }} />
                    <circle cx="8" cy="10.75" r="1.5" fill={iconC} style={{ transition: "fill 1.3s" }} />
                  </svg>
                  <input
                    type={showPass ? "text" : "password"} required
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    style={{
                      width: "100%",
                      paddingInlineEnd: 42, paddingInlineStart: 42,
                      paddingTop: 12, paddingBottom: 12,
                      borderRadius: 13, fontSize: 14,
                      background: inputBg, border: `1px solid ${inputBd}`,
                      color: "#fff", outline: "none", boxSizing: "border-box",
                      transition: "background 1.3s ease, border-color 1.3s ease",
                    }}
                    onFocus={e => { e.target.style.borderColor = A; e.target.style.boxShadow = `0 0 0 3px ${A}25, 0 0 20px ${A}18`; }}
                    onBlur={e  => { e.target.style.borderColor = inputBd; e.target.style.boxShadow = "none"; }}
                  />
                  <button type="button" onClick={() => setShowPass(p => !p)}
                    style={{ position: "absolute", insetInlineStart: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.22)", padding: 2 }}>
                    {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={isPending}
                style={{
                  width: "100%", padding: "14px",
                  borderRadius: 14, border: "none",
                  background: btnBg, color: btnColor,
                  fontWeight: 800, fontSize: 15,
                  cursor: isPending ? "not-allowed" : "pointer",
                  marginTop: 4,
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                  boxShadow: btnShadow,
                  opacity: isPending ? 0.65 : 1,
                  transition: "all 1.3s ease, transform 0.1s ease",
                  fontFamily: "'Tajawal', sans-serif",
                }}
                onMouseEnter={e => { if (!isPending) (e.currentTarget as HTMLButtonElement).style.transform = "translateY(-1px) scale(1.01)"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.transform = ""; }}
              >
                {isPending
                  ? <><Loader2 size={18} style={{ animation: "spin 1s linear infinite" }} /> {t("loggingIn")}</>
                  : t("loginBtn")
                }
              </button>
            </form>

            {/* Footer links */}
            <div style={{ textAlign: "center", marginTop: 20, display: "flex", flexDirection: "column", gap: 7 }}>
              <p style={{ fontSize: 11, color: "rgba(255,255,255,0.2)", margin: 0 }}>
                {t("forgotCredentials")}
              </p>
              <a
                href="/super-admin/login"
                style={{
                  fontSize: 11,
                  color: lampOn ? "rgba(255,185,60,0.38)" : "rgba(168,85,247,0.48)",
                  textDecoration: "none", transition: "color 0.2s",
                }}
                onMouseEnter={e => (e.currentTarget.style.color = lampOn ? "#ffb930" : "#a855f7")}
                onMouseLeave={e => (e.currentTarget.style.color = lampOn ? "rgba(255,185,60,0.38)" : "rgba(168,85,247,0.48)")}
              >
                {t("superAdminLoginLink")}
              </a>
            </div>
          </div>
        </div>

        {/* Card bottom glow */}
        <div style={{
          position: "absolute", bottom: -24, left: "50%", transform: "translateX(-50%)",
          width: 200, height: 50,
          background: lampOn
            ? "radial-gradient(ellipse,rgba(255,150,30,0.2),transparent 75%)"
            : "radial-gradient(ellipse,rgba(0,245,255,0.12),transparent 75%)",
          pointerEvents: "none",
          transition: "background 1.3s ease",
        }} />
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes cssParticle1 {
          0%,100% { transform: translate(0,0) scale(1); opacity: inherit; }
          33%      { transform: translate(8px,-18px) scale(1.2); }
          66%      { transform: translate(-5px,-8px) scale(0.85); }
        }
        @keyframes cssParticle2 {
          0%,100% { transform: translate(0,0) scale(1); }
          40%      { transform: translate(-12px,-22px) scale(1.3); }
          70%      { transform: translate(6px,-10px) scale(0.9); }
        }
        @keyframes cssParticle3 {
          0%,100% { transform: translate(0,0) scale(1); }
          30%      { transform: translate(10px,-14px) scale(1.1); }
          60%      { transform: translate(-8px,-20px) scale(0.8); }
          80%      { transform: translate(4px,-6px) scale(1.05); }
        }
        @keyframes cssParticle4 {
          0%,100% { transform: translate(0,0) scale(1) rotate(0deg); }
          50%      { transform: translate(-6px,-24px) scale(1.4) rotate(180deg); }
        }
      `}</style>
    </div>
  );
}
