import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";

const SAMPLE_RATE = 44_100;
const OUTPUT_DIR = path.join(process.cwd(), "public", "audio", "theme-samples");
const TAU = Math.PI * 2;

const NOTE_INDEX = {
  C: 0,
  "C#": 1,
  Db: 1,
  D: 2,
  "D#": 3,
  Eb: 3,
  E: 4,
  F: 5,
  "F#": 6,
  Gb: 6,
  G: 7,
  "G#": 8,
  Ab: 8,
  A: 9,
  "A#": 10,
  Bb: 10,
  B: 11,
};

function frequency(note) {
  const match = /^([A-G](?:#|b)?)(-?\d)$/.exec(note);
  if (!match) throw new Error(`Invalid note: ${note}`);
  const midi = (Number(match[2]) + 1) * 12 + NOTE_INDEX[match[1]];
  return 440 * 2 ** ((midi - 69) / 12);
}

function seededNoise(seed) {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1_664_525) + 1_013_904_223) >>> 0;
    return (state / 0xffffffff) * 2 - 1;
  };
}

function createTrack(seconds) {
  return {
    left: new Float32Array(Math.ceil(seconds * SAMPLE_RATE)),
    right: new Float32Array(Math.ceil(seconds * SAMPLE_RATE)),
  };
}

const INSTRUMENTS = {
  nylon: {
    partials: [[1, 1], [2, 0.26], [3, 0.13], [4, 0.06]],
    attack: 0.006,
    decay: 2.7,
    brightnessDecay: 2.4,
    noise: 0.025,
  },
  marimba: {
    partials: [[1, 1], [4, 0.2], [9.2, 0.07]],
    attack: 0.003,
    decay: 4.8,
    brightnessDecay: 4.2,
    noise: 0.018,
  },
  clarinet: {
    partials: [[1, 1], [3, 0.28], [5, 0.1], [7, 0.035]],
    attack: 0.045,
    decay: 0.32,
    sustain: 0.72,
    release: 0.16,
    vibrato: 0.0026,
  },
  whistle: {
    partials: [[1, 1], [2, 0.075], [3, 0.025]],
    attack: 0.08,
    decay: 0.25,
    sustain: 0.82,
    release: 0.22,
    vibrato: 0.004,
    breath: 0.012,
  },
  rhodes: {
    partials: [[1, 1], [2, 0.22], [3.01, 0.09], [6.02, 0.028]],
    attack: 0.012,
    decay: 1.25,
    sustain: 0.42,
    release: 0.55,
    tremolo: 0.09,
  },
  pizz: {
    partials: [[1, 1], [2, 0.35], [3, 0.19], [4, 0.09], [5, 0.04]],
    attack: 0.004,
    decay: 3.8,
    brightnessDecay: 3,
    noise: 0.02,
  },
  bass: {
    partials: [[1, 1], [2, 0.16], [3, 0.08]],
    attack: 0.012,
    decay: 1.5,
    sustain: 0.48,
    release: 0.16,
  },
  bell: {
    partials: [[1, 1], [2.01, 0.26], [3.98, 0.11], [6.1, 0.035]],
    attack: 0.003,
    decay: 3.1,
    brightnessDecay: 3.8,
  },
};

function envelopeAt(time, duration, preset) {
  const attack = preset.attack ?? 0.01;
  const release = Math.min(preset.release ?? duration * 0.35, duration * 0.48);
  if (time < attack) return time / attack;
  if (time > duration - release) return Math.max(0, (duration - time) / release);
  if (preset.sustain !== undefined) {
    const decay = preset.decay ?? 0.4;
    const settled = Math.min(1, (time - attack) / decay);
    return 1 + (preset.sustain - 1) * settled;
  }
  return Math.exp(-(preset.decay ?? 2.5) * (time - attack));
}

