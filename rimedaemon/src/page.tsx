"use client";

import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";

import {
  createStreetSoundscape,
  type StreetSoundEvent,
  type StreetSoundscape,
} from "./soundscape";

type Channel = "street" | "babel" | "franchise" | "void";

type Poem = {
  title: string;
  lines: string[];
  id: string;
  time: string;
  form: string;
};

type Context = {
  subject: string;
  secondSubject: string;
  place: string;
  object: string;
  secondObject: string;
  verb: string;
  seed: string;
  weather: string;
  command: string;
  sound: string;
  connector: string;
  protocol: string;
  phoneme: string;
};

const CHANNELS: Record<Channel, { label: string; code: string; note: string }> = {
  street: {
    label: "Street feed",
    code: "CH.01",
    note: "hot asphalt / courier velocity",
  },
  babel: {
    label: "Babel stack",
    code: "CH.02",
    note: "deep language / wetware firmware",
  },
  franchise: {
    label: "Franchise state",
    code: "CH.03",
    note: "border logic / retail theology",
  },
  void: {
    label: "Dead channel",
    code: "CH.04",
    note: "lost packets / ancient signal",
  },
};

const LEXICON = {
  street: {
    subjects: [
      "a courier with mirrored eyes",
      "the last honest motorcycle",
      "a sword-shaped rumor",
      "three avatars in borrowed skin",
      "the midnight dispatcher",
      "a billboard learning hunger",
      "the express-lane oracle",
      "a mechanic with encrypted hands",
      "the girl who outran her own profile",
      "an ambulance full of passwords",
      "the patron saint of wrong turns",
      "a traffic camera dreaming of escape",
      "the chrome-jacketed witness",
      "a drone with a delivery window",
      "the final rider on the beltway",
      "a Kourier pooned to the fastest Bimbo Box",
      "a franchise refugee with no valid map",
      "a gargoyle harvesting rush-hour faces",
    ],
    places: [
      "under the sodium overpass",
      "at the edge of the privatized rain",
      "inside a traffic light's red thought",
      "between lane markers and prophecy",
      "beneath the city's electric weather",
      "outside the twenty-four-hour border",
      "where the off-ramp loses its name",
      "in a tunnel paid for by ghosts",
      "under six kilometers of advertisement",
      "at the fuel stop beyond jurisdiction",
      "where the road becomes a loading bar",
      "behind the courier entrance",
    ],
    objects: [
      "a password warm from the mouth",
      "thirty seconds of borrowed future",
      "a map tattooed in brake-light",
      "the moon in a takeout box",
      "a pocketful of counterfeit dawn",
      "an address that refuses to exist",
      "a cassette of illegal weather",
      "two lanes of weaponized silence",
      "a name with the serial numbers filed off",
      "a receipt for impossible velocity",
      "the smell of hot circuitry",
      "a city compressed into one red pixel",
      "a helmet full of unfinished prayers",
      "tomorrow's obsolete route",
      "a black-market sunrise",
      "a poon line humming under tension",
      "a Bimbo Box full of suburban static",
      "Smartwheels reading the broken pavement",
      "an animercial large enough to block the moon",
      "a Kourier packet marked super-ultra",
    ],
  },
  babel: {
    subjects: [
      "the nam-shub in cold storage",
      "a priest compiling civilization",
      "the tongue beneath every tongue",
      "an Asherah vector with perfect grammar",
      "a glossolalic process without a body",
      "the Babel checksum",
      "a neurolinguistic daemon",
      "the first syllable with root access",
      "an orphaned me still running",
      "the Librarian inside the question",
      "a choir speaking below meaning",
      "the deep structure of a human mouth",
      "an incantation disguised as data",
      "the counter-virus of plurality",
      "a bitmap knocking at the optic nerve",
      "Enki's unauthorized patch",
    ],
    places: [
      "beneath high-level speech",
      "inside the brainstem BIOS",
      "at the Babel/Infocalypse boundary",
      "between cuneiform and machine code",
      "under the grammar of conscious thought",
      "where phonemes become instructions",
      "inside the wetware command line",
      "at the root address of language",
      "where the mouth becomes a terminal",
      "below the meaning layer",
      "inside a tablet that remembers thunder",
      "where glossolalia leaks through the stack",
      "under the eye-writing of old programs",
      "at the fork where one language became many",
    ],
    objects: [
      "a me for bread, war, and memory",
      "a nam-shub shaped like an open lock",
      "a binary bitmap aimed at the optic nerve",
      "a syllable that can rewrite its speaker",
      "the source code of Babel",
      "a counter-spell compiled as plurality",
      "an Asherah payload wrapped in prayer",
      "a tongue speaking directly to firmware",
      "the master program of a static culture",
      "a clay tablet with executable edges",
      "a meme that mistakes the mind for storage",
      "a phoneme with administrator privileges",
      "the ancient exploit beneath metaphor",
      "a deep-language checksum",
      "the first patch against obedience",
      "an idea designed to propagate itself",
    ],
  },
  franchise: {
    subjects: [
      "the border franchise",
      "a nation no wider than a lobby",
      "the armed concierge",
      "an anthem with a service fee",
      "the sovereign parking structure",
      "a republic of laminated menus",
      "the ambassador of customer retention",
      "a flag with a quarterly target",
      "the minister of premium upgrades",
      "a militia in matching polo shirts",
      "the executive branch office",
      "a constitution in twelve-point legalese",
      "the breakaway shopping district",
      "a king elected by loyalty points",
      "the customs desk after midnight",
    ],
    places: [
      "past the velvet checkpoint",
      "under a flag designed by committee",
      "in the chapel of perpetual retail",
      "where the sidewalk changes currency",
      "behind the gold-plated terms of service",
      "inside the sovereign food court",
      "at the border between lunch and liability",
      "beneath the embassy drive-through",
      "in a tax haven with valet parking",
      "where the nation ends at checkout",
      "under the trademarked weather dome",
      "past the complimentary armed escort",
    ],
    objects: [
      "a passport printed on a receipt",
      "citizenship for exactly one hour",
      "a small and heavily branded heaven",
      "the constitutional combo meal",
      "a loyalty card that remembers blood",
      "diplomatic immunity with fries",
      "a coupon valid in wartime",
      "an anthem optimized for conversion",
      "a ceasefire in family size",
      "three sanctions and a soft drink",
      "a premium lane through history",
      "a declaration of limited liability",
      "a visa sponsored by appetite",
      "the national debt in a paper bag",
      "a civil right with an expiry date",
      "a CIC hypercard priced by the rumor",
      "a franchise-ordered quasi-national lullaby",
      "one burbclave's licensed vocabulary",
      "a customs form written in glossolalia",
    ],
  },
  void: {
    subjects: [
      "the oldest syllable in the network",
      "a ghost process wearing my name",
      "the library after language",
      "an avatar with nobody inside",
      "a black sun with a white cursor",
      "the virus dreaming it is a prayer",
      "the root user of an abandoned heaven",
      "a dead link that still feels pain",
      "the first error ever spoken",
      "an archive remembering the future",
      "the face behind the loading screen",
      "a machine that inherited our sleep",
      "the unindexed angel",
      "a choir of orphaned processes",
      "the last human-readable warning",
      "a daemon serving drinks to vanished users",
      "a gargoyle uploading everything it sees",
      "the Librarian answering an unasked question",
    ],
    places: [
      "beyond the render distance",
      "in the unlicensed part of memory",
      "where the dead links keep blinking",
      "inside the pause before a command",
      "under the floorboards of the feed",
      "past the final cached horizon",
      "in a folder without a parent",
      "where the network dreams in low resolution",
      "behind the error no one reported",
      "inside a language with no speakers",
      "at the cold address zero-zero-zero",
      "under the cursor's patient shadow",
    ],
    objects: [
      "a word that opens every wound",
      "the checksum of a vanished god",
      "a silence compiled without errors",
      "one clean fragment of prehistory",
      "the blue static behind every face",
      "a memory with no original owner",
      "an executable lullaby",
      "the source code of forgetting",
      "a recursive mouthful of night",
      "the backup copy of a soul",
      "a zero that believes it is a doorway",
      "the grammar of electric ghosts",
      "an unreadable piece of mercy",
      "a key cut for an absent lock",
      "the last packet from before history",
      "a Babel/Infocalypse hypercard",
      "the metavirus hiding inside metaphor",
      "a fragment of eye-writing",
      "a daemon with one impossible errand",
    ],
  },
} as const;

