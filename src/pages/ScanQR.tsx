import { useEffect, useRef, useState, useCallback } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { m, AnimatePresence } from "framer-motion";
import { CheckCircle, XCircle, AlertCircle, Camera, RotateCcw, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import jsQR from "jsqr";

type ScanState = "idle" | "scanning" | "loading" | "success" | "already_used" | "error" | "invalid_key";

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

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const code = jsQR(imageData.data, imageData.width, imageData.height, {
      inversionAttempts: "dontInvert",
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

        const data = await res.json();

        if (data.alreadyUsed) {
          setGuest(data.guest ?? null);
          setCheckedInAt(data.checkedInAt ?? null);
          setState("already_used");
        } else if (data.success) {
          setGuest(data.guest ?? null);
          setState("success");
        } else {
          setErrorMsg(data.error || "QR inválido");
          setState("error");
        }
      } catch {
        setErrorMsg("Error de conexión. Verifica el internet.");
        setState("error");
      }
    },
    [eventId, scannerKey, stopCamera]
  );

  const reset = useCallback(() => {
    lastScannedRef.current = "";
    setGuest(null);
    setCheckedInAt(null);
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

      {/* Result overlay */}
      <AnimatePresence>
        {(state === "success" || state === "already_used" || state === "error") && (
          <m.div
            className="absolute inset-0 z-20 flex flex-col items-center justify-center p-6"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
          >
            <div
            className={`w-full max-w-sm rounded-3xl p-6 flex flex-col items-center gap-4 shadow-2xl bg-card ${
                state === "success"
                  ? "border border-primary/20"
                  : state === "already_used"
                  ? "border border-yellow-500/20"
                  : "border border-destructive/20"
              }`}
            >
              {/* Icon */}
              {state === "success" && (
                <m.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 400, damping: 20 }}
                  className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center"
                >
                  <CheckCircle className="w-10 h-10 text-primary" />
                </m.div>
              )}
              {state === "already_used" && (
                <div className="w-20 h-20 rounded-full bg-yellow-500/10 flex items-center justify-center">
                  <AlertCircle className="w-10 h-10 text-yellow-500" />
                </div>
              )}
              {state === "error" && (
                <div className="w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center">
                  <XCircle className="w-10 h-10 text-destructive" />
                </div>
              )}

              {/* Guest info */}
              {guest && (state === "success" || state === "already_used") && (
                <div className="flex flex-col items-center gap-2">
                  <img
                    src={guest.avatar_url || "/assets/default-avatar.png"}
                    alt={guest.username}
                    className="w-16 h-16 rounded-full object-cover border-2 border-border"
                  />
                  <div className="text-center">
                    <p className="font-semibold text-foreground text-lg">
                      {guest.full_name || `@${guest.username}`}
                    </p>
                    {guest.full_name && (
                      <p className="text-sm text-muted-foreground">{guest.username}</p>
                    )}
                  </div>
                </div>
              )}

              {/* Status label */}
              <div className="text-center">
                {state === "success" && (
                  <>
                    <p className="text-xl font-bold text-foreground">✓ Ingresó</p>
                    <p className="text-sm text-muted-foreground mt-1">Acceso válido — bienvenid@</p>
                  </>
                )}
                {state === "already_used" && (
                  <>
                    <p className="text-xl font-bold text-yellow-500">Ya ingresó</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {checkedInAt ? `Entrada registrada a las ${formatCheckedIn(checkedInAt)}` : "Este QR ya fue utilizado"}
                    </p>
                  </>
                )}
                {state === "error" && (
                  <>
                    <p className="text-xl font-bold text-destructive">QR inválido</p>
                    <p className="text-sm text-muted-foreground mt-1">{errorMsg}</p>
                  </>
                )}
              </div>

              {/* Action */}
              <Button
                variant="sheet-action"
                size="lg"
                className="w-full gap-2"
                onClick={reset}
              >
                <RotateCcw className="w-4 h-4" />
                Escanear siguiente
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