function addNote(track, note, start, duration, amplitude, instrument, pan = 0, seed = 1) {
  const preset = INSTRUMENTS[instrument];
  const baseFrequency = frequency(note);
  const first = Math.max(0, Math.floor(start * SAMPLE_RATE));
  const tail = preset.sustain === undefined ? Math.min(1.2, duration * 0.7) : 0;
  const totalDuration = duration + tail;
  const last = Math.min(track.left.length, Math.ceil((start + totalDuration) * SAMPLE_RATE));
  const random = seededNoise(seed + Math.round(baseFrequency * 10));
  const leftGain = Math.cos(((pan + 1) * Math.PI) / 4);
  const rightGain = Math.sin(((pan + 1) * Math.PI) / 4);
  const phaseOffsets = preset.partials.map(() => random() * TAU);

  for (let index = first; index < last; index += 1) {
    const time = index / SAMPLE_RATE - start;
    const envelopeDuration = totalDuration;
    let envelope = envelopeAt(time, envelopeDuration, preset);
    if (time > duration && preset.sustain === undefined) envelope *= Math.max(0, 1 - (time - duration) / tail);
    const vibrato = preset.vibrato
      ? 1 + Math.sin(TAU * 5.15 * time) * preset.vibrato * Math.min(1, time / 0.35)
      : 1;
    const tremolo = preset.tremolo ? 1 - preset.tremolo + Math.sin(TAU * 4.1 * time) * preset.tremolo : 1;
    let sample = 0;
    for (let partialIndex = 0; partialIndex < preset.partials.length; partialIndex += 1) {
      const [ratio, level] = preset.partials[partialIndex];
      const brightness = partialIndex === 0
        ? 1
        : Math.exp(-(preset.brightnessDecay ?? 0) * time);
      sample += Math.sin(TAU * baseFrequency * ratio * vibrato * time + phaseOffsets[partialIndex]) * level * brightness;
    }
    if (preset.noise && time < 0.045) sample += random() * preset.noise * (1 - time / 0.045);
    if (preset.breath) sample += random() * preset.breath * Math.min(1, time / 0.12);
    sample *= amplitude * envelope * tremolo;
    track.left[index] += sample * leftGain;
    track.right[index] += sample * rightGain;
  }
}

function addShaker(track, start, amplitude, seed) {
  const random = seededNoise(seed);
  const first = Math.floor(start * SAMPLE_RATE);
  const duration = 0.085;
  const last = Math.min(track.left.length, Math.ceil((start + duration) * SAMPLE_RATE));
  let previous = 0;
  for (let index = first; index < last; index += 1) {
    const time = index / SAMPLE_RATE - start;
    const white = random();
    const high = white - previous * 0.78;
    previous = white;
    const env = Math.exp(-35 * time) * Math.min(1, time / 0.003);
    const value = high * amplitude * env;
    track.left[index] += value * 0.46;
    track.right[index] += value * 0.7;
  }
}

function addWoodblock(track, start, pitch = 920, amplitude = 0.1) {
  const first = Math.floor(start * SAMPLE_RATE);
  const last = Math.min(track.left.length, Math.ceil((start + 0.095) * SAMPLE_RATE));
  for (let index = first; index < last; index += 1) {
    const time = index / SAMPLE_RATE - start;
    const value = (Math.sin(TAU * pitch * time) + Math.sin(TAU * pitch * 1.61 * time) * 0.3)
      * Math.exp(-42 * time) * amplitude;
    track.left[index] += value * 0.68;
    track.right[index] += value * 0.68;
  }
}

function addBrush(track, start, amplitude, seed) {
  const random = seededNoise(seed);
  const first = Math.floor(start * SAMPLE_RATE);
  const duration = 0.24;
  const last = Math.min(track.left.length, Math.ceil((start + duration) * SAMPLE_RATE));
  let smooth = 0;
  for (let index = first; index < last; index += 1) {
    const time = index / SAMPLE_RATE - start;
    smooth = smooth * 0.28 + random() * 0.72;
    const env = Math.sin(Math.PI * time / duration) * Math.exp(-3 * time);
    const value = smooth * env * amplitude;
    track.left[index] += value * 0.66;
    track.right[index] += value * 0.58;
  }
}