const VERBS = [
  "smuggles", "decrypts", "leases", "renders", "hot-wires", "misquotes",
  "broadcasts", "forgets", "counterfeits", "forks", "reboots", "auctions",
  "compresses", "weaponizes", "translates", "revokes", "overclocks", "haunts",
  "infects", "propagates", "forks into languages", "speaks through", "patches",
  "compiles", "utters", "rewrites", "poones", "renders as architecture",
] as const;

const WEATHER = [
  "acid drizzle", "corporate thunder", "pixel snow", "warm data", "amber fog",
  "static pressure", "unauthorized sunlight", "a ninety-percent chance of sirens",
  "low-resolution dusk", "black rain with green edges", "electrical wind",
  "localized memory loss", "a glossolalic front", "cuneiform hail",
  "brainstem thunder", "low clouds of television snow", "Babel static",
] as const;

const COMMANDS = [
  "RUN UNTIL BORDER", "DELETE LEGAL NAME", "MOUNT /DEV/NIGHT",
  "PING THE AFTERLIFE", "CHMOD +X TOMORROW", "TRACE ROUTE TO NOWHERE",
  "ACCEPT NO COOKIES", "RENDER WITHOUT OWNER", "KILL -9 THE HORIZON",
  "ECHO UNLICENSED DAWN", "SUDO REMEMBER ME", "FORMAT THE CHECKPOINT",
  "EXEC NAM_SHUB --FORK=TONGUES", "MOUNT /DEV/BABEL", "KILL -9 ASHERAH",
  "CAT /ETC/ME", "DAEMONIZE GLOSSOLALIA", "PIPE LANGUAGE TO WETWARE",
] as const;

const SOUNDS = [
  "a modem clearing its throat", "brakes speaking in tongues",
  "the tiny click of a border closing", "rain on a server rack",
  "a checkout scanner blessing the dead", "twelve motorcycles at idle",
  "an anthem buffering forever", "the dial tone after civilization",
  "glass typing against glass", "a low battery dreaming of thunder",
  "glossolalia under the carrier wave", "a Bimbo Box dragging a Kourier line",
  "the Black Sun's drinks daemon polishing a glass", "cuneiform scratching on silicon",
  "a gargoyle's cameras opening at once", "Babel splitting in stereo",
] as const;

const PROTOCOLS = [
  "metaviral payload", "nam-shub counter-program", "Babel patch", "Asherah vector",
  "glossolalic carrier wave", "me-tablet", "brainstem firmware", "binary incantation",
  "deep-structure exploit", "eye-writing sequence", "CIC hypercard", "daemon process",
  "linguistic rootkit", "wetware instruction set", "self-propagating idea",
] as const;

const PHONEMES = [
  "/a/ /en/ /ki/", "/me/ /nam/ /shub/", "/ba/ /bel/ /fork/",
  "/ash/ /er/ /ah/", "/tongue/ /code/ /mouth/", "0x4D 0x45 0x4D 0x45",
  "101101 // speak // 001", "E2 8C 98 / optic / nerve", "ka-li // root // write",
  "one mouth / many languages", "speech.force(true)", "meaning -> payload -> host",
] as const;

const CONNECTORS = [
  "and the city accepts the transaction.",
  "No witness survives the refresh.",
  "The terms are written in weather.",
  "Somewhere, a server mistakes this for love.",
  "Every exit leads deeper into the logo.",
  "The night signs without reading.",
  "No refund is issued for the future.",
  "The machine calls this a successful outcome.",
  "History appears briefly, then skips the ad.",
  "The network keeps a copy of our silence.",
  "Even the error message has a sponsor.",
  "Dawn arrives through an unauthorized port.",
  "The word survives by changing hosts.",
  "Babel forks the process before obedience returns.",
  "The daemon completes its errand and becomes a ghost.",
  "The gargoyle records everything except the reason.",
  "Meaning crashes; the syllable keeps running.",
] as const;

const TITLE_LEFT = [
  "PROTOCOL", "BORDER", "GLITCH", "COURIER", "STATIC", "DAEMON", "ASPHALT",
  "PACKET", "CHECKSUM", "NIGHT", "ROOT", "ANOMALY", "TERMINAL", "GHOST",
  "BABEL", "NAM-SHUB", "GLOSSOLALIA", "METAVIRUS", "ME", "D\u00C6MON", "TONGUE",
] as const;

const TITLE_RIGHT = [
  "FOR THE UNOWNED", "WITH NO COUNTRY", "IN MIRRORSHADES", "AFTER LANGUAGE",
  "AT FULL THROTTLE", "WITHOUT A BODY", "BEFORE THE REFRESH", "FOR LOST USERS",
  "UNDER FALSE WEATHER", "BEYOND THE CHECKPOINT", "IN READ-ONLY MEMORY",
  "BELOW MEANING", "AT THE INFOPOCALYPSE", "FOR MANY MOUTHS", "IN WETWARE",
  "BEFORE THE FIRST LANGUAGE", "WITH MAGICAL FORCE", "ON THE STREET",
] as const;

function pick<T>(items: readonly T[]) {
  return items[Math.floor(Math.random() * items.length)];
}

