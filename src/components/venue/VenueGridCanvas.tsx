import { useCallback, useEffect, useRef, useState } from "react";
import { CANVAS_UNITS, type DraftArea } from "@/hooks/useVenueLayouts";
import { cn } from "@/lib/utils";

const GRID = 20; // snap step in canvas units
const MIN_SIZE = 60;

export type AreaState = "available" | "partial" | "unavailable";

interface Props {
  areas: DraftArea[];
  /** Editable mode enables drag + resize. */
  editable?: boolean;
  selectedId?: string | null;
  onSelect?: (id: string | null) => void;
  onChange?: (id: string, patch: Partial<DraftArea>) => void;
  /** Read-only availability colouring, keyed by area id. */
  states?: Record<string, AreaState>;
  /** Secondary label under the name (e.g. price / remaining). */
  renderLabel?: (area: DraftArea) => string | null;
  className?: string;
}

const snap = (v: number) => Math.round(v / GRID) * GRID;
const clamp = (v: number, min: number, max: number) =>
  Math.min(Math.max(v, min), max);

export function VenueGridCanvas({
  areas,
  editable = false,
  selectedId = null,
  onSelect,
  onChange,
  states,
  renderLabel,
  className,
}: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const dragRef = useRef<{
    id: string;
    mode: "move" | "resize";
    startX: number;
    startY: number;
    origin: DraftArea;
    moved: boolean;
  } | null>(null);
  /** Swallows the synthetic click that fires right after a drag ends. */
  const suppressClickRef = useRef(false);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      setScale(el.clientWidth / CANVAS_UNITS);
    });
    ro.observe(el);
    setScale(el.clientWidth / CANVAS_UNITS);
    return () => ro.disconnect();
  }, []);

  const onPointerDown = useCallback(
    (e: React.PointerEvent, area: DraftArea, mode: "move" | "resize") => {
      if (!editable) return;
      e.stopPropagation();
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      dragRef.current = {
        id: area.id,
        mode,
        startX: e.clientX,
        startY: e.clientY,
        origin: { ...area },
        moved: false,
      };
    },
    [editable],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      const d = dragRef.current;
      if (!d || !onChange || scale === 0) return;
      const rawDx = e.clientX - d.startX;
      const rawDy = e.clientY - d.startY;
      // Tap threshold: only treat as drag once the pointer travels ~8px.
      if (!d.moved && Math.hypot(rawDx, rawDy) < 8) return;
      d.moved = true;
      const dx = rawDx / scale;
      const dy = rawDy / scale;
      if (d.mode === "move") {
        onChange(d.id, {
          pos_x: clamp(snap(d.origin.pos_x + dx), 0, CANVAS_UNITS - d.origin.width),
          pos_y: clamp(snap(d.origin.pos_y + dy), 0, CANVAS_UNITS - d.origin.height),
        });
      } else {
        onChange(d.id, {
          width: clamp(
            snap(d.origin.width + dx),
            MIN_SIZE,
            CANVAS_UNITS - d.origin.pos_x,
          ),
          height: clamp(
            snap(d.origin.height + dy),
            MIN_SIZE,
            CANVAS_UNITS - d.origin.pos_y,
          ),
        });
      }
    },
    [onChange, scale],
  );

  const endDrag = useCallback(
    (e: React.PointerEvent) => {
      const d = dragRef.current;
      dragRef.current = null;
      if (!d || !editable) return;
      // Any pointer release on an area swallows the trailing click.
      suppressClickRef.current = true;
      // Tap (no movement) on the box body selects it; drags and resize-handle
      // releases never open selection/edit UI.
      if (!d.moved && d.mode === "move") {
        onSelect?.(d.id);
      }
      void e;
    },
    [editable, onSelect],
  );

  return (
    <div
      ref={wrapRef}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onClick={() => editable && onSelect?.(null)}
      className={cn(
        "relative w-full aspect-square rounded-2xl overflow-hidden select-none touch-none",
        "bg-[hsl(0_0%_97%)] border border-black/10",
        className,
      )}
      style={{
        backgroundImage:
          "linear-gradient(to right, rgba(0,0,0,0.06) 1px, transparent 1px), linear-gradient(to bottom, rgba(0,0,0,0.06) 1px, transparent 1px)",
        backgroundSize: `${(GRID / CANVAS_UNITS) * 100}% ${(GRID / CANVAS_UNITS) * 100}%`,
      }}
    >
      {areas.map((a) => {
        const state = states?.[a.id];
        const unavailable = state === "unavailable";
        const label = renderLabel?.(a);
        const selected = selectedId === a.id;
        return (
          <div
            key={a.id}
            onPointerDown={(e) => onPointerDown(e, a, "move")}
            onClick={(e) => {
              e.stopPropagation();
              onSelect?.(a.id);
            }}
            className={cn(
              "absolute rounded-xl flex flex-col items-center justify-center text-center px-1 overflow-hidden",
              "transition-shadow",
              selected ? "ring-2 ring-offset-1 ring-black/70 z-10" : "",
              unavailable ? "opacity-45" : "",
              editable ? "cursor-move" : "cursor-pointer",
            )}
            style={{
              left: `${(a.pos_x / CANVAS_UNITS) * 100}%`,
              top: `${(a.pos_y / CANVAS_UNITS) * 100}%`,
              width: `${(a.width / CANVAS_UNITS) * 100}%`,
              height: `${(a.height / CANVAS_UNITS) * 100}%`,
              transform: a.rotation ? `rotate(${a.rotation}deg)` : undefined,
              backgroundColor: `${a.color}22`,
              border: `2px solid ${
                state === "partial" ? "#F59E0B" : unavailable ? "#94A3B8" : a.color
              }`,
            }}
          >
            <span className="text-[10px] font-semibold leading-tight text-black/80 line-clamp-2">
              {a.name}
            </span>
            {label && (
              <span className="text-[9px] leading-tight text-black/55 line-clamp-2">
                {label}
              </span>
            )}
            {editable && (
              <span
                onPointerDown={(e) => onPointerDown(e, a, "resize")}
                className="absolute bottom-0 right-0 w-4 h-4 rounded-tl-md bg-black/70 cursor-se-resize"
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