function addKick(track, start, amplitude = 0.14) {
  const first = Math.floor(start * SAMPLE_RATE);
  const duration = 0.16;
  const last = Math.min(track.left.length, Math.ceil((start + duration) * SAMPLE_RATE));
  let phase = 0;
  for (let index = first; index < last; index += 1) {
    const time = index / SAMPLE_RATE - start;
    const hz = 92 - 44 * (time / duration);
    phase += TAU * hz / SAMPLE_RATE;
    const value = Math.sin(phase) * Math.exp(-24 * time) * amplitude;
    track.left[index] += value * 0.71;
    track.right[index] += value * 0.71;
  }
}

function addChord(track, notes, start, duration, amplitude, instrument, pan = 0, seed = 1) {
  notes.forEach((note, index) => addNote(
    track,
    note,
    start + index * 0.012,
    duration,
    amplitude / Math.sqrt(notes.length),
    instrument,
    pan + (index - (notes.length - 1) / 2) * 0.08,
    seed + index * 31,
  ));
}

function applyRoom(track, wet = 0.16) {
  const taps = [
    [0.073, 0.24, -1],
    [0.109, 0.19, 1],
    [0.163, 0.14, -1],
    [0.241, 0.1, 1],
    [0.367, 0.065, -1],
  ];
  const sourceLeft = track.left.slice();
  const sourceRight = track.right.slice();
  for (const [delay, gain, cross] of taps) {
    const offset = Math.round(delay * SAMPLE_RATE);
    for (let index = offset; index < track.left.length; index += 1) {
      track.left[index] += (cross < 0 ? sourceRight[index - offset] : sourceLeft[index - offset]) * gain * wet;
      track.right[index] += (cross < 0 ? sourceLeft[index - offset] : sourceRight[index - offset]) * gain * wet;
    }
  }
}

function finishTrack(track, fadeIn = 0.45, fadeOut = 1.35) {
  let peak = 0;
  for (let index = 0; index < track.left.length; index += 1) {
    const time = index / SAMPLE_RATE;
    const remaining = (track.left.length - index) / SAMPLE_RATE;
    const fade = Math.min(1, time / fadeIn, remaining / fadeOut);
    track.left[index] = Math.tanh(track.left[index] * 0.86) * fade;
    track.right[index] = Math.tanh(track.right[index] * 0.86) * fade;
    peak = Math.max(peak, Math.abs(track.left[index]), Math.abs(track.right[index]));
  }
  const gain = peak > 0 ? 0.91 / peak : 1;
  for (let index = 0; index < track.left.length; index += 1) {
    track.left[index] *= gain;
    track.right[index] *= gain;
  }
}

function writeStereoWav(track) {
  const channels = 2;
  const bytesPerSample = 2;
  const dataLength = track.left.length * channels * bytesPerSample;
  const wav = Buffer.alloc(44 + dataLength);
  wav.write("RIFF", 0);
  wav.writeUInt32LE(36 + dataLength, 4);
  wav.write("WAVE", 8);
  wav.write("fmt ", 12);
  wav.writeUInt32LE(16, 16);
  wav.writeUInt16LE(1, 20);
  wav.writeUInt16LE(channels, 22);
  wav.writeUInt32LE(SAMPLE_RATE, 24);
  wav.writeUInt32LE(SAMPLE_RATE * channels * bytesPerSample, 28);
  wav.writeUInt16LE(channels * bytesPerSample, 32);
  wav.writeUInt16LE(16, 34);
  wav.write("data", 36);
  wav.writeUInt32LE(dataLength, 40);
  for (let index = 0; index < track.left.length; index += 1) {
    wav.writeInt16LE(Math.round(Math.max(-1, Math.min(1, track.left[index])) * 32_767), 44 + index * 4);
    wav.writeInt16LE(Math.round(Math.max(-1, Math.min(1, track.right[index])) * 32_767), 46 + index * 4);
  }
  return wav;
}

function addMelody(track, events, beat, instrument, amplitude, pan = 0.12, seed = 100) {
  events.forEach(([at, note, beats, accent = 1], index) => {
    addNote(track, note, at * beat, beats * beat * 0.9, amplitude * accent, instrument, pan, seed + index * 17);
  });
}

