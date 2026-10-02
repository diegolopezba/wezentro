import { useEffect, useRef, useState, useCallback } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { m, AnimatePresence } from "framer-motion";
import { CheckCircle, XCircle, AlertCircle, Camera, RotateCcw, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import jsQR from "jsqr";
import { haptic } from "@/lib/haptics";

type ScanState = "idle" | "scanning" | "loading" | "success" | "already_used" | "error" | "network" | "invalid_key";

interface GuestInfo {
  username: string;
  full_name: string | null;
  avatar_url: string | null;
}

export default function ScanQR() {
  const { eventId } = useParams<{ eventId: string }>();
  const [searchParams] = useSearchParams();
  const scannerKey = searchParams.get("key");

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);
  const lastScannedRef = useRef<string>("");
  const streamRef = useRef<MediaStream | null>(null);

  const [state, setState] = useState<ScanState>("idle");
  const [guest, setGuest] = useState<GuestInfo | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [eventTitle, setEventTitle] = useState("Evento");
  const [checkedInAt, setCheckedInAt] = useState<string | null>(null);
  const [entryLabel, setEntryLabel] = useState<string | null>(null);
  const [details, setDetails] = useState<string[]>([]);
  const lastTokenRef = useRef<string>("");

  // Validate key presence immediately
  const hasValidKey = Boolean(scannerKey && eventId);

  // Fetch event title for display
  useEffect(() => {
    if (!eventId) return;
    supabase
      .from("events")
      .select("title")
      .eq("id", eventId)
      .single()
      .then(({ data }) => {
        if (data?.title) setEventTitle(data.title);
      });
  }, [eventId]);

  const stopCamera = useCallback(() => {
    cancelAnimationFrame(animFrameRef.current);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }, []);

  const processFrame = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState !== video.HAVE_ENOUGH_DATA) {
      animFrameRef.current = requestAnimationFrame(processFrame);
      return;
    }

    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;

    const scale = Math.min(1, 640 / (video.videoWidth || 640));
    canvas.width = Math.round(video.videoWidth * scale);
    canvas.height = Math.round(video.videoHeight * scale);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const code = jsQR(imageData.data, imageData.width, imageData.height, {
      inversionAttempts: "attemptBoth",
    });

    if (code && code.data && code.data !== lastScannedRef.current) {
      lastScannedRef.current = code.data;
      handleQRDetected(code.data);
      return; // stop looping — handleQRDetected takes over
    }

    animFrameRef.current = requestAnimationFrame(processFrame);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setState("scanning");
      animFrameRef.current = requestAnimationFrame(processFrame);
    } catch {
      setState("error");
      setErrorMsg("No se pudo acceder a la cámara. Verifica los permisos.");
    }
  }, [processFrame]);

  const handleQRDetected = useCallback(
    async (token: string) => {
      setState("loading");
      stopCamera();
      lastTokenRef.current = token;

      try {
        const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
        const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

        const headers: Record<string, string> = {
          "Content-Type": "application/json",
          apikey: SUPABASE_ANON_KEY,
        };

        // Use scanner key (bouncer mode) — no JWT needed
        if (scannerKey) {
          headers["x-scanner-key"] = scannerKey;
        }

        const res = await fetch(`${SUPABASE_URL}/functions/v1/check-in-guest`, {
          method: "POST",
          headers,
          body: JSON.stringify({ qr_code_token: token, event_id: eventId }),
        });

        const data = await res.json().catch(() => ({}));
        if (res.status >= 500 || res.status === 401) {
          setErrorMsg(res.status === 401 ? "Enlace de escáner no autorizado" : "Error del servidor, reintentá");
          setState("network");
          haptic("warning");
          return;
        }
        setGuest(data.guest ?? null);
        setEntryLabel(data.entry_label ?? null);
        setDetails(Array.isArray(data.details) ? data.details : []);

        if (data.alreadyUsed) {
          setCheckedInAt(data.checkedInAt ?? null);
          setState("already_used");
          haptic("warning");
        } else if (data.success) {
          setState("success");
          haptic("success");
        } else {
          setErrorMsg(data.error || "QR inválido");
          setState("error");
          haptic("heavy");
        }
      } catch {
        setErrorMsg("Sin conexión. Verificá el internet y reintentá.");
        setState("network");
        haptic("warning");
      }
    },
    [eventId, scannerKey, stopCamera]
  );

  const reset = useCallback(() => {
    lastScannedRef.current = "";
    setGuest(null);
    setCheckedInAt(null);
    setEntryLabel(null);
    setDetails([]);
    setErrorMsg("");
    startCamera();
  }, [startCamera]);

  useEffect(() => {
    if (!hasValidKey) {
      setState("invalid_key");
      return;
    }
    startCamera();
    return () => stopCamera();
  }, [hasValidKey, startCamera, stopCamera]);

  // Auto-reset after success/error
  useEffect(() => {
    if (state === "success") {
      const t = setTimeout(reset, 4000);
      return () => clearTimeout(t);
    }
  }, [state, reset]);

  const formatCheckedIn = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleTimeString("es-BO", { hour: "2-digit", minute: "2-digit" });
  };

  // ── Invalid key screen ──────────────────────────────────────────────
  if (state === "invalid_key") {
    return (
      <div className="min-h-[100dvh] bg-background flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 rounded-2xl bg-destructive/10 flex items-center justify-center mb-4">
          <Shield className="w-8 h-8 text-destructive" />
        </div>
        <h1 className="text-xl font-semibold text-foreground mb-2">Acceso inválido</h1>
        <p className="text-sm text-muted-foreground max-w-xs">
          Este enlace de escáner no es válido. Pide al organizador del evento que te comparta el enlace correcto.
        </p>
      </div>
    );
  }

  return (
    <div className="relative min-h-[100dvh] bg-black overflow-hidden">
      {/* Video feed */}
      <video
        ref={videoRef}
        className="absolute inset-0 w-full h-full object-cover"
        playsInline
        muted
      />
      <canvas ref={canvasRef} className="hidden" />

      {/* Dark overlay with scan frame cutout */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-black/50" />
        {/* Scan frame */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="relative w-64 h-64">
            {/* Corners */}
            <span className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-primary rounded-tl-lg" />
            <span className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-primary rounded-tr-lg" />
            <span className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-primary rounded-bl-lg" />
            <span className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-primary rounded-br-lg" />
            {/* Scanning line animation */}
            {state === "scanning" && (
              <m.div
                className="absolute left-2 right-2 h-0.5 bg-primary/80 rounded-full shadow-lg"
                initial={{ top: "0%" }}
                animate={{ top: "100%" }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              />
            )}
          </div>
        </div>
      </div>

      {/* Top bar */}
      <div className="absolute top-0 inset-x-0 z-10 pt-safe">
        <div className="px-4 pt-4 pb-3 bg-gradient-to-b from-black/70 to-transparent">
          <div className="flex items-center gap-2 mb-1">
            <Camera className="w-4 h-4 text-primary" />
            <span className="text-xs font-medium text-primary uppercase tracking-widest">Escáner de entradas</span>
          </div>
          <h1 className="text-white font-semibold text-base truncate">{eventTitle}</h1>
        </div>
      </div>

      {/* Bottom hint */}
      {state === "scanning" && (
        <div className="absolute bottom-0 inset-x-0 z-10 pb-safe">
          <div className="px-4 pb-8 pt-4 bg-gradient-to-t from-black/70 to-transparent flex flex-col items-center gap-2">
            <p className="text-white/70 text-sm text-center">Apunta al código QR del invitado</p>
          </div>
        </div>
      )}

      {/* Loading state */}
      <AnimatePresence>
        {state === "loading" && (
          <m.div
            className="absolute inset-0 z-20 flex items-center justify-center bg-black/60"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="w-12 h-12 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          </m.div>
        )}
      </AnimatePresence>

      {/* Result overlay — full-screen color: green = entering, red = already used, yellow = invalid */}
      <AnimatePresence>
        {(state === "success" || state === "already_used" || state === "error" || state === "network") && (
          <m.div
            className={`absolute inset-0 z-20 flex flex-col items-center justify-center p-6 gap-5 text-center ${
              state === "success"
                ? "bg-success text-primary-foreground"
                : state === "already_used"
                ? "bg-destructive text-destructive-foreground"
                : state === "error"
                ? "bg-warning text-warning-foreground"
                : "bg-card text-foreground"
            }`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <m.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 400, damping: 20 }}>
              {state === "success" && <CheckCircle className="w-24 h-24" />}
              {state === "already_used" && <XCircle className="w-24 h-24" />}
              {state === "error" && <AlertCircle className="w-24 h-24" />}
              {state === "network" && <AlertCircle className="w-16 h-16 text-muted-foreground" />}
            </m.div>

            <p className="text-4xl font-bold uppercase tracking-tight">
              {state === "success" && "Ingresando"}
              {state === "already_used" && "Ya ingresó"}
              {state === "error" && "Ticket inválido"}
              {state === "network" && "Sin conexión"}
            </p>

            {state === "already_used" && (
              <p className="text-xl font-semibold">
                {checkedInAt ? `Ingresó a las ${formatCheckedIn(checkedInAt)}` : "Este QR ya fue usado"}
              </p>
            )}

            {guest && (state === "success" || state === "already_used") && (
              <div className="flex flex-col items-center gap-2">
                {guest.avatar_url && (
                  <img src={guest.avatar_url} alt="" className="w-20 h-20 rounded-full object-cover border-4 border-current" />
                )}
                <p className="text-2xl font-bold">{guest.full_name || guest.username || "Invitado"}</p>
                {guest.full_name && guest.username && <p className="text-base opacity-80">{guest.username}</p>}
              </div>
            )}

            {entryLabel && (state === "success" || state === "already_used") && (
              <span className="px-4 py-1.5 rounded-full border-2 border-current text-lg font-semibold">{entryLabel}</span>
            )}

            {details.length > 0 && (state === "success" || state === "already_used") && (
              <div className="space-y-1 text-base opacity-90">
                {details.map((d) => <p key={d}>{d}</p>)}
              </div>
            )}

            {(state === "error" || state === "network") && <p className="text-lg max-w-xs">{errorMsg}</p>}

            <div className="w-full max-w-sm flex flex-col gap-2 mt-2">
              {state === "network" && (
                <Button variant="sheet-action" size="lg" className="w-full gap-2" onClick={() => handleQRDetected(lastTokenRef.current)}>
                  <RotateCcw className="w-4 h-4" /> Reintentar
                </Button>
              )}
              <Button variant="secondary" size="lg" className="w-full gap-2 rounded-full" onClick={reset}>
                <Camera className="w-4 h-4" /> Escanear siguiente
              </Button>
            </div>
          </m.div>
        )}
      </AnimatePresence>

      {/* Idle — start button */}
      {state === "idle" && (
        <div className="absolute inset-0 z-20 flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        </div>
      )}
    </div>
  );
}
