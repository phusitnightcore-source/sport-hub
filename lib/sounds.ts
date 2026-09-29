// เสียงแจ้งเตือน (client-safe) — สังเคราะห์เป็นไฟล์ WAV (data URI) แล้วเล่นผ่าน <audio>
// เชื่อถือได้กว่า WebAudio (ไม่ติดสถานะ AudioContext suspended) — เล่นได้ทันทีเมื่อมาจาก user gesture
// สนามอัปโหลดไฟล์เองได้ต่อประเภท → ส่งเป็น customUrl

export type NotifSoundType = "booking" | "payment" | "membership" | "promotion" | "system";

// ลำดับโน้ต (ความถี่ Hz, ระยะเวลา วินาที) ต่อประเภท — ให้ "จำเสียงได้" ว่าเป็นเหตุการณ์อะไร
const PATTERNS: Record<NotifSoundType, { freq: number; dur: number }[]> = {
  booking: [
    { freq: 660, dur: 0.13 },
    { freq: 880, dur: 0.18 },
  ],
  payment: [
    { freq: 988, dur: 0.11 },
    { freq: 1319, dur: 0.24 },
  ],
  membership: [
    { freq: 523, dur: 0.11 },
    { freq: 659, dur: 0.11 },
    { freq: 784, dur: 0.2 },
  ],
  promotion: [{ freq: 1047, dur: 0.22 }],
  system: [{ freq: 392, dur: 0.26 }],
};

const SAMPLE_RATE = 44100;

// สังเคราะห์ PCM (mono, 16-bit) จากลำดับโน้ต + envelope กัน "ป๊อป"
function synthSamples(pattern: { freq: number; dur: number }[]): Float32Array {
  const total = pattern.reduce((s, n) => s + Math.floor(n.dur * SAMPLE_RATE), 0);
  const out = new Float32Array(total);
  let idx = 0;
  for (let n = 0; n < pattern.length; n++) {
    const { freq, dur } = pattern[n];
    const len = Math.floor(dur * SAMPLE_RATE);
    for (let i = 0; i < len; i++) {
      const t = i / SAMPLE_RATE;
      const attack = Math.min(1, t / 0.008);
      const release = Math.min(1, (dur - t) / 0.06);
      const env = Math.max(0, Math.min(attack, release));
      out[idx++] = Math.sin(2 * Math.PI * freq * t) * 0.45 * env;
    }
  }
  return out;
}

function writeString(view: DataView, offset: number, str: string) {
  for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
}

// ห่อ PCM เป็นไฟล์ WAV แล้วแปลงเป็น base64 data URI
function samplesToWavDataUri(samples: Float32Array): string {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);
  writeString(view, 0, "RIFF");
  view.setUint32(4, 36 + samples.length * 2, true);
  writeString(view, 8, "WAVE");
  writeString(view, 12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, SAMPLE_RATE, true);
  view.setUint32(28, SAMPLE_RATE * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(view, 36, "data");
  view.setUint32(40, samples.length * 2, true);
  let off = 44;
  for (let i = 0; i < samples.length; i++, off += 2) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(off, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunk)));
  }
  return `data:audio/wav;base64,${btoa(binary)}`;
}

const cache: Partial<Record<NotifSoundType, string>> = {};
function defaultSoundUri(type: NotifSoundType): string {
  if (!cache[type]) cache[type] = samplesToWavDataUri(synthSamples(PATTERNS[type]));
  return cache[type] as string;
}

// เรียกครั้งเดียวตอน user interaction แรก — "ปลดล็อก" การเล่นเสียงอัตโนมัติภายหลัง (เช่น toast จาก realtime)
// เล่นเสียงเงียบสั้นๆ จาก gesture เพื่อให้เบราว์เซอร์อนุญาต Audio.play() ครั้งถัดไป
let unlocked = false;
export function unlockAudio(): void {
  if (unlocked || typeof window === "undefined") return;
  unlocked = true;
  try {
    const a = new Audio(
      "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=",
    );
    a.volume = 0;
    void a.play().catch(() => {});
  } catch {
    /* เงียบ */
  }
}

// เล่นเสียงแจ้งเตือน — customUrl (ไฟล์ที่สนามอัปโหลด) มาก่อน ไม่งั้นใช้เสียง default (WAV สังเคราะห์)
export function playNotificationSound(type: NotifSoundType, customUrl?: string | null): void {
  if (typeof window === "undefined") return;
  const primary = customUrl || defaultSoundUri(type);
  try {
    const audio = new Audio(primary);
    audio.volume = 0.7;
    void audio.play().catch(() => {
      // ไฟล์ที่อัปโหลดเล่นไม่ได้ (เช่น codec) → fallback เสียง default
      if (customUrl) {
        try {
          const fb = new Audio(defaultSoundUri(type));
          fb.volume = 0.7;
          void fb.play().catch(() => {});
        } catch {
          /* เงียบ */
        }
      }
    });
  } catch {
    /* เงียบ */
  }
}
