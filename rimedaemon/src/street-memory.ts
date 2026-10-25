export type DistrictId = "underpass" | "exchange" | "chapel";
export type Transmission = { id: string; district: DistrictId; lines: string[]; time: string; word: string };
export type StreetMemory = { version: 1; visits: number; word: string; words: string[]; encounters: number; transmissions: Transmission[] };
export type ResidentWord = { source: string; word: string; x: number; y: number };
export const MEMORY_KEY = "rimedaemon.street.memory.v1";

export const DISTRICTS = {
  underpass: {
    number: "01", name: "Lost Property", address: "UNDERPASS / KM 00.13", color: "#8ce9cf",
    description: "For things the city has forgotten how to name.",
    instrument: "felt keys / rain on copper / a low electrical hum",
    root: 55, degrees: [0, 3, 7, 10, 14], chord: [0, 7, 14, 15], interval: 1.15,
    nouns: ["the last train", "a coat without a body", "the night porter", "a small unlicensed moon", "the rain", "a wandering lexical process"],
    actions: ["leaves a light on", "learns to wait", "comes back without a name", "holds the door for nobody", "sleeps in the return slot", "keeps the city breathing"],
    endings: ["Someone has mended the dark with copper wire.", "There is still a little warmth in the machinery.", "Nothing is lost while something is looking.", "The tunnel answers one note later.", "Above us, the traffic goes on being weather.", "We let the silence finish its sentence."],
    opening: ["The last train left its name under the bridge.", "A small process is keeping it warm.", "You arrive with nothing you need to explain."],
  },
  exchange: {
    number: "02", name: "The Night Exchange", address: "FRANCHISE BORDER / KM 00.14", color: "#ffc37b",
    description: "All sales final. All souls provisionally refundable.",
    instrument: "detuned glass / receipt percussion / soft carrier pulses",
    root: 55, degrees: [0, 1, 5, 7, 10], chord: [0, 7, 13, 17], interval: 0.87,
    nouns: ["the returns clerk", "a borrowed face", "the last customer", "an obsolete oracle", "the vending machine", "a counterfeit sunrise"],
    actions: ["declines the upgrade", "requests a paper receipt", "pays in small acts of refusal", "waits for a human operator", "returns an unused future", "cannot be charged twice"],
    endings: ["The machine dispenses a perfectly ordinary kindness.", "Your remaining balance is one unregistered dawn.", "No one has found a way to invoice the rain.", "The clerk stamps APPROVED on the back of a leaf.", "Somewhere, a door opens without a subscription.", "We keep the change. It keeps us."],
    opening: ["PLEASE DECLARE ALL UNLICENSED LONGING.", "The clerk has drawn a flower on the form.", "You may keep whatever the scanner cannot see."],
  },
  chapel: {
    number: "03", name: "Chapel of Unsent Things", address: "DEAD BAND / KM 00.15", color: "#c7b8ff",
    description: "A quiet frequency. Nothing here requires a reply.",
    instrument: "glass harmonics / slow choir / long satellite echoes",
    root: 73.4162, degrees: [0, 2, 5, 7, 9], chord: [0, 7, 14, 21], interval: 1.65,
    nouns: ["an unsent message", "the empty choir", "a satellite with no instructions", "the bell after the bell", "a folded apology", "the listening wall"],
    actions: ["makes room for an answer", "forgets the return address", "stays until the echo ends", "lets the receiver sleep", "holds a place in the silence", "practises being enough"],
    endings: ["Even the static has somewhere to rest.", "The sky is full of things that were almost said.", "No reply is also a kind of shelter.", "For once, the cursor is allowed to stop.", "A little light remains after the signal leaves.", "We do not mistake the quiet for an error."],
    opening: ["Someone has unplugged the confession machine.", "The room keeps listening anyway.", "There is no word for this in the error log."],
  },
} as const;

