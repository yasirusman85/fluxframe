import { describe, expect, it } from "vitest";
import {
  MAX_AUDIO_BYTES,
  computeEnvelope,
  envelopeAt,
  envelopeFromScript,
  estimateSpeechDurationMs,
  isAudioSupported,
  isSpeechSupported,
  listVoices,
  speakText,
  validateAudioFile,
  wordAt,
} from "../src/lib/audio-utils";
import { fakeFile, makeAudioBuffer } from "./helpers/fixtures";

describe("envelopeFromScript", () => {
  const script = "Hello there, this is FluxFrame speaking clearly.";

  it("returns one value per frame, all within 0..1", () => {
    const envelope = envelopeFromScript(script);
    expect(envelope.fps).toBe(30);
    expect(envelope.values.length).toBe(Math.ceil((envelope.durationMs / 1000) * envelope.fps));
    for (const value of envelope.values) {
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThanOrEqual(1);
    }
    expect(Math.max(...envelope.values)).toBeGreaterThan(0.2);
  });

  it("is deterministic", () => {
    const a = envelopeFromScript(script);
    const b = envelopeFromScript(script);
    expect(a.durationMs).toBe(b.durationMs);
    expect(Array.from(a.values)).toEqual(Array.from(b.values));
  });

  it("gets longer as the script gets longer", () => {
    const short = envelopeFromScript("One short line of dialogue here now");
    const long = envelopeFromScript("One short line of dialogue here now ".repeat(4));
    expect(long.durationMs).toBeGreaterThan(short.durationMs);
  });

  it("speeds up as words-per-minute rises", () => {
    const slow = envelopeFromScript(script.repeat(3), 30, 120);
    const fast = envelopeFromScript(script.repeat(3), 30, 300);
    expect(fast.durationMs).toBeLessThan(slow.durationMs);
  });

  it("emits monotonic, non-overlapping word timings", () => {
    const { words } = envelopeFromScript(script);
    expect(words).toBeDefined();
    expect(words!.length).toBe(7);
    expect(words![0].word).toBe("Hello");
    expect(words![0].startMs).toBeGreaterThan(0);
    for (let i = 0; i < words!.length; i++) {
      expect(words![i].endMs).toBeGreaterThan(words![i].startMs);
      if (i > 0) expect(words![i].startMs).toBeGreaterThanOrEqual(words![i - 1].endMs);
    }
  });

  it("adds a pause after sentence punctuation", () => {
    expect(envelopeFromScript("a. b").durationMs).toBeGreaterThan(envelopeFromScript("a b").durationMs);
  });

  it("adds a shorter pause after a comma than after a full stop", () => {
    const comma = envelopeFromScript("alpha, beta gamma delta epsilon");
    const stop = envelopeFromScript("alpha. beta gamma delta epsilon");
    const none = envelopeFromScript("alpha beta gamma delta epsilon");
    expect(comma.durationMs).toBeGreaterThan(none.durationMs);
    expect(stop.durationMs).toBeGreaterThan(comma.durationMs);
  });

  it("collapses whitespace and survives an empty script", () => {
    expect(envelopeFromScript("  a   b  ").words!.length).toBe(2);
    const empty = envelopeFromScript("   ");
    expect(empty.words).toEqual([]);
    expect(empty.durationMs).toBe(1500);
    expect(empty.values.length).toBe(45);
  });

  it("never drops below the 1.5 s floor", () => {
    expect(envelopeFromScript("hi").durationMs).toBeGreaterThanOrEqual(1500);
  });
});

describe("estimateSpeechDurationMs", () => {
  it("matches the envelope duration", () => {
    expect(estimateSpeechDurationMs("hello world")).toBe(envelopeFromScript("hello world").durationMs);
  });

  it("is at least 1500 ms even for empty input", () => {
    expect(estimateSpeechDurationMs("")).toBeGreaterThanOrEqual(1500);
    expect(estimateSpeechDurationMs("a")).toBeGreaterThanOrEqual(1500);
    expect(estimateSpeechDurationMs("a much longer sentence with many words in it")).toBeGreaterThan(1500);
  });
});

describe("envelopeAt", () => {
  const envelope = envelopeFromScript("Hello there friends");

  it("clamps below zero to the first frame", () => {
    expect(envelopeAt(envelope, -5000)).toBe(envelope.values[0]);
    expect(envelopeAt(envelope, 0)).toBe(envelope.values[0]);
  });

  it("clamps beyond the end to the last frame", () => {
    const last = envelope.values[envelope.values.length - 1];
    expect(envelopeAt(envelope, envelope.durationMs * 10)).toBe(last);
  });

  it("reads the frame that covers the requested time", () => {
    expect(envelopeAt(envelope, 1000)).toBe(envelope.values[30]);
  });
});

