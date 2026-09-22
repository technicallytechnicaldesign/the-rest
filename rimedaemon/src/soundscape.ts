/* Street soundscape — a reactive Web Audio ambience for STREET mode only.
 *
 * Ported from the JORD/GENLYD ambient engine (see GENLYD
 * 01_RESEARCH/jord-soundscape-module-plan.md for the original shape) and
 * re-voiced for this app: where JORD is warm pentatonic drone plus singing
 * bowls, this is a sub-heavy phrygian drone under machine-room noise, and
 * every one-shot is fired by something happening on screen rather than by a
 * generative timer alone.
 *
 * Same bones as the original: drone voices -> lowpass -> master -> swell ->
 * out, an evolve tick that wanders the drone, self-re-arming schedulers for
 * the generative layers, and one-shots routed straight to master so their
 * transients keep their bite.
 *
 * No dependencies, no React. The host calls start/stop and emit().
 */

export type StreetSoundEvent =
  | "leak"       /* lower language surfacing: binary / symbol corruption */
  | "negotiate"  /* a token being swapped mid-line */
  | "commit"     /* a line compiled and retained */
  | "advance"    /* the verse turning over */
  | "disturb"    /* the reader hitting the surface */
  | "slice"      /* a figure cut in half */
  | "giggle"     /* a figure laughing it off */
  | "shift"      /* a figure changing colour */
  | "distort"    /* the verse panel struck directly */
  | "static"     /* dead air off the street */
  | "clack";     /* someone typing nearby */

export type StreetSoundscape = {
  start: () => void;
  stop: () => void;
  emit: (event: StreetSoundEvent) => void;
  isRunning: () => boolean;
};

/* phrygian degrees — the flat second is what keeps it uneasy rather than pretty */
const SCALE = [0, 1, 3, 5, 7, 8, 10];
const ROOT = 55; /* A1 */

/* per-event cooldowns (ms). The street fires events in bursts; without these a
   three-line revolve stacks five voices on the same millisecond and just clips. */
const COOLDOWN: Record<StreetSoundEvent, number> = {
  leak: 120,
  negotiate: 110,
  commit: 90,
  advance: 900,
  disturb: 160,
  slice: 180,
  giggle: 260,
  shift: 160,
  distort: 240,
  static: 200,
  clack: 300,
};

function rand(min: number, max: number) {
  return min + Math.random() * (max - min);
}

function pick<T>(list: readonly T[]): T {
  return list[Math.floor(Math.random() * list.length)];
}

function semitone(n: number) {
  return Math.pow(2, n / 12);
}

function scaleFreq(octave: number) {
  return ROOT * semitone(pick(SCALE)) * Math.pow(2, octave);
}

function hush(...nodes: AudioNode[]) {
  nodes.forEach((node) => { try { node.disconnect(); } catch { /* already gone */ } });
}

