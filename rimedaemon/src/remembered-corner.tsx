"use client";
import { useEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import { DISTRICTS, MEMORY_KEY, cleanWord, daemonSpeech, freshMemory, readMemory, transmissionSvg, type DistrictId, type StreetMemory, type Transmission } from "./street-memory";
import { type SoundPulse, type SoundMeter, type StreetSoundscape } from "./memory-score";

type Props = {
  children: ReactNode;
  district: DistrictId;
  lines: string[];
  engine: RefObject<StreetSoundscape | null>;
  pulse: SoundPulse | null;
  meter: SoundMeter;
  held: boolean;
  onHold: () => void;
  onDistrict: (id: DistrictId) => void;
  onWord: (word: string) => void;
  onEncounter: () => void;
};

function download(t: Transmission) {
  const blob = new Blob([transmissionSvg(t)], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url; anchor.download = `rimedaemon-${t.district}-${t.id}.svg`;
  anchor.click(); window.setTimeout(() => URL.revokeObjectURL(url), 2000);
}

function MothGlyph() { return <svg viewBox="0 0 240 180" fill="none" aria-hidden="true">
          <ellipse className="moth-orbit" cx="120" cy="90" rx="91" ry="44" stroke="currentColor" strokeDasharray="1 9" />
          <g className="moth-wing wing-left"><path d="M117 81C82 14 28 37 24 61C45 59 63 93 104 99C57 88 35 111 49 137C75 113 99 140 117 97" stroke="currentColor" fill="currentColor" fillOpacity=".06"/><path d="M105 83L48 58M102 94L63 113M76 65L80 84" stroke="currentColor" opacity=".45"/></g>
          <g className="moth-wing wing-right"><path d="M123 81C158 14 212 37 216 61C195 59 177 93 136 99C183 88 205 111 191 137C165 113 141 140 123 97" stroke="currentColor" fill="currentColor" fillOpacity=".06"/><path d="M135 83L192 58M138 94L177 113M164 65L160 84" stroke="currentColor" opacity=".45"/></g>
          <path d="M117 82L120 119L123 82M118 77L109 60M122 77L132 59" stroke="currentColor" strokeWidth="1.5"/><circle cx="120" cy="80" r="5" fill="currentColor"/><circle cx="120" cy="80" r="13" stroke="currentColor" opacity=".3"/>
          <path d="M28 155H73M167 155H212M120 143V165" stroke="currentColor" opacity=".3"/><text x="120" y="173" textAnchor="middle" fill="currentColor" fontSize="7" fontFamily="monospace" letterSpacing="3">LOST / FOUND</text>
        </svg>; }

export default function RememberedCorner({ children, district, lines, engine, pulse, meter, held, onHold, onDistrict, onWord, onEncounter }: Props) {
  const [memory, setMemory] = useState<StreetMemory>(freshMemory);
  const memoryRef = useRef(memory);
  const initialized = useRef(false);
  const [input, setInput] = useState("");
  const [storageNote, setStorageNote] = useState("");
  const [pocketOpen, setPocketOpen] = useState(false);
  const [mothOpen, setMothOpen] = useState(false);
  const [mixOpen, setMixOpen] = useState(false);
  const [placesOpen, setPlacesOpen] = useState(false);
  const mothButton = useRef<HTMLButtonElement>(null);
  const [notice, setNotice] = useState("");
  const [volume, setVolume] = useState(52);
  const [density, setDensity] = useState(38);
  const [speaking, setSpeaking] = useState(false);
  const noticeTimer = useRef<number | null>(null);
  const speakingTimer = useRef<number | null>(null);
  const d = DISTRICTS[district];

  function persist(next: StreetMemory) {
    memoryRef.current = next; setMemory(next);
    try { localStorage.setItem(MEMORY_KEY, JSON.stringify(next)); setStorageNote(""); }
    catch { setStorageNote("Memory lasts for this visit only. Download anything you want to keep."); }
  }

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    let stored = freshMemory();
    try { stored = readMemory(localStorage.getItem(MEMORY_KEY)); }
    catch { setStorageNote("Memory lasts for this visit only."); }
    stored = { ...stored, visits: stored.visits + 1 };
    memoryRef.current = stored; setMemory(stored);
    onWord(stored.word);
    try { localStorage.setItem(MEMORY_KEY, JSON.stringify(stored)); }
    catch { setStorageNote("Memory lasts for this visit only. Download anything you want to keep."); }
  }, [onWord]);

  useEffect(() => () => {
    if (noticeTimer.current !== null) window.clearTimeout(noticeTimer.current);
    if (speakingTimer.current !== null) window.clearTimeout(speakingTimer.current);
  }, []);

  function say(message: string) {
    setNotice(message);
    if (noticeTimer.current !== null) window.clearTimeout(noticeTimer.current);
    noticeTimer.current = window.setTimeout(() => setNotice(""), 6500);
  }

  function encounter() {
    persist({ ...memoryRef.current, encounters: memoryRef.current.encounters + 1 });
    onEncounter(); setSpeaking(true);
    if (speakingTimer.current !== null) window.clearTimeout(speakingTimer.current);
    speakingTimer.current = window.setTimeout(() => setSpeaking(false), 2200);
  }

  function giveWord(event: React.FormEvent) {
    event.preventDefault();
    const word = cleanWord(input);
    if (!word) return;
    persist({ ...memoryRef.current, word, encounters: Math.max(1, memoryRef.current.encounters + 1) });
    onWord(word); onEncounter(); setInput("");
    say(`MOTH has “${word}”. Listen for it coming back.`);
  }

  function keep() {
    const current = memoryRef.current;
    if (current.transmissions.length >= 24) {
      say("Your pocket is full. You can still download this moment.");
      download({ id: crypto.randomUUID(), time: new Date().toISOString(), district, lines: [...lines], word: current.word });
      return;
    }
    const last = current.transmissions[0];
    if (last?.district === district && last.lines.join("\n") === lines.join("\n")) { say("This moment is already in your pocket."); return; }
    const t: Transmission = { id: crypto.randomUUID(), time: new Date().toISOString(), district, lines: [...lines], word: current.word };
    persist({ ...current, transmissions: [t, ...current.transmissions] });
    engine.current?.emit("commit");
    say("A small thing, kept. Find it in your pocket.");
  }

  return <div className="remembered-corner" onClick={event => event.stopPropagation()} onKeyDown={event => {
    if (event.key === "Escape" && (mothOpen || pocketOpen || mixOpen || placesOpen)) {
      event.preventDefault(); event.stopPropagation();
      setMothOpen(false); setPocketOpen(false); setMixOpen(false); setPlacesOpen(false);
      mothButton.current?.focus();
    }
  }}>
    <div className="place-controls">
      <button type="button" className="place-toggle" aria-expanded={placesOpen} onClick={() => setPlacesOpen(!placesOpen)}>WALK / {d.name} ↗</button>
      {placesOpen && <nav className="district-nav" aria-label="Walk the Street">
        {(Object.keys(DISTRICTS) as DistrictId[]).map(id => <button key={id} type="button" aria-pressed={district === id} onClick={() => { onDistrict(id); engine.current?.setDistrict(id); setPlacesOpen(false); }}>
          <span>{DISTRICTS[id].number}</span><b>{DISTRICTS[id].name}</b>
        </button>)}
      </nav>}
    </div>

    <div className="corner-address"><span>{d.address}</span><h1>{d.name}</h1><p>{d.description}</p></div>

    <button ref={mothButton} className={`moth-beacon${speaking ? " is-speaking" : ""}`} type="button" aria-label="Approach MOTH" aria-expanded={mothOpen} aria-controls="moth-encounter" onClick={() => { setMothOpen(!mothOpen); if (!mothOpen) { if (memoryRef.current.encounters > 0) encounter(); else onEncounter(); } }}>
      <MothGlyph /><span>MOTH / LOST PROPERTY</span>
    </button>
    {mothOpen && <aside id="moth-encounter" className={`moth-encounter${speaking ? " is-speaking" : ""}`} aria-label="MOTH, lost-property process">
      <header className="encounter-heading"><span>LOST PROPERTY / MOTH</span><button type="button" aria-label="Leave MOTH" onClick={() => { setMothOpen(false); mothButton.current?.focus(); }}>×</button></header>
      <button className="moth-body" type="button" onClick={encounter} aria-label="Talk to MOTH">

        <span>MOTH <i /> <small>touch to listen</small></span>
      </button>
      <div className="moth-words"><span>RESIDENT PROCESS / STILL HERE</span><p key={`${district}-${memory.encounters}`}>{daemonSpeech(memory, district)}</p></div>
      <form onSubmit={giveWord} className="word-offering"><label htmlFor="moth-word">LEAVE A WORD IN ITS KEEPING</label><div><input id="moth-word" value={input} onChange={event => setInput(event.target.value)} maxLength={32} placeholder={memory.word || "something worth keeping"} autoComplete="off" /><button type="submit" disabled={!cleanWord(input)} aria-label="Give your word to MOTH">↗</button></div></form>
      {memory.word && <small className="carried-word">CARRYING <b>{memory.word}</b></small>}
    </aside>}

    <div className="corner-poem">{children}</div>
    <div className="current-actions"><button type="button" onClick={onHold} aria-pressed={held}>{held ? "LET IT FLOW ↗" : "STAY WITH THESE LINES ‖"}</button><button type="button" onClick={keep}>KEEP THIS MOMENT +</button></div>

    <div className="score-desk" hidden={!mixOpen} aria-label="Generative sound controls" data-audio-state={meter.state} data-rms={meter.rms.toFixed(6)} data-peak={meter.peak.toFixed(6)} data-voices={meter.voices}>
      <div className="score-notation" aria-hidden="true"><div className="score-level" style={{ opacity: Math.min(1, .15 + meter.rms * 18), transform: `scaleY(${Math.min(1, .05 + meter.rms * 15)})` }} /><span className={pulse ? "note-lit" : ""} key={pulse ? `${pulse.note}-${pulse.pan}` : "silent"}>{pulse?.note || "·"}</span><div><b>{pulse?.voice || "the city is waiting to be heard"}</b><small>{d.instrument}</small></div><i style={{ left: `${50 + (pulse?.pan || 0) * 42}%` }} /></div>
      <label>VOLUME <input aria-label="Street volume" type="range" min="0" max="85" value={volume} onChange={event => { const v = Number(event.target.value); setVolume(v); engine.current?.setVolume(v / 100); }} /><output>{volume}</output></label>
      <label>ACTIVITY <input aria-label="Musical activity" type="range" min="0" max="100" value={density} onChange={event => { const v = Number(event.target.value); setDensity(v); engine.current?.setDensity(v / 100); }} /><output>{density < 33 ? "sparse" : density < 67 ? "drift" : "awake"}</output></label>
    </div>

    <div className="corner-tools"><button className="mix-toggle" type="button" aria-expanded={mixOpen} onClick={() => setMixOpen(!mixOpen)}>MIX</button>
    <button className="pocket-toggle" type="button" aria-expanded={pocketOpen} onClick={() => setPocketOpen(!pocketOpen)}>POCKET / {String(memory.transmissions.length).padStart(2, "0")}</button></div>
    <div className="corner-notice" role="status">{notice || storageNote}</div>
    {pocketOpen && <section className="pocket-panel" aria-label="Your kept transmissions"><header><div><span>LOCAL MEMORY</span><h2>A small thing, kept.</h2></div><button type="button" onClick={() => setPocketOpen(false)} aria-label="Close pocket">×</button></header><p className="pocket-note">Kept in this browser. Download a print to take it with you.</p><div className="pocket-list">{memory.transmissions.length === 0 ? <p className="empty-pocket">Nothing in your pocket yet.<br />Catch a few lines before the current takes them.</p> : memory.transmissions.map(t => <article key={t.id}><small>{DISTRICTS[t.district].name} / {new Date(t.time).toLocaleDateString()}</small>{t.lines.map((l, i) => <p key={i}>{l}</p>)}<button type="button" onClick={() => download(t)}>DOWNLOAD PRINT ↗</button></article>)}</div></section>}
  </div>;
}