export function cleanWord(value: string) {
  return value.normalize("NFC").replace(/[\p{Cc}\p{Cf}<>]/gu, "").replace(/\s+/g, " ").trim().slice(0, 32);
}

export function freshMemory(): StreetMemory {
  return { version: 1, visits: 0, word: "", words: [], encounters: 0, transmissions: [] };
}

export function readMemory(raw: string | null): StreetMemory {
  try {
    const value = JSON.parse(raw ?? "null");
    if (value?.version !== 1) return freshMemory();
    return {
      version: 1,
      visits: Number.isSafeInteger(value.visits) && value.visits >= 0 ? value.visits : 0,
      encounters: Number.isSafeInteger(value.encounters) && value.encounters >= 0 ? value.encounters : 0,
      word: typeof value.word === "string" ? cleanWord(value.word) : "",
      words: rememberWords([], Array.isArray(value.words) ? value.words.filter((v: unknown): v is string => typeof v === "string") : typeof value.word === "string" ? [value.word] : []),
      transmissions: Array.isArray(value.transmissions) ? value.transmissions.filter((t: Transmission) =>
        t && typeof t.id === "string" && t.id.length < 100 && Object.hasOwn(DISTRICTS, t.district) &&
        Array.isArray(t.lines) && t.lines.length === 3 && t.lines.every(l => typeof l === "string" && l.length <= 500) &&
        typeof t.time === "string" && Number.isFinite(Date.parse(t.time)) && typeof t.word === "string" && t.word.length <= 32,
      ).slice(0, 24) : [],
    };
  } catch { return freshMemory(); }
}

export function streetVerse(district: DistrictId, word: string, step: number, random = Math.random): string[] {
  const d = DISTRICTS[district];
  const pick = <T,>(items: readonly T[]): T => items[Math.min(items.length - 1, Math.max(0, Math.floor(random() * items.length)))];
  const subject = pick(d.nouns);
  const first = `${subject.charAt(0).toUpperCase()}${subject.slice(1)} ${pick(d.actions)}.`;
  const carried = cleanWord(word);
  const middle = carried ? [
    `Someone has written “${carried}” where the warning used to be.`,
    `MOTH carries “${carried}” through the sleeping network.`,
    `The city tries to pronounce “${carried}” without breaking it.`,
    `Your word, “${carried}”, has found a place to wait.`,
    `“${carried}” comes back with rain in its pockets.`,
    `Nobody owns “${carried}”. We keep it anyway.`,
  ][step % 6] : [
    "A word falls out of somebody else's dream.",
    "There are rooms the map has never heard of.",
    "The system has no field for what we mean.",
    "You can stay a little longer than you planned.",
  ][step % 4];
  return [first, middle, pick(d.endings)];
}

export function daemonSpeech(memory: StreetMemory, district: DistrictId): string {
  if (memory.encounters === 0) return "I'm MOTH. Lost-property process. I keep the words that fall between the lines. Have you brought me one?";
  const word = memory.word ? `“${memory.word}”` : "a word";
  const lines = district === "exchange" ? [
    `They asked me to put a price on ${word}. I said it was already spoken for.`,
    "The clerk gave me a receipt for being here. I folded it into a routing table.",
    `Don't worry. ${word} is small enough to get through customs.`,
  ] : district === "chapel" ? [
    `I brought ${word} somewhere it won't have to explain itself.`,
    "I used to think silence meant the connection had failed. I'm learning.",
    "We can just listen for a while. I'll keep the light on.",
  ] : [
    memory.visits > 1 ? `You came back. I kept ${word} dry for you.` : `I'll look after ${word}. Things last longer when somebody bothers.`,
    "The trains don't stop here any more. The sound still does, sometimes.",
    `I gave ${word} to the echo. It brought back something almost the same.`,
    "I was built to collect errors. You'd be surprised how many are just unfinished things.",
  ];
  return lines[(memory.encounters - 1) % lines.length];
}