function composeMelonMorning() {
  const bpm = 96;
  const beat = 60 / bpm;
  const bars = 16;
  const track = createTrack(bars * 4 * beat + 1.2);
  const chords = [
    ["C4", "E4", "G4", "B4"], ["A3", "C4", "E4", "G4"],
    ["D4", "F4", "A4", "C5"], ["G3", "B3", "D4", "F4"],
    ["C4", "E4", "G4", "B4"], ["A3", "C4", "E4", "G4"],
    ["F3", "A3", "C4", "E4"], ["G3", "B3", "D4", "F4"],
    ["F3", "A3", "C4", "E4"], ["E3", "G3", "B3", "D4"],
    ["D3", "F3", "A3", "C4"], ["G3", "B3", "D4", "F4"],
    ["C4", "E4", "G4", "B4"], ["A3", "C#4", "E4", "G4"],
    ["D4", "F4", "A4", "C5"], ["G3", "B3", "D4", "F4"],
  ];
  const roots = ["C3", "A2", "D3", "G2", "C3", "A2", "F2", "G2", "F2", "E2", "D2", "G2", "C3", "A2", "D3", "G2"];

  chords.forEach((chord, bar) => {
    for (let pulse = 0; pulse < 4; pulse += 1) {
      const at = (bar * 4 + pulse) * beat;
      addChord(track, chord, at, beat * 0.72, pulse === 0 ? 0.12 : 0.085, "nylon", -0.23, 200 + bar * 13 + pulse);
      if (pulse === 0 || pulse === 2) addNote(track, roots[bar], at, beat * 1.55, 0.16, "bass", -0.05, 400 + bar * 7 + pulse);
    }
    addShaker(track, (bar * 4 + 1) * beat, 0.038, 900 + bar);
    addShaker(track, (bar * 4 + 3) * beat, 0.045, 950 + bar);
    if (bar > 3) addWoodblock(track, (bar * 4 + 2) * beat, 1_030, 0.028);
  });

  const melody = [
    [0, "E5", 1], [1, "G5", 1], [2, "A5", 1.5], [3.5, "G5", 0.5],
    [4, "C6", 1], [5, "B5", 0.5], [5.5, "A5", 0.5], [6, "G5", 1], [7, "E5", 1],
    [8, "F5", 1], [9, "A5", 1], [10, "C6", 1], [11, "A5", 1],
    [12, "B5", 1], [13, "A5", 0.5], [13.5, "G5", 0.5], [14, "D6", 1], [15, "B5", 1],
    [16, "E5", 0.5], [16.5, "G5", 0.5], [17, "A5", 1], [18, "G5", 0.5], [18.5, "E5", 0.5], [19, "D5", 1],
    [20, "C5", 1], [21, "E5", 1], [22, "G5", 1.5], [23.5, "A5", 0.5],
    [24, "C6", 1], [25, "A5", 1], [26, "F5", 1], [27, "E5", 1],
    [28, "D5", 0.5], [28.5, "G5", 0.5], [29, "B5", 1], [30, "A5", 0.5], [30.5, "G5", 0.5], [31, "D5", 1],
    [32, "A5", 1], [33, "C6", 1], [34, "E6", 1], [35, "C6", 1],
    [36, "B5", 1], [37, "G5", 1], [38, "E5", 1.5], [39.5, "G5", 0.5],
    [40, "F5", 0.5], [40.5, "A5", 0.5], [41, "C6", 1], [42, "D6", 1], [43, "C6", 1],
    [44, "B5", 0.5], [44.5, "A5", 0.5], [45, "G5", 1], [46, "D6", 0.75], [47, "B5", 1.25],
    [48, "G5", 1], [49, "E5", 1], [50, "C5", 1], [51, "E5", 1],
    [52, "C#5", 0.5], [52.5, "E5", 0.5], [53, "G5", 1], [54, "A5", 1], [55, "E5", 1],
    [56, "F5", 1], [57, "A5", 1], [58, "C6", 1], [59, "D6", 1],
    [60, "B5", 0.5], [60.5, "A5", 0.5], [61, "G5", 1], [62, "E5", 0.5], [62.5, "D5", 0.5], [63, "C5", 1],
  ];
  addMelody(track, melody, beat, "marimba", 0.22, 0.2, 1_200);
  applyRoom(track, 0.18);
  finishTrack(track);
  return { track, bpm, title: "Melon Morning" };
}