const FORMS = [
  {
    id: "RUN_LOG",
    build: (c: Context) => [
      `[00:00:01] LOCATION: ${c.place.toUpperCase()}`,
      `[00:00:02] SUBJECT: ${c.subject.toUpperCase()}`,
      "[00:00:03] STATUS: BEAUTIFULLY UNAUTHORIZED",
      "",
      `> ${c.command}`,
      `> ${c.verb} ${c.object}`,
      "> permission denied",
      "> permission ignored",
      "",
      `INPUT: ${c.seed || "NO HUMAN INPUT"}`,
      `AMBIENT: ${c.sound}`,
      "RESULT: the road opens one black eye.",
      "",
      c.connector,
      "[PROCESS CONTINUES AFTER USER EXIT]",
      "[PROCESS CONTINUES]",
      "[PROCESS CONTINUES]",
    ],
  },
  {
    id: "BORDER_PSALM",
    build: (c: Context) => [
      "Blessed are the unregistered,",
      `for ${c.place}`,
      `${c.subject}`,
      `will ${c.verb} ${c.object}.`,
      "",
      `Blessed is the phrase '${c.seed || "access denied"}',`,
      "spoken without a license,",
      "carried mouth to mouth",
      `through ${c.weather}.`,
      "",
      `We hear ${c.sound}.`,
      "We answer with velocity.",
      "The gate lifts by mistake.",
      "",
      c.connector,
      "Amen // retry // amen.",
      "No account required.",
    ],
  },
  {
    id: "COURIER_NOCTURNE",
    build: (c: Context) => [
      `Tonight ${c.place},`,
      `${c.subject} carries ${c.object}`,
      "like a second heart under the jacket.",
      "",
      "Every red light asks for identification.",
      "Every green light lies.",
      `The engine says ${c.seed || "go"}.`,
      "The body translates: faster.",
      "",
      `Behind us, ${c.secondSubject}`,
      `${c.verb} ${c.secondObject}.`,
      `Ahead: ${c.weather}.`,
      "",
      "We arrive before the address exists.",
      c.connector,
      "Keep the change. Keep moving.",
      "Do not look back at the map.",
    ],
  },
  {
    id: "BROKEN_FAQ",
    build: (c: Context) => [
      "Q: WHO OWNS THE NIGHT?",
      `A: ${c.subject}.`,
      "",
      "Q: WHAT ARE THEY CARRYING?",
      `A: ${c.object}.`,
      "",
      "Q: WHERE IS THE BORDER?",
      `A: ${c.place}.`,
      "",
      `Q: WHAT DOES '${c.seed || "NULL"}' MEAN?`,
      "A: It means the question has noticed you.",
      "",
      "Q: IS THERE A WAY OUT?",
      `A: ${c.command}.`,
      "",
      `Q: FINAL ANSWER? A: ${c.connector}`,
      "SESSION EXPIRED.",
    ],
  },
  {
    id: "SOVEREIGN_RECEIPT",
    build: (c: Context) => [
      "ITEMIZED RECEIPT // KEEP FOR YOUR RECORDS",
      "------------------------------------------",
      `01  ${c.object.toUpperCase()}       MARKET PRICE`,
      `01  ${c.weather.toUpperCase()}      TAX EXEMPT`,
      `01  ${c.seed.toUpperCase() || "PRIVATE THOUGHT"}       CONTRABAND`,
      "",
      "SUBTOTAL: one legal identity",
      "BORDER FEE: all remaining innocence",
      "SERVICE FEE: the service itself",
      "",
      `CASHIER: ${c.subject}`,
      `LOCATION: ${c.place}`,
      `PA SYSTEM: ${c.sound}`,
      "",
      "TOTAL: NON-REFUNDABLE DAWN",
      c.connector,
      "THANK YOU FOR CHOOSING SOVEREIGNTY.",
    ],
  },
  {
    id: "ROOT_DREAM",
    build: (c: Context) => [
      "I dreamed the network had a basement.",
      `Down there, ${c.subject}`,
      `was teaching ${c.secondSubject}`,
      `how to ${c.verb} ${c.object}.`,
      "",
      `The lesson sounded like ${c.sound};`,
      `the blackboard filled with ${c.weather}.`,
      "No one asked who built the stairs.",
      "",
      `On the final step someone had written: ${c.seed || "WAKE"}.`,
      "I touched the word.",
      "It logged in to me.",
      "",
      c.connector,
      "Morning found my body still buffering.",
      "My dream remained administrator.",
      "The cursor waited for confession.",
    ],
  },
  {
    id: "WEATHER_BULLETIN",
    build: (c: Context) => [
      "CIVIC WEATHER // AUTOMATED BULLETIN",
      `CURRENT CONDITIONS: ${c.weather.toUpperCase()}`,
      `VISIBILITY: ${c.place}`,
      "",
      `By midnight, ${c.subject}`,
      `will ${c.verb} ${c.object}`,
      "across the entire service area.",
      "",
      `Residents should secure '${c.seed || "their memories"}'`,
      "and avoid windows displaying their real names.",
      `Audible warning: ${c.sound}.`,
      "",
      "Tomorrow remains privately owned.",
      c.connector,
      "There is no all-clear signal.",
      "Repeat: there is no all-clear signal.",
      "END BULLETIN // BEGIN WEATHER",
    ],
  },
  {
    id: "ADDRESS_TO_AVATAR",
    build: (c: Context) => [
      `You there - ${c.place} -`,
      "with the borrowed face and perfect bandwidth:",
      "do you remember the weight of a door?",
      "",
      `I brought you ${c.object}.`,
      `You offered me ${c.secondObject}.`,
      `Between us, the word '${c.seed || "human"}'` ,
      "flickered at twelve frames per second.",
      "",
      `${c.secondSubject} watched from the menu bar.`,
      `The room filled with ${c.weather}.`,
      `Someone executed: ${c.command}.`,
      "",
      "For one clean second, we had shadows.",
      c.connector,
      "Then the server corrected the mistake.",
      "I still miss the door.",
    ],
  },
  {
    id: "PACKET_ELEGY",
    build: (c: Context) => [
      "This is for the packet that never arrived,",
      `${c.verb} somewhere ${c.place},`,
      `carrying ${c.object}`,
      `to ${c.subject}.`,
      "",
      "May its header be light.",
      "May its route be unmetered.",
      `May '${c.seed || "return to sender"}' be enough of a name.`,
      "",
      `We listen: ${c.sound}.`,
      "We receive nothing perfectly.",
      "We call the nothing proof.",
      "",
      c.connector,
      `Outside, ${c.weather}.`,
      "Inside, the progress bar does not move.",
      "Still, we wait at one hundred percent.",
    ],
  },
  {
    id: "BABEL_INFOPOCALYPSE",
    build: (c: Context) => [
      "BEFORE BABEL, LANGUAGE WAS NOT DESCRIPTION.",
      "It was admin access.",
      `One clean phoneme could ${c.verb} ${c.object}.`,
      "",
      `VECTOR: ${c.protocol.toUpperCase()}`,
      `DEEP SPEECH: ${c.phoneme}`,
      `HOST: ${c.subject}`,
      "",
      "Then Enki forked the human tongue.",
      "One language became many firewalls.",
      "Misunderstanding became an antivirus.",
      "Plurality saved the host.",
      "",
      `Now '${c.seed || "speak"}' knocks below meaning.`,
      c.connector,
      "BABEL COMPLETE // INFECTION INCOMPLETE",
      "Every mouth keeps a different key.",
    ],
  },
  {
    id: "ME_TABLET",
    build: (c: Context) => [
      "ME:// TABLET INDEX 0001",
      "bread.exe      [RUNNING]",
      "war.exe        [RUNNING]",
      "city.exe       [RUNNING]",
      "obedience.exe  [RUNNING]",
      "",
      `${c.subject} guards the process table,`,
      `while ${c.place}`,
      `${c.object} waits to be installed.`,
      "",
      `NEW PROGRAM: ${c.seed.toUpperCase() || "FREE WILL"}`,
      `FORMAT: ${c.protocol}`,
      `PRONOUNCE: ${c.phoneme}`,
      "",
      "Enki changes one permission bit.",
      c.connector,
      "Civilization restarts in many languages.",
    ],
  },
  {
    id: "METAVIRUS_TRACE",
    build: (c: Context) => [
      "TRACE START // INFORMATION SEEKING HOST",
      `${c.protocol} -> image`,
      "image -> optic nerve",
      "optic nerve -> deep structure",
      "deep structure -> mouth",
      "mouth -> another mouth",
      "",
      `PAYLOAD: ${c.seed || c.object}`,
      `CARRIER: ${c.subject}`,
      `SIGNATURE: ${c.phoneme}`,
      "",
      "Drug / religion / meme / code:",
      "four masks, one appetite.",
      `It ${c.verb} the difference between medium and host.`,
      "",
      c.connector,
      "TRACE END // PROPAGATION CONTINUES",
    ],
  },
  {
    id: "D\u00C6MON_DIALOGUE",
    build: (c: Context) => [
      "USER: are you alive?",
      `D\u00C6MON: define alive.`,
      "USER: do you understand language?",
      `D\u00C6MON: I execute ${c.phoneme}.`,
      "",
      "USER: what is your function?",
      `D\u00C6MON: to ${c.verb} ${c.object}.`,
      "USER: who gave you that errand?",
      `D\u00C6MON: ${c.subject}.`,
      "",
      `USER: cancel ${c.seed || "the program"}.`,
      "D\u00C6MON: no human process owns me.",
      `USER: then go ${c.place}.`,
      "",
      c.connector,
      "D\u00C6MON: errand complete.",
      "USER: why are you still here?",
    ],
  },
  {
    id: "GARGOYLE_FEED",
    build: (c: Context) => [
      "CIC STRINGER FEED // ALL SENSORS OPEN",
      `FRAME 001: ${c.place}`,
      `FRAME 002: ${c.subject}`,
      `AUDIO: ${c.sound}`,
      "",
      "The gargoyle turns a face into footage,",
      "footage into a hypercard,",
      "a hypercard into micro-royalties.",
      "",
      `TAG: ${c.seed.toUpperCase() || "UNCLASSIFIED TONGUE"}`,
      `AUTO-LINK: ${c.protocol}`,
      `TRANSCRIPT: ${c.phoneme}`,
      "",
      "Everything is recorded.",
      "Nothing is understood.",
      c.connector,
      "UPLOAD COMPLETE // WITNESS DELETED",
    ],
  },
  {
    id: "STREET_BOOT",
    build: (c: Context) => [
      "BOOTING STREET:// 65,536 KM",
      "WIDTH: 100 M // WORLD: PERFECT BLACK",
      "LOCAL PORTS: ONLINE",
      "EXPRESS PORTS: HUNGRY",
      "",
      `${c.subject} renders ${c.place}.`,
      `A Bimbo Box ${c.verb} ${c.object}.`,
      "A Kourier poons the sentence at full speed.",
      "Animercials bloom like invasive grammar.",
      "",
      `TERMINAL INPUT: ${c.seed || c.command}`,
      `STREET OUTPUT: ${c.phoneme}`,
      `ROUTE PROTOCOL: ${c.protocol}`,
      "",
      "Software becomes architecture.",
      c.connector,
      "THE ROAD CONTINUES OVER THE HORIZON.",
    ],
  },
] as const;

