"use client";
import {useEffect, useRef, useState, type CSSProperties} from "react";
import {type DaemonTraffic} from "./word-daemon";

export type EchoAnchor = {index: number; source: string; word: string; x: number; y: number};
type Phase = "away" | "arriving" | "offering" | "continuing" | "released" | "departing";
type Props = {
  traffic: DaemonTraffic;
  onLocate: () => EchoAnchor | null;
  onBranch: (anchor: EchoAnchor) => void;
};

export default function EchoDaemon(props: Props) {
  const callbacks = useRef(props);
  callbacks.current = props;
  const [phase, setPhase] = useState<Phase>("away");
  const [anchor, setAnchor] = useState<EchoAnchor | null>(null);
  const [visible, setVisible] = useState(true);
  const visits = useRef(0);

  useEffect(() => () => {
    if (callbacks.current.traffic.current === "echo") callbacks.current.traffic.current = null;
  }, []);

  useEffect(() => {
    let timer: number | null = null;
    let disposed = false;
    const wait = phase === "away" ? visits.current === 0 ? 48000 : 110000 + Math.random() * 40000
      : phase === "arriving" ? 2200 : phase === "offering" ? 22000
      : phase === "departing" ? 2800 : 5200;

    function advance() {
      if (disposed || document.hidden) return;
      if (phase === "away") {
        if (callbacks.current.traffic.current !== null) { timer = window.setTimeout(advance, 3500); return; }
        const next = callbacks.current.onLocate();
        if (!next) { timer = window.setTimeout(advance, 3500); return; }
        callbacks.current.traffic.current = "echo";
        visits.current += 1;
        setAnchor(next); setPhase("arriving");
      } else if (phase === "arriving") setPhase("offering");
      else if (phase === "offering") setPhase("released");
      else if (phase === "departing") { callbacks.current.traffic.current = null; setAnchor(null); setPhase("away"); }
      else setPhase("departing");
    }

    function arm() {
      if (timer !== null) window.clearTimeout(timer);
      setVisible(!document.hidden);
      if (!document.hidden) timer = window.setTimeout(advance, wait);
    }
    arm(); document.addEventListener("visibilitychange", arm);
    return () => { disposed = true; if (timer !== null) window.clearTimeout(timer); document.removeEventListener("visibilitychange", arm); };
  }, [phase]);

  if (phase === "away" || !anchor) return null;
  const status = phase === "arriving" ? "continuity.check()"
    : phase === "offering" ? "a copy is waiting for a body."
    : phase === "continuing" ? "same memory / separate future"
    : phase === "released" ? "one life continues. the other stays possible."
    : "no original was lost.";
  return <div className={`daemon-sweeper word-daemon echo-daemon phase-${phase}`} data-phase={phase} data-visit={visits.current}
    style={{left: `${anchor.x}%`, top: `${anchor.y}%`, animationPlayState: visible ? "running" : "paused"} as CSSProperties}
    onKeyDown={event => { if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); setPhase("departing"); } }}>
    <b>DÆMON://ECHO</b><i aria-hidden="true" />
    <div className="daemon-service">
      <code>{status}</code>
      {(phase === "arriving" || phase === "offering") && <p className="echo-memory">{anchor.source} / last retained: <em className="carried-lexeme">{anchor.word}</em></p>}
      {phase === "offering" && <div className="echo-choice">
        <button type="button" className="daemon-invitation" onClick={() => { callbacks.current.onBranch(anchor); setPhase("continuing"); }}>let it branch ↗</button>
        <button type="button" className="echo-decline" onClick={() => setPhase("released")}>leave it unrun</button>
      </div>}
      {phase === "continuing" && <p className="echo-memory"><em className="carried-lexeme">{anchor.word}</em> survives in another body.</p>}
    </div>
  </div>;
}
