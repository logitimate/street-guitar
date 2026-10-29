import { Injectable } from '@angular/core';
import { ChordName } from './open-chords';

interface Sample { buf: AudioBuffer; peak: number; start: number; }

export type StrumDir = 'down' | 'up';

const BASE = 'tutorials/';
const CHORD_NAMES: ChordName[] = ['G', 'A', 'Am', 'C', 'D', 'Dm', 'E', 'Em'];

/**
 * Plays David's recorded open-chord strums (Martin HD28, CC0) and the woodblock click.
 * Files are fetched up front; the AudioContext is created on the first user gesture
 * (browsers block audio until then), and buffers decode into it.
 */
@Injectable({ providedIn: 'root' })
export class GuitarAudioService {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private raw = new Map<string, Promise<ArrayBuffer>>();
  private samples = new Map<string, Sample>();
  private ringing: { src: AudioBufferSourceNode; g: GainNode }[] = [];

  constructor() {
    for (const f of this.files()) this.fetchRaw(f);
  }

  /** Call from inside a click/tap handler. Returns false if Web Audio isn't available. */
  ensure(): boolean {
    if (typeof window === 'undefined' || !('AudioContext' in window)) return false;
    if (!this.ctx) {
      this.ctx = new AudioContext();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.9;
      this.master.connect(this.ctx.destination);
      for (const f of this.files()) this.decode(f);
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
    return true;
  }

  get now(): number { return this.ctx?.currentTime ?? 0; }

  /** audio-clock time → performance.now() ms of when it is heard (to match camera samples) */
  toPerfMs(t: number): number {
    const ctx = this.ctx;
    if (!ctx) return performance.now();
    const o = ctx.getOutputTimestamp?.();
    if (o?.performanceTime && o.contextTime !== undefined) return o.performanceTime + (t - o.contextTime) * 1000;
    return performance.now() + (t - ctx.currentTime) * 1000 + (ctx.outputLatency || 0.02) * 1000;
  }

  /** A quick strum of an open chord. `lift` plays the open strings (fingers off). */
  strum(chord: ChordName, dir: StrumDir = 'down', at = this.now + 0.03, vel = 1, lift = false) {
    const key = lift ? 'liftoff-up' : `open-${chord}-${dir}`;
    const s = this.samples.get(key);
    if (!this.ctx || !this.master || !s) return;
    this.damp(at);
    const src = this.ctx.createBufferSource();
    src.buffer = s.buf;
    const g = this.ctx.createGain();
    g.gain.value = ((dir === 'down' ? 0.85 : 0.65) * vel) / s.peak;
    src.connect(g).connect(this.master);
    src.start(at, s.start);
    this.ringing.push({ src, g });
  }

  /** Woodblock metronome knock. Beat 1 is pitched a touch higher. */
  click(at: number, accent = false, level = 0.6) {
    const s = this.samples.get('woodblock');
    if (!this.ctx || !this.master) return;
    if (s) {
      const src = this.ctx.createBufferSource();
      src.buffer = s.buf;
      src.playbackRate.value = accent ? 1.12 : 1;
      const g = this.ctx.createGain();
      g.gain.value = 0.55 * (accent ? 1 : level);
      src.connect(g).connect(this.master);
      src.start(at);
      return;
    }
    // fallback beep until the woodblock decodes
    const o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.frequency.value = accent ? 1760 : 1175;
    g.gain.setValueAtTime(0.0001, at);
    g.gain.exponentialRampToValueAtTime(0.3, at + 0.002);
    g.gain.exponentialRampToValueAtTime(0.0001, at + 0.06);
    o.connect(g).connect(this.master);
    o.start(at);
    o.stop(at + 0.08);
  }

  /** Stop everything ringing (new strum, or Stop pressed). */
  damp(at = this.now) {
    for (const v of this.ringing) {
      v.g.gain.setTargetAtTime(0, at, 0.015);
      try { v.src.stop(at + 0.15); } catch { /* already stopped */ }
    }
    this.ringing = [];
  }

  private files(): string[] {
    return [
      ...CHORD_NAMES.flatMap(c => [`open-${c}-down`, `open-${c}-up`]),
      'liftoff-up',
      'woodblock',
    ];
  }

  private url(f: string) {
    return f === 'woodblock' ? `${BASE}woodblock.mp3` : `${BASE}strums/${f}.mp3`;
  }

  private fetchRaw(f: string) {
    if (typeof fetch === 'undefined' || this.raw.has(f)) return;
    const p = fetch(this.url(f)).then(r => {
      if (!r.ok) throw new Error(`${f}: ${r.status}`);
      return r.arrayBuffer();
    });
    p.catch(() => undefined);
    this.raw.set(f, p);
  }

  private async decode(f: string) {
    const ctx = this.ctx;
    const raw = this.raw.get(f);
    if (!ctx || !raw) return;
    try {
      // slice: decodeAudioData detaches the buffer, and the promise is shared
      const buf = await ctx.decodeAudioData((await raw).slice(0));
      const d = buf.getChannelData(0);
      let peak = 0;
      for (let i = 0; i < d.length; i++) peak = Math.max(peak, Math.abs(d[i]));
      // skip the quiet lead-in so the strum lands on the beat
      let i = 0;
      while (i < d.length && Math.abs(d[i]) < peak * 0.1) i++;
      this.samples.set(f, { buf, peak: peak || 1, start: Math.max(0, i / buf.sampleRate - 0.005) });
    } catch { /* missing file: that sound just stays silent */ }
  }
}