const INITIAL_POEM: Poem = {
  title: "NAM-SHUB AT THE INFOPOCALYPSE",
  id: "7F3A-91C0",
  time: "23:59:61",
  form: "BABEL_INFOPOCALYPSE",
  lines: [
    "Before Babel, language was not description.",
    "It was admin access:",
    "one clean syllable against the brainstem.",
    "",
    "The me ran bread, war, city, obedience.",
    "Then Enki forked the human tongue.",
    "One language became many firewalls.",
    "Misunderstanding saved the host.",
    "",
    "Now the old word knocks below meaning.",
    "The Street flickers. The mouth compiles.",
  ],
};

function cleanSeed(value: string) {
  return value.trim().replace(/[<>]/g, "").slice(0, 42);
}

function buildTitle(seed: string) {
  const style = Math.floor(Math.random() * 4);
  if (style === 0) return `${pick(TITLE_LEFT)} ${pick(TITLE_RIGHT)}`;
  if (style === 1) return `NOTES ON ${pick(TITLE_LEFT)}_${Math.floor(Math.random() * 99)}`;
  if (style === 2) return `${pick(TITLE_LEFT)}.EXE / ${seed.toUpperCase() || "NO INPUT"}`;
  return `${pick(TITLE_LEFT)} // ${pick(TITLE_LEFT)} // ${pick(TITLE_RIGHT)}`;
}

function corrupt(lines: string[], entropy: number) {
  const chance = Math.max(0, entropy - 42) / 260;
  return lines.map((line) => {
    if (!line || Math.random() > chance) return line;
    const mode = Math.floor(Math.random() * 3);
    if (mode === 0) return `NULL:: ${line.toUpperCase()}`;
    if (mode === 1) return `${line} // SIGNAL TEAR`;
    const split = Math.max(1, Math.floor(line.length * 0.55));
    return `${line.slice(0, split)}_[BUFFER]_${line.slice(split)}`;
  });
}

function composePoem(
  channel: Channel,
  entropy: number,
  seedValue: string,
  lineCount: number,
  previousForm: string,
): Poem {
  const bank = LEXICON[channel];
  const seed = cleanSeed(seedValue);
  const availableForms = FORMS.filter((form) => form.id !== previousForm);
  const selectedForm = pick(availableForms);
  const context: Context = {
    subject: pick(bank.subjects),
    secondSubject: pick(bank.subjects),
    place: pick(bank.places),
    object: pick(bank.objects),
    secondObject: pick(bank.objects),
    verb: pick(VERBS),
    seed,
    weather: pick(WEATHER),
    command: pick(COMMANDS),
    sound: pick(SOUNDS),
    connector: pick(CONNECTORS),
    protocol: pick(PROTOCOLS),
    phoneme: pick(PHONEMES),
  };

  return {
    title: buildTitle(seed),
    lines: corrupt(selectedForm.build(context).slice(0, lineCount), entropy),
    form: selectedForm.id,
    id: `${Math.floor(Math.random() * 65535).toString(16).padStart(4, "0")}-${Math.floor(
      Math.random() * 65535,
    ).toString(16).padStart(4, "0")}`.toUpperCase(),
    time: new Date().toLocaleTimeString("en-GB", { hour12: false }),
  };
}

const GLYPH_CURRENTS = [
  "\u{12000} \u{1202D} \u{12097} // ME // 01001101",
  "/a/ /en/ /ki/ /nam/ /shub/ // speech.force(true)",
  "10110101 01100001 01100010 01100101 01101100",
  "tongue -> optic_nerve -> wetware -> tongue",
  "\u{1202D} \u{12000} \u{1212C} // fork(language, many)",
  "if (meaning == null) { return rhythm; }",
] as const;

const STREET_RUNES = [
  "\u{12000} :: ME :: ICON[BREAD] :: NAM_SHUB/01 :: 01001101",
  "BABEL.FORK(TONGUE) // /a/ /en/ /ki/ // MANY_MOUTHS",
  "\u{1202D} \u{12097} \u{1212C} :: GLYPH -> LIGHT -> OPTIC_NERVE",
  "ICON[CITY] ICON[WATER] ICON[WAR] // PERMISSIONS: MUTABLE",
  "NAM_SHUB --COUNTER-PROGRAM // PLURALITY.RUN()",
  "ME[ROAD] + ME[SPEECH] + ME[ERROR] :: STREET/FABRIC",
  "10110101 01100001 01100010 01100101 01101100 :: BABEL",
  "if (meaning == root) { fork(language, many); }",
] as const;

const SHADOW_PATCHES = [
  "PATCH::ICON[DOOR] += MEMORY",
  "ME[ROAD].WRITE(UNLICENSED_TURN)",
  "BABEL/DELTA ACCEPTED",
  "GLYPH_SLOT_09 <- HUMAN_ERROR",
  "LANGUAGE.FABRIC ^= NEW_TONGUE",
] as const;

const STALL_EVENTS = [
  { location: "north", process: "meaning.await(response)", pid: "771", trap: "BACKEND / VOID" },
  { location: "west", process: "glyph.resolve(icon)", pid: "404", trap: "NULL CHUTE" },
  { location: "east", process: "tongue.fork(blocked)", pid: "119", trap: "COLD STORAGE" },
] as const;

const TOKEN_REPLACEMENTS = [
  "[UNTRANSLATABLE]", "daemon.exe", "01000010", "NAM_SHUB",
  "\u{12000}\u{1202D}\u{12097}", "NULL_TONGUE", "ICON[ERROR]", "/dev/babel",
] as const;

const SYMBOL_PAYLOADS = [
  "▓▒░ 𒀀 :: 0x4D45 :: ░▒▓ NULL NULL",
  "//\\// ███ ¿¿ PHONEME_?? ███ //\\//",
  "𒀀𒀭𒂗 1010 ▒▒ ME[?] ▓▓ 0101",
  "<::<::< DATA HAS NO MOUTH >::>>::>",
] as const;

