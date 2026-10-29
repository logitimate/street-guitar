import { Injectable, signal } from '@angular/core';
import type { HandLandmarker, NormalizedLandmark } from '@mediapipe/tasks-vision';

const VER = '0.10.35';
const WASM = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${VER}/wasm`;
const MODEL = 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task';
/** a camera picture is about this many ms old by the time it is looked at */
const CAM_LAG = 80;

export interface Sample { t: number; y: number; }
interface Track { x: number; y: number; t: number; h: NormalizedLandmark[]; hist: Sample[]; }

export type Stroke = 'down' | 'up' | 'still' | 'none';

/**
 * Which way was the strumming hand moving at an arrow's moment? Fits a line to the hand's height
 * (0 top .. 1 bottom) around that moment: going down the picture = down strum. 'still' when it
 * barely moved, 'none' when the camera had too few looks to say.
 */
export function judgeStroke(samples: Sample[], at: number, slotMs: number): Stroke {
  const w = 0.3 * slotMs;
  const pts = samples.filter(p => p.t >= at - w && p.t <= at + w);
  if (pts.length < 3) return 'none';
  const mt = pts.reduce((s, p) => s + p.t, 0) / pts.length;
  const my = pts.reduce((s, p) => s + p.y, 0) / pts.length;
  let num = 0, den = 0;
  for (const p of pts) { num += (p.t - mt) * (p.y - my); den += (p.t - mt) ** 2; }
  const perSec = den ? (num / den) * 1000 : 0; // picture heights per second
  if (Math.abs(perSec) < 0.1) return 'still';
  return perSec > 0 ? 'down' : 'up';
}

const std = (a: number[]) => {
  const m = a.reduce((s, v) => s + v, 0) / a.length;
  return Math.sqrt(a.reduce((s, v) => s + (v - m) ** 2, 0) / a.length);
};

/**
 * The front camera watching the strumming hand (MediaPipe hand landmarks). Finds the hands, follows each,
 * and treats the one moving up and down the most as the strumming hand. Pictures never leave the device.
 */
@Injectable({ providedIn: 'root' })
export class HandTrackerService {
  readonly message = signal('Tap Start: the camera will ask to turn on.');
  readonly blocked = signal(false);

  private marker: HandLandmarker | null = null;
  private loading: Promise<void> | null = null;
  private stream: MediaStream | null = null;
  private video: HTMLVideoElement | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private on = false;
  private turn = 0;
  private tracks: Track[] = [];
  private strumTrack: Track | null = null;
  private lastSeen = 0;
  private lastFrame = -1;

  /** true while the strumming hand is in view */
  watching() { return this.on && !!this.strumTrack && performance.now() - this.lastSeen < 1000; }
  samples(): Sample[] { return this.strumTrack?.hist ?? []; }

  /** start watching; resolves false if the camera was refused or couldn't load */
  async start(video: HTMLVideoElement, canvas: HTMLCanvasElement): Promise<boolean> {
    const my = ++this.turn;
    this.video = video;
    this.canvas = canvas;
    try {
      this.message.set('Turning the camera on…');
      await this.openCamera();
      if (my !== this.turn) return false;
      if (!this.marker) {
        this.message.set('Camera on. Loading the hand finder…');
        await (this.loading ??= this.load().catch(e => { this.loading = null; throw e; }));
      }
      if (my !== this.turn) return false;
      this.tracks = [];
      this.strumTrack = null;
      if (!this.on) { this.on = true; this.loop(); }
      return true;
    } catch (e) {
      const err = e as Error;
      if (/Permission|NotAllowed|Security/i.test(err.name + err.message)) {
        this.blocked.set(true);
        this.message.set('The camera was blocked. Allow it for this site in your browser settings, then try again.');
      } else {
        this.message.set("This device can't watch yet. You can still strum along.");
      }
      return false;
    }
  }

  stop() {
    this.turn++;
    this.on = false;
    this.stream?.getTracks().forEach(t => t.stop());
    this.stream = null;
    if (this.video) this.video.srcObject = null;
    this.canvas?.getContext('2d')?.clearRect(0, 0, this.canvas.width, this.canvas.height);
    if (!this.blocked()) this.message.set('Camera off. Press Start to watch again.');
  }

  private async load() {
    const { FilesetResolver, HandLandmarker } = await import('@mediapipe/tasks-vision');
    const files = await FilesetResolver.forVisionTasks(WASM);
    const opts = (delegate: 'GPU' | 'CPU') => ({
      baseOptions: { modelAssetPath: MODEL, delegate },
      runningMode: 'VIDEO' as const,
      numHands: 2,
      minHandDetectionConfidence: 0.4,
      minHandPresenceConfidence: 0.4,
      minTrackingConfidence: 0.4,
    });
    try { this.marker = await HandLandmarker.createFromOptions(files, opts('GPU')); }
    catch { this.marker = await HandLandmarker.createFromOptions(files, opts('CPU')); }
  }

  private async openCamera() {
    if (this.stream) return;
    // always 1280x720, the sensor's own shape: other asks came back zoomed or cropped to the face on phones
    let s: MediaStream;
    try {
      s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false });
    } catch (e) {
      const err = e as Error;
      if (/Permission|NotAllowed|Security/i.test(err.name + err.message)) throw e;
      await new Promise(r => setTimeout(r, 500)); // a camera busy for a moment gets one plain retry
      s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false });
    }
    this.stream = s;
    this.blocked.set(false);
    this.video!.srcObject = s;
    await this.video!.play().catch(() => undefined);
    // widest view the camera allows, where the device lets a page zoom
    try {
      const tr = s.getVideoTracks()[0];
      const zoom = (tr.getCapabilities?.() as { zoom?: { min: number } } | undefined)?.zoom;
      if (zoom) await tr.applyConstraints({ advanced: [{ zoom: zoom.min } as MediaTrackConstraintSet] });
    } catch { /* not supported */ }
  }

  private loop = () => {
    if (!this.on || !this.marker || !this.video) return;
    const v = this.video;
    if (v.readyState >= 2 && v.currentTime !== this.lastFrame) {
      this.lastFrame = v.currentTime;
      const t = performance.now();
      const hands = this.marker.detectForVideo(v, t).landmarks ?? [];
      this.follow(hands, t);
      this.draw();
      if (hands.length) {
        this.lastSeen = t;
        this.message.set(this.strumTrack ? 'Watching your strumming hand.' : 'I see a hand. Start strumming.');
      } else if (t - this.lastSeen > 1000) {
        this.message.set("I can't see your strumming hand. Tilt the camera down a little.");
      }
    }
    requestAnimationFrame(this.loop);
  };

  private follow(hands: NormalizedLandmark[][], t: number) {
    for (const h of hands) {
      const x = h.reduce((s, p) => s + p.x, 0) / h.length, y = h.reduce((s, p) => s + p.y, 0) / h.length;
      let best: Track | null = null, bd = 0.25;
      for (const tr of this.tracks) {
        const d = Math.hypot(tr.x - x, tr.y - y);
        if (d < bd && tr.t !== t) { bd = d; best = tr; }
      }
      if (!best) { best = { x, y, t, h, hist: [] }; this.tracks.push(best); }
      Object.assign(best, { x, y, t, h });
      best.hist.push({ t: t - CAM_LAG, y });
    }
    this.tracks = this.tracks.filter(tr => t - tr.t < 1000);
    for (const tr of this.tracks) while (tr.hist.length && tr.hist[0].t < t - 3000) tr.hist.shift();
    const moving = this.tracks.filter(tr => tr.hist.length >= 8);
    const spread = (tr: Track) => std(tr.hist.slice(-45).map(p => p.y));
    if (moving.length) this.strumTrack = moving.reduce((a, b) => (spread(a) >= spread(b) ? a : b));
  }

  private draw() {
    const c = this.canvas, v = this.video;
    const g = c?.getContext('2d');
    if (!c || !v || !g) return;
    c.width = v.videoWidth;
    c.height = v.videoHeight;
    g.clearRect(0, 0, c.width, c.height);
    const r = Math.max(5, c.width / 90);
    for (const tr of this.tracks) {
      if (performance.now() - tr.t > 200) continue;
      const strum = tr === this.strumTrack;
      g.fillStyle = strum ? '#3CC07F' : 'rgba(255,255,255,.5)';
      for (const p of tr.h) {
        g.beginPath();
        g.arc(p.x * c.width, p.y * c.height, strum ? r : r * 0.6, 0, 7);
        g.fill();
      }
    }
  }
}