describe("wordAt", () => {
  const envelope = envelopeFromScript("Hello there friends");

  it("finds the word spoken at a time", () => {
    const first = envelope.words![0];
    expect(wordAt(envelope, first.startMs + 1)?.word).toBe("Hello");
    expect(wordAt(envelope, envelope.words![2].startMs + 1)?.word).toBe("friends");
  });

  it("returns undefined before the first word", () => {
    expect(wordAt(envelope, 0)).toBeUndefined();
  });

  it("returns undefined past the end", () => {
    expect(wordAt(envelope, 10 * envelope.durationMs)).toBeUndefined();
  });

  it("returns undefined when the envelope has no word track", () => {
    expect(wordAt(computeEnvelope(makeAudioBuffer()), 100)).toBeUndefined();
  });
});

describe("computeEnvelope", () => {
  const buffer = makeAudioBuffer({ durationSec: 2, sampleRate: 8000, burstSec: 0.5 });
  const envelope = computeEnvelope(buffer, 30);

  it("produces ceil(duration * fps) frames", () => {
    expect(envelope.values.length).toBe(Math.ceil(2 * 30));
    expect(envelope.fps).toBe(30);
    expect(envelope.durationMs).toBe(2000);
    expect(envelope.words).toBeUndefined();
  });

  it("keeps every value within 0..1", () => {
    for (const value of envelope.values) {
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThanOrEqual(1);
    }
  });

  it("peaks near 1 during the bursts", () => {
    expect(envelope.values[14]).toBeGreaterThan(0.85);
    expect(envelope.values[44]).toBeGreaterThan(0.85);
  });

  it("falls back near 0 during the silences", () => {
    expect(envelope.values[29]).toBeLessThan(0.15);
    expect(envelope.values[59]).toBeLessThan(0.15);
  });

  it("clamps the duration to maxSeconds", () => {
    const long = computeEnvelope(makeAudioBuffer({ durationSec: 90 }), 30, 10);
    expect(long.durationMs).toBe(10_000);
    expect(long.values.length).toBe(300);
  });

  it("always returns at least one frame", () => {
    const tiny = computeEnvelope(makeAudioBuffer({ durationSec: 0 }), 30);
    expect(tiny.values.length).toBe(1);
  });
});

describe("validateAudioFile", () => {
  it("accepts audio MIME types", () => {
    expect(validateAudioFile(new File([new Uint8Array(16)], "voice.mp3", { type: "audio/mpeg" }))).toBeNull();
    expect(validateAudioFile(fakeFile("clip.bin", "audio/wav", 1024))).toBeNull();
  });

  it("accepts known extensions even without a MIME type", () => {
    for (const name of ["take.wav", "take.mp3", "take.m4a", "take.ogg", "take.webm", "take.aac", "TAKE.WAV"]) {
      expect(validateAudioFile(fakeFile(name, "", 1024))).toBeNull();
    }
  });

  it("rejects non-audio files", () => {
    const message = validateAudioFile(fakeFile("shot.png", "image/png", 2048));
    expect(message).toMatch(/audio file/i);
    expect(validateAudioFile(fakeFile("notes.txt", "text/plain", 64))).toMatch(/audio file/i);
  });

  it("rejects files above 25 MB", () => {
    expect(validateAudioFile(fakeFile("huge.mp3", "audio/mpeg", MAX_AUDIO_BYTES + 1))).toMatch(/25 MB/);
    expect(validateAudioFile(fakeFile("ok.mp3", "audio/mpeg", MAX_AUDIO_BYTES))).toBeNull();
  });
});

describe("speech helpers", () => {
  it("reports support as a boolean", () => {
    expect(typeof isSpeechSupported()).toBe("boolean");
    expect(typeof isAudioSupported()).toBe("boolean");
  });

  it("returns a usable handle even when speech synthesis is unavailable", async () => {
    const handle = speakText("Hello from FluxFrame");
    expect(typeof handle.cancel).toBe("function");
    expect(handle.done).toBeInstanceOf(Promise);
    expect(() => handle.cancel()).not.toThrow();
    await expect(handle.done).resolves.toBeUndefined();
  });

  it("returns an array of voices", () => {
    expect(Array.isArray(listVoices())).toBe(true);
  });
});