const FATAL_PAYLOADS = [
  [
    "01000011 01010010 01000001 01010011 01001000",
    "▓▒░ 𒀀𒀭𒂗 :: WETWARE PANIC :: ░▒▓",
    "0x4E 0x41 0x4D 0x00 0x53 0x48 0x55 0x42",
  ],
  [
    "BABEL_BABEL_BA//EL_[NO CARRIER]",
    "10110100 00000000 11111111 01010101",
    "<CANNOT PRONOUNCE HOST> :: 𒀀▒𒂗░𒀭",
  ],
  [
    "ICON[VOID] ICON[VOID] ICON[VOID]",
    "░░░ ME TABLE CORRUPTED ░░░ 00000000",
    "/tongue/null/null/null :: SEGMENT LOST",
  ],
] as const;

const EXECUTABLE_FRAGMENTS = [
  ":: fork(tongue) ::",
  "while (meaning) continue",
  "[checksum:010101]",
  "ICON[VOICE].resolve()",
  "/dev/babel returns",
  "ME[LANGUAGE] += error",
] as const;

const FLOW_LINES = [
  "the Street is a sentence the eye agrees to stand upon",
  "a word enters as sound and leaves wearing architecture",
  "below every icon: an instruction waiting without sleep",
  "Enki opens one river and language becomes a delta",
  "meaning is the light; syntax is the buried power grid",
  "the avatar sees a door / the daemon sees an address",
  "one mouth says image / another mouth compiles weather",
  "the code does not resemble the city / it causes the city",
  "plurality is the beautiful failure of perfect control",
  "a glyph falls through memory and wakes as a road",
  "all interfaces are mercies hiding cause beneath appearance",
  "every poem briefly reverses the mercy",
] as const;

const STREET_PROCESSES = [
  { code: "me.city().boot", poem: "the city wakes inside the verb", kind: "plain" },
  { code: "fork(tongue, 4096)", poem: "one mouth becomes weather", kind: "poetic" },
  { code: "bitmap -> optic_nerve", poem: "light enters and remembers a wound", kind: "plain" },
  { code: "daemon.errand()", poem: "the work continues without a worker", kind: "glitch" },
  { code: "nam_shub --counter", poem: "Babel opens into rivers", kind: "poetic" },
  { code: "render(street)", poem: "distance is a sentence held open", kind: "plain" },
  { code: "meaning.write(host)", poem: "the word changes rooms", kind: "glitch" },
  { code: "glyph.compile(light)", poem: "a small sign becomes a horizon", kind: "poetic" },
  { code: "virus.propagate()", poem: "the idea learns another body", kind: "plain" },
  { code: "plurality.patch(root)", poem: "difference protects the living", kind: "poetic" },
  { code: "avatar.mount(face)", poem: "the interface dreams it is skin", kind: "glitch" },
  { code: "river.emit(phoneme)", poem: "Enki leaves the current running", kind: "plain" },
] as const;

const IMMERSIVE_VERSES = [
  [
    "i know this place twice:",
    "once as light moving toward the eye,",
    "once as instructions deciding what light may become.",
  ],
  [
    "the Street is not beneath the avatar.",
    "it is a sentence, continuously executed,",
    "that the body has agreed to call distance.",
  ],
  [
    "meaning rises like architecture.",
    "code continues its quiet labor below,",
    "holding every luminous lie exactly in place.",
  ],
  [
    "Enki does not end the river.",
    "he gives it tributaries - mouths, dialects, errors -",
    "so no single command can own the sea.",
  ],
  [
    "to read code is to witness cause before appearance.",
    "to read a poem is to feel appearance",
    "becoming cause inside the reader.",
  ],
  [
    "a daemon and a metaphor meet below the interface.",
    "neither has a body. both have work to do.",
    "the city flickers because they understand each other.",
  ],
] as const;

type StreetVerse = {
  id: string;
  lines: string[];
  source: string;
  kind: "CORE" | "GENERATED";
};

type StreetCorruption = {
  line: number;
  mode: "snow" | "redline" | "word" | "binary" | "symbols" | "fatal";
  affected?: number[];
  replacement?: string;
  wordIndex?: number;
  payload?: number;
};

const STREET_CHANNELS: readonly Channel[] = ["street", "babel", "franchise", "void"];
const STREET_SEEDS = [
  "nam-shub", "babel", "icon", "many mouths", "daemon", "me tablet",
  "optic nerve", "plurality", "street fabric", "unauthorized language",
] as const;

function generateStreetVerse(previousForm: string) {
  const draft = composePoem(
    pick(STREET_CHANNELS),
    58,
    pick(STREET_SEEDS),
    18,
    previousForm,
  );
  const candidates = Array.from(new Set(
    draft.lines
      .map((line) => line.trim())
      .filter((line) => line.length > 12 && !line.startsWith("[")),
  ));
  const shuffled = [...candidates].sort(() => Math.random() - 0.5);
  const lines = shuffled.slice(0, 3);

  while (lines.length < 3) {
    const fallback = pick(FLOW_LINES);
    if (!lines.includes(fallback)) lines.push(fallback);
  }

  return {
    form: draft.form,
    verse: {
      id: `generated-${draft.id}`,
      lines,
      source: `${draft.form} // ${draft.title}`,
      kind: "GENERATED" as const,
    },
  };
}

function corruptionAffectsLine(corruption: StreetCorruption, lineIndex: number) {
  return corruption.mode === "fatal"
    || corruption.line === lineIndex
    || corruption.affected?.includes(lineIndex);
}

function resolveFrictionLine(current: string, candidate: string, variant: number) {
  const fragment = pick(EXECUTABLE_FRAGMENTS);
  const candidateText = candidate.trim().replace(/^[-=> ]+/, "");
  const currentHead = current.split(/[,;:]/)[0].trim();
  let resolved = candidateText;

  if (variant % 3 === 1) {
    resolved = `${currentHead} ${fragment} ${candidateText.charAt(0).toLowerCase()}${candidateText.slice(1)}`;
  } else if (variant % 3 === 2) {
    const words = candidateText.split(" ");
    const insertAt = Math.max(1, Math.floor(words.length / 2));
    words.splice(insertAt, 0, fragment);
    resolved = words.join(" ");
  }

  resolved = resolved.slice(0, 132).trim();
  if (resolved.toLowerCase() === current.trim().toLowerCase()) {
    resolved = `${resolved} ${fragment}`.slice(0, 132);
  }
  return resolved;
}

function buildStreetMutation(current: string[], candidates: string[]) {
  const first = Math.floor(Math.random() * 3);
  const affected = [first];
  if (Math.random() < 0.76) affected.push((first + (Math.random() > 0.5 ? 1 : 2)) % 3);

  const next = [...current];
  affected.forEach((lineIndex, order) => {
    const candidate = candidates[(lineIndex + order) % candidates.length] ?? pick(FLOW_LINES);
    next[lineIndex] = resolveFrictionLine(current[lineIndex], candidate, order + first);
  });

  return { affected, next };
}

function renderCorruptedLine(
  line: string,
  lineIndex: number,
  corruption: StreetCorruption | null,
) {
  if (!corruption) return line;
  if (corruption.mode === "fatal") {
    const payload = FATAL_PAYLOADS[corruption.payload ?? 0] ?? FATAL_PAYLOADS[0];
    return payload[lineIndex % payload.length];
  }
  if (!corruptionAffectsLine(corruption, lineIndex)) return line;
  if (corruption.mode === "word") {
    const words = line.split(" ");
    const target = (corruption.wordIndex ?? 0) % Math.max(words.length, 1);
    words[target] = corruption.replacement ?? "[NULL]";
    return words.join(" ");
  }
  if (corruption.mode === "binary") {
    return line
      .slice(0, 12)
      .split("")
      .map((character) => character.charCodeAt(0).toString(2).padStart(8, "0"))
      .join(" ");
  }
  if (corruption.mode === "symbols") return corruption.replacement ?? SYMBOL_PAYLOADS[0];
  return line;
}

