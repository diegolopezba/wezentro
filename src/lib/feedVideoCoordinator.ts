/**
 * FeedVideoCoordinator
 *
 * Pinterest-style autoplay + explicit-audio behavior for feed videos.
 *
 * Rules:
 *  - A registered <video> autoplays (muted) when ≥ VISIBILITY_THRESHOLD on screen.
 *  - It pauses (and resets to 0) when below that threshold.
 *  - Audio is OFF by default for every feed video.
 *  - The user explicitly chooses which video has sound by tapping its sound button.
 *  - Only that chosen video un-mutes; it stays muted while off-screen and resumes
 *    with sound when it comes back on screen, until the user mutes it again.
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
    // Audio stays locked until the user explicitly taps a card's sound button.
    // We no longer unlock on generic page interactions, so feed videos remain
    // muted by default and only the chosen video gets sound.
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

  subscribe = (cb: () => void) => {
    this.listeners.add(cb);
    return () => {
      this.listeners.delete(cb);
    };
  };

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
    // Audio holder is the video the user explicitly unmuted (if any).
    // We never auto-promote a visible video to audio holder.
    const audioId = this.audioUnlocked ? this.currentAudioId : null;

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
    }

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
