/**
 * Audio helpers for the LipSync engine: decoding uploaded audio, turning it
 * into a per-frame amplitude envelope, synthesising an envelope from a
 * script when there is no audio, and exposing audio as a MediaStream so it
 * can be muxed into the recorded video.
 */
import { hashString } from "./ids";

export const MAX_AUDIO_BYTES = 25 * 1024 * 1024;
export const MAX_AUDIO_SECONDS = 60;

export interface WordTiming {
  word: string;
  startMs: number;
  endMs: number;
}

export interface Envelope {
  /** One value per frame, 0..1. */
  values: Float32Array;
  fps: number;
  durationMs: number;
  words?: WordTiming[];
}

type AudioContextCtor = typeof AudioContext;

function getAudioContextCtor(): AudioContextCtor | undefined {
  if (typeof window === "undefined") return undefined;
  return window.AudioContext ?? (window as unknown as { webkitAudioContext?: AudioContextCtor }).webkitAudioContext;
}

export function isAudioSupported(): boolean {
  return !!getAudioContextCtor();
}

export function validateAudioFile(file: File): string | null {
  if (!file.type.startsWith("audio/") && !/\.(mp3|wav|m4a|ogg|webm|aac)$/i.test(file.name)) {
    return "Please choose an audio file (MP3, WAV, M4A, OGG).";
  }
  if (file.size > MAX_AUDIO_BYTES) return "Audio must be smaller than 25 MB.";
  return null;
}

export async function decodeAudio(blob: Blob): Promise<AudioBuffer> {
  const Ctor = getAudioContextCtor();
  if (!Ctor) throw new Error("Web Audio is not supported in this browser.");
  const arrayBuffer = await blob.arrayBuffer();
  const OfflineCtor = typeof OfflineAudioContext !== "undefined" ? OfflineAudioContext : undefined;
  const ctx = OfflineCtor ? new OfflineCtor(1, 1, 44100) : new Ctor();
  try {
    return await new Promise<AudioBuffer>((resolve, reject) => {
      ctx.decodeAudioData(arrayBuffer.slice(0), resolve, (err) => reject(err ?? new Error("Could not decode audio")));
    });
  } finally {
    if (!OfflineCtor && "close" in ctx) void (ctx as AudioContext).close();
  }
}

/** Per-frame RMS envelope, normalised and smoothed (fast attack, slower release). */
export function computeEnvelope(buffer: AudioBuffer, fps = 30, maxSeconds = MAX_AUDIO_SECONDS): Envelope {
  const durationMs = Math.min(buffer.duration, maxSeconds) * 1000;
  const frames = Math.max(1, Math.ceil((durationMs / 1000) * fps));
  const samplesPerFrame = Math.floor(buffer.sampleRate / fps);
  const channels = Array.from({ length: buffer.numberOfChannels }, (_, c) => buffer.getChannelData(c));
  const raw = new Float32Array(frames);

  for (let f = 0; f < frames; f++) {
    const start = f * samplesPerFrame;
    const end = Math.min(start + samplesPerFrame, buffer.length);
    let sum = 0;
    let count = 0;
    for (let i = start; i < end; i += 4) {
      let v = 0;
      for (const ch of channels) v += ch[i];
      v /= channels.length;
      sum += v * v;
      count++;
    }
    raw[f] = count ? Math.sqrt(sum / count) : 0;
  }

  const sorted = Array.from(raw).sort((a, b) => a - b);
  const reference = sorted[Math.floor(sorted.length * 0.95)] || 1e-6;
  const values = new Float32Array(frames);
  let prev = 0;
  for (let f = 0; f < frames; f++) {
    const target = Math.min(1, raw[f] / reference);
    const k = target > prev ? 0.6 : 0.25;
    prev = prev + (target - prev) * k;
    values[f] = prev;
  }
  return { values, fps, durationMs };
}

function syllableCount(word: string): number {
  const w = word.toLowerCase().replace(/[^a-z]/g, "");
  if (!w) return 1;
  const groups = w.match(/[aeiouy]+/g);
  let count = groups ? groups.length : 1;
  if (w.endsWith("e") && count > 1) count -= 1;
  return Math.max(1, count);
}

export function estimateSpeechDurationMs(text: string, wordsPerMinute = 150): number {
  return envelopeFromScript(text, 30, wordsPerMinute).durationMs;
}

/**
 * Builds a plausible mouth-motion envelope from a script: one bump per
 * syllable, pauses at punctuation. Used when the user types dialogue rather
 * than uploading audio (browser speech synthesis cannot be captured).
 */
