/**
 * FeedVideoCoordinator
 *
 * Pinterest-style autoplay + single-audio behavior for feed videos.
 *
 * Rules:
 *  - A registered <video> autoplays (muted) when ≥ VISIBILITY_THRESHOLD on screen.
 *  - It pauses (and resets to 0) when below that threshold.
 *  - At any time only ONE video has audio: the one whose bounding box top is
 *    closest to the top of the viewport (but still on screen). All others mute.
 *  - Until the user makes a first gesture, audio stays off everywhere
 *    (mobile browsers block audible autoplay otherwise).
 *  - If the user mutes a card via its sound button, that card is "user-muted"
 *    and skipped by the audio-selection logic until it leaves the viewport.
 */

type Entry = {
  el: HTMLVideoElement;
  ratio: number;
  top: number;
  userMuted: boolean;
};

const VISIBILITY_THRESHOLD = 0.5;

class Coordinator {
  private entries = new Map<string, Entry>();
  private observer: IntersectionObserver | null = null;
  private idByEl = new WeakMap<Element, string>();
  private audioUnlocked = false;
  private currentAudioId: string | null = null;
  private rafPending = false;
  private listeners = new Set<() => void>();

  constructor() {
    if (typeof window !== "undefined") {
      const unlock = () => {
        this.audioUnlocked = true;
        this.schedule();
        window.removeEventListener("pointerdown", unlock);
        window.removeEventListener("touchstart", unlock);
        window.removeEventListener("keydown", unlock);
      };
      window.addEventListener("pointerdown", unlock, { once: true, passive: true });
      window.addEventListener("touchstart", unlock, { once: true, passive: true });
      window.addEventListener("keydown", unlock, { once: true });
    }
  }

  private ensureObserver() {
    if (this.observer || typeof window === "undefined") return;
    this.observer = new IntersectionObserver(
      (records) => {
        for (const r of records) {
          const id = this.idByEl.get(r.target);
          if (!id) continue;
          const entry = this.entries.get(id);
          if (!entry) continue;
          entry.ratio = r.intersectionRatio;
          entry.top = r.boundingClientRect.top;
        }
        this.schedule();
      },
      { threshold: [0, 0.25, 0.5, 0.75, 1] }
    );
  }

  register(id: string, el: HTMLVideoElement) {
    this.ensureObserver();
    // Replace existing registration if same id
    const existing = this.entries.get(id);
    if (existing && existing.el !== el) {
      this.observer?.unobserve(existing.el);
      this.idByEl.delete(existing.el);
    }
    this.entries.set(id, {
      el,
      ratio: 0,
      top: Number.POSITIVE_INFINITY,
      userMuted: existing?.userMuted ?? false,
    });
    this.idByEl.set(el, id);
    el.muted = true;
    el.playsInline = true;
    el.loop = true;
    this.observer?.observe(el);
    this.schedule();
  }

  unregister(id: string) {
    const entry = this.entries.get(id);
    if (!entry) return;
    this.observer?.unobserve(entry.el);
    this.idByEl.delete(entry.el);
    this.entries.delete(id);
    try {
      entry.el.pause();
    } catch {}
    if (this.currentAudioId === id) this.currentAudioId = null;
    this.schedule();
  }

  /** Per-card mute toggle. Returns the new muted state for that card. */
  toggleUserMute(id: string): boolean {
    const entry = this.entries.get(id);
    if (!entry) return true;
    // First interaction also unlocks audio
    this.audioUnlocked = true;
    if (this.currentAudioId === id && !entry.userMuted) {
      entry.userMuted = true;
    } else {
      // Unmute this one — make it the audio holder
      entry.userMuted = false;
      // Clear user-mute on others so topmost rule resumes naturally
      for (const [otherId, other] of this.entries) {
        if (otherId !== id) other.userMuted = false;
      }
      this.currentAudioId = id;
    }
    this.apply();
    this.emit();
    return entry.userMuted || this.currentAudioId !== id;
  }

  isAudioActive(id: string): boolean {
    return this.audioUnlocked && this.currentAudioId === id;
  }

  subscribe(cb: () => void) {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  private emit() {
    for (const cb of this.listeners) cb();
  }

  private schedule() {
    if (this.rafPending) return;
    this.rafPending = true;
    requestAnimationFrame(() => {
      this.rafPending = false;
      this.apply();
      this.emit();
    });
  }

  private apply() {
    // Determine audio holder: among visible (ratio >= threshold) and not user-muted,
    // the one with smallest |top| (closest to top of viewport, clamped at 0).
    let audioId: string | null = null;
    let bestTop = Number.POSITIVE_INFINITY;

    for (const [id, e] of this.entries) {
      const visible = e.ratio >= VISIBILITY_THRESHOLD;
      // Play / pause
      if (visible) {
        if (e.el.paused) {
          e.el.muted = true;
          e.el.play().catch(() => {});
        }
      } else {
        if (!e.el.paused) {
          try {
            e.el.pause();
            e.el.currentTime = 0;
          } catch {}
        }
      }

      if (visible && !e.userMuted) {
        const dist = Math.abs(e.top);
        if (dist < bestTop) {
          bestTop = dist;
          audioId = id;
        }
      }
    }

    this.currentAudioId = audioId;

    // Apply mute state
    for (const [id, e] of this.entries) {
      const shouldHaveAudio = this.audioUnlocked && id === audioId;
      const desiredMuted = !shouldHaveAudio;
      if (e.el.muted !== desiredMuted) {
        e.el.muted = desiredMuted;
        if (!desiredMuted) {
          // Ensure playing
          e.el.play().catch(() => {});
        }
      }
    }
  }
}

export const feedVideoCoordinator = new Coordinator();
