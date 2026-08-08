import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const SAMPLE_RATE = 44_100;
const OUTPUT_DIR = path.join(process.cwd(), "public", "audio");

function makeTrack(seconds, compose, targetPeak = 0.88) {
  const samples = new Float32Array(Math.ceil(seconds * SAMPLE_RATE));
  compose(samples);
  let peak = 0;
  for (const sample of samples) peak = Math.max(peak, Math.abs(sample));
  const scale = peak > 0 ? targetPeak / peak : 1;
  for (let index = 0; index < samples.length; index += 1) samples[index] *= scale;
  return samples;
}

function waveValue(kind, phase) {
  if (kind === "triangle") return (2 / Math.PI) * Math.asin(Math.sin(phase));
  if (kind === "square") return Math.sin(phase) >= 0 ? 1 : -1;
  return Math.sin(phase);
}

function addTone(samples, {
  frequency,
  start,
  duration,
  amplitude,
  wave = "sine",
  endFrequency = frequency,
  attack = 0.018,
  release = Math.min(0.28, duration * 0.45),
}) {
  const first = Math.max(0, Math.floor(start * SAMPLE_RATE));
  const last = Math.min(samples.length, Math.ceil((start + duration) * SAMPLE_RATE));
  for (let index = first; index < last; index += 1) {
    const elapsed = index / SAMPLE_RATE - start;
    const progress = elapsed / duration;
    const fadeIn = Math.min(1, elapsed / Math.max(attack, 0.001));
    const fadeOut = Math.min(1, (duration - elapsed) / Math.max(release, 0.001));
    const envelope = Math.max(0, Math.min(fadeIn, fadeOut));
    const phase = 2 * Math.PI * (
      frequency * elapsed + ((endFrequency - frequency) * elapsed * elapsed) / (2 * duration)
    );
    samples[index] += waveValue(wave, phase) * amplitude * envelope * (1 - progress * 0.08);
  }
}

function addBell(samples, frequency, start, duration, amplitude) {
  addTone(samples, { frequency, start, duration, amplitude, release: duration * 0.72 });
  addTone(samples, {
    frequency: frequency * 2.01,
    start,
    duration: duration * 0.68,
    amplitude: amplitude * 0.27,
    release: duration * 0.52,
  });
  addTone(samples, {
    frequency: frequency * 3.98,
    start,
    duration: duration * 0.38,
    amplitude: amplitude * 0.08,
    release: duration * 0.28,
  });
}

function addNoise(samples, start, duration, amplitude, seed = 12_345) {
  const first = Math.max(0, Math.floor(start * SAMPLE_RATE));
  const last = Math.min(samples.length, Math.ceil((start + duration) * SAMPLE_RATE));
  let state = seed >>> 0;
  let smooth = 0;
  for (let index = first; index < last; index += 1) {
    state = (Math.imul(state, 1_664_525) + 1_013_904_223) >>> 0;
    const white = (state / 0xffffffff) * 2 - 1;
    smooth = smooth * 0.72 + white * 0.28;
    const elapsed = index / SAMPLE_RATE - start;
    const envelope = Math.sin(Math.PI * Math.min(1, elapsed / duration));
    samples[index] += smooth * amplitude * envelope;
  }
}

function writeWav(samples) {
  const dataLength = samples.length * 2;
  const wav = Buffer.alloc(44 + dataLength);
  wav.write("RIFF", 0);
  wav.writeUInt32LE(36 + dataLength, 4);
  wav.write("WAVE", 8);
  wav.write("fmt ", 12);
  wav.writeUInt32LE(16, 16);
  wav.writeUInt16LE(1, 20);
  wav.writeUInt16LE(1, 22);
  wav.writeUInt32LE(SAMPLE_RATE, 24);
  wav.writeUInt32LE(SAMPLE_RATE * 2, 28);
  wav.writeUInt16LE(2, 32);
  wav.writeUInt16LE(16, 34);
  wav.write("data", 36);
  wav.writeUInt32LE(dataLength, 40);
  for (let index = 0; index < samples.length; index += 1) {
    const sample = Math.max(-1, Math.min(1, samples[index]));
    wav.writeInt16LE(Math.round(sample * 32_767), 44 + index * 2);
  }
  return wav;
}