export function envelopeFromScript(script: string, fps = 30, wordsPerMinute = 150): Envelope {
  const tokens = script.replace(/\s+/g, " ").trim().split(" ").filter(Boolean);
  const msPerSyllable = 60_000 / (wordsPerMinute * 1.5);
  const leadMs = 350;
  const words: WordTiming[] = [];
  let cursor = leadMs;

  for (const token of tokens) {
    const syllables = syllableCount(token);
    const duration = syllables * msPerSyllable * (0.85 + (hashString(token) % 30) / 100);
    words.push({ word: token, startMs: cursor, endMs: cursor + duration });
    cursor += duration + 40;
    if (/[.!?]$/.test(token)) cursor += 380;
    else if (/[,;:]$/.test(token)) cursor += 180;
  }
  const durationMs = Math.max(1500, Math.round(cursor + 500));
  const frames = Math.ceil((durationMs / 1000) * fps);
  const values = new Float32Array(frames);

  for (const timing of words) {
    const syllables = syllableCount(timing.word);
    const span = timing.endMs - timing.startMs;
    const amplitude = 0.55 + (hashString(timing.word + "amp") % 45) / 100;
    for (let s = 0; s < syllables; s++) {
      const start = timing.startMs + (span / syllables) * s;
      const end = start + span / syllables;
      const fStart = Math.floor((start / 1000) * fps);
      const fEnd = Math.min(frames - 1, Math.ceil((end / 1000) * fps));
      for (let f = fStart; f <= fEnd; f++) {
        const t = (f - fStart) / Math.max(1, fEnd - fStart);
        values[f] = Math.max(values[f], Math.sin(Math.PI * t) * amplitude);
      }
    }
  }
  // light smoothing
  let prev = 0;
  for (let f = 0; f < frames; f++) {
    prev = prev + (values[f] - prev) * 0.5;
    values[f] = prev;
  }
  return { values, fps, durationMs, words };
}

export function envelopeAt(envelope: Envelope, timeMs: number): number {
  const index = Math.floor((timeMs / 1000) * envelope.fps);
  return envelope.values[Math.min(envelope.values.length - 1, Math.max(0, index))] ?? 0;
}

export function wordAt(envelope: Envelope, timeMs: number): WordTiming | undefined {
  const words = envelope.words;
  if (!words) return undefined;
  // Exact containment wins. The grace window only bridges the short silence
  // between words, so it must not let a finished word shadow the current one.
  return words.find((w) => timeMs >= w.startMs && timeMs < w.endMs) ?? words.find((w) => timeMs >= w.startMs && timeMs < w.endMs + 60);
}

export interface RecordingAudio {
  tracks: MediaStreamTrack[];
  start: () => void;
  stop: () => Promise<void>;
}

/**
 * Plays a decoded buffer into a MediaStream destination so the recorder can
 * mux it. Nothing is audible to the user during rendering.
 */
export async function createRecordingAudio(buffer: AudioBuffer): Promise<RecordingAudio> {
  const Ctor = getAudioContextCtor();
  if (!Ctor) throw new Error("Web Audio is not supported in this browser.");
  const ctx = new Ctor();
  if (ctx.state === "suspended") {
    try {
      await ctx.resume();
    } catch {
      /* ignore, tracks will just be silent */
    }
  }
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  const destination = ctx.createMediaStreamDestination();
  source.connect(destination);
  return {
    tracks: destination.stream.getAudioTracks(),
    start: () => source.start(0),
    stop: async () => {
      try {
        source.stop();
      } catch {
        /* already stopped */
      }
      await ctx.close();
    },
  };
}

// ---- speech synthesis (live preview only) -----------------------------------

export function isSpeechSupported(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window && typeof SpeechSynthesisUtterance !== "undefined";
}

export function listVoices(): SpeechSynthesisVoice[] {
  if (!isSpeechSupported()) return [];
  return window.speechSynthesis.getVoices().filter((v) => v.lang.toLowerCase().startsWith("en"));
}

export interface SpeechHandle {
  cancel: () => void;
  done: Promise<void>;
}

export function speakText(text: string, options: { voiceName?: string; rate?: number; pitch?: number } = {}): SpeechHandle {
  if (!isSpeechSupported()) return { cancel: () => undefined, done: Promise.resolve() };
  const synth = window.speechSynthesis;
  synth.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = options.rate ?? 1;
  utterance.pitch = options.pitch ?? 1;
  const voice = options.voiceName ? synth.getVoices().find((v) => v.name === options.voiceName) : undefined;
  if (voice) utterance.voice = voice;
  const done = new Promise<void>((resolve) => {
    utterance.onend = () => resolve();
    utterance.onerror = () => resolve();
  });
  synth.speak(utterance);
  return { cancel: () => synth.cancel(), done };
}
