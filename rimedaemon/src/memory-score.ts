import { DISTRICTS, type DistrictId } from "./street-memory";
export type StreetSoundEvent = "leak" | "negotiate" | "commit" | "advance" | "disturb" | "slice" | "giggle" | "shift" | "distort" | "static" | "clack";
export type SoundPulse = { note: string; voice: string; pan: number };
export type SoundMeter = { rms: number; peak: number; state: string; voices: number };
export type StreetSoundscape = {
  start: () => Promise<boolean>;
  stop: () => void;
  emit: (event: StreetSoundEvent) => void;
  setDistrict: (district: DistrictId) => void;
  setWord: (word: string) => void;
  setVolume: (volume: number) => void;
  setDensity: (density: number) => void;
  isRunning: () => boolean;
  measure: () => SoundMeter;
};

export function wordMotif(word: string): number[] {
  let hash = 2166136261;
  for (const glyph of word.normalize("NFC") || "moth") hash = Math.imul(hash ^ glyph.codePointAt(0)!, 16777619) >>> 0;
  return Array.from({ length: 7 }, (_, i) => {
    hash = (Math.imul(hash, 1664525) + 1013904223 + i) >>> 0;
    return hash % 5;
  });
}

const ratio = (n: number) => 2 ** (n / 12);
const between = (a: number, b: number) => a + Math.random() * (b - a);
const noteName = (hz: number) => {
  const midi = Math.round(69 + 12 * Math.log2(hz / 440));
  return ["C", "C♯", "D", "E♭", "E", "F", "F♯", "G", "A♭", "A", "B♭", "B"][((midi % 12) + 12) % 12] + (Math.floor(midi / 12) - 1);
};