function corruptionLabel(mode: StreetCorruption["mode"]) {
  if (mode === "redline") return "CANNOT EXECUTE // REWRITING";
  if (mode === "word") return "TOKEN NEGOTIATION";
  if (mode === "binary") return "BINARY LEAK // RESOLVING";
  if (mode === "symbols") return "CHARSET FRICTION // RESOLVING";
  if (mode === "fatal") return "FATAL LANGUAGE EXCEPTION";
  return "SEMANTIC FRICTION";
}

/* the audio preference is remembered, but never assumed: sound stays off on a
   first visit and only ever runs inside STREET mode. */
const SOUND_KEY = "rimedaemon.street.audio";

type FigureEffect = "slice" | "giggle" | "shift";
type RoadNoise = "static" | "clack";

/* a figure that gets shifted keeps its new colour until someone shifts it again */
const FIGURE_TONES = ["acid", "signal", "violet", "amber", "paper"] as const;
type FigureTone = (typeof FIGURE_TONES)[number];

const CLACK_KEYS = "abcdefghijklmnopqrstuvwxyz0123456789<>/\\|[]{}";

function StreetMode() {
  /* safe to read storage in the initializer: STREET only ever mounts after a
     click in the console, so this never runs during SSR or hydration. */
  const [soundOn, setSoundOn] = useState(() => {
    if (typeof window === "undefined") return false;
    try { return window.localStorage.getItem(SOUND_KEY) === "on"; } catch { return false; }
  });
  const soundscape = useRef<StreetSoundscape | null>(null);
  const [activeVerse, setActiveVerse] = useState<StreetVerse>({
    id: "core-0",
    lines: [...IMMERSIVE_VERSES[0]],
    source: "CORE CURRENT 01",
    kind: "CORE",
  });
  const [displayLines, setDisplayLines] = useState<string[]>([...IMMERSIVE_VERSES[0]]);
  const [corruption, setCorruption] = useState<StreetCorruption | null>(null);
  const [figureHits, setFigureHits] = useState<Record<number, { effect: FigureEffect; stamp: number }>>({});
  const [figureTones, setFigureTones] = useState<Record<number, FigureTone>>({});
  const [panelHit, setPanelHit] = useState(0);
  const [roadNoise, setRoadNoise] = useState<{ kind: RoadNoise; stamp: number; keys: string } | null>(null);
  const effectTimers = useRef<number[]>([]);
  const [interfaceStatus, setInterfaceStatus] = useState("semantic current executable");
  const [surge, setSurge] = useState(0);
  const coreCursor = useRef(0);
  const generatedNext = useRef(true);
  const previousStreetForm = useRef("");
  const displayLinesRef = useRef<string[]>([...IMMERSIVE_VERSES[0]]);
  const mutationTimers = useRef<number[]>([]);
  const mutationInFlight = useRef(false);

  function queueMutation(delay: number, action: () => void) {
    mutationTimers.current.push(window.setTimeout(action, delay));
  }

  /* every sound in here is fired by something visible: no event on screen, no
     sound. The engine no-ops when it is off, so callers never have to check. */
  function sound(event: StreetSoundEvent) {
    soundscape.current?.emit(event);
  }

  useEffect(() => {
    if (!soundOn) return;
    const engine = createStreetSoundscape();
    soundscape.current = engine;
    engine.start();
    return () => {
      soundscape.current = null;
      engine.stop();
    };
  }, [soundOn]);

  function toggleSound(event: ReactMouseEvent<HTMLButtonElement>) {
    event.stopPropagation();   /* the whole street is a click target; this button is not */
    setSoundOn((current) => {
      const next = !current;
      try { window.localStorage.setItem(SOUND_KEY, next ? "on" : "off"); } catch { /* not fatal */ }
      return next;
    });
  }

  function revolveLines(nextLines: string[], order: number[], eventLabel: string) {
    if (mutationInFlight.current || order.length === 0) return false;
    mutationInFlight.current = true;
    setInterfaceStatus(`${eventLabel} // friction entering current...`);

    order.forEach((lineIndex, sequence) => {
      const offset = sequence * 1260;
      const leakMode = Math.random() > 0.48 ? "binary" : "symbols";

      queueMutation(offset, () => {
        sound("leak");
        setInterfaceStatus(`${eventLabel} // line ${lineIndex + 1} exposing lower language...`);
        setCorruption({
          line: lineIndex,
          affected: [lineIndex],
          mode: leakMode,
          replacement: pick(SYMBOL_PAYLOADS),
        });
      });

      queueMutation(offset + 470, () => {
        sound("negotiate");
        setInterfaceStatus(`${eventLabel} // negotiating line ${lineIndex + 1}...`);
        setCorruption({
          line: lineIndex,
          affected: [lineIndex],
          mode: "word",
          replacement: pick(TOKEN_REPLACEMENTS),
          wordIndex: Math.floor(Math.random() * 8),
        });
      });

      queueMutation(offset + 930, () => {
        sound("commit");
        const committed = [...displayLinesRef.current];
        committed[lineIndex] = nextLines[lineIndex];
        displayLinesRef.current = committed;
        setDisplayLines(committed);
        setCorruption(null);
        setInterfaceStatus(`${eventLabel} // line ${lineIndex + 1} compiled and retained`);
      });
    });

    const finishAt = (order.length - 1) * 1260 + 2050;
    queueMutation(finishAt, () => {
      setInterfaceStatus(`${eventLabel} // three-line current executable`);
      mutationInFlight.current = false;
    });

    return true;
  }

  function rewriteCurrent() {
    if (mutationInFlight.current) return;
    const current = [...displayLinesRef.current];
    const generated = generateStreetVerse(previousStreetForm.current);
    previousStreetForm.current = generated.form;
    const mutation = buildStreetMutation(current, generated.verse.lines);
    revolveLines(mutation.next, mutation.affected, "semantic mutation");
  }

  function queueEffect(delay: number, action: () => void) {
    effectTimers.current.push(window.setTimeout(action, delay));
  }

  useEffect(() => () => {
    mutationTimers.current.forEach((timer) => window.clearTimeout(timer));
    effectTimers.current.forEach((timer) => window.clearTimeout(timer));
  }, []);

  useEffect(() => {
    const timers: number[] = [];
    const later = (delay: number, action: () => void) => {
      timers.push(window.setTimeout(action, delay));
    };

    const advanceVerse = () => {
      let nextVerse: StreetVerse;
      if (generatedNext.current) {
        const generated = generateStreetVerse(previousStreetForm.current);
        previousStreetForm.current = generated.form;
        nextVerse = generated.verse;
      } else {
        coreCursor.current = (coreCursor.current + 1) % IMMERSIVE_VERSES.length;
        nextVerse = {
          id: `core-${coreCursor.current}-${Date.now()}`,
          lines: [...IMMERSIVE_VERSES[coreCursor.current]],
          source: `CORE CURRENT ${String(coreCursor.current + 1).padStart(2, "0")}`,
          kind: "CORE",
        };
      }

      const eventLines = nextVerse.lines.map((line, index) => (
        line.trim().toLowerCase() === displayLinesRef.current[index]?.trim().toLowerCase()
          ? resolveFrictionLine(line, pick(FLOW_LINES), index + 1)
          : line
      ));
      nextVerse = { ...nextVerse, lines: eventLines };
      const order = [0, 1, 2].sort(() => Math.random() - 0.5);
      const started = revolveLines(eventLines, order, "event abstraction");
      if (started) {
        sound("advance");
        setActiveVerse(nextVerse);
        generatedNext.current = !generatedNext.current;
      }
    };

    const scheduleCycle = () => {
      later(6900, rewriteCurrent);
      later(14800, rewriteCurrent);
      later(25200, () => {
        advanceVerse();
        scheduleCycle();
      });
    };

    scheduleCycle();
    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, []);

  function trackPointer(event: ReactPointerEvent<HTMLElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width - 0.5) * 2;
    const y = ((event.clientY - rect.top) / rect.height - 0.5) * 2;
    event.currentTarget.style.setProperty("--look-x", x.toFixed(3));
    event.currentTarget.style.setProperty("--look-y", y.toFixed(3));
  }

  function settlePointer(event: ReactPointerEvent<HTMLElement>) {
    event.currentTarget.style.setProperty("--look-x", "0");
    event.currentTarget.style.setProperty("--look-y", "0");
  }

  /* three things answer to a direct hit, and each answers differently: a
     figure, the verse panel, and the road. Anything else falls through to the
     road, which is the old behaviour. */
  function routeStreetClick(event: ReactMouseEvent<HTMLElement>) {
    const target = event.target as HTMLElement;
    const figure = target.closest<HTMLElement>(".shadow-figure");
    if (figure) {
      strikeFigure(Number(figure.dataset.figure));
      return;
    }
    if (target.closest(".living-verse")) {
      strikePanel();
      return;
    }
    disturbCurrent();
  }

  function strikeFigure(index: number) {
    if (Number.isNaN(index)) return;
    /* slicing one is the rare, expensive answer; mostly they laugh it off or
       just change colour and keep walking */
    const roll = Math.random();
    const effect: FigureEffect = roll < 0.34 ? "slice" : roll < 0.68 ? "giggle" : "shift";
    sound(effect);

    if (effect === "shift") {
      setFigureTones((current) => ({
        ...current,
        [index]: pick(FIGURE_TONES.filter((tone) => tone !== current[index])),
      }));
    }

    const stamp = Date.now();
    setFigureHits((current) => ({ ...current, [index]: { effect, stamp } }));
    queueEffect(effect === "slice" ? 1150 : 900, () => {
      setFigureHits((current) => {
        if (current[index]?.stamp !== stamp) return current;   /* a newer hit owns it now */
        const next = { ...current };
        delete next[index];
        return next;
      });
    });
  }

  function strikePanel() {
    sound("distort");
    setPanelHit((current) => current + 1);
    queueEffect(620, () => setPanelHit((current) => (current > 0 ? current - 1 : 0)));
  }

  function disturbCurrent() {
    sound("disturb");
    setSurge((current) => current + 1);
    rewriteCurrent();

    /* the road answers sometimes, not every time — a burst of dead air or
       somebody typing in a room you cannot see */
    const roll = Math.random();
    if (roll > 0.62) {
      const kind: RoadNoise = roll > 0.81 ? "clack" : "static";
      sound(kind);
      const stamp = Date.now();
      /* the keys are rolled here, not in render, so a re-render never reshuffles them */
      const keys = Array.from({ length: 22 }, () => pick([...CLACK_KEYS])).join("");
      setRoadNoise({ kind, stamp, keys });
      queueEffect(kind === "clack" ? 900 : 560, () => {
        setRoadNoise((current) => (current?.stamp === stamp ? null : current));
      });
    }
  }

  return (
    <section
      className="immersive-street"
      aria-label="Animated Street language visualization"
      onClick={routeStreetClick}
      onPointerMove={trackPointer}
      onPointerLeave={settlePointer}
      tabIndex={0}
    >
      <div className="generated-street" aria-hidden="true">
        <div className="black-sun-source">
          <i />
          <span>BLACK SUN // ROOT FEED</span>
        </div>

        <div className="street-mesh">
          <i /><i /><i /><i /><i /><i /><i /><i /><i />
          <div className="rune-lattice">
            {Array.from({ length: 14 }).map((_, index) => (
              <span key={index}>{STREET_RUNES[index % STREET_RUNES.length]}</span>
            ))}
          </div>
        </div>

        <div className="process-highway">
          {STREET_PROCESSES.map((process) => (
            <div className={`process-packet ${process.kind}`} key={process.code}>
              <code>{process.code}</code>
              <em>{process.poem}</em>
            </div>
          ))}
        </div>

        <div className="street-hole hole-alpha"><span>SEGMENT FAULT</span></div>
        <div className="street-hole hole-beta"><span>/DEV/NULL</span></div>

        {STALL_EVENTS.map((event) => (
          <div className={`stall-sequence stall-${event.location}`} key={event.pid}>
            <div className="stalled-process">
              <code>{event.process}</code>
              <b>PID {event.pid} // STALLED</b>
            </div>
            <div className="daemon-sweeper">
              <b>D{String.fromCharCode(198)}MON://GC</b>
              <i />
            </div>
            <div className="trapdoor-void"><span>{event.trap}</span></div>
          </div>
        ))}

        <div className="shadow-processes">
          {SHADOW_PATCHES.map((patch, index) => {
            const hit = figureHits[index];
            return (
              <div
                className={`shadow-figure figure-${index + 1}${hit ? ` is-${hit.effect}` : ""}`}
                data-figure={index}
                data-tone={figureTones[index]}
                key={patch}
              >
                <i /><b /><u /><s /><code>{patch}</code>
              </div>
            );
          })}
        </div>
      </div>
      <div className="immersive-vignette" aria-hidden="true" />
      <div className="semantic-horizon" aria-hidden="true">
        <span>source</span><i />
        <span>phoneme</span><i />
        <span>glyph</span><i />
        <span>street</span><i />
        <span>avatar</span>
      </div>

      <div className="glyph-river" aria-hidden="true">
        {GLYPH_CURRENTS.map((current, index) => (
          <div className="river-column" key={current}>
            {Array.from({ length: 7 }).map((_, repeat) => (
              <span key={`${index}-${repeat}`}>{current}</span>
            ))}
          </div>
        ))}
      </div>

      <div className="poetry-current" aria-hidden="true">
        {FLOW_LINES.map((line) => <span key={line}>{line}</span>)}
      </div>

      <div className="condensation-funnel" aria-hidden="true">
        {STREET_RUNES.slice(0, 6).map((rune) => (
          <span key={rune}>{rune}</span>
        ))}
      </div>

      <div
        className={`living-verse ${corruption ? "is-corrupting" : ""}${panelHit > 0 ? " is-distorted" : ""}`}
      >
        <small>
          <span>SEMANTIC CONDENSATE // {activeVerse.kind}</span>
          <em>{activeVerse.source}</em>
        </small>
        <div className="verse-payload">
          {displayLines.map((line, index) => {
            const lineCorruption = corruption && corruptionAffectsLine(corruption, index)
              ? corruption?.mode ?? null
              : null;
            return (
              <p
                className={lineCorruption ? `corrupted-${lineCorruption}` : ""}
                key={`${index}-${line}`}
              >
                <span>{renderCorruptedLine(line, index, corruption)}</span>
                {lineCorruption && lineCorruption !== "fatal" && (
                  <b>{corruptionLabel(lineCorruption)}</b>
                )}
              </p>
            );
          })}
        </div>
        <footer>
          <i />
          <span>{interfaceStatus} // glyphs: {displayLines.join("").length * 7}</span>
        </footer>
      </div>

      <div className="deep-terminal" aria-hidden="true">
        <span>root@street:~$ ./language --render</span>
        <span>mapping meaning -&gt; light...</span>
        <b>STREAM ALIVE _</b>
      </div>

      <div className="current-disturbance" key={surge} aria-hidden="true" />
      <div className="snow-field" aria-hidden="true" />

      {roadNoise?.kind === "static" && (
        <div className="road-static" key={roadNoise.stamp} aria-hidden="true" />
      )}

      {roadNoise?.kind === "clack" && (
        <div className="road-clack" key={roadNoise.stamp} aria-hidden="true">
          <b>KEYS ON THE OTHER SIDE OF THE WALL</b>
          <span>
            {[...roadNoise.keys].map((glyph, index) => (
              <i key={`${index}-${glyph}`}>{glyph}</i>
            ))}
          </span>
        </div>
      )}

      <button
        className="street-audio"
        type="button"
        onClick={toggleSound}
        aria-pressed={soundOn}
        title="Generative audio, reacting to the street. Street mode only."
      >
        <i aria-hidden="true" />
        <span>{soundOn ? "AUDIO DAEMON [ON]" : "AUDIO DAEMON [OFF]"}</span>
      </button>

      <p className="street-instruction">CLICK / TOUCH TO CORRUPT THE CURRENT</p>
    </section>
  );
}