function composeGardenBounce() {
  const bpm = 112;
  const beat = 60 / bpm;
  const bars = 16;
  const track = createTrack(bars * 4 * beat + 1.1);
  const chords = [
    ["F4", "A4", "C5", "D5"], ["Bb3", "D4", "F4", "G4"],
    ["G3", "Bb3", "D4", "F4"], ["C4", "E4", "G4", "Bb4"],
    ["F4", "A4", "C5", "D5"], ["D4", "F4", "A4", "C5"],
    ["G3", "Bb3", "D4", "F4"], ["C4", "E4", "G4", "Bb4"],
    ["Bb3", "D4", "F4", "A4"], ["A3", "C4", "E4", "G4"],
    ["G3", "Bb3", "D4", "F4"], ["C4", "E4", "G4", "Bb4"],
    ["F4", "A4", "C5", "D5"], ["D4", "F#4", "A4", "C5"],
    ["G3", "Bb3", "D4", "F4"], ["C4", "E4", "G4", "Bb4"],
  ];
  const walkingBass = [
    ["F2", "A2", "C3", "E3"], ["Bb2", "D3", "F3", "A2"],
    ["G2", "Bb2", "D3", "B2"], ["C3", "E3", "G3", "E3"],
    ["F2", "A2", "C3", "E3"], ["D2", "F2", "A2", "C3"],
    ["G2", "Bb2", "D3", "B2"], ["C3", "E3", "G3", "Bb2"],
    ["Bb2", "D3", "F3", "A3"], ["A2", "C3", "E3", "G3"],
    ["G2", "Bb2", "D3", "B2"], ["C3", "E3", "G3", "E3"],
    ["F2", "A2", "C3", "E3"], ["D2", "F#2", "A2", "C3"],
    ["G2", "Bb2", "D3", "B2"], ["C3", "G2", "C3", "E3"],
  ];

  chords.forEach((chord, bar) => {
    for (let pulse = 0; pulse < 4; pulse += 1) {
      const swing = pulse % 2 === 1 ? beat * 0.08 : 0;
      const at = (bar * 4 + pulse) * beat + swing;
      addChord(track, chord, at, beat * 0.43, pulse === 1 || pulse === 3 ? 0.105 : 0.075, "pizz", pulse % 2 ? 0.22 : -0.16, 2_000 + bar * 11 + pulse);
      addNote(track, walkingBass[bar][pulse], (bar * 4 + pulse) * beat, beat * 0.72, 0.16, "bass", -0.15, 2_400 + bar * 9 + pulse);
      addShaker(track, (bar * 4 + pulse + 0.5) * beat, 0.032, 2_700 + bar * 4 + pulse);
    }
    addKick(track, bar * 4 * beat, 0.11);
    addWoodblock(track, (bar * 4 + 1) * beat, 840, 0.055);
    addWoodblock(track, (bar * 4 + 3) * beat, 990, 0.06);
  });

  const melody = [
    [0, "A4", 0.5], [0.5, "C5", 0.5], [1, "D5", 1], [2.5, "C5", 0.5], [3, "A4", 1],
    [4, "Bb4", 0.5], [4.5, "D5", 0.5], [5, "F5", 1], [6, "D5", 0.5], [6.5, "C5", 0.5], [7, "Bb4", 1],
    [8, "G4", 0.5], [8.5, "Bb4", 0.5], [9, "D5", 0.5], [9.5, "F5", 0.5], [10, "E5", 1], [11, "D5", 1],
    [12, "E5", 0.5], [12.5, "G5", 0.5], [13, "Bb5", 1], [14, "G5", 0.5], [14.5, "E5", 0.5], [15, "C5", 1],
    [16, "A4", 0.5], [16.5, "C5", 0.5], [17, "F5", 0.75], [18, "E5", 0.5], [18.5, "D5", 0.5], [19, "C5", 1],
    [20, "A4", 0.5], [20.5, "D5", 0.5], [21, "F5", 1], [22, "E5", 0.5], [22.5, "D5", 0.5], [23, "A4", 1],
    [24, "Bb4", 0.5], [24.5, "D5", 0.5], [25, "G5", 1], [26, "F5", 0.5], [26.5, "D5", 0.5], [27, "Bb4", 1],
    [28, "C5", 0.5], [28.5, "E5", 0.5], [29, "G5", 0.75], [30, "Bb5", 0.5], [30.5, "G5", 0.5], [31, "E5", 1],
    [32, "D5", 0.5], [32.5, "F5", 0.5], [33, "A5", 1], [34, "F5", 0.5], [34.5, "D5", 0.5], [35, "C5", 1],
    [36, "C5", 0.5], [36.5, "E5", 0.5], [37, "G5", 0.75], [38, "E5", 0.5], [38.5, "C5", 0.5], [39, "A4", 1],
    [40, "Bb4", 0.5], [40.5, "D5", 0.5], [41, "F5", 0.75], [42, "G5", 0.5], [42.5, "F5", 0.5], [43, "D5", 1],
    [44, "E5", 0.5], [44.5, "G5", 0.5], [45, "C6", 1], [46, "Bb5", 0.5], [46.5, "G5", 0.5], [47, "E5", 1],
    [48, "A4", 0.5], [48.5, "C5", 0.5], [49, "F5", 1], [50, "E5", 0.5], [50.5, "C5", 0.5], [51, "A4", 1],
    [52, "A4", 0.5], [52.5, "D5", 0.5], [53, "F#5", 1], [54, "A5", 0.5], [54.5, "F#5", 0.5], [55, "D5", 1],
    [56, "Bb4", 0.5], [56.5, "D5", 0.5], [57, "G5", 1], [58, "F5", 0.5], [58.5, "D5", 0.5], [59, "B4", 1],
    [60, "C5", 0.5], [60.5, "E5", 0.5], [61, "G5", 0.75], [62, "E5", 0.5], [62.5, "C5", 0.5], [63, "F5", 1],
  ];
  addMelody(track, melody, beat, "clarinet", 0.19, 0.12, 3_000);
  applyRoom(track, 0.13);
  finishTrack(track, 0.32, 1.2);
  return { track, bpm, title: "Garden Bounce" };
}

