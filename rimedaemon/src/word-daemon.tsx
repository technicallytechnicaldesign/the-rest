"use client";
import {useEffect, useRef, useState, type CSSProperties, type FormEvent, type RefObject} from "react";
import {cleanWord, type ResidentWord} from "./street-memory";
import {type StreetSoundscape} from "./memory-score";
import WordText from "./word-text";

export type DaemonPhase = "away" | "arriving" | "gathering" | "inviting" | "listening" | "compiling" | "departing";
export type DaemonTraffic = RefObject<"moth" | "echo" | null>;
type Props = {
  traffic: DaemonTraffic;
  knownWord: string;
  engine: RefObject<StreetSoundscape | null>;
  onGather: () => ResidentWord;
  onOffer: (word: string) => void;
  onCompile: (words: string[]) => {lines: string[]; delivered: boolean};
};

export default function WordDaemon(props: Props) {
  const callbacks = useRef(props);
  callbacks.current = props;
  const [phase, setPhase] = useState<DaemonPhase>("away");
  const [step, setStep] = useState(0);
  const [collection, setCollection] = useState<ResidentWord[]>([]);
  const collectionRef = useRef<ResidentWord[]>([]);
  const [position, setPosition] = useState({x: 50, y: 32});
  const [input, setInput] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const [output, setOutput] = useState<{lines: string[]; delivered: boolean} | null>(null);
  const [visible, setVisible] = useState(true);
  const cycle = useRef(0);
  const gathered = useRef("");
  const compiled = useRef(0);

  useEffect(() => () => {
    if (callbacks.current.traffic.current === "moth") callbacks.current.traffic.current = null;
  }, []);

  function addWord(word: ResidentWord) {
    const next = [...collectionRef.current, word];
    collectionRef.current = next;
    setCollection(next);
  }

  useEffect(() => {
    let timer: number | null = null;
    let entered = false;
    let disposed = false;
    const wait = phase === "away" ? cycle.current === 0 ? 8500 : 55000 + Math.random() * 25000
      : phase === "arriving" ? 2400 : phase === "gathering" ? 1600
      : phase === "inviting" ? 16000 : phase === "compiling" ? 5200 : 2800;

    function enter() {
      if (phase === "gathering") {
        const key = `${cycle.current}/${step}`;
        if (gathered.current === key) return;
        gathered.current = key;
        const reply = callbacks.current.onGather();
        addWord(reply);
        setPosition({x: reply.x, y: reply.y});
      }
      if (phase === "listening") inputRef.current?.focus({preventScroll: true});
      if (phase === "compiling" && compiled.current !== cycle.current) {
        compiled.current = cycle.current;
        setOutput(callbacks.current.onCompile(collectionRef.current.map(item => item.word)));
      }
    }

    function advance() {
      if (disposed) return;
      if (phase === "away") {
        if (callbacks.current.traffic.current !== null) { timer = window.setTimeout(advance, 3500); return; }
        callbacks.current.traffic.current = "moth";
        cycle.current += 1;
        const cached = cleanWord(callbacks.current.knownWord);
        const words = cached ? [{source: "CACHE", word: cached, x: 50, y: 32}] : [];
        collectionRef.current = words;
        setCollection(words); setOutput(null); setInput(""); setStep(0); setPosition({x: 50, y: 32});
        setPhase("arriving");
      } else if (phase === "arriving") setPhase("gathering");
      else if (phase === "gathering") {
        if (step === 0) setStep(1);
        else setPhase("inviting");
      } else if (phase === "inviting") setPhase("compiling");
      else if (phase === "compiling") setPhase("departing");
      else if (phase === "departing") { callbacks.current.traffic.current = null; setPhase("away"); }
    }

    function arm() {
      if (timer !== null) window.clearTimeout(timer);
      setVisible(!document.hidden);
      if (document.hidden) return;
      if (!entered) { entered = true; enter(); }
      if (phase !== "listening") timer = window.setTimeout(advance, wait);
    }
    arm();
    document.addEventListener("visibilitychange", arm);
    return () => { disposed = true; if (timer !== null) window.clearTimeout(timer); document.removeEventListener("visibilitychange", arm); };
  }, [phase, step]);

  function offer(event: FormEvent) {
    event.preventDefault();
    const word = cleanWord(input);
    if (!word) return;
    callbacks.current.onOffer(word);
    addWord({source: "YOU", word, ...position});
    setInput(""); setPhase("compiling");
  }

  if (phase === "away") return null;
  const status = phase === "arriving" ? "lexemes.collect()"
    : phase === "gathering" ? `${collection[collection.length - 1]?.source ?? "STREET"} → packet`
    : phase === "inviting" ? "one word? i'll pass it on."
    : phase === "listening" ? "stdin.open() / your turn"
    : phase === "compiling" ? output?.delivered === false ? "current held / packet queued" : "compile() → current + score"
    : "return packet / keep walking";
  const style = {left: `${position.x}%`, top: `${position.y}%`, animationPlayState: visible ? "running" : "paused"} as CSSProperties;

  return <div className={`daemon-sweeper word-daemon phase-${phase}`} style={style} data-phase={phase} data-cycle={cycle.current}
    onKeyDown={event => { if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); setInput(""); setPhase("departing"); } }}>
    <b>DÆMON://MOTH</b><i aria-hidden="true" />
    <div className="daemon-service">
      <code>{status}</code>
      <div className="collected-lexemes" aria-label="Collected words">{collection.map((item,index) => <span key={`${cycle.current}-${index}`}><small>{item.source}</small> <em className="carried-lexeme">{item.word}</em></span>)}</div>
      {phase === "inviting" && <button type="button" className="daemon-invitation" onClick={() => { callbacks.current.engine.current?.emit("shift"); setPhase("listening"); }}>offer a word ↗</button>}
      {phase === "listening" && <form className="word-offering" onSubmit={offer}>
        <label htmlFor="daemon-word">ONE WORD FOR THE CURRENT</label>
        <div><span aria-hidden="true">&gt;</span><input ref={inputRef} id="daemon-word" value={input} onChange={event => setInput(event.target.value)} maxLength={32} placeholder="leave something running" autoComplete="off" /><button type="submit" disabled={!cleanWord(input)} aria-label="Pass your word to the daemon">↗</button></div>
        <button className="daemon-pass" type="button" onClick={() => { setInput(""); setPhase("compiling"); }}>pass / keep walking</button>
      </form>}
      {phase === "compiling" && output && <p className="compiled-packet"><WordText text={output.lines[0]} /></p>}
    </div>
  </div>;
}