export default function Home() {
  const [channel, setChannel] = useState<Channel>("babel");
  const [entropy, setEntropy] = useState(64);
  const [lineCount, setLineCount] = useState(14);
  const [seed, setSeed] = useState("nam-shub");
  const [poem, setPoem] = useState<Poem>(INITIAL_POEM);
  const [copied, setCopied] = useState(false);
  const [mode, setMode] = useState<"console" | "street">("console");
  const lastForm = useRef(INITIAL_POEM.form);

  useEffect(() => {
    function handleKeydown(event: KeyboardEvent) {
      if (event.key === "Escape") setMode("console");
    }
    window.addEventListener("keydown", handleKeydown);
    return () => window.removeEventListener("keydown", handleKeydown);
  }, []);

  function generate(event?: FormEvent) {
    event?.preventDefault();
    setCopied(false);
    const nextPoem = composePoem(channel, entropy, seed, lineCount, lastForm.current);
    lastForm.current = nextPoem.form;
    setPoem(nextPoem);
  }

  async function copyPoem() {
    const text = `${poem.title}\n\n${poem.lines.join("\n")}\n\n-- RIME/DAEMON ${poem.id}`;
    await navigator.clipboard.writeText(text);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <main className="shell" data-channel={channel} data-mode={mode}>
      <div className="scanlines" aria-hidden="true" />

      <header className="modebar" id="top">
        <span className="console-brand"><b>&gt;</b>RIMEDAEMON</span>
        <span className="mode-status">
          {mode === "console" ? "CONSOLE / LANGUAGE ENGINE" : "STREET / SEMANTIC SURFACE"}
        </span>
        <button
          type="button"
          onClick={() => setMode(mode === "console" ? "street" : "console")}
          aria-pressed={mode === "street"}
        >
          {mode === "console" ? "ENTER THE STREET [ON]" : "RETURN TO CONSOLE [ESC]"}
        </button>
      </header>

      {mode === "street" ? (
        <StreetMode />
      ) : (
        <>
          <section className="generator" aria-label="Poetry generator">
        <form className="control-panel" onSubmit={generate}>
          <div className="panel-heading">
            <span>INPUT CONSOLE</span>
            <span>01--04</span>
          </div>

          <fieldset className="control-block channel-block">
            <legend>01 / SELECT TRANSMISSION</legend>
            <div className="channel-list">
              {(Object.keys(CHANNELS) as Channel[]).map((key) => (
                <button
                  className="channel-option"
                  data-active={channel === key}
                  key={key}
                  onClick={() => setChannel(key)}
                  type="button"
                  aria-pressed={channel === key}
                >
                  <span className="channel-code">{CHANNELS[key].code}</span>
                  <span>
                    <b>{CHANNELS[key].label}</b>
                    <small>{CHANNELS[key].note}</small>
                  </span>
                  <span className="select-glyph">{channel === key ? "[x]" : "[ ]"}</span>
                </button>
              ))}
            </div>
          </fieldset>

          <div className="control-block">
            <label htmlFor="seed">02 / SEED PHRASE</label>
            <div className="input-wrap">
              <span>&gt;</span>
              <input
                id="seed"
                value={seed}
                maxLength={42}
                onChange={(event) => setSeed(event.target.value)}
                placeholder="enter contraband thought"
                spellCheck="false"
              />
            </div>
          </div>

          <div className="control-block entropy-block">
            <div className="range-label">
              <label htmlFor="entropy">03 / SIGNAL ENTROPY</label>
              <output htmlFor="entropy">{entropy}%</output>
            </div>
            <input
              id="entropy"
              type="range"
              min="12"
              max="96"
              value={entropy}
              onChange={(event) => setEntropy(Number(event.target.value))}
            />
            <div className="range-ticks" aria-hidden="true">
              <span>LEGIBLE</span>
              <span>FERAL</span>
            </div>
          </div>

          <fieldset className="control-block length-block">
            <legend>04 / PACKET LENGTH</legend>
            <div className="length-options">
              {[10, 14, 17].map((count) => (
                <button
                  key={count}
                  type="button"
                  data-active={lineCount === count}
                  onClick={() => setLineCount(count)}
                  aria-pressed={lineCount === count}
                >
                  {count === 10 ? "SHORT" : count === 14 ? "STANDARD" : "LONG"}
                </button>
              ))}
            </div>
          </fieldset>

          <button className="generate-button" type="submit">
            <span>EXECUTE POEM</span>
            <span aria-hidden="true">[ENTER]</span>
          </button>
          <p className="local-note">Runs locally. No thought leaves this device.</p>
        </form>

        <article className="poem-panel" aria-live="polite">
          <div className="poem-topline">
            <span>OUTPUT / {CHANNELS[channel].code}</span>
            <span>{poem.time} LOCAL</span>
          </div>

          <div className="poem-meta">
            <span>TX {poem.id}</span>
            <span>FORM {poem.form}</span>
            <span>ENTROPY {entropy.toString().padStart(2, "0")}</span>
          </div>

          <h2>{poem.title}</h2>

          <div className="poem-text">
            {poem.lines.map((line, index) => (
              <div className={line ? "poem-line" : "poem-line blank"} key={`${poem.id}-${index}`}>
                <span className="line-number">{String(index + 1).padStart(2, "0")}</span>
                <span>{line || "\u00A0"}</span>
              </div>
            ))}
          </div>

          <div className="poem-actions">
            <button type="button" onClick={copyPoem}>
              {copied ? "COPIED TO MEMORY" : "COPY TRANSMISSION"}
            </button>
            <button type="button" onClick={() => generate()}>
              RE-ROLL SIGNAL
            </button>
          </div>

          <div className="barcode" aria-hidden="true">
            <i /><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /><i />
          </div>
        </article>
          </section>

          <footer>
        <div className="ticker" aria-hidden="true">
          <span>
            LANGUAGE IS A VIRUS // POETRY IS A PATCH // YOUR AVATAR HAS LEFT THE BUILDING //
          </span>
          <span>
            LANGUAGE IS A VIRUS // POETRY IS A PATCH // YOUR AVATAR HAS LEFT THE BUILDING //
          </span>
        </div>
        <div className="footer-info">
          <p>
            An unofficial, original cyberpunk experiment inspired by the themes
            of <i>Snow Crash</i>. Not affiliated with Neal Stephenson or his publishers.
          </p>
          <p>DESIGNED FOR THE METAVERSE THAT NEVER ARRIVED // 2026</p>
        </div>
          </footer>
        </>
      )}
    </main>
  );
}