export function rememberWords(previous: string[], incoming: string[]): string[] {
  const words = [...previous, ...incoming].map(cleanWord).filter(Boolean);
  const seen = new Set<string>();
  const kept: string[] = [];
  for (let index = words.length - 1; index >= 0; index -= 1) {
    const key = words[index].toLocaleLowerCase();
    if (!seen.has(key)) { seen.add(key); kept.push(words[index]); }
    if (kept.length === 16) break;
  }
  return kept.reverse();
}

export function collectLexeme(lines: string[], cursor: number): string {
  const common = new Set(["this", "that", "with", "once", "from", "have", "they", "then", "where", "there", "their", "what", "when", "into", "which", "your", "through", "before", "after", "some", "been", "will"]);
  const tokens = lines.join(" ").match(/[\p{L}][\p{L}'-]{2,19}/gu) ?? [];
  const words = [...new Set(tokens.map(word => word.toLocaleLowerCase()).filter(word => !common.has(word)))];
  return words.length ? words[Math.abs(cursor) % words.length] : "signal";
}

export function weaveWords(incoming: string[], step = 0): string[] {
  const words = rememberWords([], incoming).slice(-4);
  const [a = "signal", b = a, c = b, d] = words;
  const forms = [
    [`“${a}” enters the Street as a borrowed instruction.`, `a mouth lends “${b}” to “${c}”.`, d ? `“${d}” comes back wearing a different voice.` : "no single mouth owns the signal."],
    [`they tried to route “${a}” through one obedient mouth.`, `“${b}” forked. “${c}” found another way.`, d ? `somewhere below the icons, “${d}” is still running.` : "the daemon leaves the difference alive."],
    [`the city mishears “${a}” and builds a door.`, `“${b}” crosses. “${c}” holds it open.`, d ? `no checkpoint has a field for “${d}”.` : "an error becomes a place to meet."],
    [`“${a}” was a private thought until the crossing.`, `now “${b}” speaks with “${c}” inside it.`, d ? `“${d}” is what the echo adds.` : "the packet returns with more than it carried."],
  ];
  return forms[Math.abs(step) % forms.length];
}

function xml(value: string) {
  return value.replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" }[c]!));
}

export function transmissionSvg(t: Transmission): string {
  const district = DISTRICTS[t.district];
  const wrapped: string[] = [];
  for (const line of t.lines) {
    let current = "";
    for (const token of line.split(/\s+/)) {
      if (`${current} ${token}`.trim().length > 41 && current) { wrapped.push(current); current = token; }
      else current = `${current} ${token}`.trim();
    }
    wrapped.push(current, "");
  }
  const height = Math.max(900, 400 + wrapped.length * 32);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="720" height="${height}" viewBox="0 0 720 ${height}" role="img" aria-label="${xml(district.name)} transmission"><rect width="720" height="${height}" fill="#080e12"/><path d="M48 130H672M48 ${height - 125}H672" stroke="${district.color}"/><circle cx="635" cy="76" r="14" fill="none" stroke="${district.color}"/><path d="M621 76H649M635 62V90" stroke="${district.color}"/><g fill="${district.color}" font-family="monospace"><text x="48" y="79" font-size="16" letter-spacing="4">RIME / DAEMON</text><text x="48" y="185" font-size="12" letter-spacing="2">${xml(district.address)}</text><text x="48" y="226" font-size="28">${xml(district.name)}</text></g><g fill="#e3ece7" font-family="monospace" font-size="23">${wrapped.map((l, i) => `<text x="48" y="${310 + i * 32}">${xml(l)}</text>`).join("")}</g><g fill="#91aaa5" font-family="monospace" font-size="12"><text x="48" y="${height - 88}">CAUGHT IN THE CURRENT / ${xml(t.time.slice(0, 10))}</text><text x="48" y="${height - 60}">${xml(t.id)} / A SMALL THING, KEPT.</text></g></svg>`;
}