export function createStreetSoundscape(onPulse?: (pulse: SoundPulse) => void, onFailure?: (message: string) => void): StreetSoundscape {
  let ctx: AudioContext | null = null;
  let master: GainNode | null = null;
  let dry: GainNode | null = null;
  let wet: GainNode | null = null;
  let noise: AudioBuffer | null = null;
  let analyser: AnalyserNode | null = null;
  let samples: Float32Array<ArrayBuffer> | null = null;
  let district: DistrictId = "underpass";
  let volume = 0.52;
  let density = 0.38;
  let motif = wordMotif("");
  let cursor = 0;
  let clock: number | null = null;
  let nextNote = 0;
  let nextChord = 0;
  let nextRain = 0;
  let active = false;
  let hidden = false;
  let generation = 0;
  let visibilityHandler: (() => void) | null = null;
  const last: Partial<Record<StreetSoundEvent, number>> = {};
  const chords = new Set<GainNode>();
  const pulseTimers = new Set<number>();
  const sources = new Set<AudioScheduledSourceNode>();

  function track(source: AudioScheduledSourceNode, nodes: AudioNode[]) {
    sources.add(source);
    source.onended = () => {
      sources.delete(source);
      for (const node of [source, ...nodes]) { try { node.disconnect(); } catch {} }
    };
  }

  function output(node: AudioNode, send = 0.3) {
    if (!ctx || !dry || !wet) return;
    node.connect(dry);
    const amount = ctx.createGain();
    amount.gain.value = send;
    node.connect(amount); amount.connect(wet);
    return amount;
  }

  function pulse(hz: number, voice: string, pan: number, at: number) {
    if (!ctx) return;
    const token = generation;
    const timer = window.setTimeout(() => {
      pulseTimers.delete(timer);
      if (active && !hidden && token === generation) onPulse?.({ note: noteName(hz), voice, pan });
    }, Math.max(0, (at - ctx.currentTime) * 1000));
    pulseTimers.add(timer);
  }

  function key(hz: number, at: number, strength = 1, pan = between(-0.65, 0.65), voice = "a word in the wires") {
    if (!ctx || !dry || !active) return;
    const c = ctx;
    const shape = district;
    const decay = shape === "chapel" ? 4.6 : shape === "exchange" ? 1.7 : 3.1;
    const envelope = c.createGain();
    const panner = c.createStereoPanner();
    panner.pan.value = pan;
    envelope.connect(panner);
    const send = output(panner, shape === "chapel" ? 0.65 : 0.32);
    const level = 0.095 * strength;
    envelope.gain.setValueAtTime(0, at);
    envelope.gain.linearRampToValueAtTime(level, at + 0.018);
    envelope.gain.exponentialRampToValueAtTime(0.0001, at + decay);
    const partials = shape === "exchange" ? [1, 2.002, 3.98] : shape === "chapel" ? [1, 2, 3.001] : [1, 2.001, 3];
    partials.forEach((partial, index) => {
      const osc = c.createOscillator();
      const gain = c.createGain();
      osc.type = "sine";
      osc.frequency.value = hz * partial;
      gain.gain.value = index === 0 ? 0.85 : index === 1 ? 0.18 : 0.045;
      osc.connect(gain); gain.connect(envelope);
      osc.start(at); osc.stop(at + decay + 0.05);
      track(osc, [gain]);
    });
    const cleanup = window.setTimeout(() => {
      pulseTimers.delete(cleanup);
      for (const node of [envelope, panner, send]) { try { node?.disconnect(); } catch {} }
    }, Math.max(0, (at + decay + 0.2 - c.currentTime) * 1000));
    pulseTimers.add(cleanup);
    pulse(hz, voice, pan, at);
  }

  function chord(at: number) {
    if (!ctx || !active) return;
    const c = ctx;
    const d = DISTRICTS[district];
    const envelope = c.createGain();
    chords.add(envelope);
    const filter = c.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = district === "exchange" ? 650 : 420;
    filter.Q.value = 0.45;
    envelope.connect(filter);
    const send = output(filter, 0.55);
    const duration = between(24, 34);
    envelope.gain.setValueAtTime(0, at);
    envelope.gain.linearRampToValueAtTime(0.13, at + 7);
    envelope.gain.linearRampToValueAtTime(0.09, at + duration - 9);
    envelope.gain.linearRampToValueAtTime(0, at + duration);
    d.chord.forEach((degree, index) => {
      const osc = c.createOscillator();
      const panner = c.createStereoPanner();
      const gain = c.createGain();
      osc.type = index === 0 ? "sine" : "triangle";
      osc.frequency.value = d.root * ratio(degree);
      osc.detune.value = index % 2 ? -3 : 3;
      panner.pan.value = (index - 1.5) / 2.5;
      gain.gain.value = index === 0 ? 0.75 : 0.22;
      osc.connect(gain); gain.connect(panner); panner.connect(envelope);
      osc.start(at); osc.stop(at + duration + 0.1);
      track(osc, [gain, panner]);
    });
    const timer = window.setTimeout(() => {
      pulseTimers.delete(timer); chords.delete(envelope);
      for (const node of [envelope, filter, send]) { try { node?.disconnect(); } catch {} }
    }, Math.max(0, (at + duration + 0.3 - c.currentTime) * 1000));
    pulseTimers.add(timer);
  }

  function breath(at: number, strength = 1, short = false) {
    if (!ctx || !noise || !active) return;
    const c = ctx;
    const src = c.createBufferSource(); src.buffer = noise; src.loop = true;
    const band = c.createBiquadFilter(); band.type = "bandpass";
    band.frequency.value = district === "exchange" ? 1450 : 700;
    band.Q.value = 0.6;
    const envelope = c.createGain();
    const pan = c.createStereoPanner();
    pan.pan.setValueAtTime(-0.65, at); pan.pan.linearRampToValueAtTime(0.65, at + 4);
    src.connect(band); band.connect(envelope); envelope.connect(pan);
    const send = output(pan, 0.22);
    const duration = short ? 0.23 : between(3, 6);
    envelope.gain.setValueAtTime(0, at);
    envelope.gain.linearRampToValueAtTime((short ? 0.045 : 0.06) * strength, at + duration * 0.35);
    envelope.gain.exponentialRampToValueAtTime(0.0001, at + duration);
    src.start(at); src.stop(at + duration + 0.05);
    track(src, [band, envelope, pan, ...(send ? [send] : [])]);
  }

  function tick() {
    if (!ctx || ctx.state !== "running" || hidden || !active) return;
    const now = ctx.currentTime;
    const d = DISTRICTS[district];
    if (now >= nextChord) { chord(now + 0.02); nextChord = now + 22; }
    if (now >= nextRain) { breath(now + 0.02); nextRain = now + between(7, 15); }
    if (now >= nextNote) {
      const degree = d.degrees[motif[cursor % motif.length]];
      const octave = cursor % 7 === 6 ? 3 : 2;
      if (Math.random() < 0.52 + density * 0.42) {
        key(d.root * ratio(degree + octave * 12), now + 0.06, between(0.48, 0.85));
        if (district === "exchange" && cursor % 4 === 2) breath(now + 0.12, 0.3, true);
      }
      cursor += 1;
      const length = [1, 1.5, 1, 2, 0.75, 1.25, 3][cursor % 7];
      nextNote = now + d.interval * length * (2.7 - density * 1.7);
    }
  }

  async function start() {
    if (ctx) return active;
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) { onFailure?.("This browser cannot open the audio channel."); return false; }
    const token = ++generation;
    let c: AudioContext | null = null;
    try {
      c = new AC(); ctx = c;
      master = c.createGain(); master.gain.value = 0;
      dry = c.createGain(); dry.gain.value = 0.8;
      wet = c.createGain(); wet.gain.value = 0.46;
      const highpass = c.createBiquadFilter(); highpass.type = "highpass"; highpass.frequency.value = 28;
      const limiter = c.createDynamicsCompressor();
      limiter.threshold.value = -12; limiter.knee.value = 12; limiter.ratio.value = 8;
      limiter.attack.value = 0.008; limiter.release.value = 0.35;
      const room = c.createConvolver();
      const impulse = c.createBuffer(2, c.sampleRate * 3.2, c.sampleRate);
      for (let channel = 0; channel < 2; channel++) {
        const data = impulse.getChannelData(channel);
        for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length) ** 3 * 0.55;
      }
      room.buffer = impulse;
      const delay = c.createDelay(2); delay.delayTime.value = 0.73;
      const feedback = c.createGain(); feedback.gain.value = 0.27;
      const echoFilter = c.createBiquadFilter(); echoFilter.type = "lowpass"; echoFilter.frequency.value = 1900;
      wet.connect(room); room.connect(master);
      wet.connect(delay); delay.connect(echoFilter); echoFilter.connect(feedback); feedback.connect(delay);
      echoFilter.connect(master);
      analyser = c.createAnalyser(); analyser.fftSize = 2048;
      samples = new Float32Array(analyser.fftSize);
      dry.connect(master); master.connect(highpass); highpass.connect(limiter); limiter.connect(analyser); analyser.connect(c.destination);
      noise = c.createBuffer(1, c.sampleRate * 2, c.sampleRate);
      const data = noise.getChannelData(0);
      let previous = 0;
      for (let i = 0; i < data.length; i++) { previous = (previous + Math.random() * 0.04 - 0.02) / 1.02; data[i] = previous * 3.5; }
      if (c.state === "suspended") await c.resume();
      if (token !== generation) { void c.close(); return false; }
      if (c.state !== "running") throw new Error("Audio is waiting for a browser gesture. Try opening the channel again.");
      active = true; hidden = document.hidden;
      master.gain.setTargetAtTime(volume * 0.7, c.currentTime, 1.4);
      nextNote = c.currentTime + 0.2; nextChord = c.currentTime; nextRain = c.currentTime + 4;
      clock = window.setInterval(tick, 160); tick();
      visibilityHandler = () => {
        if (!ctx || !active) return;
        hidden = document.hidden;
        if (hidden) { void ctx.suspend(); }
        else void ctx.resume().catch(() => onFailure?.("Audio paused. Close and reopen the channel to resume."));
      };
      document.addEventListener("visibilitychange", visibilityHandler);
      return true;
    } catch (error) {
      stop();
      onFailure?.(error instanceof Error ? error.message : "The audio channel could not open.");
      return false;
    }
  }

  function stop() {
    active = false; generation += 1;
    if (clock !== null) window.clearInterval(clock); clock = null;
    pulseTimers.forEach(timer => window.clearTimeout(timer)); pulseTimers.clear();
    if (visibilityHandler) document.removeEventListener("visibilitychange", visibilityHandler); visibilityHandler = null;
    const closing = ctx; const fading = master;
    ctx = null; master = null; dry = null; wet = null; noise = null; analyser = null; samples = null;
    chords.clear();
    if (!closing) return;
    try { fading?.gain.setTargetAtTime(0, closing.currentTime, 0.08); } catch {}
    const closingSources = [...sources]; sources.clear();
    window.setTimeout(() => {
      closingSources.forEach(source => { try { source.stop(); } catch {} });
      void closing.close().catch(() => {});
    }, 350);
  }

  function setDistrict(value: DistrictId) {
    if (value === district) return;
    district = value; cursor = 0;
    if (!ctx || !active) return;
    const now = ctx.currentTime;
    chords.forEach(envelope => {
      envelope.gain.cancelAndHoldAtTime(now); envelope.gain.linearRampToValueAtTime(0, now + 3);
    });
    nextChord = now + 0.1; nextNote = now + 1.5;
  }

  function emit(event: StreetSoundEvent) {
    if (!ctx || !active || ctx.state !== "running" || hidden) return;
    const now = ctx.currentTime;
    if (now - (last[event] ?? -100) < 0.3) return;
    last[event] = now;
    const d = DISTRICTS[district];
    if (["leak", "distort", "static", "clack", "slice"].includes(event)) {
      breath(now + 0.01, event === "slice" ? 0.7 : 0.36, true);
    } else {
      const index = event === "commit" ? motif[cursor % 7] : event === "shift" ? 3 : 0;
      const hz = d.root * ratio(d.degrees[index] + (event === "advance" ? 12 : 24));
      key(hz, now + 0.01, event === "advance" ? 0.8 : 0.42, between(-0.5, 0.5), event === "commit" ? "a line, kept" : "MOTH answers");
      if (event === "giggle" || event === "shift") key(hz * ratio(7), now + 0.28, 0.35, 0.35, "a second thought");
    }
  }

  return {
    start, stop, emit, setDistrict,
    setWord: word => { motif = wordMotif(word); cursor = 0; },
    setVolume: value => {
      volume = Number.isFinite(value) ? Math.min(0.85, Math.max(0, value)) : 0.52;
      if (ctx && master) master.gain.setTargetAtTime(volume * 0.7, ctx.currentTime, 0.2);
    },
    setDensity: value => { density = Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 0.38; },
    isRunning: () => active && ctx?.state === "running",
    measure: () => {
      if (!ctx || !analyser || !samples) return { rms: 0, peak: 0, state: "closed", voices: 0 };
      analyser.getFloatTimeDomainData(samples);
      let square = 0; let peak = 0;
      for (const sample of samples) { square += sample * sample; peak = Math.max(peak, Math.abs(sample)); }
      return { rms: Math.sqrt(square / samples.length), peak, state: ctx.state, voices: sources.size };
    },
  };
}