const effects = {
  "click.wav": makeTrack(0.13, (samples) => {
    addTone(samples, { frequency: 620, endFrequency: 820, start: 0, duration: 0.09, amplitude: 0.5 });
    addBell(samples, 1_180, 0.014, 0.08, 0.24);
  }, 0.78),
  "plant.wav": makeTrack(0.36, (samples) => {
    addNoise(samples, 0, 0.16, 0.34, 81);
    addTone(samples, { frequency: 210, endFrequency: 105, start: 0, duration: 0.22, amplitude: 0.55 });
    addBell(samples, 420, 0.14, 0.18, 0.25);
  }),
  "harvest.wav": makeTrack(0.62, (samples) => {
    [659.25, 830.61, 1_046.5, 1_318.5].forEach((frequency, index) => addBell(samples, frequency, index * 0.09, 0.34, 0.34));
  }),
  "spell.wav": makeTrack(0.9, (samples) => {
    addNoise(samples, 0, 0.6, 0.1, 412);
    [783.99, 1_174.66, 1_567.98, 2_093].forEach((frequency, index) => addBell(samples, frequency, index * 0.12, 0.55, 0.28));
  }),
  "level-up.wav": makeTrack(1.6, (samples) => {
    [523.25, 659.25, 783.99, 1_046.5, 1_318.5].forEach((frequency, index) => addBell(samples, frequency, index * 0.15, 0.58, 0.32));
    [523.25, 783.99, 1_046.5].forEach((frequency) => addTone(samples, { frequency, start: 0.82, duration: 0.72, amplitude: 0.2, wave: "triangle", attack: 0.04, release: 0.52 }));
  }),
  "success.wav": makeTrack(0.58, (samples) => {
    addBell(samples, 659.25, 0, 0.34, 0.38);
    addBell(samples, 880, 0.12, 0.42, 0.42);
  }),
  "error.wav": makeTrack(0.46, (samples) => {
    addTone(samples, { frequency: 246.94, endFrequency: 207.65, start: 0, duration: 0.24, amplitude: 0.42, wave: "triangle" });
    addTone(samples, { frequency: 196, endFrequency: 164.81, start: 0.16, duration: 0.27, amplitude: 0.38, wave: "triangle" });
  }),
  "expand.wav": makeTrack(0.76, (samples) => {
    addTone(samples, { frequency: 130, endFrequency: 76, start: 0, duration: 0.34, amplitude: 0.5 });
    addNoise(samples, 0.04, 0.25, 0.18, 55);
    [392, 523.25, 659.25].forEach((frequency, index) => addBell(samples, frequency, 0.22 + index * 0.1, 0.4, 0.27));
  }),
  "scan.wav": makeTrack(0.36, (samples) => {
    addTone(samples, { frequency: 880, endFrequency: 1_180, start: 0, duration: 0.13, amplitude: 0.48 });
    addTone(samples, { frequency: 1_320, endFrequency: 1_620, start: 0.11, duration: 0.2, amplitude: 0.52 });
  }),
  "timer.wav": makeTrack(0.78, (samples) => {
    [880, 880, 1_320].forEach((frequency, index) => addBell(samples, frequency, index * 0.24, 0.2, 0.42));
  }),
};

await mkdir(OUTPUT_DIR, { recursive: true });
for (const [filename, samples] of Object.entries(effects)) {
  await writeFile(path.join(OUTPUT_DIR, filename), writeWav(samples));
}
process.stdout.write(`Generated ${Object.keys(effects).length} effects in ${OUTPUT_DIR}\n`);