function composeFireflySupper() {
  const bpm = 88;
  const beat = 60 / bpm;
  const bars = 16;
  const track = createTrack(bars * 4 * beat + 1.5);
  const chords = [
    ["D4", "F#4", "A4", "C#5", "E5"], ["B3", "D4", "F#4", "A4"],
    ["G3", "B3", "D4", "F#4"], ["A3", "D4", "E4", "A4"],
    ["D4", "F#4", "A4", "C#5"], ["B3", "D4", "F#4", "A4"],
    ["E3", "G3", "B3", "D4"], ["A3", "C#4", "E4", "G4"],
    ["G3", "B3", "D4", "F#4"], ["F#3", "A3", "C#4", "E4"],
    ["E3", "G3", "B3", "D4"], ["A3", "D4", "E4", "A4"],
    ["D4", "F#4", "A4", "C#5"], ["B3", "D4", "F#4", "A4"],
    ["G3", "B3", "D4", "F#4"], ["A3", "C#4", "E4", "G4"],
  ];
  const roots = ["D2", "B1", "G2", "A2", "D2", "B1", "E2", "A2", "G2", "F#2", "E2", "A2", "D2", "B1", "G2", "A2"];

  chords.forEach((chord, bar) => {
    addChord(track, chord, bar * 4 * beat, beat * 3.65, 0.15, "rhodes", bar % 2 ? 0.12 : -0.12, 4_000 + bar * 19);
    addNote(track, roots[bar], bar * 4 * beat, beat * 1.75, 0.15, "bass", -0.12, 4_500 + bar);
    addNote(track, roots[bar], (bar * 4 + 2) * beat, beat * 1.5, 0.11, "bass", -0.08, 4_550 + bar);
    addBrush(track, (bar * 4 + 1) * beat, 0.035, 4_700 + bar);
    addBrush(track, (bar * 4 + 3) * beat, 0.045, 4_800 + bar);
    if (bar % 2 === 1) addNote(track, chord.at(-1), (bar * 4 + 3.5) * beat, beat * 0.42, 0.055, "bell", 0.34, 4_900 + bar);
  });

  const melody = [
    [0, "F#5", 1.5], [2, "A5", 1], [3, "E5", 1],
    [4, "D5", 1], [5, "F#5", 1.5], [7, "A5", 1],
    [8, "B5", 1.5], [10, "A5", 1], [11, "F#5", 1],
    [12, "E5", 1], [13, "D5", 1], [14, "A4", 2],
    [16, "F#5", 0.75], [17, "A5", 0.75], [18, "C#6", 1], [19, "B5", 1],
    [20, "A5", 1.5], [22, "F#5", 1], [23, "D5", 1],
    [24, "E5", 1], [25, "G5", 1.5], [27, "B5", 1],
    [28, "C#6", 1.5], [30, "B5", 0.75], [31, "A5", 1],
    [32, "D6", 1.5], [34, "B5", 1], [35, "A5", 1],
    [36, "C#6", 1], [37, "A5", 1.5], [39, "F#5", 1],
    [40, "G5", 1], [41, "B5", 1.5], [43, "A5", 1],
    [44, "E5", 1], [45, "D5", 1], [46, "A4", 2],
    [48, "F#5", 1], [49, "A5", 1], [50, "D6", 1.5], [52, "C#6", 1],
    [53, "B5", 1], [54, "A5", 1.5], [56, "B5", 1],
    [57, "A5", 1], [58, "F#5", 1], [59, "D5", 1],
    [60, "E5", 1], [61, "F#5", 1], [62, "A5", 2],
  ];
  addMelody(track, melody, beat, "whistle", 0.155, 0.16, 5_000);
  const sparkles = [[7.5, "D6"], [15.5, "E6"], [23.5, "B5"], [31.5, "E6"], [39.5, "F#6"], [47.5, "E6"], [55.5, "D6"], [63, "A5"]];
  sparkles.forEach(([at, note], index) => addNote(track, note, at * beat, beat * 0.7, 0.07, "bell", 0.38, 5_600 + index));
  applyRoom(track, 0.28);
  finishTrack(track, 0.7, 1.6);
  return { track, bpm, title: "Firefly Supper" };
}

