import { Injectable, signal } from '@angular/core';
import {
  getFirestore, collection, getDocs, doc, setDoc,
} from 'firebase/firestore';

function extractYouTubeId(input: string): string {
  const s = input.trim();
  if (/^[a-zA-Z0-9_-]{11}$/.test(s)) return s;
  const m =
    s.match(/[?&]v=([a-zA-Z0-9_-]{11})/) ??
    s.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/) ??
    s.match(/embed\/([a-zA-Z0-9_-]{11})/);
  return m ? m[1] : s;
}

@Injectable({ providedIn: 'root' })
export class LessonService {
  private db = getFirestore();

  private _videoIds = signal<Record<string, string>>({});
  private _loaded   = signal(false);

  readonly videoIds = this._videoIds.asReadonly();
  readonly loaded   = this._loaded.asReadonly();

  constructor() {
    this.loadAll();
  }

  private async loadAll() {
    const snap = await getDocs(collection(this.db, 'lessons'));
    const ids: Record<string, string> = {};
    snap.forEach(d => {
      const v = (d.data() as { videoId?: string }).videoId;
      if (v) ids[d.id] = v;
    });
    this._videoIds.set(ids);
    this._loaded.set(true);
  }

  getVideoId(lessonId: number): string | null {
    const id = this._videoIds()[String(lessonId)];
    return id?.trim() || null;
  }

  async setVideoId(lessonId: number, raw: string): Promise<void> {
    const videoId = raw.trim() ? extractYouTubeId(raw) : '';
    await setDoc(
      doc(this.db, 'lessons', String(lessonId)),
      { videoId },
      { merge: true },
    );
    this._videoIds.update(ids => ({ ...ids, [String(lessonId)]: videoId }));
  }
}