export function createStreetSoundscape(): StreetSoundscape {
  let ctx: AudioContext | null = null;
  let master: GainNode | null = null;      /* one-shots land here */
  let swell: GainNode | null = null;       /* slow macro breathing, downstream of master */
  let droneFilter: BiquadFilterNode | null = null;
  let droneVoices: { osc: OscillatorNode; gain: GainNode; mult: number }[] = [];
  let noiseBuf: AudioBuffer | null = null;
  let evolveTimer: number | null = null;
  let gritTimer: number | null = null;
  let transmitTimer: number | null = null;
  let swellTimer: number | null = null;
  let swellUp = false;
  let running = false;
  const lastFired: Partial<Record<StreetSoundEvent, number>> = {};

  function clearTimer(id: number | null) {
    if (id !== null) window.clearTimeout(id);
  }

  /* one guard for every sound-making function: hands back non-null locals so
     nothing downstream has to re-check a closure variable that could be torn
     down between scheduling and firing. */
  function bus(): { c: AudioContext; out: GainNode } | null {
    if (!running || !ctx || ctx.state !== "running" || !master) return null;
    return { c: ctx, out: master };
  }

  function start() {
    if (ctx) return;
    const AC = window.AudioContext
      ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;

    try {
      const c = new AC();
      ctx = c;
      running = true;

      /* a compressor on the way out is the whole safety net here: the street can
         fire a leak, a negotiate and a commit inside 200ms and the sum would
         otherwise clip hard. */
      const limiter = c.createDynamicsCompressor();
      limiter.threshold.value = -14;
      limiter.knee.value = 8;
      limiter.ratio.value = 12;
      limiter.attack.value = 0.003;
      limiter.release.value = 0.18;

      swell = c.createGain();
      swell.gain.value = 1;
      master = c.createGain();
      master.gain.value = 0;

      master.connect(swell);
      swell.connect(limiter);
      limiter.connect(c.destination);

      /* drone: a sub sine under three detuned saws, all dragged through a
         resonant lowpass. The 3.01 partial is deliberately off the harmonic
         series so the top of the drone beats against itself. */
      const filter = c.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.value = 320;
      filter.Q.value = 6;
      filter.connect(master);
      droneFilter = filter;

      droneVoices = [0.5, 1, 1.5, 3.01].map((mult) => {
        const osc = c.createOscillator();
        osc.type = mult === 0.5 ? "sine" : "sawtooth";
        osc.frequency.value = ROOT * mult;
        osc.detune.value = rand(-9, 9);
        const gain = c.createGain();
        gain.gain.value = 0;
        osc.connect(gain);
        gain.connect(filter);
        osc.start();
        return { osc, gain, mult };
      });

      /* one shared half-second noise buffer, reused by every noise-based hit */
      const buf = c.createBuffer(1, Math.floor(c.sampleRate * 0.5), c.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < data.length; i += 1) data[i] = Math.random() * 2 - 1;
      noiseBuf = buf;

      evolve();
      evolveTimer = window.setInterval(evolve, 3200);
      scheduleGrit();
      scheduleTransmission();
      scheduleSwell();

      if (c.state === "suspended") void c.resume();
    } catch {
      ctx = null;
      running = false;
    }
  }

  function stop() {
    running = false;
    if (evolveTimer !== null) window.clearInterval(evolveTimer);
    evolveTimer = null;
    clearTimer(gritTimer); gritTimer = null;
    clearTimer(transmitTimer); transmitTimer = null;
    clearTimer(swellTimer); swellTimer = null;

    const closing = ctx;
    const voices = droneVoices;
    ctx = null;
    droneVoices = [];
    droneFilter = null;
    swell = null;
    noiseBuf = null;
    if (!closing) { master = null; return; }

    const fading = master;
    master = null;
    try {
      if (fading) fading.gain.setTargetAtTime(0, closing.currentTime, 0.25);
    } catch { /* context already gone */ }

    /* fade first, tear down after — a hard close on a running drone clicks */
    window.setTimeout(() => {
      voices.forEach((voice) => { try { voice.osc.stop(); } catch { /* already stopped */ } });
      try { void closing.close(); } catch { /* already closed */ }
    }, 450);
  }

  /* ---- generative bed ---------------------------------------------------- */

  function evolve() {
    const a = bus();
    if (!a || !droneFilter) return;
    const now = a.c.currentTime;
    a.out.gain.setTargetAtTime(0.5, now, 1.2);

    droneFilter.frequency.setTargetAtTime(190 + Math.random() * 420, now, 1.8);
    droneFilter.Q.setTargetAtTime(rand(4, 11), now, 2.2);

    droneVoices.forEach((voice) => {
      const base = voice.mult === 0.5 ? 0.3 : voice.mult === 1 ? 0.13 : voice.mult === 1.5 ? 0.07 : 0.035;
      voice.gain.gain.setTargetAtTime(base * rand(0.7, 1.25), now, 2.4);
      voice.osc.detune.setTargetAtTime(rand(-16, 16), now, 3.0);
    });
  }

  /* street grit: a slow filtered-noise gust. This is the traffic/ventilation
     layer — never rhythmic, just weather. */
  function scheduleGrit() {
    clearTimer(gritTimer);
    if (!running) return;
    gritTimer = window.setTimeout(() => { playGrit(); scheduleGrit(); }, rand(4.5, 13) * 1000);
  }

  function playGrit() {
    const a = bus();
    if (!a || !noiseBuf) return;
    const { c, out } = a;
    const now = c.currentTime;
    const src = c.createBufferSource();
    src.buffer = noiseBuf;
    src.loop = true;
    const filt = c.createBiquadFilter();
    filt.type = "bandpass";
    filt.frequency.value = rand(280, 900);
    filt.Q.value = rand(0.6, 2.2);
    const gain = c.createGain();
    gain.gain.value = 0;

    src.connect(filt); filt.connect(gain); gain.connect(out);
    const dur = rand(2.6, 6.5);
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(rand(0.05, 0.12), now + dur * 0.42);
    gain.gain.linearRampToValueAtTime(0, now + dur);
    filt.frequency.linearRampToValueAtTime(rand(200, 1400), now + dur);
    src.start(now);
    src.stop(now + dur + 0.05);
    src.onended = () => hush(src, filt, gain);
  }

  /* far-off transmissions: a two-tone data chirp from somewhere else in the
     city, quiet and infrequent. Nothing on screen causes these — they are the
     reminder that the street is bigger than the frame. */
  function scheduleTransmission() {
    clearTimer(transmitTimer);
    if (!running) return;
    transmitTimer = window.setTimeout(() => {
      playTransmission();
      scheduleTransmission();
    }, rand(11, 27) * 1000);
  }

  function playTransmission() {
    const a = bus();
    if (!a) return;
    const { c, out } = a;
    const now = c.currentTime;
    const base = scaleFreq(Math.random() > 0.5 ? 4 : 5);
    [0, 0.19].forEach((offset, index) => {
      const osc = c.createOscillator();
      osc.type = "square";
      osc.frequency.value = index === 0 ? base : base * semitone(pick([-5, -2, 3, 7]));
      const filt = c.createBiquadFilter();
      filt.type = "bandpass";
      filt.frequency.value = base * 1.4;
      filt.Q.value = 3;
      const gain = c.createGain();
      gain.gain.value = 0;
      osc.connect(filt); filt.connect(gain); gain.connect(out);
      const at = now + offset;
      gain.gain.setValueAtTime(0, at);
      gain.gain.linearRampToValueAtTime(0.035, at + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0008, at + 0.16);
      osc.start(at);
      osc.stop(at + 0.2);
      osc.onended = () => hush(osc, filt, gain);
    });
  }

  /* macro swell — same idea as the JORD original: the whole mix breathes on a
     tens-of-seconds cycle so a long look at the street never sits flat. */
  function scheduleSwell() {
    clearTimer(swellTimer);
    const a = bus();
    if (!a || !swell) return;
    const now = a.c.currentTime;
    const half = rand(16, 34);
    swellUp = !swellUp;
    swell.gain.cancelScheduledValues(now);
    swell.gain.setValueAtTime(swell.gain.value, now);
    swell.gain.linearRampToValueAtTime(swellUp ? 1 : 0.55, now + half);
    swellTimer = window.setTimeout(scheduleSwell, half * 1000);
  }

  /* ---- screen-driven one-shots ------------------------------------------- */

  function emit(event: StreetSoundEvent) {
    if (!bus()) return;
    const now = Date.now();
    if (now - (lastFired[event] ?? 0) < COOLDOWN[event]) return;
    lastFired[event] = now;

    if (event === "leak") playLeak();
    else if (event === "negotiate") playNegotiate();
    else if (event === "commit") playCommit();
    else if (event === "advance") playAdvance();
    else if (event === "disturb") playDisturb();
    else if (event === "slice") playSlice();
    else if (event === "giggle") playGiggle();
    else if (event === "shift") playShift();
    else if (event === "distort") playDistort();
    else if (event === "static") playStatic();
    else playClack();
  }

  /* leak — lower language surfacing. Slowed noise through a swept bandpass: a
     burst of something that was never meant to be audible. */
  function playLeak() {
    const a = bus();
    if (!a || !noiseBuf) return;
    const { c, out } = a;
    const now = c.currentTime;
    const src = c.createBufferSource();
    src.buffer = noiseBuf;
    src.playbackRate.value = rand(0.12, 0.3); /* slowed noise reads as bit-rate, not hiss */
    const filt = c.createBiquadFilter();
    filt.type = "bandpass";
    filt.frequency.value = rand(900, 2400);
    filt.Q.value = 9;
    const gain = c.createGain();
    gain.gain.value = 0;
    src.connect(filt); filt.connect(gain); gain.connect(out);

    const dur = rand(0.18, 0.34);
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.16, now + 0.006);
    gain.gain.exponentialRampToValueAtTime(0.0008, now + dur);
    filt.frequency.exponentialRampToValueAtTime(rand(300, 700), now + dur);
    src.start(now);
    src.stop(now + dur + 0.03);
    src.onended = () => hush(src, filt, gain);
  }

  /* negotiate — one token being argued over. A tight square blip, high and dry. */
  function playNegotiate() {
    const a = bus();
    if (!a) return;
    const { c, out } = a;
    const now = c.currentTime;
    const osc = c.createOscillator();
    osc.type = "square";
    const freq = scaleFreq(Math.random() > 0.5 ? 4 : 5);
    osc.frequency.setValueAtTime(freq, now);
    osc.frequency.exponentialRampToValueAtTime(freq * rand(0.6, 1.6), now + 0.07);
    const gain = c.createGain();
    gain.gain.value = 0;
    osc.connect(gain); gain.connect(out);
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.055, now + 0.004);
    gain.gain.exponentialRampToValueAtTime(0.0008, now + 0.09);
    osc.start(now);
    osc.stop(now + 0.11);
    osc.onended = () => hush(osc, gain);
  }

  /* commit — a line compiled and kept. The one warm sound in the set: a plucked
     saw through a fast-closing resonant filter, in key with the drone. */
  function playCommit() {
    const a = bus();
    if (!a) return;
    const { c, out } = a;
    const now = c.currentTime;
    const freq = scaleFreq(pick([2, 3, 3]));
    const osc = c.createOscillator();
    osc.type = "sawtooth";
    osc.frequency.value = freq;
    const filt = c.createBiquadFilter();
    filt.type = "lowpass";
    filt.Q.value = 9;
    filt.frequency.setValueAtTime(freq * 8, now);
    filt.frequency.exponentialRampToValueAtTime(Math.max(freq * 1.1, 120), now + 0.5);
    const gain = c.createGain();
    gain.gain.value = 0;
    osc.connect(filt); filt.connect(gain); gain.connect(out);

    const dur = rand(0.6, 1.1);
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.075, now + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0006, now + dur);
    osc.start(now);
    osc.stop(now + dur + 0.05);
    osc.onended = () => hush(osc, filt, gain);
  }

  /* advance — the verse turns over. Sub thump plus a downward noise sweep, and
     the drone filter gets yanked open and left to settle: the one event that
     moves the whole bed rather than sitting on top of it. */
  function playAdvance() {
    const a = bus();
    if (!a) return;
    const { c, out } = a;
    const now = c.currentTime;

    const sub = c.createOscillator();
    sub.type = "sine";
    sub.frequency.setValueAtTime(ROOT * 1.5, now);
    sub.frequency.exponentialRampToValueAtTime(ROOT * 0.5, now + 0.7);
    const subGain = c.createGain();
    subGain.gain.value = 0;
    sub.connect(subGain); subGain.connect(out);
    subGain.gain.setValueAtTime(0, now);
    subGain.gain.linearRampToValueAtTime(0.24, now + 0.02);
    subGain.gain.exponentialRampToValueAtTime(0.0006, now + 1.1);
    sub.start(now);
    sub.stop(now + 1.2);
    sub.onended = () => hush(sub, subGain);

    if (noiseBuf) {
      const src = c.createBufferSource();
      src.buffer = noiseBuf;
      src.loop = true;
      const filt = c.createBiquadFilter();
      filt.type = "bandpass";
      filt.Q.value = 2.4;
      filt.frequency.setValueAtTime(5200, now);
      filt.frequency.exponentialRampToValueAtTime(240, now + 0.9);
      const gain = c.createGain();
      gain.gain.value = 0;
      src.connect(filt); filt.connect(gain); gain.connect(out);
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.1, now + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.0006, now + 0.95);
      src.start(now);
      src.stop(now + 1);
      src.onended = () => hush(src, filt, gain);
    }

    if (droneFilter) {
      droneFilter.frequency.cancelScheduledValues(now);
      droneFilter.frequency.setValueAtTime(droneFilter.frequency.value, now);
      droneFilter.frequency.linearRampToValueAtTime(1500, now + 0.12);
      droneFilter.frequency.setTargetAtTime(340, now + 0.2, 2.4);
    }
  }

  /* disturb — the reader touching the surface. Noise crack over a pitch drop,
     the loudest thing in the set because it is the only one they caused. */
  function playDisturb() {
    const a = bus();
    if (!a) return;
    const { c, out } = a;
    const now = c.currentTime;

    const zap = c.createOscillator();
    zap.type = "sawtooth";
    zap.frequency.setValueAtTime(rand(700, 1300), now);
    zap.frequency.exponentialRampToValueAtTime(rand(70, 130), now + 0.26);
    const zapFilt = c.createBiquadFilter();
    zapFilt.type = "lowpass";
    zapFilt.frequency.value = 2600;
    zapFilt.Q.value = 5;
    const zapGain = c.createGain();
    zapGain.gain.value = 0;
    zap.connect(zapFilt); zapFilt.connect(zapGain); zapGain.connect(out);
    zapGain.gain.setValueAtTime(0, now);
    zapGain.gain.linearRampToValueAtTime(0.14, now + 0.006);
    zapGain.gain.exponentialRampToValueAtTime(0.0006, now + 0.3);
    zap.start(now);
    zap.stop(now + 0.34);
    zap.onended = () => hush(zap, zapFilt, zapGain);

    if (!noiseBuf) return;
    const src = c.createBufferSource();
    src.buffer = noiseBuf;
    const filt = c.createBiquadFilter();
    filt.type = "highpass";
    filt.frequency.value = 1800;
    const gain = c.createGain();
    gain.gain.value = 0;
    src.connect(filt); filt.connect(gain); gain.connect(out);
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.12, now + 0.003);
    gain.gain.exponentialRampToValueAtTime(0.0006, now + 0.09);
    src.start(now);
    src.stop(now + 0.12);
    src.onended = () => hush(src, filt, gain);
  }

  /* ---- click targets ------------------------------------------------------
     Three things on the street answer to a direct hit — a figure, the verse
     panel, and the road itself — and each gets its own voice so the reader can
     tell by ear what they touched. */

  /* slice — a blade through a figure. Air first (a bandpass sweeping down fast),
     then the ring of the edge, then the body hitting the road. */
  function playSlice() {
    const a = bus();
    if (!a || !noiseBuf) return;
    const { c, out } = a;
    const now = c.currentTime;

    const swoosh = c.createBufferSource();
    swoosh.buffer = noiseBuf;
    swoosh.loop = true;
    const air = c.createBiquadFilter();
    air.type = "bandpass";
    air.Q.value = 1.6;
    air.frequency.setValueAtTime(4600, now);
    air.frequency.exponentialRampToValueAtTime(420, now + 0.22);
    const swooshGain = c.createGain();
    swooshGain.gain.value = 0;
    swoosh.connect(air); air.connect(swooshGain); swooshGain.connect(out);
    swooshGain.gain.setValueAtTime(0, now);
    swooshGain.gain.linearRampToValueAtTime(0.2, now + 0.05);
    swooshGain.gain.exponentialRampToValueAtTime(0.0006, now + 0.28);
    swoosh.start(now);
    swoosh.stop(now + 0.32);
    swoosh.onended = () => hush(swoosh, air, swooshGain);

    /* the edge itself: two close sines beating, struck at the end of the swing */
    const at = now + 0.16;
    const edgeGain = c.createGain();
    edgeGain.gain.value = 0;
    edgeGain.connect(out);
    const edgeFreq = 2400 * rand(0.85, 1.2);
    [1, 1.007].forEach((mult) => {
      const osc = c.createOscillator();
      osc.type = "sine";
      osc.frequency.value = edgeFreq * mult;
      osc.connect(edgeGain);
      osc.start(at);
      osc.stop(at + 0.5);
      osc.onended = () => hush(osc);
    });
    edgeGain.gain.setValueAtTime(0, at);
    edgeGain.gain.linearRampToValueAtTime(0.07, at + 0.004);
    edgeGain.gain.exponentialRampToValueAtTime(0.0006, at + 0.45);
    window.setTimeout(() => hush(edgeGain), 900);

    /* the half that falls */
    const thudAt = now + 0.34;
    const thud = c.createOscillator();
    thud.type = "sine";
    thud.frequency.setValueAtTime(140, thudAt);
    thud.frequency.exponentialRampToValueAtTime(46, thudAt + 0.3);
    const thudGain = c.createGain();
    thudGain.gain.value = 0;
    thud.connect(thudGain); thudGain.connect(out);
    thudGain.gain.setValueAtTime(0, thudAt);
    thudGain.gain.linearRampToValueAtTime(0.18, thudAt + 0.012);
    thudGain.gain.exponentialRampToValueAtTime(0.0006, thudAt + 0.34);
    thud.start(thudAt);
    thud.stop(thudAt + 0.38);
    thud.onended = () => hush(thud, thudGain);
  }

  /* giggle — five or six quick vibrato blips walking up then falling away. Not
     a sample of a laugh; the shape of one. */
  function playGiggle() {
    const a = bus();
    if (!a) return;
    const { c, out } = a;
    const now = c.currentTime;
    const base = scaleFreq(4) * rand(0.95, 1.25);
    const count = Math.floor(rand(4, 7));
    const step = rand(0.075, 0.105);

    for (let i = 0; i < count; i += 1) {
      const at = now + i * step;
      const climb = i < count - 2 ? semitone(i * 2) : semitone((count - i) * 1.5);
      const osc = c.createOscillator();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(base * climb, at);
      /* a fast vibrato per blip is what stops this reading as a plain arpeggio */
      const vib = c.createOscillator();
      vib.type = "sine";
      vib.frequency.value = rand(22, 34);
      const vibAmount = c.createGain();
      vibAmount.gain.value = base * 0.05;
      vib.connect(vibAmount); vibAmount.connect(osc.frequency);
      const gain = c.createGain();
      gain.gain.value = 0;
      osc.connect(gain); gain.connect(out);
      gain.gain.setValueAtTime(0, at);
      gain.gain.linearRampToValueAtTime(0.05, at + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.0006, at + step * 0.9);
      osc.start(at); vib.start(at);
      osc.stop(at + step);
      vib.stop(at + step);
      osc.onended = () => hush(osc, vib, vibAmount, gain);
    }
  }

  /* shift — a figure changing colour. A short glide up with a shimmer on top,
     the friendliest sound in the set. */
  function playShift() {
    const a = bus();
    if (!a) return;
    const { c, out } = a;
    const now = c.currentTime;
    const from = scaleFreq(3);
    const to = from * semitone(pick([5, 7, 12]));
    const gain = c.createGain();
    gain.gain.value = 0;
    gain.connect(out);

    [1, 2.01].forEach((mult, index) => {
      const osc = c.createOscillator();
      osc.type = index === 0 ? "triangle" : "sine";
      osc.frequency.setValueAtTime(from * mult, now);
      osc.frequency.exponentialRampToValueAtTime(to * mult, now + 0.26);
      const partial = c.createGain();
      partial.gain.value = index === 0 ? 1 : 0.35;
      osc.connect(partial); partial.connect(gain);
      osc.start(now);
      osc.stop(now + 0.62);
      osc.onended = () => hush(osc, partial);
    });

    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.07, now + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.0006, now + 0.58);
    window.setTimeout(() => hush(gain), 900);
  }

  /* distort — the verse panel struck directly. Ring-modulated noise through a
     hard waveshaper: the text is being damaged, and it should sound like it. */
  function playDistort() {
    const a = bus();
    if (!a || !noiseBuf) return;
    const { c, out } = a;
    const now = c.currentTime;

    const src = c.createBufferSource();
    src.buffer = noiseBuf;
    src.loop = true;
    src.playbackRate.value = rand(0.4, 0.8);

    const shaper = c.createWaveShaper();
    const curve = new Float32Array(1024);
    for (let i = 0; i < curve.length; i += 1) {
      const x = (i / (curve.length - 1)) * 2 - 1;
      curve[i] = Math.tanh(x * 7);   /* hard, but bounded — no runaway peaks */
    }
    shaper.curve = curve;
    shaper.oversample = "2x";

    const band = c.createBiquadFilter();
    band.type = "bandpass";
    band.Q.value = 3.2;
    band.frequency.setValueAtTime(rand(700, 1500), now);
    band.frequency.exponentialRampToValueAtTime(rand(160, 320), now + 0.42);

    /* ring modulation: a low carrier multiplying the noise turns hiss into
       something that buzzes at a pitch */
    const ring = c.createOscillator();
    ring.type = "square";
    ring.frequency.value = rand(38, 92);
    const ringDepth = c.createGain();
    ringDepth.gain.value = 0;
    ring.connect(ringDepth.gain);

    const gain = c.createGain();
    gain.gain.value = 0;
    src.connect(shaper); shaper.connect(band); band.connect(ringDepth); ringDepth.connect(gain); gain.connect(out);

    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.13, now + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0006, now + 0.45);
    ring.start(now); src.start(now);
    ring.stop(now + 0.5); src.stop(now + 0.5);
    src.onended = () => hush(src, shaper, band, ringDepth, gain, ring);
  }

  /* static — dead air. Wideband noise with the gain stepped at random so it
     flickers rather than fading politely. */
  function playStatic() {
    const a = bus();
    if (!a || !noiseBuf) return;
    const { c, out } = a;
    const now = c.currentTime;
    const src = c.createBufferSource();
    src.buffer = noiseBuf;
    src.loop = true;
    const filt = c.createBiquadFilter();
    filt.type = "highpass";
    filt.frequency.value = rand(700, 1600);
    const gain = c.createGain();
    gain.gain.value = 0;
    src.connect(filt); filt.connect(gain); gain.connect(out);

    const dur = rand(0.3, 0.55);
    gain.gain.setValueAtTime(0.09, now);
    for (let t = 0.03; t < dur; t += 0.035) {
      gain.gain.setValueAtTime(rand(0.02, 0.11), now + t);
    }
    gain.gain.setValueAtTime(0.0001, now + dur);
    src.start(now);
    src.stop(now + dur + 0.02);
    src.onended = () => hush(src, filt, gain);
  }

  /* clack — someone typing nearby. A short burst of key hits at human,
     uneven spacing: a click transient plus a woody body per key. */
  function playClack() {
    const a = bus();
    if (!a || !noiseBuf) return;
    const { c, out } = a;
    const now = c.currentTime;
    const keys = Math.floor(rand(4, 10));
    let at = now;

    for (let i = 0; i < keys; i += 1) {
      const src = c.createBufferSource();
      src.buffer = noiseBuf;
      src.playbackRate.value = rand(0.8, 1.4);
      const body = c.createBiquadFilter();
      body.type = "bandpass";
      body.frequency.value = rand(1400, 2900);
      body.Q.value = rand(4, 9);
      const gain = c.createGain();
      gain.gain.value = 0;
      src.connect(body); body.connect(gain); gain.connect(out);

      const peak = rand(0.05, 0.11);
      gain.gain.setValueAtTime(0, at);
      gain.gain.linearRampToValueAtTime(peak, at + 0.002);
      gain.gain.exponentialRampToValueAtTime(0.0006, at + 0.035);
      src.start(at);
      src.stop(at + 0.06);
      src.onended = () => hush(src, body, gain);

      /* the odd double-tap and the odd pause is what makes it read as a hand */
      at += Math.random() < 0.18 ? rand(0.16, 0.26) : rand(0.05, 0.11);
    }
  }

  return { start, stop, emit, isRunning: () => running };
}