const themes = [
  ["01-melon-morning", composeMelonMorning],
  ["02-garden-bounce", composeGardenBounce],
  ["03-firefly-supper", composeFireflySupper],
];

await mkdir(OUTPUT_DIR, { recursive: true });
const manifest = [];
for (const [slug, compose] of themes) {
  const { track, bpm, title } = compose();
  const wavPath = path.join(OUTPUT_DIR, `${slug}.wav`);
  const mp3Path = path.join(OUTPUT_DIR, `${slug}.mp3`);
  await writeFile(wavPath, writeStereoWav(track));
  const result = spawnSync("ffmpeg", [
    "-hide_banner", "-loglevel", "error", "-y", "-i", wavPath,
    "-codec:a", "libmp3lame", "-b:a", "192k", "-ar", String(SAMPLE_RATE), mp3Path,
  ], { encoding: "utf8" });
  if (result.status !== 0) throw new Error(`ffmpeg failed for ${slug}: ${result.stderr}`);
  await unlink(wavPath);
  manifest.push({ title, slug, bpm, durationSeconds: track.left.length / SAMPLE_RATE, file: `${slug}.mp3` });
}
await writeFile(path.join(OUTPUT_DIR, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
process.stdout.write(`Generated ${themes.length} theme samples in ${OUTPUT_DIR}\n`);
