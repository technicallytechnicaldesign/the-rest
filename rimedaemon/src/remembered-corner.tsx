"use client";
import { useEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import { DISTRICTS, MEMORY_KEY, cleanWord, freshMemory, readMemory, rememberWords, transmissionSvg, type DistrictId, type StreetMemory, type Transmission, type ResidentWord } from "./street-memory";
import { type SoundPulse, type SoundMeter, type StreetSoundscape } from "./memory-score";
import WordDaemon from "./word-daemon";
import WordText from "./word-text";
import EchoDaemon, {type EchoAnchor} from "./echo-daemon";

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
  onGather: () => ResidentWord;
  onCompile: (words: string[]) => {lines: string[]; delivered: boolean};
  onLocateEcho: () => EchoAnchor | null;
  onBranch: (anchor: EchoAnchor) => void;
};

function download(t: Transmission) {
  const blob = new Blob([transmissionSvg(t)], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url; anchor.download = `rimedaemon-${t.district}-${t.id}.svg`;
  anchor.click(); window.setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export default function RememberedCorner({ children, district, lines, engine, pulse, meter, held, onHold, onDistrict, onWord, onGather, onCompile, onLocateEcho, onBranch }: Props) {
  const traffic = useRef<"moth" | "echo" | null>(null);
  const [memory, setMemory] = useState<StreetMemory>(freshMemory);
  const memoryRef = useRef(memory);
  const initialized = useRef(false);
  const [storageNote, setStorageNote] = useState("");
  const [pocketOpen, setPocketOpen] = useState(false);
  const [mixOpen, setMixOpen] = useState(false);
  const [placesOpen, setPlacesOpen] = useState(false);
  const menuButton = useRef<HTMLButtonElement>(null);
  const [notice, setNotice] = useState("");
  const [volume, setVolume] = useState(52);
  const [density, setDensity] = useState(38);
  const noticeTimer = useRef<number | null>(null);
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
  }, []);

  function say(message: string) {
    setNotice(message);
    if (noticeTimer.current !== null) window.clearTimeout(noticeTimer.current);
    noticeTimer.current = window.setTimeout(() => setNotice(""), 6500);
  }

  function giveWord(value: string) {
    const word = cleanWord(value);
    if (!word) return;
    const current = memoryRef.current;
    persist({ ...current, word, words: rememberWords(current.words, [word]), encounters: current.encounters + 1 });
    onWord(word);
  }

  function compile(words: string[]) {
    const current = memoryRef.current;
    persist({ ...current, words: rememberWords(current.words, words) });
    return onCompile(words);
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
    if (event.key === "Escape" && (pocketOpen || mixOpen || placesOpen)) {
      event.preventDefault(); event.stopPropagation();
      setPocketOpen(false); setMixOpen(false); setPlacesOpen(false);
      menuButton.current?.focus();
    }
  }}>
    <div className="place-controls">
      <button ref={menuButton} type="button" className="place-toggle" aria-expanded={placesOpen} onClick={() => setPlacesOpen(!placesOpen)}>WALK / {d.name} ↗</button>
      {placesOpen && <nav className="district-nav" aria-label="Walk the Street">
        {(Object.keys(DISTRICTS) as DistrictId[]).map(id => <button key={id} type="button" aria-pressed={district === id} onClick={() => { onDistrict(id); engine.current?.setDistrict(id); setPlacesOpen(false); }}>
          <span>{DISTRICTS[id].number}</span><b>{DISTRICTS[id].name}</b>
        </button>)}
      </nav>}
    </div>

    <div className="corner-address"><span>{d.address}</span><h1>{d.name}</h1><p>{d.description}</p></div>

    <WordDaemon traffic={traffic} knownWord={memory.word || memory.words[memory.words.length - 1] || ""} engine={engine} onGather={onGather} onOffer={giveWord} onCompile={compile} />
    <EchoDaemon traffic={traffic} onLocate={onLocateEcho} onBranch={onBranch} />

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
    {pocketOpen && <section className="pocket-panel" aria-label="Your kept transmissions"><header><div><span>LOCAL MEMORY</span><h2>A small thing, kept.</h2></div><button type="button" onClick={() => setPocketOpen(false)} aria-label="Close pocket">×</button></header><p className="pocket-note">Kept in this browser. Download a print to take it with you.</p><div className="pocket-list">{memory.transmissions.length === 0 ? <p className="empty-pocket">Nothing in your pocket yet.<br />Catch a few lines before the current takes them.</p> : memory.transmissions.map(t => <article key={t.id}><small>{DISTRICTS[t.district].name} / {new Date(t.time).toLocaleDateString()}</small>{t.lines.map((l, i) => <p key={i}><WordText text={l} /></p>)}<button type="button" onClick={() => download(t)}>DOWNLOAD PRINT ↗</button></article>)}</div></section>}
  </div>;
}
