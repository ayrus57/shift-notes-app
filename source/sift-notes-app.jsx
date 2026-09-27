import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Plus, X, Sparkles, Image as ImageIcon, Search, Trash2, Loader2, Inbox, Briefcase, Home,
  Check, Ban, Settings, AlertCircle, Tag,
  CheckSquare, Bell, CreditCard, Lightbulb, BookOpen, Phone, ShoppingCart, Plane, Heart,
  Wrench, Users, Calendar, FileText, Star, Zap, Target, Coffee, Car, Gift, Key, MapPin,
  Clock, Minus, Crosshair, Compass, Archive, ArchiveRestore, Flame, ChevronDown, ChevronUp,
  ChevronRight, User, UserPlus, Gauge, Repeat, CalendarClock, ArrowUpDown, Layers, Flag, Cloud,
  Siren, ArrowUp, ArrowDown, Rows, Columns, Paperclip, Upload,
  Heading1, Heading2, Bold, Italic, List, Quote, Code, Link as LinkIcon, Eye, EyeOff, Info, Copy,
} from "lucide-react";

/* ---------------- tokens ---------------- */

const C = {
  ink: "#12171C",
  surface: "#1A2027",
  raised: "#222A32",
  line: "#2E3841",
  lineSoft: "#252E36",
  text: "#E4EAEF",
  dim: "#8896A2",
  dimmer: "#5E6C78",
  work: "#7CA0E8",
  personal: "#63C9A8",
  warn: "#E0B341",
  danger: "#E08A7C",
};

const DOMAINS = ["Work", "Personal"];
// Fixed relation models between two contacts (person-person or person-company) - not
// user-editable. Each has a reverse: if A -> B is "Employee", B -> A shows "Employer".
const RELATION_MODELS = [
  { id: "sister", label: "Sister", reverse: "Sister" },
  { id: "brother", label: "Brother", reverse: "Brother" },
  { id: "sibling", label: "Sibling", reverse: "Sibling" },
  { id: "father", label: "Father", reverse: "Child" },
  { id: "mother", label: "Mother", reverse: "Child" },
  { id: "child", label: "Child", reverse: "Parent" },
  { id: "spouse", label: "Spouse", reverse: "Spouse" },
  { id: "friend", label: "Friend", reverse: "Friend" },
  { id: "relative", label: "Relative", reverse: "Relative" },
  { id: "colleague", label: "Colleague", reverse: "Colleague" },
  { id: "employee", label: "Employee", reverse: "Employer" },
  { id: "employer", label: "Employer", reverse: "Employee" },
  { id: "client", label: "Client", reverse: "Vendor" },
  { id: "vendor", label: "Vendor", reverse: "Client" },
  { id: "owner", label: "Owner", reverse: "Owned by" },
];
const relationModel = (id) => RELATION_MODELS.find((m) => m.id === id);
// A contact's relations shown from BOTH sides: its own stored relations, plus any other
// contact's relation that points AT it (shown reversed). ownerId is whichever contact
// actually stores the record, needed so "remove" edits the right one.
function effectiveRelations(contact, allContacts) {
  const own = (contact.relations || []).map((r) => ({
    ownerId: contact.id, targetId: r.to, modelId: r.modelId,
    label: (relationModel(r.modelId) || {}).label || r.modelId,
  }));
  const incoming = allContacts.filter((c) => c.id !== contact.id).flatMap((c) =>
    (c.relations || []).filter((r) => r.to === contact.id).map((r) => ({
      ownerId: c.id, targetId: contact.id, modelId: r.modelId,
      label: (relationModel(r.modelId) || {}).reverse || r.modelId,
      otherId: c.id,
    })));
  return [...own.map((r) => ({ ...r, otherId: r.targetId })), ...incoming];
}
const DOMAIN_STYLE = {
  Work: { fg: C.work, Icon: Briefcase, tint: "rgba(124,160,232,0.10)", edge: "rgba(124,160,232,0.30)" },
  Personal: { fg: C.personal, Icon: Home, tint: "rgba(99,201,168,0.10)", edge: "rgba(99,201,168,0.30)" },
};

const ICONS = {
  CheckSquare, Bell, CreditCard, Lightbulb, BookOpen, Phone, ShoppingCart, Plane, Heart,
  Wrench, Users, Calendar, FileText, Star, Zap, Target, Coffee, Car, Gift, Key,
  Compass, Flag, MapPin, Clock, Repeat, User, Info,
};
const ICON_KEYS = Object.keys(ICONS);

const DEFAULT_TYPES = [
  { name: "Note", icon: "FileText" },
  { name: "Task", icon: "CheckSquare" },
  { name: "Remember", icon: "Bell" },
  { name: "Pay", icon: "CreditCard" },
  { name: "Idea", icon: "Lightbulb" },
  { name: "Discover", icon: "Compass" },
  { name: "Event", icon: "Calendar" },
  { name: "Info", icon: "Info" },
  { name: "Bookmark", icon: "Star" },
  { name: "Routine", icon: "Repeat" },
];
const DEFAULT_ROUTINE_KINDS = ["Organize", "Grow", "Selfcare"];
// fallback sorting/grouping choices for a Section (or "Everything") that hasn't set its own yet
const DEFAULT_VIEW_PREFS = {
  sortBy: "newest", sortChain: [], groupBy: "none", taskScope: "both", listShowArchived: false, listGroupByType: false,
  // Threshold filters, each null (off) or a value on that field's own scale:
  //  - filterPriority: keep notes at or ABOVE this urgency (this priority or more urgent)
  //  - filterEffort:   keep notes at or BELOW this effort (this effort or easier)
  //  - filterQueue:    keep notes at or AFTER this queue stage (this queue or later)
  //  - filterDate:     keep notes due at or before this date/time (this date or closer to today)
  filterPriority: null, filterEffort: null, filterQueue: null, filterDate: null,
};

const DEFAULT_CATEGORIES = {
  Personal: [
    { name: "Home", emoji: "🏠" }, { name: "Wellness", emoji: "🌿" }, { name: "People", emoji: "👥" },
    { name: "Money", emoji: "💰" }, { name: "Admin", emoji: "🗂️" },
  ],
  Work: [
    { name: "Core", emoji: "⚙️" }, { name: "Business", emoji: "💼" },
    { name: "Product", emoji: "📦" }, { name: "Market", emoji: "📈" },
  ],
};

const LABEL_COLORS = ["#7CA0E8", "#63C9A8", "#E0B341", "#E08A7C", "#C58FD4", "#7FC8DE", "#A8C97F", "#E5A0C0"];

const QUEUES = ["Now!", "Planned", "Next", "Follow", "Soon", "Upcoming", "Later", "Future"];
const QUEUE_COLOR = {
  "Now!": "#E08A7C", Planned: "#E0B341", Next: "#E5C06B", Follow: "#A8C97F",
  Soon: "#63C9A8", Upcoming: "#7FC8DE", Later: "#7CA0E8", Future: "#C58FD4",
};
const STATUSES = ["Backlog", "To Do", "Ready", "Doing", "Done"];
const STATUS_COLOR = {
  Backlog: "#7A8794", "To Do": "#7CA0E8", Ready: "#7FC8DE", Doing: "#E0B341", Done: "#6FBF8B",
};
const PRIORITY_ICONS = { Siren, ArrowUp, Minus, ArrowDown };
const PRIORITIES = [
  { v: 1, name: "Urgent", icon: "Siren", color: "#E08A7C" },
  { v: 2, name: "High", icon: "ArrowUp", color: "#E0A85C" },
  { v: 3, name: "Medium", icon: "Minus", color: "#6FBF8B" },
  { v: 4, name: "Low", icon: "ArrowDown", color: "#7FA5C9" },
];
const DEFAULT_DISCOVER = ["Movie", "Restaurant", "Tool", "Game", "Book", "Podcast", "Think", "Question"];
const DEFAULT_TRIGGERS = ["When I get home", "At the office", "Next time I shop", "When I'm free"];
const REPEAT_UNITS = ["day", "week", "month", "year"];
const WEEKDAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// "<emoji> <space-separated keywords>"
const EMOJI_GROUPS = {
  "Smileys & people": "😀grinning happy 😃smiley 😄laughing 😁beaming 😆satisfied 😅sweat 🤣rofl 😂joy tears 🙂slight 😉wink 😊blush 🥰love hearts 😍heart eyes 😘kiss 😋yum tasty 😎cool sunglasses 🤓nerd geek 🧐monocle 🤔thinking 🤨raised brow 😐neutral 😴sleeping tired 🥱yawn 😪sleepy 😵dizzy 🤯mind blown 😡angry mad 😤triumph steam 😭sobbing cry 😢crying sad 😱scream fear 😬grimace 🙄eyeroll 😶speechless 🤐zipper quiet 🤒sick thermometer 🤕hurt bandage 🤧sneeze 😷mask 🥳party celebrate 🤗hug 🤫shush quiet 🤝handshake deal 👍thumbsup yes good 👎thumbsdown no 👏clap applause 🙏pray thanks please 💪muscle strong 🫶heart hands 👋wave hello 🖐️hand stop ✍️writing 👀eyes look 🧠brain mind 👤person user 👥people group team 👨‍💻developer coder 👩‍⚕️doctor 👶baby 🧑‍🎓student 👴elder 🚶walking 🏃running 🧘yoga meditate",
  "Animals & nature": "🐶dog puppy 🐱cat 🐭mouse 🐹hamster 🐰rabbit bunny 🦊fox 🐻bear 🐼panda 🐨koala 🐯tiger 🦁lion 🐮cow 🐷pig 🐸frog 🐵monkey 🐔chicken 🐧penguin 🐦bird 🦆duck 🦅eagle 🦉owl 🐝bee 🦋butterfly 🐌snail 🐢turtle 🐍snake 🐙octopus 🐠fish 🐬dolphin 🐳whale 🦈shark 🐴horse 🦄unicorn 🐘elephant 🐾paws pets 🌲tree evergreen 🌳tree 🌴palm 🌵cactus 🌿herb plant leaf 🍀clover luck ☘️shamrock 🍁maple 🍂leaves autumn 🌸blossom flower 🌺hibiscus 🌻sunflower 🌹rose 🌷tulip 💐bouquet 🌾wheat grain 🍄mushroom 🌍earth globe world 🌙moon night ⭐star 🌟glowing star ☀️sun sunny ⛅cloud ☁️cloudy 🌧️rain 🌈rainbow ❄️snow cold 🔥fire hot 💧water drop 🌊wave ocean",
  "Food & drink": "🍏apple green 🍎apple red 🍐pear 🍊orange 🍋lemon 🍌banana 🍉watermelon 🍇grapes 🍓strawberry 🫐blueberry 🍑peach 🥭mango 🍍pineapple 🥥coconut 🥝kiwi 🍅tomato 🥑avocado 🍆eggplant 🥔potato 🥕carrot 🌽corn 🌶️pepper spicy 🥒cucumber 🥬greens lettuce 🧄garlic 🧅onion 🍞bread 🥐croissant 🥖baguette 🧀cheese 🥚egg 🍳cooking fry 🥞pancakes 🧇waffle 🥓bacon 🍔burger 🍟fries 🍕pizza 🌭hotdog 🥪sandwich 🌮taco 🌯burrito 🥗salad 🍝pasta 🍜noodles ramen 🍲stew soup 🍛curry 🍣sushi 🍤shrimp 🍚rice 🥟dumpling 🍦icecream 🍰cake 🎂birthday cake 🧁cupcake 🍪cookie 🍫chocolate 🍬candy 🍯honey ☕coffee 🍵tea 🧃juice 🥤soda drink 🍺beer 🍷wine 🥂cheers 🍾champagne 🧊ice 🍽️dining meal restaurant 🥄spoon 🍴utensils",
  "Travel & places": "🏠house home 🏡house garden 🏢office building 🏣post office 🏥hospital 🏦bank 🏨hotel 🏪store shop 🏫school 🏭factory 🏛️classical government 🏗️construction 🏘️houses 🗼tower 🗽liberty 🕌mosque ⛪church 🕍synagogue 🛕temple ⛩️shrine 🏰castle 🎡ferris wheel 🎢rollercoaster 🏖️beach 🏝️island 🏔️mountain ⛰️mountain 🌋volcano 🏜️desert 🏕️camping 🌃night city 🌆city sunset 🌇sunset 🌉bridge 🚗car drive 🚕taxi 🚙suv 🚌bus 🚎trolley 🚓police car 🚑ambulance 🚒fire truck 🛻truck 🚚delivery 🚲bicycle bike 🛵scooter 🏍️motorcycle 🚂train 🚆train 🚇metro subway 🚊tram ✈️plane flight 🛫takeoff 🛬landing 🚀rocket 🛸ufo 🚁helicopter ⛵sailboat 🚤speedboat 🛳️ship ⚓anchor 🗺️map ⛽fuel gas 🚦traffic light 🛑stop 📍pin location 🧭compass",
  "Activities & objects": "⚽soccer football 🏀basketball 🏈football 🎾tennis 🏐volleyball 🏉rugby 🎱pool billiards 🏓pingpong 🏸badminton 🥊boxing 🥋martial arts ⛳golf 🎿ski 🏂snowboard 🏋️weights gym 🚴cycling 🏊swimming 🤿diving 🎣fishing 🎯target dart 🎮gaming controller 🕹️joystick 🎲dice 🧩puzzle ♟️chess 🎭theatre 🎨art paint 🎬film movie 🎤microphone sing 🎧headphones 🎵music note 🎶music 🎸guitar 🎹piano 🥁drums 🎺trumpet 🎻violin 📷camera photo 📸camera flash 📹video 📺tv 📻radio 📱phone mobile ☎️telephone 📞call 📟pager 💻laptop computer 🖥️desktop ⌨️keyboard 🖱️mouse 🖨️printer 💾floppy save 💿disc 🔋battery 🔌plug 💡lightbulb idea 🔦flashlight 🕯️candle 🧯extinguisher 🔧wrench tool 🔨hammer 🛠️tools 🪛screwdriver ⚙️gear settings 🧰toolbox 🧲magnet 🔑key 🗝️old key 🔒lock secure 🔓unlock 🛡️shield 🔍search find 🔎magnify 🧪test tube lab 🧬dna 🔬microscope 🔭telescope 💉syringe 💊pill medicine 🩺stethoscope health 🩹bandaid 🛏️bed sleep 🛋️couch 🚿shower 🛁bath 🧼soap 🧹broom clean 🧺laundry basket 🧴lotion 🪥toothbrush 🎁gift present 🎈balloon 🎉party popper 🎊confetti 🎀ribbon 🏆trophy win 🥇gold medal 🏅medal 👑crown 💎gem diamond 💍ring 👓glasses 👔shirt tie 👗dress 👜bag purse 🎒backpack 👟shoes sneakers 🧢cap hat ⌚watch time",
  "Work & symbols": "💼briefcase business work 📁folder 📂open folder 🗂️dividers files organize 📅calendar date 📆calendar 🗓️spiral calendar ⏰alarm clock 🕐clock time ⌛hourglass ⏳timer 📇card index 📈chart up growth market 📉chart down 📊bar chart stats 📋clipboard list 📌pushpin 📎paperclip 🖇️clips 📏ruler 📐triangle ruler ✂️scissors cut 🗃️file box 🗄️cabinet 🗑️trash delete 📝memo note write ✏️pencil 🖊️pen 🖋️fountain pen 🖌️brush 🖍️crayon 📓notebook 📔journal 📒ledger 📕book red 📗book green 📘book blue 📙book orange 📚books library 📖open book read 🔖bookmark 🏷️label tag 💰money bag 💴yen 💵dollar cash 💶euro 💷pound 💳credit card pay 🧾receipt invoice bill 💸money flying spend 🏧atm 📧email mail 📨incoming mail 📩envelope 📤outbox send 📥inbox receive 📦package box product 📫mailbox 📮postbox 📜scroll document 📄page document 📃page curl 🧮abacus ✅check done 🔲checkbox ☑️ticked ❌cross no ⚠️warning ❗exclamation ❓question 💯hundred 🔔bell notify 🔕mute 📢announce 📣megaphone 💬speech chat 💭thought 🗯️anger bubble ♻️recycle 🔄refresh sync ➕plus ➖minus ✖️multiply ➗divide 🆕new 🆗ok 🔝top ⭕circle 🚫forbidden ⛔no entry ❤️heart red 🧡heart orange 💛heart yellow 💚heart green 💙heart blue 💜heart purple 🖤heart black 🤍heart white ⚡zap energy ⭐star favourite 🌟sparkle ✨sparkles 💫dizzy 🔥fire",
};

const EMOJI_LIST = Object.entries(EMOJI_GROUPS).map(([group, blob]) => {
  const items = [];
  blob.split(" ").filter(Boolean).forEach((tok) => {
    const chars = Array.from(tok);
    let i = 0, emoji = "";
    while (i < chars.length && !/[a-z]/i.test(chars[i])) { emoji += chars[i]; i++; }
    const kw = chars.slice(i).join("");
    if (emoji) items.push({ emoji, kw });
    else if (items.length) items[items.length - 1].kw += " " + kw; // extra keyword for the previous emoji
  });
  return { group, items };
});

const isRtl = (t) => /[\u0590-\u08FF]/.test(t || "");
const uid = () => Math.random().toString(36).slice(2) + Date.now().toString(36);
const rtl = (t) => (isRtl(t) ? { direction: "rtl", textAlign: "right", fontFamily: "'Vazirmatn', 'Inter', sans-serif" } : {});

/* ---------------- helpers ---------------- */

async function fileToBase64(file) {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result.split(",")[1]);
    r.onerror = () => rej(new Error("Could not read file"));
    r.readAsDataURL(file);
  });
}

/* ---------------- storage: local by default, Supabase when configured ---------------- */

const CFG_KEY = "shift-cloud-config";

function getCloudConfig() {
  try {
    const raw = localStorage.getItem(CFG_KEY);
    if (!raw) return null;
    const c = JSON.parse(raw);
    return c && c.url && c.key ? c : null;
  } catch { return null; }
}
function setCloudConfig(cfg) {
  if (cfg) localStorage.setItem(CFG_KEY, JSON.stringify(cfg));
  else localStorage.removeItem(CFG_KEY);
  sbClient = null;
}

let sbClient = null;
class CloudError extends Error {
  constructor(code, message) { super(message); this.code = code; }
}

async function getSupabase() {
  if (sbClient) return sbClient;
  const cfg = getCloudConfig();
  if (!cfg) throw new CloudError("unconfigured", "No project connected yet.");
  let createClient;
  try {
    ({ createClient } = await import("https://esm.sh/@supabase/supabase-js@2"));
  } catch (e) {
    throw new CloudError("offline",
      "Couldn't load the Supabase library. This preview blocks outside connections — sync works once the app is hosted at its own address.");
  }
  sbClient = createClient(cfg.url, cfg.key, { auth: { persistSession: true, autoRefreshToken: true } });
  return sbClient;
}
const trySupabase = () => getSupabase().catch(() => null);

// local fallback: the artifact host's storage, or plain localStorage outside it
const localDB = {
  async get(key) {
    if (typeof window !== "undefined" && window.storage) return window.storage.get(key);
    const v = localStorage.getItem("shift::" + key);
    if (v === null) throw new Error("not found");
    return { key, value: v };
  },
  async set(key, value) {
    if (typeof window !== "undefined" && window.storage) return window.storage.set(key, value);
    localStorage.setItem("shift::" + key, value);
    return { key, value };
  },
};

async function loadKey(key, fallback) {
  const sb = await trySupabase();
  if (sb) {
    const { data: { user } } = await sb.auth.getUser();
    if (user) {
      const { data, error } = await sb.from("shift_kv").select("value").eq("user_id", user.id).eq("key", key).maybeSingle();
      if (!error && data) { try { return JSON.parse(data.value); } catch { return fallback; } }
      if (!error) return fallback;
    }
  }
  try { const r = await localDB.get(key); return r ? JSON.parse(r.value) : fallback; }
  catch { return fallback; }
}

async function saveKey(key, value) {
  const payload = JSON.stringify(value);
  try { await localDB.set(key, payload); } catch (e) { console.error(e); }  // always keep a local copy
  const sb = await trySupabase();
  if (!sb) return;
  try {
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return;
    await sb.from("shift_kv").upsert(
      { user_id: user.id, key, value: payload, updated_at: new Date().toISOString() },
      { onConflict: "user_id,key" }
    );
  } catch (e) { console.error("cloud save failed", e); }
}

// Uploads a file to the per-user shift-files bucket and returns the record to store
// on a note's images/attachments array. Throws if not signed in / not connected.
async function uploadAttachment(noteId, file) {
  const sb = await trySupabase();
  if (!sb) throw new Error("Connect to Supabase first (see Sync in settings).");
  const { data: { user } } = await sb.auth.getUser();
  if (!user) throw new Error("Sign in first (see Sync in settings).");
  const safe = file.name.replace(/[^\w.\-]+/g, "_");
  const path = `${user.id}/${noteId}/${uid()}-${safe}`;
  const { error } = await sb.storage.from("shift-files").upload(path, file, { contentType: file.type || "application/octet-stream" });
  if (error) throw error;
  const { data: signed } = await sb.storage.from("shift-files").createSignedUrl(path, 60 * 60 * 24 * 365);
  return { id: uid(), filename: safe, mimeType: file.type || "application/octet-stream", path, url: (signed && signed.signedUrl) || null, createdAt: Date.now() };
}

const normTypes = (t) => (Array.isArray(t) && t.length ? t.map((x) => (typeof x === "string" ? { name: x, icon: "FileText" } : x)) : DEFAULT_TYPES);
const normCats = (c) => {
  const out = {};
  DOMAINS.forEach((d) => {
    const list = (c && c[d]) || DEFAULT_CATEGORIES[d];
    out[d] = list.map((x) => (typeof x === "string" ? { name: x, emoji: "•" } : x));
  });
  return out;
};
const normLabels = (l) => (Array.isArray(l) ? l.map((x, i) => (typeof x === "string" ? { name: x, color: LABEL_COLORS[i % LABEL_COLORS.length] } : x)) : []);

function toLocalDate(iso) {
  if (!iso) return null;
  const hasTime = iso.includes("T") && iso.split("T")[1];
  const d = new Date(hasTime ? iso : iso.split("T")[0] + "T00:00");
  return isNaN(d) ? null : d;
}
function fmtDate(iso) {
  const d = toLocalDate(iso);
  if (!d) return "";
  const hasTime = iso.includes("T") && iso.split("T")[1];
  return hasTime
    ? d.toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })
    : d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
// The single date used to place a note on the "Date" filter/sort scale: the earliest of its
// deadline, date-trigger, and suggested date (whichever it actually has set).
function noteRefDate(n) {
  const dueTrig = (n.triggers || (n.trigger ? [n.trigger] : [])).find((t) => t.kind === "date");
  const candidates = [n.deadline, dueTrig && dueTrig.at, n.recommendedDate]
    .map((iso) => toLocalDate(iso))
    .filter(Boolean);
  if (!candidates.length) return null;
  return new Date(Math.min(...candidates.map((d) => d.getTime())));
}

/* ---------------- map picker ---------------- */

const TILE = 256;
const lngToX = (lng, z) => ((lng + 180) / 360) * 2 ** z;
const latToY = (lat, z) => {
  const r = (lat * Math.PI) / 180;
  return ((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2) * 2 ** z;
};
const xToLng = (x, z) => (x / 2 ** z) * 360 - 180;
const yToLat = (y, z) => {
  const n = Math.PI - (2 * Math.PI * y) / 2 ** z;
  return (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));
};

function MapPicker({ onChange, initial }) {
  const [tilesOk, setTilesOk] = useState(true);
  const W = 430, H = 230;
  const [center, setCenter] = useState(initial ? { lat: initial.lat, lng: initial.lng } : { lat: 35.7219, lng: 51.3347 });
  const [zoom, setZoom] = useState(initial ? 15 : 12);
  const drag = useRef(null);

  useEffect(() => { onChange(center); }, [center]);
  // recentre when the caller opens us on a specific place - `initial` (mapSeed) only
  // changes when the modal is opened for a new target, never while panning/zooming
  useEffect(() => {
    if (initial) { setCenter({ lat: initial.lat, lng: initial.lng }); setZoom(15); }
  }, [initial]);

  const cx = lngToX(center.lng, zoom), cy = latToY(center.lat, zoom);
  const tiles = [];
  const max = 2 ** zoom;
  for (let tx = Math.floor(cx - W / 2 / TILE); tx <= Math.floor(cx + W / 2 / TILE); tx++)
    for (let ty = Math.floor(cy - H / 2 / TILE); ty <= Math.floor(cy + H / 2 / TILE); ty++) {
      if (ty < 0 || ty >= max) continue;
      const wx = ((tx % max) + max) % max;
      tiles.push({
        key: `${tx}-${ty}`,
        url: `https://tile.openstreetmap.org/${zoom}/${wx}/${ty}.png`,
        left: (tx - cx) * TILE + W / 2,
        top: (ty - cy) * TILE + H / 2,
      });
    }

  const pan = (dx, dy) =>
    setCenter((c) => ({
      lat: yToLat(latToY(c.lat, zoom) - dy / TILE, zoom),
      lng: xToLng(lngToX(c.lng, zoom) - dx / TILE, zoom),
    }));

  return (
    <div>
      <div
        style={{ ...st.mapFrame, height: H }}
        onMouseDown={(e) => { drag.current = { x: e.clientX, y: e.clientY }; }}
        onMouseMove={(e) => {
          if (!drag.current) return;
          pan(e.clientX - drag.current.x, e.clientY - drag.current.y);
          drag.current = { x: e.clientX, y: e.clientY };
        }}
        onMouseUp={() => (drag.current = null)}
        onMouseLeave={() => (drag.current = null)}
        onWheel={(e) => { e.preventDefault(); setZoom((z) => Math.max(3, Math.min(18, z + (e.deltaY < 0 ? 1 : -1)))); }}
        onTouchStart={(e) => { const t = e.touches[0]; drag.current = { x: t.clientX, y: t.clientY }; }}
        onTouchMove={(e) => {
          if (!drag.current) return;
          const t = e.touches[0];
          pan(t.clientX - drag.current.x, t.clientY - drag.current.y);
          drag.current = { x: t.clientX, y: t.clientY };
        }}
        onTouchEnd={() => (drag.current = null)}
      >
        {tilesOk && tiles.map((t) => (
          <img key={t.key} src={t.url} alt="" draggable={false} onError={() => setTilesOk(false)}
            style={{ position: "absolute", left: t.left, top: t.top, width: TILE, height: TILE,
              filter: "grayscale(0.35) brightness(0.72) contrast(1.08)" }} />
        ))}
        {!tilesOk && <div style={st.mapOffline}><MapPin size={18} /><span>Map tiles unavailable here — the pin still records the coordinates below.</span></div>}
        <div style={st.mapPin}><MapPin size={26} color="#E0342A" fill="rgba(224,52,42,0.25)" /></div>
        <div style={st.mapZoom}>
          <button style={st.mapZoomBtn} onClick={() => setZoom((z) => Math.min(18, z + 1))}><Plus size={13} /></button>
          <button style={st.mapZoomBtn} onClick={() => setZoom((z) => Math.max(3, z - 1))}><Minus size={13} /></button>
        </div>
      </div>
      <p style={{ ...st.hint, marginTop: 7 }}>
        Drag or scroll to move/zoom — {center.lat.toFixed(4)}, {center.lng.toFixed(4)}
      </p>
    </div>
  );
}

function DateTimeField({ value, onChange, style }) {
  const raw = value || "";
  const [d, t] = raw.split("T");
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, ...style }}>
      <input type="date" style={st.dateIn} value={d || ""}
        onChange={(e) => onChange(e.target.value ? (t ? e.target.value + "T" + t : e.target.value) : "")} />
      <input type="time" style={{ ...st.dateIn, width: 100, opacity: d ? 1 : 0.4 }} value={t || ""} disabled={!d}
        title={d ? "Optional — leave blank for an all-day date" : "Pick a date first"}
        onChange={(e) => onChange(d ? (e.target.value ? d + "T" + e.target.value : d) : "")} />
      {raw && <button style={st.ghost} title="Clear" onClick={() => onChange("")}><X size={12} /></button>}
    </div>
  );
}

// Standard "type to search, create if not found" picker - used everywhere an item
// gets added from an existing list (people, places, labels, relation targets...).
function SearchCreatePicker({ items, getLabel = (i) => i.name, buttonLabel, buttonIcon: BtnIcon,
  onPick, onCreate, renderItem, placeholder = "Type to search…" }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [coords, setCoords] = useState(null);
  const wrapRef = useRef(null);
  const btnRef = useRef(null);
  useEffect(() => {
    if (!open) return;
    const place = () => {
      if (!btnRef.current) return;
      const r = btnRef.current.getBoundingClientRect();
      setCoords({ top: r.bottom + 4, left: r.left, width: Math.max(r.width, 220) });
    };
    place();
    const onDoc = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) { setOpen(false); setQ(""); } };
    document.addEventListener("mousedown", onDoc);
    window.addEventListener("scroll", place, true);
    window.addEventListener("resize", place);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      window.removeEventListener("scroll", place, true);
      window.removeEventListener("resize", place);
    };
  }, [open]);
  const matches = items.filter((i) => getLabel(i).toLowerCase().includes(q.trim().toLowerCase()));
  const exact = items.some((i) => getLabel(i).toLowerCase() === q.trim().toLowerCase());
  return (
    <div ref={wrapRef} style={{ display: "inline-block" }}>
      <button type="button" ref={btnRef} style={st.labelAdd} onClick={() => setOpen((o) => !o)}>
        {BtnIcon && <BtnIcon size={11} />} {buttonLabel}
      </button>
      {open && coords && (
        // position:fixed (not portaled) - this alone escapes clipping from any scrolling/
        // overflow-hidden ancestor, since none of our ancestors set a transform/filter that
        // would create a new containing block for fixed-position descendants
        <div style={{ ...st.pop, position: "fixed", top: coords.top, left: coords.left, width: coords.width, zIndex: 200 }}
          onClick={(e) => e.stopPropagation()}>
          <input autoFocus style={st.popIn} placeholder={placeholder} value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") { setOpen(false); setQ(""); return; }
              if (e.key !== "Enter") return;
              if (!exact && q.trim() && onCreate) { onCreate(q.trim()); setQ(""); setOpen(false); }
              else if (matches.length === 1) { onPick(matches[0]); setQ(""); setOpen(false); }
            }} />
          <div style={{ maxHeight: 170, overflowY: "auto" }}>
            {matches.map((i) => (
              <div key={i.id || getLabel(i)} className="lbl" style={st.popRow}
                onClick={() => { onPick(i); setQ(""); setOpen(false); }}>
                {renderItem ? renderItem(i) : <span style={{ flex: 1 }}>{getLabel(i)}</span>}
              </div>
            ))}
            {!exact && q.trim() && onCreate && (
              <div className="lbl" style={st.popRow} onClick={() => { onCreate(q.trim()); setQ(""); setOpen(false); }}>
                <Plus size={12} /><span>Create "{q.trim()}"</span>
              </div>
            )}
            {!matches.length && (exact || !q.trim()) && <div style={{ ...st.hint, padding: "6px 8px" }}>Nothing yet</div>}
          </div>
        </div>
      )}
    </div>
  );
}

function EmojiPicker({ onPick, onClose }) {
  const [q, setQ] = useState("");
  const query = q.trim().toLowerCase();
  const hit = (i) => !query || i.emoji === q.trim() || i.kw.split(" ").some((w) => w.startsWith(query));
  const groups = EMOJI_LIST
    .map((g) => ({ ...g, items: g.items.filter(hit) }))
    .filter((g) => g.items.length);
  return (
    <div style={st.pickerPanel}>
      <div style={{ display: "flex", gap: 7 }}>
        <input autoFocus style={st.textIn} placeholder="Search emoji — home, money, plane…" value={q} onChange={(e) => setQ(e.target.value)} />
        <button style={st.noBtn} onClick={onClose}><X size={12} /></button>
      </div>
      <div style={st.pickerScroll}>
        {groups.length === 0 && <p style={st.hint}>No emoji matches that.</p>}
        {groups.map((g) => (
          <div key={g.group}>
            <div style={st.pickerGroup}>{g.group}</div>
            <div style={st.emojiGrid}>
              {g.items.map((i) => (
                <button key={g.group + i.emoji} title={i.kw} style={st.emojiBtn} onClick={() => onPick(i.emoji)}>{i.emoji}</button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function IconPicker({ current, onPick, onClose }) {
  return (
    <div style={st.pickerPanel}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={st.hint}>Pick an icon</span>
        <button style={st.noBtn} onClick={onClose}><X size={12} /></button>
      </div>
      <div style={st.iconGrid}>
        {ICON_KEYS.map((k) => {
          const I = ICONS[k];
          return (
            <button key={k} title={k} onClick={() => onPick(k)}
              style={{ ...st.iconBtn, ...(current === k ? st.iconBtnOn : {}) }}><I size={14} /></button>
          );
        })}
      </div>
    </div>
  );
}

function MapBoard({ pins, onOpen, highlightId, tall }) {
  const [tilesOk, setTilesOk] = useState(true);
  const [pinHover, setPinHover] = useState(null);
  const [activePin, setActivePin] = useState(null);
  const H = tall ? 640 : 460;
  const first = pins.find((p) => p.lat != null);
  const [center, setCenter] = useState(first ? { lat: first.lat, lng: first.lng } : { lat: 35.7219, lng: 51.3347 });
  const [zoom, setZoom] = useState(11);
  const [W, setW] = useState(700);
  const box = useRef(null);
  const drag = useRef(null);

  useEffect(() => {
    const measure = () => box.current && setW(box.current.clientWidth);
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  useEffect(() => {
    if (!highlightId) return;
    const p = pins.find((x) => x.id === highlightId);
    if (p && p.lat != null) setCenter({ lat: p.lat, lng: p.lng });
  }, [highlightId]);

  const cx = lngToX(center.lng, zoom), cy = latToY(center.lat, zoom);
  const tiles = [];
  const max = 2 ** zoom;
  for (let tx = Math.floor(cx - W / 2 / TILE); tx <= Math.floor(cx + W / 2 / TILE); tx++)
    for (let ty = Math.floor(cy - H / 2 / TILE); ty <= Math.floor(cy + H / 2 / TILE); ty++) {
      if (ty < 0 || ty >= max) continue;
      const wx = ((tx % max) + max) % max;
      tiles.push({ key: `${tx}-${ty}`, url: `https://tile.openstreetmap.org/${zoom}/${wx}/${ty}.png`,
        left: (tx - cx) * TILE + W / 2, top: (ty - cy) * TILE + H / 2 });
    }

  const pan = (dx, dy) => setCenter((c) => ({
    lat: yToLat(latToY(c.lat, zoom) - dy / TILE, zoom),
    lng: xToLng(lngToX(c.lng, zoom) - dx / TILE, zoom),
  }));

  return (
    <div ref={box} style={{ ...st.mapFrame, height: H }}
      onMouseDown={(e) => { drag.current = { x: e.clientX, y: e.clientY }; }}
      onMouseMove={(e) => { if (!drag.current) return; pan(e.clientX - drag.current.x, e.clientY - drag.current.y); drag.current = { x: e.clientX, y: e.clientY }; }}
      onMouseUp={() => (drag.current = null)}
      onMouseLeave={() => (drag.current = null)}
      onTouchStart={(e) => { const t = e.touches[0]; drag.current = { x: t.clientX, y: t.clientY }; }}
      onTouchMove={(e) => { if (!drag.current) return; const t = e.touches[0]; pan(t.clientX - drag.current.x, t.clientY - drag.current.y); drag.current = { x: t.clientX, y: t.clientY }; }}
      onTouchEnd={() => (drag.current = null)}
      onWheel={(e) => { e.preventDefault(); setZoom((z) => Math.max(3, Math.min(18, z + (e.deltaY < 0 ? 1 : -1)))); }}
      onClick={() => setActivePin(null)}>
      {tilesOk && tiles.map((t) => (
        <img key={t.key} src={t.url} alt="" draggable={false} onError={() => setTilesOk(false)}
          style={{ position: "absolute", left: t.left, top: t.top, width: TILE, height: TILE,
            filter: "grayscale(0.35) brightness(0.72) contrast(1.08)" }} />
      ))}
      {!tilesOk && <div style={st.mapOffline}><MapPin size={18} /><span>Map tiles can't load in this preview. Pins are still placed correctly.</span></div>}
      {pins.filter((p) => p.lat != null).map((p) => {
        const on = p.id === highlightId || p.id === activePin;
        const items = p.items || (p.note ? [{ id: p.id, label: p.note, done: p.done }] : []);
        return (
          <div key={p.id} style={{ ...st.mapMarker,
            left: (lngToX(p.lng, zoom) - cx) * TILE + W / 2, top: (latToY(p.lat, zoom) - cy) * TILE + H / 2,
            zIndex: on ? 3 : (pinHover === p.id ? 2 : 1), display: "flex", flexDirection: "column", alignItems: "center" }}
            onMouseEnter={() => setPinHover(p.id)} onMouseLeave={() => setPinHover(null)}>
            {pinHover === p.id && activePin !== p.id && (
              <div style={st.mapTooltip}>{items.length > 1 ? `${items.length} notes here` : items[0]?.label}</div>
            )}
            {activePin === p.id && (
              <div style={st.mapPopup} onClick={(e) => e.stopPropagation()}>
                <div style={{ fontWeight: 600, fontSize: 11.5, marginBottom: 4, color: C.text }}>{p.place}</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 2, maxHeight: 160, overflowY: "auto" }}>
                  {items.map((it) => (
                    <button key={it.id} style={st.mapPopupItem} onClick={() => { onOpen(it.id); setActivePin(null); }}>
                      {it.done && <Check size={11} color={C.personal} />}
                      <span style={{ flex: 1, textAlign: "left", ...rtl(it.label) }}>{it.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
            <button style={{ background: "none", border: "none", padding: 0, cursor: "pointer",
              filter: on ? "drop-shadow(0 0 5px rgba(224,52,42,0.9))" : "none" }}
              onClick={(e) => { e.stopPropagation(); setActivePin((cur) => (cur === p.id ? null : p.id)); }}>
              <MapPin size={on ? 30 : 24} color={p.done ? C.dimmer : "#E0342A"} fill={p.done ? "rgba(94,108,120,0.35)" : "rgba(224,52,42,0.28)"} />
            </button>
            <span style={st.mapPinLabel}>{p.place}</span>
            {items.some((it) => it.soon) && (
              <div style={st.mapSoonLabels}>
                {items.filter((it) => it.soon).map((it) => (
                  <span key={it.id} style={st.mapSoonLabel}>{it.done && <Check size={9} />}{it.label}</span>
                ))}
              </div>
            )}
          </div>
        );
      })}
      <div style={st.mapZoom}>
        <button style={st.mapZoomBtn} onClick={() => setZoom((z) => Math.min(18, z + 1))}><Plus size={13} /></button>
        <button style={st.mapZoomBtn} onClick={() => setZoom((z) => Math.max(3, z - 1))}><Minus size={13} /></button>
      </div>
    </div>
  );
}

/* ---------------- markdown (Notion-flavoured subset) ---------------- */

function mdInline(text, key) {
  // order matters: code first so its contents are not re-parsed
  const out = [];
  let rest = text, i = 0;
  const patterns = [
    { re: /`([^`]+)`/, render: (m, k) => <code key={k} style={st.mdCode}>{m[1]}</code> },
    { re: /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/, render: (m, k) => <a key={k} href={m[2]} target="_blank" rel="noreferrer" style={st.mdLink}>{m[1]}</a> },
    { re: /\*\*([^*]+)\*\*/, render: (m, k) => <strong key={k}>{m[1]}</strong> },
    { re: /(?<!\*)\*([^*]+)\*(?!\*)/, render: (m, k) => <em key={k}>{m[1]}</em> },
    { re: /~~([^~]+)~~/, render: (m, k) => <span key={k} style={{ textDecoration: "line-through", opacity: 0.7 }}>{m[1]}</span> },
    { re: /(https?:\/\/[^\s)]+)/, render: (m, k) => <a key={k} href={m[1]} target="_blank" rel="noreferrer" style={st.mdLink}>{m[1]}</a> },
  ];
  let guard = 0;
  while (rest && guard++ < 200) {
    let best = null;
    patterns.forEach((p) => {
      const m = p.re.exec(rest);
      if (m && (!best || m.index < best.m.index)) best = { m, p };
    });
    if (!best) { out.push(rest); break; }
    if (best.m.index > 0) out.push(rest.slice(0, best.m.index));
    out.push(best.p.render(best.m, `${key}-${i++}`));
    rest = rest.slice(best.m.index + best.m[0].length);
  }
  return out;
}

function Markdown({ text }) {
  if (!text || !text.trim()) return <p style={st.hint}>Nothing here yet.</p>;
  const lines = text.split("\n");
  const blocks = [];
  let list = null;

  const flush = () => {
    if (!list) return;
    blocks.push(list.ordered
      ? <ol key={"l" + blocks.length} style={st.mdList}>{list.items.map((it, i) => <li key={i} style={st.mdLi}>{mdInline(it, "li" + i)}</li>)}</ol>
      : <ul key={"l" + blocks.length} style={st.mdList}>{list.items.map((it, i) => <li key={i} style={st.mdLi}>{mdInline(it, "li" + i)}</li>)}</ul>);
    list = null;
  };

  lines.forEach((raw, idx) => {
    const line = raw.trimEnd();
    const dir = rtl(line);
    if (!line.trim()) { flush(); return; }

    const todo = line.match(/^\s*[-*]\s+\[([ xX])\]\s+(.*)$/);
    if (todo) {
      flush();
      const done = todo[1].toLowerCase() === "x";
      blocks.push(
        <div key={idx} style={{ ...st.mdTodo, ...dir }}>
          <span style={{ ...st.mdCheck, ...(done ? st.mdCheckOn : {}) }}>{done && <Check size={9} color={C.ink} />}</span>
          <span style={{ textDecoration: done ? "line-through" : "none", opacity: done ? 0.6 : 1 }}>{mdInline(todo[2], "t" + idx)}</span>
        </div>
      );
      return;
    }
    const h = line.match(/^(#{1,3})\s+(.*)$/);
    if (h) {
      flush();
      const size = [17, 15, 13.5][h[1].length - 1];
      blocks.push(<div key={idx} style={{ ...st.mdH, fontSize: size, ...dir }}>{mdInline(h[2], "h" + idx)}</div>);
      return;
    }
    if (/^\s*(---|\*\*\*|___)\s*$/.test(line)) { flush(); blocks.push(<hr key={idx} style={st.mdHr} />); return; }
    const quote = line.match(/^\s*>\s?(.*)$/);
    if (quote) { flush(); blocks.push(<blockquote key={idx} style={{ ...st.mdQuote, ...dir }}>{mdInline(quote[1], "q" + idx)}</blockquote>); return; }
    const ol = line.match(/^\s*\d+[.)]\s+(.*)$/);
    const ul = line.match(/^\s*[-*+]\s+(.*)$/);
    if (ol || ul) {
      const ordered = !!ol;
      if (!list || list.ordered !== ordered) { flush(); list = { ordered, items: [] }; }
      list.items.push((ol || ul)[1]);
      return;
    }
    flush();
    blocks.push(<p key={idx} style={{ ...st.mdP, ...dir }}>{mdInline(line, "p" + idx)}</p>);
  });
  flush();
  return <div>{blocks}</div>;
}

/* ---------------- links & payments ---------------- */

const URL_RE = /https?:\/\/[^\s<>"')\]]+/g;
const extractLinks = (n) => {
  const found = `${n.content || ""}\n${n.extra || ""}`.match(URL_RE) || [];
  return [...new Set(found)].slice(0, 5);
};
function useLocalValue(key, initial) {
  const [state, setState] = useState(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw !== null ? JSON.parse(raw) : initial;
    } catch { return initial; }
  });
  useEffect(() => {
    try { localStorage.setItem(key, JSON.stringify(state)); } catch {}
  }, [key, state]);
  return [state, setState];
}

function useLocalObject(key, initial) {
  const [state, setState] = useState(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? { ...initial, ...JSON.parse(raw) } : initial;
    } catch { return initial; }
  });
  useEffect(() => {
    try { localStorage.setItem(key, JSON.stringify(state)); } catch {}
  }, [key, state]);
  return [state, setState];
}

function distributeColumns(elements, columnCount) {
  const cols = Array.from({ length: columnCount }, () => []);
  elements.forEach((el, i) => cols[i % columnCount].push(el));
  return cols;
}

function linkParts(url) {
  try {
    const u = new URL(url);
    const path = decodeURIComponent(u.pathname).split("/").filter(Boolean).pop() || "";
    const title = path ? path.replace(/[-_]+/g, " ").replace(/\.\w{2,4}$/, "") : u.hostname.replace(/^www\./, "");
    return { host: u.hostname.replace(/^www\./, ""), title: title.slice(0, 70), url };
  } catch { return { host: url.slice(0, 30), title: url, url }; }
}

// Rich link previews: the browser can't read another site's <meta> tags itself
// (CORS), so a small edge function fetches the page server-side and hands back
// og:title/description/image. Cached by URL so the same link is only fetched once.
const LINK_PREVIEW_ENDPOINT = "https://fvxnrhomkaybmasecuus.supabase.co/functions/v1/link-preview";
const linkPreviewCache = {};
const linkPreviewListeners = {};
function fetchLinkPreview(url, onDone) {
  if (linkPreviewCache[url]) { onDone(linkPreviewCache[url]); return; }
  if (linkPreviewListeners[url]) { linkPreviewListeners[url].push(onDone); return; }
  linkPreviewListeners[url] = [onDone];
  fetch(`${LINK_PREVIEW_ENDPOINT}?url=${encodeURIComponent(url)}`)
    .then((r) => r.json())
    .then((data) => {
      const result = data && !data.error ? data : null;
      linkPreviewCache[url] = result;
      (linkPreviewListeners[url] || []).forEach((cb) => cb(result));
      delete linkPreviewListeners[url];
    })
    .catch(() => {
      linkPreviewCache[url] = null;
      (linkPreviewListeners[url] || []).forEach((cb) => cb(null));
      delete linkPreviewListeners[url];
    });
}
function LinkPreviewCard({ url, first, last }) {
  const [preview, setPreview] = useState(() => linkPreviewCache[url] !== undefined ? linkPreviewCache[url] : "loading");
  useEffect(() => {
    if (linkPreviewCache[url] !== undefined) { setPreview(linkPreviewCache[url]); return; }
    let live = true;
    fetchLinkPreview(url, (r) => { if (live) setPreview(r); });
    return () => { live = false; };
  }, [url]);

  const lp = linkParts(url);
  const radii = {
    borderTopLeftRadius: first ? 9 : 0, borderTopRightRadius: first ? 9 : 0,
    borderBottomLeftRadius: last ? 9 : 0, borderBottomRightRadius: last ? 9 : 0,
    borderTop: first ? `1px solid ${C.line}` : "none",
  };

  if (preview && preview !== "loading" && (preview.title || preview.image)) {
    return (
      <a href={url} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}
        style={{ ...st.richLinkRow, ...radii }}>
        {preview.image && <img src={preview.image} alt="" style={st.richLinkImg} onError={(e) => { e.currentTarget.style.display = "none"; }} />}
        <span style={st.richLinkBody}>
          <span style={st.richLinkSite}>
            <img alt="" width={14} height={14} style={{ borderRadius: 3 }} src={preview.favicon || `https://www.google.com/s2/favicons?sz=32&domain=${lp.host}`}
              onError={(e) => { e.currentTarget.style.display = "none"; }} />
            {preview.siteName || lp.host}
          </span>
          <span style={st.richLinkTitle}>{preview.title || lp.title}</span>
          {preview.description && <span style={st.richLinkDesc}>{preview.description}</span>}
          <span style={st.richLinkUrl}>{url}</span>
        </span>
      </a>
    );
  }

  // loading or no metadata found - fall back to the lightweight favicon row
  return (
    <a href={url} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} style={{ ...st.linkRow, ...radii }}>
      <span style={st.faviconWrap}>
        <span style={st.faviconLetter}>{(lp.host[0] || "?").toUpperCase()}</span>
        <img alt="" width={16} height={16} style={st.favicon}
          src={`https://www.google.com/s2/favicons?sz=32&domain=${lp.host}`}
          onError={(e) => { e.currentTarget.style.display = "none"; }} />
      </span>
      <span style={st.linkText}>
        <span style={st.linkTitle}>{lp.title || lp.host}</span>
        <span style={st.linkHost}>{lp.host}</span>
      </span>
    </a>
  );
}

// pulls the payable amount out of a bill-like note
const FA_DIGITS = "\u06F0\u06F1\u06F2\u06F3\u06F4\u06F5\u06F6\u06F7\u06F8\u06F9";
const AR_DIGITS = "\u0660\u0661\u0662\u0663\u0664\u0665\u0666\u0667\u0668\u0669";
const toLatinDigits = (t) => t.replace(/[\u06F0-\u06F9]/g, (d) => String(FA_DIGITS.indexOf(d)))
                              .replace(/[\u0660-\u0669]/g, (d) => String(AR_DIGITS.indexOf(d)));

const CURRENCY_RE = /(ریال|تومان|تومن|﷼|IRR|USD|EUR|GBP|\$|€|£)/;
// lines naming an identifier rather than money — these must never be read as an amount
const ID_LINE_RE = /(شناسه|کد|بدنه|کنتور|شماره|حساب|شبا|کارت|پیامک|سرشماره|اشتراک|قرارداد|account|invoice\s*(no|#)|tracking|ref(erence)?|id\b|code)/i;
// lines that name the payable total — strongest signal
const PAYABLE_RE = /(قابل\s*پرداخت|مبلغ\s*کل|جمع\s*کل|بدهی|قبض|amount\s*due|total\s*due|payable|grand\s*total|balance\s*due)/i;
const AMOUNT_WORD_RE = /(مبلغ|هزینه|پرداخت|price|amount|total|cost|fee)/i;

function parsePayment(text) {
  if (!text) return null;
  const cands = [];
  text.split("\n").forEach((rawLine) => {
    const line = toLatinDigits(rawLine);
    if (ID_LINE_RE.test(line) && !PAYABLE_RE.test(line)) return; // skip identifier lines
    const hasCur = CURRENCY_RE.test(rawLine);
    const payable = PAYABLE_RE.test(line);
    const amountish = AMOUNT_WORD_RE.test(line);
    // require thousands grouping, a decimal, or an explicit currency — bare digit runs are usually IDs
    const re = /\d{1,3}(?:[,،]\d{3})+(?:\.\d+)?|\d+\.\d{2}\b|\d{4,9}\b/g;
    let m;
    while ((m = re.exec(line))) {
      const raw = m[0];
      const digits = raw.replace(/\D/g, "");
      if (digits.length > 12) continue;                         // too long to be money
      const grouped = /[,،]/.test(raw);
      if (!grouped && !hasCur && !payable) continue;            // unlabelled bare number: skip
      const val = parseFloat(digits);
      if (!isFinite(val) || val < 100) continue;
      cands.push({ display: raw, currency: (rawLine.match(CURRENCY_RE) || [])[1] || "",
        payable, amountish, hasCur, grouped, val });
    }
  });
  if (!cands.length) return null;
  // rank by signal strength, not by magnitude — a large ID must never beat a labelled total
  cands.sort((a, b) =>
    (b.payable - a.payable) ||
    (b.amountish - a.amountish) ||
    (b.hasCur - a.hasCur) ||
    (b.grouped - a.grouped) ||
    (b.val - a.val));
  return cands[0];
}

/* ---------------- app ---------------- */

export default function ShiftApp() {
  const [notes, setNotes] = useState([]);
  const [types, setTypes] = useState(DEFAULT_TYPES);
  const [categories, setCategories] = useState(DEFAULT_CATEGORIES);
  const [labels, setLabels] = useState([]);
  const [places, setPlaces] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [discoverClasses, setDiscoverClasses] = useState(DEFAULT_DISCOVER);
  const [routineKinds, setRoutineKinds] = useState(DEFAULT_ROUTINE_KINDS);
  const [peopleGroups, setPeopleGroups] = useState([]); // extra (possibly empty) group names, on top of whatever contacts already reference
  const [sections, setSections] = useState([]);
  const [activeSectionId, setActiveSectionId] = useLocalValue("shift-active-section", null);
  const [view, setView] = useState("notes");
  // Sorting/grouping choices are remembered per Section (including "Everything", when no
  // section is active) so they survive a refresh instead of resetting every time.
  const [viewPrefsBySection, setViewPrefsBySection] = useLocalObject("shift-view-prefs", {});
  const sectionPrefsKey = activeSectionId || "everything";
  const viewPrefs = viewPrefsBySection[sectionPrefsKey] || DEFAULT_VIEW_PREFS;
  const setViewPref = (key, value) => {
    setViewPrefsBySection((p) => {
      const cur = p[sectionPrefsKey] || DEFAULT_VIEW_PREFS;
      const nextVal = typeof value === "function" ? value(cur[key]) : value;
      return { ...p, [sectionPrefsKey]: { ...cur, [key]: nextVal } };
    });
  };
  const sortBy = viewPrefs.sortBy, setSortBy = (v) => setViewPref("sortBy", v);
  const sortChain = viewPrefs.sortChain, setSortChain = (v) => setViewPref("sortChain", v);
  const groupBy = viewPrefs.groupBy, setGroupBy = (v) => setViewPref("groupBy", v);
  const taskScope = viewPrefs.taskScope, setTaskScope = (v) => setViewPref("taskScope", v); // "both" | "tasks" | "subtasks"
  const listShowArchived = viewPrefs.listShowArchived, setListShowArchived = (v) => setViewPref("listShowArchived", v);
  const listGroupByType = viewPrefs.listGroupByType, setListGroupByType = (v) => setViewPref("listGroupByType", v);
  const filterPriority = viewPrefs.filterPriority, setFilterPriority = (v) => setViewPref("filterPriority", v);
  const filterEffort = viewPrefs.filterEffort, setFilterEffort = (v) => setViewPref("filterEffort", v);
  const filterQueue = viewPrefs.filterQueue, setFilterQueue = (v) => setViewPref("filterQueue", v);
  const filterDate = viewPrefs.filterDate, setFilterDate = (v) => setViewPref("filterDate", v);
  const [loaded, setLoaded] = useState(false);

  const [filter, setFilter] = useState({ kind: "all" });
  const [search, setSearch] = useState("");
  const [error, setError] = useState(null);

  const [editor, setEditor] = useState(null);
  // Guards every modal's backdrop click: a drag that starts inside the modal card and is
  // released on the backdrop (e.g. selecting text and letting go outside the card) must NOT
  // close the modal. Browsers retarget that "click" to the backdrop itself, so we track
  // whether the mousedown truly *originated* on the backdrop (not a descendant) and only
  // close when it did.
  const overlayDownOnBackdropRef = useRef(false);
  const overlayMouseDown = (e) => { overlayDownOnBackdropRef.current = e.target === e.currentTarget; };
  const overlayClickClose = (fn) => () => { if (overlayDownOnBackdropRef.current) fn(); };
  const [busy, setBusy] = useState({});
  const [labelOpen, setLabelOpen] = useState(false);
  const [labelQuery, setLabelQuery] = useState("");
  const [mapOpen, setMapOpen] = useState(false);
  const [mapDraft, setMapDraft] = useState(null);
  const [mapName, setMapName] = useState("");
  const [mapTarget, setMapTarget] = useState(null); // null = trigger location; "new" = new saved place; placeId = edit that place's location
  const [mapSeed, setMapSeed] = useState(null); // where to open the map - set once per open, never touched while panning
  const [mapHighlight, setMapHighlight] = useState(null);
  const [personModal, setPersonModal] = useState(null);
  const [linksModal, setLinksModal] = useState(null);
  const [pendingRelModel, setPendingRelModel] = useState("");

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [newType, setNewType] = useState({ name: "", icon: "Star" });
  const [newCat, setNewCat] = useState({});
  const [picker, setPicker] = useState(null);
  const [extraOpen, setExtraOpen] = useState(false);
  const [relationsOpen, setRelationsOpen] = useState(false);
  const [contactQuery, setContactQuery] = useState("");
  const [newContact, setNewContact] = useState("");
  const [newDiscover, setNewDiscover] = useState("");
  const [newRoutineKind, setNewRoutineKind] = useState("");
  const [newPeopleGroup, setNewPeopleGroup] = useState("");
  const [newPlace, setNewPlace] = useState("");
  const [customTriggers, setCustomTriggers] = useState(DEFAULT_TRIGGERS);
  const [claudeMemory, setClaudeMemory] = useState([]);
  const [newTrigger, setNewTrigger] = useState("");
  const [tab, setTab] = useState("filing");
  const [cloudOpen, setCloudOpen] = useState(false);
  const [cloud, setCloud] = useState(() => getCloudConfig());
  const [session, setSession] = useState(null);
  const [cloudForm, setCloudForm] = useState(() => getCloudConfig() || { url: "", key: "" });
  const [email, setEmail] = useState("");
  const [cloudMsg, setCloudMsg] = useState(null);
  const [cloudBusy, setCloudBusy] = useState(false);
  const [epoch, setEpoch] = useState(0);
  const lastUserRef = useRef(undefined);

  // watch the Supabase session when cloud sync is configured
  useEffect(() => {
    let sub = null, alive = true;
    (async () => {
      const sb = await trySupabase();
      if (!sb || !alive) return;
      const { data: { session: s } } = await sb.auth.getSession();
      if (alive) {
        setSession(s || null);
        lastUserRef.current = s && s.user ? s.user.id : null;
      }
      const res = sb.auth.onAuthStateChange((_e, s2) => {
        setSession(s2 || null);
        // Supabase fires this on startup and on every token refresh. Reloading
        // on each one would overwrite whatever is currently on screen, so only
        // reload when the account itself has actually changed.
        const nextUser = s2 && s2.user ? s2.user.id : null;
        if (lastUserRef.current !== nextUser) {
          lastUserRef.current = nextUser;
          setEpoch((n) => n + 1);
        }
      });
      sub = res.data.subscription;
    })();
    return () => { alive = false; if (sub) sub.unsubscribe(); };
  }, [cloud]);

  const editorOpenRef = useRef(false);
  useEffect(() => { editorOpenRef.current = !!editor; }, [editor]);
  const personModalOpenRef = useRef(false);
  useEffect(() => { personModalOpenRef.current = !!personModal; }, [personModal]);
  const skipNextSaveRef = useRef({});

  // realtime: any change to this account's data, from this device or another
  // (including notes Claude writes through the connector), applies live.
  const realtimeUserId = session && session.user ? session.user.id : null;
  useEffect(() => {
    if (!realtimeUserId || !cloud) return;
    let channel = null, alive = true;
    (async () => {
      const sb = await trySupabase();
      if (!sb || !alive) return;
      const setters = {
        "sift-notes": (v) => {
          if (editorOpenRef.current) return; // don't clobber an open draft, and don't mark skip for a no-op
          skipNextSaveRef.current["sift-notes"] = true;
          setNotes(v);
        },
        "sift-types": (v) => { skipNextSaveRef.current["sift-types"] = true; setTypes(normTypes(v)); },
        "sift-categories": (v) => { skipNextSaveRef.current["sift-categories"] = true; setCategories(normCats(v)); },
        "sift-labels": (v) => { skipNextSaveRef.current["sift-labels"] = true; setLabels(normLabels(v)); },
        "sift-places": (v) => { skipNextSaveRef.current["sift-places"] = true; setPlaces(v); },
        "sift-contacts": (v) => {
          if (personModalOpenRef.current) return; // don't clobber an open person's draft
          skipNextSaveRef.current["sift-contacts"] = true;
          setContacts(v);
        },
        "sift-discover": (v) => { skipNextSaveRef.current["sift-discover"] = true; setDiscoverClasses(v && v.length ? v : DEFAULT_DISCOVER); },
        "sift-routine-kinds": (v) => { skipNextSaveRef.current["sift-routine-kinds"] = true; setRoutineKinds(v && v.length ? v : DEFAULT_ROUTINE_KINDS); },
        "sift-people-groups": (v) => { skipNextSaveRef.current["sift-people-groups"] = true; setPeopleGroups(Array.isArray(v) ? v : []); },
        "sift-sections": (v) => { skipNextSaveRef.current["sift-sections"] = true; setSections(Array.isArray(v) ? v : []); },
        "sift-custom-triggers": (v) => { skipNextSaveRef.current["sift-custom-triggers"] = true; setCustomTriggers(Array.isArray(v) ? v : DEFAULT_TRIGGERS); },
        "sift-claude-memory": (v) => { skipNextSaveRef.current["sift-claude-memory"] = true; setClaudeMemory(Array.isArray(v) ? v : []); },
      };
      channel = sb.channel("shift-kv-" + realtimeUserId)
        .on("postgres_changes",
          { event: "*", schema: "public", table: "shift_kv", filter: `user_id=eq.${realtimeUserId}` },
          (payload) => {
            const row = payload.new || payload.old;
            if (!row || payload.eventType === "DELETE") return;
            const setter = setters[row.key];
            if (!setter) return;
            try { setter(JSON.parse(row.value)); } catch {}
          })
        .subscribe();
    })();
    return () => { alive = false; if (channel) channel.unsubscribe(); };
  }, [realtimeUserId, cloud]);

  const [relPicker, setRelPicker] = useState(null);
  const [confirmState, setConfirmState] = useState(null); // { x, y, message, onConfirm }
  const confirmRef = useRef(null);
  const confirmAction = (e, message, onConfirm) => {
    const r = e.currentTarget.getBoundingClientRect();
    const width = 260;
    setConfirmState({
      x: Math.min(Math.max(8, r.left), window.innerWidth - width - 8),
      y: r.bottom + 6 > window.innerHeight - 100 ? Math.max(8, r.top - 6) : r.bottom + 6,
      upward: r.bottom + 6 > window.innerHeight - 100,
      message, onConfirm,
    });
  };
  useEffect(() => {
    if (!confirmState) return;
    const onDoc = (e) => { if (confirmRef.current && !confirmRef.current.contains(e.target)) setConfirmState(null); };
    const onEsc = (e) => { if (e.key === "Escape") setConfirmState(null); };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onEsc);
    return () => { document.removeEventListener("mousedown", onDoc); document.removeEventListener("keydown", onEsc); };
  }, [confirmState]);
  const [vw, setVw] = useState(typeof window !== "undefined" ? window.innerWidth : 1200);
  const [drawer, setDrawer] = useState(false);
  const narrow = vw < 900;
  const columnCount = vw <= 880 ? 1 : vw <= 1250 ? 2 : 3;
  const phone = vw < 560;

  useEffect(() => {
    const onResize = () => setVw(window.innerWidth);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  useEffect(() => { if (!narrow) setDrawer(false); }, [narrow]);

  // launched from a PWA shortcut (long-press the app icon)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (!params.toString()) return;
    if (params.get("new") === "1") openNew();
    else if (params.get("view") === "critical") { setView("notes"); setFilter({ kind: "critical" }); }
    else if (params.get("view") === "calendar") setView("calendar");
    window.history.replaceState({}, "", window.location.pathname);
  }, []);

  /* ---------------- notifications ---------------- */
  const [notifPerm, setNotifPerm] = useState(() =>
    (typeof Notification !== "undefined" ? Notification.permission : "unsupported"));
  const [swReady, setSwReady] = useState(null);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js", { scope: "/" }).then((reg) => setSwReady(reg)).catch(() => {});
  }, []);

  async function requestNotifPermission() {
    if (typeof Notification === "undefined") return;
    const perm = await Notification.requestPermission();
    setNotifPerm(perm);
  }

  async function notify(title, body, tag) {
    if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
    try {
      const reg = swReady || (await navigator.serviceWorker.ready.catch(() => null));
      if (reg && reg.showNotification) {
        await reg.showNotification(title, {
          body, tag, icon: undefined, badge: undefined,
          data: { url: window.location.origin + window.location.pathname },
        });
      } else {
        new Notification(title, { body, tag });
      }
    } catch {}
  }

  const sendTestNotification = () => notify("Shift", "This is what a reminder notification looks like.", "shift-test");

  // checks reminders while the app is open/installed, and fires those due
  const firedRef = useRef({});
  useEffect(() => {
    if (notifPerm !== "granted") return;
    const check = () => {
      const now = Date.now();
      notes.forEach((n) => {
        if (!n.reminder || n.archived) return;
        let due = null;
        if (n.reminder.kind === "once" && n.reminder.at) {
          due = toLocalDate(n.reminder.at)?.getTime() ?? null;
        } else if (n.reminder.kind === "repeat" && n.reminder.at) {
          const start = toLocalDate(n.reminder.at)?.getTime();
          if (isNaN(start)) return;
          const stepMs = { day: 864e5, week: 7 * 864e5, month: 30 * 864e5, year: 365 * 864e5 }[n.reminder.unit || "week"] * (n.reminder.every || 1);
          if (now >= start) {
            const cycles = Math.floor((now - start) / stepMs);
            due = start + cycles * stepMs;
          }
        }
        if (due == null || isNaN(due) || due > now) return;
        const fireKey = n.id + ":" + due;
        if (firedRef.current[fireKey]) return;
        firedRef.current[fireKey] = true;
        notify(n.title || "Reminder", (n.content || "").slice(0, 120), "shift-reminder-" + n.id);
      });
    };
    check();
    const id = setInterval(check, 45000);
    return () => clearInterval(id);
  }, [notes, notifPerm]);

  const [relQuery, setRelQuery] = useState("");
  const [calMonth, setCalMonth] = useState(() => { const d = new Date(); return { y: d.getFullYear(), m: d.getMonth() }; });
  const [calKindOn, setCalKindOn] = useLocalObject("shift-cal-kind-on", { done: true, dead: true, due: true, suggested: true, related: true });
  const [recKindOn, setRecKindOn] = useLocalObject("shift-rec-kind-on", { reminder: true, routine: true });
  const [dailyKindOn, setDailyKindOn] = useLocalObject("shift-daily-kind-on", { dates: true, remember: true, reminders: true, discover: true });
  const [domainActive, setDomainActive] = useLocalObject("shift-domain-active", { Work: true, Personal: true });
  const [newSectionName, setNewSectionName] = useState("");

  const fileRef = useRef(null), titleRef = useRef(null), contentRef = useRef(null);

  useEffect(() => {
    Promise.all([
      loadKey("sift-notes", []), loadKey("sift-types", DEFAULT_TYPES), loadKey("sift-categories", DEFAULT_CATEGORIES),
      loadKey("sift-labels", []), loadKey("sift-places", []),
      loadKey("sift-contacts", []), loadKey("sift-discover", DEFAULT_DISCOVER),
      loadKey("sift-custom-triggers", DEFAULT_TRIGGERS), loadKey("sift-claude-memory", []),
      loadKey("sift-routine-kinds", DEFAULT_ROUTINE_KINDS), loadKey("sift-sections", []),
      loadKey("sift-people-groups", []),
    ]).then(([n, t, c, l, p, co, dc, ct, cm, rk, sc, pg]) => {
      // migrate any note still missing a type - "Note" is now the floor, never null
      const nArr = Array.isArray(n) ? n : [];
      const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
      const purged = nArr.some((x) => x.trashedAt && x.trashedAt < thirtyDaysAgo);
      const nPurged = purged ? nArr.filter((x) => !(x.trashedAt && x.trashedAt < thirtyDaysAgo)) : nArr;
      const migrated = nPurged.some((x) => !x.type);
      const nFixed = migrated ? nPurged.map((x) => (x.type ? x : { ...x, type: "Note" })) : nPurged;
      // guard against a stale or empty cloud copy wiping work already on screen
      setNotes((prev) => (Array.isArray(nFixed) && nFixed.length === 0 && prev.length > 0 ? prev : nFixed));
      if ((migrated || purged) && nFixed.length > 0) saveKey("sift-notes", nFixed);
      const storedTypes = normTypes(t);
      const canonicalTypes = DEFAULT_TYPES.map((dt) => {
        const stored = storedTypes.find((x) => x.name === dt.name);
        return stored && stored.active === false ? { ...dt, active: false } : dt;
      });
      setTypes(canonicalTypes); setCategories(normCats(c)); setLabels(normLabels(l));
      setPlaces(p);
      setContacts(co); setDiscoverClasses(dc && dc.length ? dc : DEFAULT_DISCOVER);
      setRoutineKinds(rk && rk.length ? rk : DEFAULT_ROUTINE_KINDS);
      setPeopleGroups(Array.isArray(pg) ? pg : []);
      setSections(Array.isArray(sc) ? sc : []);
      setCustomTriggers(Array.isArray(ct) ? ct : DEFAULT_TRIGGERS);
      setClaudeMemory(Array.isArray(cm) ? cm : []);
      setLoaded(true);
    });
  }, [epoch]);

  useEffect(() => {
    if (!loaded) return;
    if (skipNextSaveRef.current["sift-notes"]) { skipNextSaveRef.current["sift-notes"] = false; return; }
    saveKey("sift-notes", notes);
  }, [notes, loaded]);
  useEffect(() => {
    if (!loaded) return;
    if (skipNextSaveRef.current["sift-types"]) { skipNextSaveRef.current["sift-types"] = false; return; }
    saveKey("sift-types", types);
  }, [types, loaded]);
  useEffect(() => {
    if (!loaded) return;
    if (skipNextSaveRef.current["sift-categories"]) { skipNextSaveRef.current["sift-categories"] = false; return; }
    saveKey("sift-categories", categories);
  }, [categories, loaded]);
  useEffect(() => {
    if (!loaded) return;
    if (skipNextSaveRef.current["sift-labels"]) { skipNextSaveRef.current["sift-labels"] = false; return; }
    saveKey("sift-labels", labels);
  }, [labels, loaded]);
  useEffect(() => {
    if (!loaded) return;
    if (skipNextSaveRef.current["sift-places"]) { skipNextSaveRef.current["sift-places"] = false; return; }
    saveKey("sift-places", places);
  }, [places, loaded]);
  useEffect(() => {
    if (!loaded) return;
    if (skipNextSaveRef.current["sift-contacts"]) { skipNextSaveRef.current["sift-contacts"] = false; return; }
    saveKey("sift-contacts", contacts);
  }, [contacts, loaded]);
  useEffect(() => {
    if (!loaded) return;
    if (skipNextSaveRef.current["sift-discover"]) { skipNextSaveRef.current["sift-discover"] = false; return; }
    saveKey("sift-discover", discoverClasses);
  }, [discoverClasses, loaded]);
  useEffect(() => {
    if (!loaded) return;
    if (skipNextSaveRef.current["sift-routine-kinds"]) { skipNextSaveRef.current["sift-routine-kinds"] = false; return; }
    saveKey("sift-routine-kinds", routineKinds);
  }, [routineKinds, loaded]);
  useEffect(() => {
    if (!loaded) return;
    if (skipNextSaveRef.current["sift-people-groups"]) { skipNextSaveRef.current["sift-people-groups"] = false; return; }
    saveKey("sift-people-groups", peopleGroups);
  }, [peopleGroups, loaded]);
  useEffect(() => {
    if (!loaded) return;
    if (skipNextSaveRef.current["sift-sections"]) { skipNextSaveRef.current["sift-sections"] = false; return; }
    saveKey("sift-sections", sections);
  }, [sections, loaded]);
  useEffect(() => {
    if (!loaded) return;
    if (skipNextSaveRef.current["sift-custom-triggers"]) { skipNextSaveRef.current["sift-custom-triggers"] = false; return; }
    saveKey("sift-custom-triggers", customTriggers);
  }, [customTriggers, loaded]);
  useEffect(() => {
    if (!loaded) return;
    if (skipNextSaveRef.current["sift-claude-memory"]) { skipNextSaveRef.current["sift-claude-memory"] = false; return; }
    saveKey("sift-claude-memory", claudeMemory);
  }, [claudeMemory, loaded]);

  const typeOf = (name) => types.find((t) => t.name === name);
  const catOf = (domain, name) => (categories[domain] || []).find((c) => c.name === name);
  const labelOf = (name) => labels.find((l) => l.name === name);
  const TypeIcon = ({ name, size = 14, color }) => {
    const t = typeOf(name);
    const I = (t && ICONS[t.icon]) || FileText;
    return <I size={size} color={color} />;
  };
  const isTaskLike = (name) => {
    const t = typeOf(name);
    return !!t && (t.icon === "CheckSquare" || /task/i.test(t.name));
  };

  // A note is hidden everywhere (all views, including Calendar) if its type, category,
  // any of its labels, or any referenced person has been marked inactive. Everything is
  // active by default - only an explicit active:false hides it.
  const activeSection = sections.find((s) => s.id === activeSectionId) || null;
  const isDomainVisible = (d) => (activeSection ? (activeSection.domainActive || {})[d] !== false : domainActive[d] !== false);
  const toggleDomainVisible = (d) => {
    if (activeSection) {
      const next = isDomainVisible(d) ? false : true;
      setSections((p) => p.map((s) => (s.id === activeSection.id ? { ...s, domainActive: { ...(s.domainActive || {}), [d]: next } } : s)));
    } else setDomainActive((p) => ({ ...p, [d]: p[d] === false ? true : false }));
  };
  const isCatVisible = (domain, catName) => {
    if (activeSection) return (activeSection.categoryActive || {})[`${domain}/${catName}`] !== false;
    const cat = (categories[domain] || []).find((c) => c.name === catName);
    return !cat || cat.active !== false;
  };
  const toggleCatVisible = (domain, catName) => {
    const key = `${domain}/${catName}`;
    if (activeSection) {
      const next = isCatVisible(domain, catName) ? false : true;
      setSections((p) => p.map((s) => (s.id === activeSection.id ? { ...s, categoryActive: { ...(s.categoryActive || {}), [key]: next } } : s)));
    } else setCategories((p) => ({ ...p, [domain]: p[domain].map((x) => (x.name === catName ? { ...x, active: x.active === false ? true : false } : x)) }));
  };
  const isTypeVisible = (name) => {
    if (activeSection) return (activeSection.typeActive || {})[name] !== false;
    const t = types.find((x) => x.name === name);
    return !t || t.active !== false;
  };
  const toggleTypeVisible = (name) => {
    if (activeSection) {
      const next = isTypeVisible(name) ? false : true;
      setSections((p) => p.map((s) => (s.id === activeSection.id ? { ...s, typeActive: { ...(s.typeActive || {}), [name]: next } } : s)));
    } else setTypes((p) => p.map((x) => (x.name === name ? { ...x, active: x.active === false ? true : false } : x)));
  };
  const isLabelVisible = (name) => {
    if (activeSection) return (activeSection.labelActive || {})[name] !== false;
    const l = labels.find((x) => x.name === name);
    return !l || l.active !== false;
  };
  const toggleLabelVisible = (name) => {
    if (activeSection) {
      const next = isLabelVisible(name) ? false : true;
      setSections((p) => p.map((s) => (s.id === activeSection.id ? { ...s, labelActive: { ...(s.labelActive || {}), [name]: next } } : s)));
    } else setLabels((p) => p.map((x) => (x.name === name ? { ...x, active: x.active === false ? true : false } : x)));
  };
  const isNoteVisible = React.useCallback((n) => {
    if (n.domain && !isDomainVisible(n.domain)) return false;
    if (n.type && !isTypeVisible(n.type)) return false;
    if (n.domain && n.category && !isCatVisible(n.domain, n.category)) return false;
    if ((n.labels || []).some((l) => !isLabelVisible(l))) return false;
    const refs = [...(n.contacts || []), ...(n.assignees || []), n.referrer].filter(Boolean);
    if (refs.some((id) => { const c = contacts.find((x) => x.id === id); return c && c.active === false; })) return false;
    return true;
  }, [types, categories, labels, contacts, domainActive, activeSection]);
  const live = React.useMemo(() => notes.filter((n) => !n.archived && !n.trashedAt && isNoteVisible(n)), [notes, isNoteVisible]);
  const archived = React.useMemo(() => notes.filter((n) => n.archived && !n.trashedAt && isNoteVisible(n)), [notes, isNoteVisible]);
  const trashed = React.useMemo(() => notes.filter((n) => n.trashedAt), [notes]);

  const domainCounts = React.useMemo(() => {
    const d = { Work: 0, Personal: 0 };
    live.forEach((n) => { if (n.domain) d[n.domain] += 1; });
    return d;
  }, [live]);
  const catCounts = React.useMemo(() => {
    const c = { Work: {}, Personal: {} };
    live.forEach((n) => { if (n.domain) { const k = n.category || "Uncategorized"; c[n.domain][k] = (c[n.domain][k] || 0) + 1; } });
    return c;
  }, [live]);
  const typeCounts = React.useMemo(() => {
    const t = {}; live.forEach((n) => { if (n.type) t[n.type] = (t[n.type] || 0) + 1; }); return t;
  }, [live]);
  const labelCounts = React.useMemo(() => {
    const m = {}; live.forEach((n) => (n.labels || []).forEach((l) => (m[l] = (m[l] || 0) + 1))); return m;
  }, [live]);
  const contactCounts = React.useMemo(() => {
    const m = {};
    live.forEach((n) => [...(n.contacts || []), ...(n.assignees || [])].forEach((c) => (m[c] = (m[c] || 0) + 1)));
    return m;
  }, [live]);
  const criticalCount = React.useMemo(() => live.filter((n) => n.critical).length, [live]);
  const unfiled = live.filter((n) => !n.domain).length;
  const taskContext = filter.kind === "type" && (() => {
    const t = types.find((x) => x.name === filter.type);
    return !!t && (t.icon === "CheckSquare" || /task/i.test(t.name));
  })();
  const discoverContext = filter.kind === "type" && filter.type === "Discover";

  const applyCommonFilters = (l) => {
    if (view !== "archive") {
      if (filter.kind === "unfiled") l = l.filter((n) => !n.domain);
      else if (filter.kind === "domain") l = l.filter((n) => n.domain === filter.domain);
      else if (filter.kind === "category") l = l.filter((n) => n.domain === filter.domain && (n.category || "Uncategorized") === filter.category);
      else if (filter.kind === "type") l = l.filter((n) => n.type === filter.type);
      else if (filter.kind === "label") l = l.filter((n) => (n.labels || []).includes(filter.label));
      else if (filter.kind === "contact") l = l.filter((n) => (n.contacts || []).includes(filter.contact) || (n.assignees || []).includes(filter.contact));
      else if (filter.kind === "group") {
        const ids = contacts.filter((c) => contactGroupNames(c).includes(filter.group)).map((c) => c.id);
        l = l.filter((n) => (n.contacts || []).some((id) => ids.includes(id)) || (n.assignees || []).some((id) => ids.includes(id)));
      }
      else if (filter.kind === "critical") l = l.filter((n) => n.critical);
    }
    if (taskScope === "tasks") l = l.filter((n) => !n.parent);
    else if (taskScope === "subtasks") l = l.filter((n) => !!n.parent);
    if (filterPriority != null) l = l.filter((n) => n.priority != null && n.priority <= filterPriority);
    if (filterEffort != null) l = l.filter((n) => n.effort != null && n.effort <= filterEffort);
    if (filterQueue != null) {
      const idx = QUEUES.indexOf(filterQueue);
      l = l.filter((n) => n.queue && QUEUES.indexOf(n.queue) >= idx);
    }
    if (filterDate) {
      const cutoff = new Date(filterDate).getTime();
      l = l.filter((n) => { const d = noteRefDate(n); return d && d.getTime() <= cutoff; });
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      l = l.filter((n) => (n.title || "").toLowerCase().includes(q) || n.content.toLowerCase().includes(q) || (n.extra || "").toLowerCase().includes(q));
    }
    return l;
  };

  const archivedForFilter = React.useMemo(() => {
    if (view !== "notes") return [];
    if (!["category", "type", "label"].includes(filter.kind)) return [];
    return applyCommonFilters(archived);
  }, [archived, filter, view, taskScope, search, filterPriority, filterEffort, filterQueue, filterDate]);

  const visible = React.useMemo(() => {
    let l = applyCommonFilters(view === "archive" ? archived : live);
    const byNewest = (a, b) => b.createdAt - a.createdAt;
    const sorters = {
      newest: byNewest,
      priority: (a, b) => (a.priority || 9) - (b.priority || 9) || byNewest(a, b),
      deadline: (a, b) => {
        const av = a.deadline ? new Date(a.deadline).getTime() : Infinity;
        const bv = b.deadline ? new Date(b.deadline).getTime() : Infinity;
        return av - bv || byNewest(a, b);
      },
      queue: (a, b) => {
        const ai = a.queue ? QUEUES.indexOf(a.queue) : 99;
        const bi = b.queue ? QUEUES.indexOf(b.queue) : 99;
        return ai - bi || byNewest(a, b);
      },
      effort: (a, b) => (a.effort || 9) - (b.effort || 9) || byNewest(a, b),
    };
    const sorted = [...l].sort(sorters[sortBy] || byNewest);
    // pinned notes float above everything, critical notes above the rest
    return sorted.sort((a, b) => (b.pinned ? 2 : 0) - (a.pinned ? 2 : 0) || (b.critical ? 1 : 0) - (a.critical ? 1 : 0));
  }, [live, archived, view, filter, taskScope, search, sortBy, filterPriority, filterEffort, filterQueue, filterDate]);

  const [peopleListView, setPeopleListView] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState({});
  const [peopleSidebarQuery, setPeopleSidebarQuery] = useState("");
  const [groupSearchModal, setGroupSearchModal] = useState(null);
  const [groupSearchQuery, setGroupSearchQuery] = useState("");
  const listBase = React.useMemo(() => {
    if (!listShowArchived) return visible;
    return applyCommonFilters([...live, ...archived]);
  }, [visible, listShowArchived, live, archived, filter, taskScope, search, filterPriority, filterEffort, filterQueue, filterDate]);

  // Field comparators shared by the List view's clickable, stackable column sort.
  const FIELD_CMP = {
    title: (a, b) => (a.title || a.content || "").localeCompare(b.title || b.content || ""),
    domain: (a, b) => (a.domain || "").localeCompare(b.domain || ""),
    category: (a, b) => (a.category || "").localeCompare(b.category || ""),
    type: (a, b) => (a.type || "").localeCompare(b.type || ""),
    queue: (a, b) => (a.queue ? QUEUES.indexOf(a.queue) : 99) - (b.queue ? QUEUES.indexOf(b.queue) : 99),
    status: (a, b) => (a.status ? STATUSES.indexOf(a.status) : 99) - (b.status ? STATUSES.indexOf(b.status) : 99),
    priority: (a, b) => (a.priority || 9) - (b.priority || 9),
    effort: (a, b) => (a.effort || 9) - (b.effort || 9),
    deadline: (a, b) => (a.deadline ? new Date(a.deadline).getTime() : Infinity) - (b.deadline ? new Date(b.deadline).getTime() : Infinity),
    due: (a, b) => {
      const at = (n) => { const t = n.trigger; return t && t.kind === "date" ? new Date(t.at).getTime() : Infinity; };
      return at(a) - at(b);
    },
    related: (a, b) => {
      const at = (n) => ((n.relatedDates || [])[0] ? new Date(n.relatedDates[0]).getTime() : Infinity);
      return at(a) - at(b);
    },
    recommendedDate: (a, b) => (a.recommendedDate ? new Date(a.recommendedDate).getTime() : Infinity) - (b.recommendedDate ? new Date(b.recommendedDate).getTime() : Infinity),
    done: (a, b) => (a.doneAt ? new Date(a.doneAt).getTime() : Infinity) - (b.doneAt ? new Date(b.doneAt).getTime() : Infinity),
    created: (a, b) => a.createdAt - b.createdAt,
    critical: (a, b) => (b.critical ? 1 : 0) - (a.critical ? 1 : 0),
  };
  const listSorted = React.useMemo(() => {
    const base = listBase;
    if (!sortChain.length) return base;
    const chain = sortChain;
    return [...base].sort((a, b) => {
      for (const { field, dir } of chain) {
        const cmp = FIELD_CMP[field]; if (!cmp) continue;
        const r = cmp(a, b) * (dir === "desc" ? -1 : 1);
        if (r !== 0) return r;
      }
      return b.createdAt - a.createdAt;
    });
  }, [listBase, sortChain]);
  const toggleSortChain = (field, additive) => {
    setSortChain((prev) => {
      const existing = prev.find((s) => s.field === field);
      if (!additive) {
        if (existing) return [{ field, dir: existing.dir === "asc" ? "desc" : "asc" }];
        return [{ field, dir: "asc" }];
      }
      if (existing) return prev.map((s) => (s.field === field ? { field, dir: s.dir === "asc" ? "desc" : "asc" } : s));
      return [...prev, { field, dir: "asc" }];
    });
  };

  const grouped = React.useMemo(() => {
    const pinned = visible.filter((n) => n.pinned);
    const rest = visible.filter((n) => !n.pinned);
    const pinnedGroup = pinned.length ? [{ key: "__pinned__", pinned: true, items: pinned }] : [];
    if (groupBy === "none") return [...pinnedGroup, { key: null, items: rest }];
    const map = new Map();
    rest.forEach((n) => {
      let k = "Ungrouped";
      if (groupBy === "category") k = n.domain ? `${n.domain} / ${n.category || "Uncategorized"}` : "Unfiled";
      else if (groupBy === "type") k = n.type || "No type";
      else if (groupBy === "queue") k = n.queue || "No queue";
      else if (groupBy === "trigger") k = !n.trigger ? "No trigger"
        : n.trigger.kind === "date" ? "Date"
        : n.trigger.kind === "location" ? "Place"
        : (n.trigger.name || "Custom");
      else if (groupBy === "kind") k = n.discoverClass || "No kind";
      if (!map.has(k)) map.set(k, []);
      map.get(k).push(n);
    });
    const keys = [...map.keys()];
    if (groupBy === "queue") keys.sort((a, b) => (QUEUES.indexOf(a) + 1 || 99) - (QUEUES.indexOf(b) + 1 || 99));
    else if (groupBy === "trigger") {
      const rank = (k) => k === "Date" ? 0 : k === "Place" ? 1 : k === "No trigger" ? 3 : 2;
      keys.sort((a, b) => rank(a) - rank(b) || a.localeCompare(b));
    }
    else keys.sort();
    return [...pinnedGroup, ...keys.map((k) => ({ key: k, items: map.get(k) }))];
  }, [visible, groupBy]);

  const upd = (f) => setEditor((p) => (p ? { ...p, ...f } : p));
  const [activeMore, setActiveMore] = useState(null); // which popover (reminder/label/people/places/dates/images/attachments) is open, if any
  const [moreExpanded, setMoreExpanded] = useState(false);
  const resetAux = () => {
    setLabelOpen(false); setLabelQuery(""); setBusy({}); setMapOpen(false);
    setExtraOpen(false); setContactQuery(""); setTab("filing"); setRelationsOpen(false);
    setActiveMore(null);
    setMoreExpanded(false);
  };
  const openNew = () => {
    setEditor({ id: null, title: "", content: "", extra: "", labels: [], contacts: [], assignees: [],
      places: [], relatedDates: [], images: [], attachments: [], checklist: [],
      domain: null, category: null, type: "Note", trigger: null, triggers: [], reminder: null,
      priority: null, effort: null, queue: null, status: null, deadline: null, recommendedDate: null,
      critical: false, doneAt: null, archived: false, referrer: null, discoverClass: null,
      pinned: false, routineKind: null, routineRecurring: null,
      fileReason: null, showTitle: false });
    resetAux();
  };
  const openNote = (n) => {
    setEditor({ ...n, labels: n.labels || [], contacts: n.contacts || [], assignees: n.assignees || [],
      places: n.places || [], relatedDates: n.relatedDates || [], images: n.images || [], attachments: n.attachments || [],
      checklist: n.checklist || [],
      triggers: n.triggers || (n.trigger ? [n.trigger] : []), pinned: !!n.pinned,
      extra: n.extra || "", showTitle: !!(n.title || "").trim() });
    resetAux();
    setExtraOpen(!!(n.extra || "").trim());
  };
  const togglePinned = (id) => setNotes((p) => p.map((n) => (n.id === id ? { ...n, pinned: !n.pinned } : n)));
  const duplicateNote = (id) => {
    const src = notes.find((n) => n.id === id);
    if (!src) return;
    const copy = { ...src, id: uid(), createdAt: Date.now(), pinned: false, doneAt: null, archived: false,
      children: [], parent: null, blockers: [], blocking: [], related: [] };
    setNotes((p) => [copy, ...p]);
  };

  function closeEditor() {
    if (!editor) return;
    if (!editor.title.trim() && !editor.content.trim()) {
      if (editor.id) setNotes((p) => p.filter((n) => n.id !== editor.id));
      setEditor(null); return;
    }
    const payload = payloadOf(editor);
    setNotes((p) => (editor.id && p.some((n) => n.id === editor.id)
      ? p.map((n) => (n.id === editor.id ? { ...n, ...payload } : n))
      : [{ id: editor.id || uid(), createdAt: Date.now(), source: "typed", ...payload }, ...p]));
    setEditor(null);
  }

  function toggleLabel(name) {
    if (!editor) return;
    const has = editor.labels.includes(name);
    upd({ labels: has ? editor.labels.filter((l) => l !== name) : [...editor.labels, name] });
  }
  function createLabel() {
    const name = labelQuery.trim(); if (!name) return;
    if (!labels.some((l) => l.name === name))
      setLabels((p) => [...p, { name, color: LABEL_COLORS[p.length % LABEL_COLORS.length] }]);
    if (editor && !editor.labels.includes(name)) upd({ labels: [...editor.labels, name] });
    setLabelQuery("");
  }
  const cycleLabelColor = (name) => setLabels((p) => p.map((l) => (l.name === name
    ? { ...l, color: LABEL_COLORS[(LABEL_COLORS.indexOf(l.color) + 1) % LABEL_COLORS.length] } : l)));

  const setTrigger = (t) => upd({ trigger: t }); // legacy single-slot setter, kept for anything still using it
  // multi-slot triggers: up to one each of date / location / custom, all can coexist
  const triggerSlot = (kind) => (editor && editor.triggers || []).find((t) => t.kind === kind) || null;
  const setTriggerSlot = (kind, val) => {
    if (!editor) return;
    const list = (editor.triggers || []).filter((t) => t.kind !== kind);
    upd({ triggers: val ? [...list, val] : list });
  };
  const clearTriggerSlot = (kind) => setTriggerSlot(kind, null);
  function savePlaceFromMap() {
    if (mapTarget === "new") {
      const name = mapName.trim();
      if (!name) return; // name is required for a saved place
      setPlaces((p) => [...p, { id: uid(), name, ...(mapDraft ? { lat: mapDraft.lat, lng: mapDraft.lng } : {}) }]);
      setMapOpen(false); setMapName(""); setMapTarget(null); return;
    }
    if (mapTarget) { // editing an existing saved place's location
      setPlaces((p) => p.map((x) => (x.id === mapTarget ? { ...x, ...(mapDraft ? { lat: mapDraft.lat, lng: mapDraft.lng } : {}) } : x)));
      setMapOpen(false); setMapTarget(null); return;
    }
    if (!mapDraft) return;
    const name = mapName.trim() || `${mapDraft.lat.toFixed(3)}, ${mapDraft.lng.toFixed(3)}`;
    const place = { id: uid(), name, lat: mapDraft.lat, lng: mapDraft.lng };
    setPlaces((p) => [...p, place]);
    setTriggerSlot("location", { kind: "location", place });
    setMapOpen(false); setMapName("");
  }

  const addType = () => {
    const n = newType.name.trim();
    if (!n || types.some((t) => t.name === n)) return;
    setTypes((p) => [...p, { name: n, icon: newType.icon }]);
    setNewType({ name: "", icon: "Star" });
    setPicker(null);
  };
  const addCat = (d) => {
    const v = newCat[d] || {}; const n = (v.name || "").trim();
    if (!n || (categories[d] || []).some((c) => c.name === n)) return;
    setCategories((p) => ({ ...p, [d]: [...(p[d] || []), { name: n, emoji: v.emoji || "🙂" }] }));
    setNewCat((p) => ({ ...p, [d]: { name: "", emoji: "" } }));
    setPicker(null);
  };

  const payloadOf = (e) => ({
    title: e.title.trim(), content: e.content, extra: e.extra || "",
    labels: e.labels, contacts: e.contacts || [], assignees: e.assignees || [],
    places: e.places || [], relatedDates: e.relatedDates || [], images: e.images || [], attachments: e.attachments || [],
    checklist: e.checklist || [],
    domain: e.domain, category: e.category || null, type: e.type || "Note",
    triggers: e.triggers || (e.trigger ? [e.trigger] : []),
    trigger: (e.triggers && e.triggers[0]) || e.trigger || null, reminder: e.reminder || null,
    priority: e.priority || null, effort: e.effort || null, queue: e.queue || null,
    status: e.status || null,
    deadline: e.deadline || null,
    recommendedDate: e.recommendedDate || null,
    critical: !!e.critical, doneAt: e.doneAt || null, archived: !!e.archived, pinned: !!e.pinned,
    referrer: e.referrer || null, discoverClass: e.discoverClass || null,
    fileReason: e.fileReason || null,
    routineKind: e.routineKind || null, routineRecurring: e.routineRecurring || null,
  });

  // commits an unsaved draft so it can take part in relations
  function ensureSaved() {
    if (!editor) return null;
    if (editor.id && notes.some((n) => n.id === editor.id)) return editor.id;
    const id = editor.id || uid();
    setNotes((p) => [{ id, createdAt: Date.now(), source: "typed", ...payloadOf(editor) }, ...p]);
    upd({ id });
    return id;
  }

  const uniq = (a) => [...new Set(a)];
  const [attBusy, setAttBusy] = useState(false);
  async function handleAttachmentPick(kind, fileList) {
    const files = Array.from(fileList || []);
    if (!files.length) return;
    const id = ensureSaved();
    if (!id) return;
    setAttBusy(true);
    for (const file of files) {
      try {
        const rec = await uploadAttachment(id, file);
        const field = kind === "image" ? "images" : "attachments";
        setNotes((p) => p.map((n) => (n.id === id ? { ...n, [field]: [...(n[field] || []), rec] } : n)));
        upd({ [field]: [...((editor && editor[field]) || []), rec] });
      } catch (e) { alert("Upload failed: " + e.message); }
    }
    setAttBusy(false);
  }
  function removeAttachment(kind, recId) {
    const field = kind === "image" ? "images" : "attachments";
    const id = editor && editor.id;
    if (!id) return;
    setNotes((p) => p.map((n) => (n.id === id ? { ...n, [field]: (n[field] || []).filter((r) => r.id !== recId) } : n)));
    upd({ [field]: (editor[field] || []).filter((r) => r.id !== recId) });
  }

  function link(aId, bId, kind) {
    if (!aId || !bId || aId === bId) return;
    if (kind === "parent" && isDescendant(bId, aId)) return; // no cycles
    setNotes((p) => p.map((n) => {
      let m = n;
      if (n.id === aId) {
        if (kind === "blocker") m = { ...m, blockers: uniq([...(m.blockers || []), bId]) };
        if (kind === "related") m = { ...m, related: uniq([...(m.related || []), bId]) };
        if (kind === "parent") m = { ...m, parent: bId };
        if (kind === "child") m = { ...m, children: uniq([...(m.children || []), bId]) };
      }
      if (n.id === bId) {
        if (kind === "blocker") m = { ...m, blocking: uniq([...(m.blocking || []), aId]) };
        if (kind === "related") m = { ...m, related: uniq([...(m.related || []), aId]) };
        if (kind === "parent") m = { ...m, children: uniq([...(m.children || []), aId]) };
        if (kind === "child") m = { ...m, parent: aId };
      }
      return m;
    }));
  }

  function unlink(aId, bId, kind) {
    setNotes((p) => p.map((n) => {
      let m = n;
      if (n.id === aId) {
        if (kind === "blocker") m = { ...m, blockers: (m.blockers || []).filter((x) => x !== bId) };
        if (kind === "blocking") m = { ...m, blocking: (m.blocking || []).filter((x) => x !== bId) };
        if (kind === "related") m = { ...m, related: (m.related || []).filter((x) => x !== bId) };
        if (kind === "parent") m = { ...m, parent: null };
        if (kind === "child") m = { ...m, children: (m.children || []).filter((x) => x !== bId) };
      }
      if (n.id === bId) {
        if (kind === "blocker") m = { ...m, blocking: (m.blocking || []).filter((x) => x !== aId) };
        if (kind === "blocking") m = { ...m, blockers: (m.blockers || []).filter((x) => x !== aId) };
        if (kind === "related") m = { ...m, related: (m.related || []).filter((x) => x !== aId) };
        if (kind === "parent") m = { ...m, children: (m.children || []).filter((x) => x !== aId) };
        if (kind === "child") m = { ...m, parent: null };
      }
      return m;
    }));
  }

  function isDescendant(candidate, ofId) {
    let guard = 0;
    const walk = (id) => {
      if (guard++ > 200 || !id) return false;
      if (id === candidate) return true;
      const n = notes.find((x) => x.id === id);
      return (n?.children || []).some(walk);
    };
    return (notes.find((x) => x.id === ofId)?.children || []).some(walk);
  }

  const noteById = (id) => notes.find((n) => n.id === id);
  const noteLabel = (n) => (n ? (n.title || n.content || "").slice(0, 48) || "Untitled" : "Missing note");

  const deleteNote = (id, e) => {
    const go = () => {
      setNotes((p) => p.map((n) => (n.id === id ? { ...n, trashedAt: Date.now() } : n)));
      setEditor(null);
    };
    if (!e) { go(); return; }
    confirmAction(e, "Move this note to Trash? It stays there for 30 days before being permanently deleted.", go);
  };
  const restoreFromTrash = (id) => setNotes((p) => p.map((n) => (n.id === id ? { ...n, trashedAt: null } : n)));
  const deleteForever = (id, e) => {
    const go = () => setNotes((p) => p.filter((n) => n.id !== id).map((n) => ({
      ...n,
      blockers: (n.blockers || []).filter((x) => x !== id),
      blocking: (n.blocking || []).filter((x) => x !== id),
      related: (n.related || []).filter((x) => x !== id),
      children: (n.children || []).filter((x) => x !== id),
      parent: n.parent === id ? null : n.parent,
    })));
    if (!e) { go(); return; }
    confirmAction(e, "Permanently delete this note? This cannot be undone.", go);
  };

  function markDone(id) {
    const at = new Date().toISOString();
    setNotes((p) => p.map((n) => (n.id === id ? { ...n, doneAt: at, archived: true, status: "Done" } : n)));
    setEditor((e) => (e && e.id === id ? null : e));
  }
  function restoreNote(id) {
    setNotes((p) => p.map((n) => (n.id === id ? { ...n, doneAt: null, archived: false, status: n.status === "Done" ? null : n.status } : n)));
  }
  const toggleCritical = (id) => setNotes((p) => p.map((n) => (n.id === id ? { ...n, critical: !n.critical } : n)));

  function addContact(name) {
    const n = name.trim();
    if (!n) return null;
    const found = contacts.find((c) => c.name.toLowerCase() === n.toLowerCase());
    if (found) return found.id;
    const c = { id: uid(), name: n };
    setContacts((p) => [...p, c]);
    return c.id;
  }
  const contactName = (id) => { const c = contacts.find((x) => x.id === id); return c ? c.name : "Unknown"; };
  // effective group membership for a contact - falls back to "Ungrouped" only when truly
  // empty (an explicit but empty groups[] must still fall back, so this checks .length,
  // never plain truthiness - an empty array is truthy in JS and was silently breaking that)
  const contactGroupNames = (c) => {
    const gs = (c.groups && c.groups.length) ? c.groups : (c.group ? [c.group] : []);
    return gs.length ? gs : ["Ungrouped"];
  };

  async function saveCloudConfig() {
    const url = cloudForm.url.trim().replace(/\/+$/, "");
    const key = cloudForm.key.trim();
    if (!url || !key) { setCloudMsg({ bad: true, text: "Both the URL and the key are needed." }); return; }
    if (!/^https:\/\/.+\.supabase\.co$/.test(url)) {
      setCloudMsg({ bad: true, text: "That doesn't look like a Project URL. It should end in .supabase.co" });
      return;
    }
    setCloudBusy(true); setCloudMsg(null);
    setCloudConfig({ url, key });
    setCloud({ url, key });
    setCloudBusy(false);
    setCloudMsg({ text: "Connected. Now sign in with your email below." });
  }

  async function sendMagicLink() {
    if (!email.trim()) { setCloudMsg({ bad: true, text: "Enter your email address." }); return; }
    setCloudBusy(true); setCloudMsg(null);
    let sb;
    try {
      sb = await getSupabase();
    } catch (e) {
      setCloudBusy(false);
      setCloudMsg({ bad: true, text: e.message });
      return;
    }
    const { error } = await sb.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: window.location.href },
    });
    setCloudBusy(false);
    setCloudMsg(error
      ? { bad: true, text: error.message }
      : { text: "Check your email and tap the link. You can close this." });
  }

  async function signOutCloud() {
    const sb = await trySupabase();
    if (sb) await sb.auth.signOut();
    setSession(null); setEpoch((n) => n + 1);
    setCloudMsg({ text: "Signed out. Your notes are still on this device." });
  }

  async function pushEverything() {
    setCloudBusy(true); setCloudMsg(null);
    try {
      await Promise.all([
        saveKey("sift-notes", notes), saveKey("sift-types", types), saveKey("sift-categories", categories),
        saveKey("sift-labels", labels), saveKey("sift-places", places), saveKey("sift-contacts", contacts),
        saveKey("sift-discover", discoverClasses), saveKey("sift-custom-triggers", customTriggers),
        saveKey("sift-claude-memory", claudeMemory),
        saveKey("sift-routine-kinds", routineKinds), saveKey("sift-people-groups", peopleGroups),
        saveKey("sift-sections", sections),
      ]);
      setCloudMsg({ text: `Uploaded ${notes.length} notes and your settings.` });
    } catch (e) { setCloudMsg({ bad: true, text: "Upload failed: " + e.message }); }
    setCloudBusy(false);
  }

  function exportBackup() {
    const blob = new Blob([JSON.stringify({
      exportedAt: new Date().toISOString(), notes, types, categories, labels, places,
      contacts, discoverClasses, routineKinds, customTriggers, claudeMemory,
    }, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `shift-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  const csvEscape = (v) => {
    const s = String(v ?? "");
    return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  };
  const CSV_COLUMNS = ["Note", "Domain", "Category", "Type", "Status", "Queue", "Priority", "Effort", "Related", "Suggested", "Due", "Deadline", "Done"];
  function exportCsv() {
    const rows = live.map((n) => {
      const pri = PRIORITIES.find((p) => p.v === n.priority);
      const dueTrig = (n.triggers || (n.trigger ? [n.trigger] : [])).find((t) => t.kind === "date");
      return [
        n.title || n.content, n.domain || "", n.category || "", n.type || "",
        n.status || "", n.queue || "", pri ? pri.name : "", n.effort || "",
        (n.relatedDates || [])[0] || "", n.recommendedDate || "", dueTrig ? dueTrig.at : "", n.deadline || "", n.doneAt || "",
      ].map(csvEscape).join(",");
    });
    const csv = [CSV_COLUMNS.join(","), ...rows].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `shift-notes-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  function parseCsv(text) {
    const rows = []; let row = [], field = "", inQ = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (inQ) {
        if (c === '"') { if (text[i + 1] === '"') { field += '"'; i++; } else inQ = false; }
        else field += c;
      } else if (c === '"') inQ = true;
      else if (c === ",") { row.push(field); field = ""; }
      else if (c === "\n" || c === "\r") {
        if (field !== "" || row.length) { row.push(field); rows.push(row); row = []; field = ""; }
        if (c === "\r" && text[i + 1] === "\n") i++;
      } else field += c;
    }
    if (field !== "" || row.length) { row.push(field); rows.push(row); }
    return rows;
  }
  function importCsv(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const rows = parseCsv(String(e.target.result || ""));
      if (rows.length < 2) { alert("No rows found in that file."); return; }
      const header = rows[0].map((h) => h.trim());
      const idx = (name) => header.indexOf(name);
      const iNote = idx("Note"), iDomain = idx("Domain"), iCategory = idx("Category"), iType = idx("Type"),
        iStatus = idx("Status"), iQueue = idx("Queue"), iPriority = idx("Priority"), iEffort = idx("Effort"),
        iRelated = idx("Related"), iSuggested = idx("Suggested"), iDue = idx("Due"), iDeadline = idx("Deadline"), iDone = idx("Done");
      if (iNote < 0) { alert('This CSV needs a "Note" column - export one from here first to see the expected format.'); return; }
      const priByName = { Urgent: 1, High: 2, Medium: 3, Low: 4 };
      const newNotes = rows.slice(1).filter((r) => r.length && r[iNote]).map((r) => {
        const doneAt = iDone >= 0 && r[iDone] ? r[iDone] : null;
        const dueVal = iDue >= 0 && r[iDue] ? r[iDue] : null;
        return {
          id: uid(), createdAt: Date.now(), source: "import",
          title: "", content: r[iNote] || "Untitled", extra: "",
          labels: [], contacts: [], places: [], relatedDates: iRelated >= 0 && r[iRelated] ? [r[iRelated]] : [],
          assignees: [],
          domain: iDomain >= 0 ? (r[iDomain] || null) : null,
          category: iCategory >= 0 ? (r[iCategory] || null) : null,
          type: (iType >= 0 && r[iType]) || "Note",
          queue: iQueue >= 0 ? (r[iQueue] || null) : null,
          priority: iPriority >= 0 ? (priByName[r[iPriority]] || null) : null,
          effort: iEffort >= 0 && r[iEffort] ? Number(r[iEffort]) : null,
          deadline: iDeadline >= 0 ? (r[iDeadline] || null) : null,
          recommendedDate: iSuggested >= 0 ? (r[iSuggested] || null) : null,
          critical: false, doneAt, archived: !!doneAt,
          status: (iStatus >= 0 && r[iStatus]) || (doneAt ? "Done" : null),
          triggers: dueVal ? [{ kind: "date", at: dueVal }] : [],
          trigger: dueVal ? { kind: "date", at: dueVal } : null,
          checklist: [], images: [], attachments: [],
          reminder: null, referrer: null, discoverClass: null, fileReason: "Imported from CSV",
          blockers: [], blocking: [], related: [], children: [], parent: null, pinned: false,
        };
      });
      if (newNotes.length) setNotes((p) => [...newNotes, ...p]);
      alert(`Imported ${newNotes.length} note(s).`);
    };
    reader.readAsText(file);
  }

  const move = (arr, i, dir) => {
    const j = i + dir;
    if (j < 0 || j >= arr.length) return arr;
    const next = [...arr];
    [next[i], next[j]] = [next[j], next[i]];
    return next;
  };
  const reorderArray = (arr, from, to) => {
    if (from === to || from < 0 || to < 0 || from >= arr.length || to >= arr.length) return arr;
    const next = [...arr];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    return next;
  };
  const dragRef = useRef(null); // { list, index } — only one drag happens at a time, shared across all Settings lists
  const dragHandlers = (listKey, index, setter, arr) => ({
    draggable: true,
    onDragStart: () => { dragRef.current = { list: listKey, index }; },
    onDragOver: (e) => e.preventDefault(),
    onDrop: (e) => {
      e.preventDefault();
      if (!dragRef.current || dragRef.current.list !== listKey) return;
      setter(reorderArray(arr, dragRef.current.index, index));
      dragRef.current = null;
    },
  });
  // renaming a Type/Category/Label/Discover-kind must update every note that already
  // references it by name; Contacts and Places are referenced by id so need no cascade
  const renameTypeEverywhere = (oldName, newName) => {
    if (!newName || oldName === newName) return;
    setNotes((p) => p.map((n) => (n.type === oldName ? { ...n, type: newName } : n)));
  };
  const renameCategoryEverywhere = (domain, oldName, newName) => {
    if (!newName || oldName === newName) return;
    setNotes((p) => p.map((n) => (n.domain === domain && n.category === oldName ? { ...n, category: newName } : n)));
  };
  const renameLabelEverywhere = (oldName, newName) => {
    if (!newName || oldName === newName) return;
    setNotes((p) => p.map((n) => (n.labels || []).includes(oldName)
      ? { ...n, labels: n.labels.map((l) => (l === oldName ? newName : l)) } : n));
  };
  const renameDiscoverEverywhere = (oldName, newName) => {
    if (!newName || oldName === newName) return;
    setNotes((p) => p.map((n) => (n.discoverClass === oldName ? { ...n, discoverClass: newName } : n)));
  };
  // People groups aren't their own list - they're names living inside contact.groups[]
  // (plus optional "empty" placeholders in peopleGroups so a group can exist before anyone's in it)
  const allGroupNames = () => {
    const fromContacts = contacts.flatMap((c) => c.groups || (c.group ? [c.group] : []));
    return [...new Set([...peopleGroups, ...fromContacts])].sort((a, b) => a.localeCompare(b));
  };
  const renameGroupEverywhere = (oldName, newName) => {
    if (!newName || oldName === newName) return;
    if (allGroupNames().includes(newName)) {
      // merging into an existing group - just fold oldName's members into it
      setContacts((p) => p.map((c) => {
        const gs = c.groups || (c.group ? [c.group] : []);
        if (!gs.includes(oldName)) return c;
        return { ...c, groups: [...new Set(gs.map((g) => (g === oldName ? newName : g)))], group: undefined };
      }));
    } else {
      setContacts((p) => p.map((c) => {
        const gs = c.groups || (c.group ? [c.group] : []);
        if (!gs.includes(oldName)) return c;
        return { ...c, groups: gs.map((g) => (g === oldName ? newName : g)), group: undefined };
      }));
    }
    setPeopleGroups((p) => [...new Set(p.map((g) => (g === oldName ? newName : g)))]);
  };
  const deleteGroupEverywhere = (name) => {
    setContacts((p) => p.map((c) => {
      const gs = c.groups || (c.group ? [c.group] : []);
      if (!gs.includes(name)) return c;
      return { ...c, groups: gs.filter((g) => g !== name), group: undefined };
    }));
    setPeopleGroups((p) => p.filter((g) => g !== name));
  };
  const [renaming, setRenaming] = useState(null); // { list, index, value }
  const moreContent = (key) => {
    if (!editor) return null;
    if (key === "people") return (
      <div style={st.fieldRow}>
        <span style={st.pickLbl}>People</span>
        <div style={st.wrapRow}>
          {(editor.contacts || []).map((cid) => (
            <span key={cid} style={{ ...st.labelPill, color: C.work, borderColor: C.work + "55" }}>
              {contactName(cid)}
              <button style={st.pillX} onClick={() => upd({ contacts: editor.contacts.filter((x) => x !== cid) })}><X size={9} /></button>
            </span>
          ))}
          <SearchCreatePicker items={contacts} buttonLabel="Person" buttonIcon={User}
            onPick={(c) => { if (!(editor.contacts || []).includes(c.id)) upd({ contacts: [...(editor.contacts || []), c.id] }); }}
            onCreate={(name) => { const id = addContact(name); if (id) upd({ contacts: [...(editor.contacts || []), id] }); }} />
        </div>
      </div>
    );
    if (key === "places") return (
      <div style={st.fieldRow}>
        <span style={st.pickLbl}>Places</span>
        <div style={st.wrapRow}>
          {(editor.places || []).map((pid) => {
            const p = places.find((x) => x.id === pid);
            return (
              <span key={pid} style={{ ...st.labelPill, color: C.personal, borderColor: C.personal + "55" }}>
                {p ? p.name : "Unknown"}
                <button style={st.pillX} onClick={() => upd({ places: (editor.places || []).filter((x) => x !== pid) })}><X size={9} /></button>
              </span>
            );
          })}
          <SearchCreatePicker items={places.filter((p) => !(editor.places || []).includes(p.id))} buttonLabel="Place" buttonIcon={MapPin}
            onPick={(p) => upd({ places: [...(editor.places || []), p.id] })}
            onCreate={(name) => { const id = uid(); setPlaces((pl) => [...pl, { id, name }]); upd({ places: [...(editor.places || []), id] }); }} />
        </div>
      </div>
    );
    if (key === "dates") return (
      <div style={st.fieldRow}>
        <span style={st.pickLbl}>Related dates</span>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {(editor.relatedDates || []).map((d, i) => (
            <div key={i} style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <DateTimeField value={d} onChange={(v) => upd({ relatedDates: editor.relatedDates.map((x, xi) => (xi === i ? v : x)) })} />
              <button style={st.pillX} onClick={() => upd({ relatedDates: editor.relatedDates.filter((_, xi) => xi !== i) })}><X size={9} /></button>
            </div>
          ))}
          <button style={st.link} onClick={() => upd({ relatedDates: [...(editor.relatedDates || []), ""] })}>
            <Plus size={10} /> Add a related date
          </button>
        </div>
      </div>
    );
    if (key === "images") return (
      <div style={st.fieldRow}>
        <span style={st.pickLbl}>Images</span>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, flex: 1 }}>
          <div style={st.wrapRow}>
            {(editor.images || []).map((im) => (
              <span key={im.id} style={st.labelPill}>
                <ImageIcon size={11} />{im.filename}
                <button style={st.pillX} onClick={() => removeAttachment("image", im.id)}><X size={9} /></button>
              </span>
            ))}
          </div>
          <label style={{ ...st.mapBtn, cursor: attBusy ? "wait" : "pointer", width: "fit-content" }}>
            <Upload size={12} /> {attBusy ? "Uploading…" : "Add image"}
            <input type="file" accept="image/*" multiple style={{ display: "none" }} disabled={attBusy}
              onChange={(e) => { handleAttachmentPick("image", e.target.files); e.target.value = ""; }} />
          </label>
        </div>
      </div>
    );
    if (key === "attachments") return (
      <div style={st.fieldRow}>
        <span style={st.pickLbl}>Attachments</span>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, flex: 1 }}>
          <div style={st.wrapRow}>
            {(editor.attachments || []).map((at) => (
              <a key={at.id} href={at.url || "#"} target="_blank" rel="noreferrer" style={{ ...st.labelPill, textDecoration: "none" }}>
                <Paperclip size={11} />{at.filename}
                <button style={st.pillX} onClick={(e) => { e.preventDefault(); removeAttachment("attachment", at.id); }}><X size={9} /></button>
              </a>
            ))}
          </div>
          <label style={{ ...st.mapBtn, cursor: attBusy ? "wait" : "pointer", width: "fit-content" }}>
            <Upload size={12} /> {attBusy ? "Uploading…" : "Add file"}
            <input type="file" multiple style={{ display: "none" }} disabled={attBusy}
              onChange={(e) => { handleAttachmentPick("attachment", e.target.files); e.target.value = ""; }} />
          </label>
        </div>
      </div>
    );
    return null;
  };
  const [extraEditing, setExtraEditing] = useState(false);
  // Live Notion-style editor: each markdown *line* is its own auto-growing single-block
  // textarea. Heading lines ("# "/"## ") show their marker hidden and the text itself
  // rendered big/bold in real time, instead of the literal "#" characters. Enter starts a
  // new block; Backspace at the very start of a block merges it into the previous one.
  const extraLineRefs = useRef([]);
  const extraContainerRef = useRef(null);
  const extraFocusedLineRef = useRef(0);
  const extraPendingFocusRef = useRef(null); // { index, pos, selEnd? } applied after the next render
  const extraEditTargetRef = useRef(null); // which line to focus when edit mode is first entered
  // Cross-line selection: since each line is its own <textarea>, native drag-select can only
  // ever cover text inside one of them. Dragging the mouse across several lines is tracked here
  // instead, and rendered as a highlighted range that Backspace/Delete/typing/copy all act on.
  const [extraLineSel, setExtraLineSel] = useState(null); // { start, end } inclusive, start<=end
  const extraDraggingRef = useRef(false);
  const extraLineIndexAtY = (clientY) => {
    const root = extraContainerRef.current;
    if (!root) return null;
    const rows = Array.from(root.children || []);
    let idx = 0;
    for (let k = 0; k < rows.length; k++) {
      const r = rows[k].getBoundingClientRect();
      if (clientY >= r.top + r.height / 2) idx = k; else break;
    }
    return idx;
  };
  const extraLineMouseDown = (i) => {
    setExtraLineSel(null);
    extraDraggingRef.current = true;
    const onMove = (e) => {
      const hover = extraLineIndexAtY(e.clientY);
      if (hover == null) return;
      if (hover !== i) {
        // the drag has left the starting line: kill any native in-box text selection and
        // show the spanned lines as one selection instead
        if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
        try { window.getSelection().removeAllRanges(); } catch {}
        setExtraLineSel({ start: Math.min(i, hover), end: Math.max(i, hover) });
      } else {
        setExtraLineSel(null);
      }
    };
    const onUp = () => {
      extraDraggingRef.current = false;
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  };
  // Backspace/Delete/typing/Escape/copy while a cross-line range is selected. Nothing has
  // focus during that range (we blur to kill native selection), so these land on document.
  useEffect(() => {
    if (!extraLineSel) return;
    const onKey = (e) => {
      const lines = (editor.extra || "").split("\n");
      const { start, end } = extraLineSel;
      const collapseTo = (index, pos) => { setExtraLineSel(null); extraPendingFocusRef.current = { index, pos }; };
      if (e.key === "Escape") { setExtraLineSel(null); return; }
      const isCopy = (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "c";
      const isCut = (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "x";
      if (isCopy || isCut) {
        e.preventDefault();
        const text = lines.slice(start, end + 1).join("\n");
        if (navigator.clipboard) navigator.clipboard.writeText(text).catch(() => {});
        if (isCopy) return;
      }
      if (isCut || e.key === "Backspace" || e.key === "Delete" || e.key === "Enter") {
        e.preventDefault();
        const next = [...lines.slice(0, start), "", ...lines.slice(end + 1)];
        upd({ extra: next.join("\n") });
        collapseTo(start, 0);
        return;
      }
      if (e.key.length === 1 && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        const next = [...lines.slice(0, start), e.key, ...lines.slice(end + 1)];
        upd({ extra: next.join("\n") });
        collapseTo(start, 1);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [extraLineSel, editor && editor.extra]);
  // clicking outside the extra-description editor while a range is selected clears it (and
  // exits edit mode, matching the normal click-away behavior it's standing in for)
  useEffect(() => {
    if (!extraLineSel) return;
    const onDocDown = (e) => {
      const root = extraContainerRef.current;
      if (root && !root.contains(e.target)) { setExtraLineSel(null); setExtraEditing(false); }
    };
    document.addEventListener("mousedown", onDocDown);
    return () => document.removeEventListener("mousedown", onDocDown);
  }, [extraLineSel]);
  useEffect(() => { setExtraLineSel(null); }, [editor && editor.id, extraEditing]);
  const extraLineMarker = (line) => {
    const raw = line || "";
    const h = raw.match(/^(#{1,2})\s+(.*)$/);
    if (h) return { level: h[1].length, prefix: h[1] + " ", text: h[2] };
    // Numbered-list rows: the "N. " is a fixed, non-editable label (like the heading's "#"),
    // so the cursor can never land in front of the number and start typing there.
    const n = raw.match(/^(\d+)\.\s(.*)$/);
    if (n) return { level: 0, num: n[1], prefix: n[1] + ". ", text: n[2] };
    return null;
  };
  const extraAutoResize = (el) => {
    if (!el) return;
    el.style.height = "auto";
    el.style.height = el.scrollHeight + "px";
  };
  useEffect(() => {
    const pf = extraPendingFocusRef.current;
    if (!pf) return;
    extraPendingFocusRef.current = null;
    const el = extraLineRefs.current[pf.index];
    if (el) {
      el.focus();
      const p = Math.max(0, Math.min(pf.pos ?? 0, el.value.length));
      const endP = pf.selEnd != null ? Math.min(pf.selEnd, el.value.length) : p;
      try { el.setSelectionRange(p, endP); } catch {}
    }
  }, [editor && editor.extra]);
  useEffect(() => {
    if (!extraEditing) return;
    const i = extraEditTargetRef.current;
    extraEditTargetRef.current = null;
    if (i == null) return;
    const el = extraLineRefs.current[i];
    if (el) { el.focus(); const p = el.value.length; try { el.setSelectionRange(p, p); } catch {} }
  }, [extraEditing]);
  const onExtraLineChange = (i, displayVal) => {
    const lines = (editor.extra || "").split("\n");
    const marker = extraLineMarker(lines[i] || "");
    lines[i] = marker ? marker.prefix + displayVal : displayVal;
    upd({ extra: lines.join("\n") });
  };
  // shared by all the formatting toolbar buttons - they act on whichever line was last focused
  const extraApplyLineMarker = (prefix) => {
    const i = extraFocusedLineRef.current;
    const lines = (editor.extra || "").split("\n");
    const raw = lines[i] || "";
    const stripped = raw.replace(/^(#{1,2}\s+|-\s\[[ xX]\]\s+|-\s+|>\s+|\d+\.\s+)/, "");
    const already = raw.length !== stripped.length && raw.slice(0, raw.length - stripped.length) === prefix;
    lines[i] = already ? stripped : prefix + stripped;
    upd({ extra: lines.join("\n") });
    extraPendingFocusRef.current = { index: i, pos: 0 };
  };
  const extraLinePrefix = (prefix) => extraApplyLineMarker(prefix);
  const extraNumberedList = () => {
    const i = extraFocusedLineRef.current;
    const lines = (editor.extra || "").split("\n");
    const prev = i > 0 ? lines[i - 1] : "";
    const m = (prev || "").match(/^(\d+)\.\s/);
    extraApplyLineMarker(`${m ? parseInt(m[1], 10) + 1 : 1}. `);
  };
  const extraWrapSelection = (before, after = before) => {
    const i = extraFocusedLineRef.current;
    const input = extraLineRefs.current[i]; if (!input) return;
    const lines = (editor.extra || "").split("\n");
    const raw = lines[i] || "";
    const marker = extraLineMarker(raw);
    const prefixLen = marker ? marker.prefix.length : 0;
    const s = input.selectionStart, e = input.selectionEnd;
    const rawS = s + prefixLen, rawE = e + prefixLen;
    lines[i] = raw.slice(0, rawS) + before + raw.slice(rawS, rawE) + after + raw.slice(rawE);
    upd({ extra: lines.join("\n") });
    extraPendingFocusRef.current = { index: i, pos: s + before.length, selEnd: e + before.length };
  };
  const extraInsertLink = () => {
    const i = extraFocusedLineRef.current;
    const input = extraLineRefs.current[i]; if (!input) return;
    const lines = (editor.extra || "").split("\n");
    const raw = lines[i] || "";
    const marker = extraLineMarker(raw);
    const prefixLen = marker ? marker.prefix.length : 0;
    const s = input.selectionStart, e = input.selectionEnd;
    const rawS = s + prefixLen, rawE = e + prefixLen;
    const label = raw.slice(rawS, rawE) || "text";
    lines[i] = raw.slice(0, rawS) + `[${label}](url)` + raw.slice(rawE);
    upd({ extra: lines.join("\n") });
    const from = s + label.length + 3;
    extraPendingFocusRef.current = { index: i, pos: from, selEnd: from + 3 };
  };
  const extraInsertDivider = () => {
    const i = extraFocusedLineRef.current;
    const lines = (editor.extra || "").split("\n");
    const next = [...lines.slice(0, i + 1), "---", "", ...lines.slice(i + 1)];
    upd({ extra: next.join("\n") });
    extraPendingFocusRef.current = { index: i + 2, pos: 0 };
  };
  // Notion/Keep-style smart lists + block split/merge, all scoped to one line's textarea.
  const extraLineKeyDown = (i, e) => {
    const input = e.currentTarget;
    const lines = (editor.extra || "").split("\n");
    const raw = lines[i] || "";
    const marker = extraLineMarker(raw);
    const prefixLen = marker ? marker.prefix.length : 0;

    if (e.key === "Enter") {
      e.preventDefault();
      if (input.selectionStart !== input.selectionEnd) return;
      const rawPos = input.selectionStart + prefixLen;
      const beforeRaw = raw.slice(0, rawPos), afterRaw = raw.slice(rawPos);
      const numMatch = beforeRaw.match(/^(\d+)\.\s/);
      const checkMatch = beforeRaw.match(/^-\s\[[ xX]\]\s/);
      const bulletMatch = !checkMatch && beforeRaw.match(/^-\s/);
      const listMarker = numMatch ? `${parseInt(numMatch[1], 10) + 1}. ` : checkMatch ? "- [ ] " : bulletMatch ? "- " : null;
      if (listMarker) {
        const bare = (numMatch || checkMatch || bulletMatch)[0];
        if (beforeRaw === bare && afterRaw === "") {
          const next = [...lines]; next[i] = "";
          upd({ extra: next.join("\n") });
          extraPendingFocusRef.current = { index: i, pos: 0 };
          return;
        }
        const next = [...lines];
        next[i] = beforeRaw;
        next.splice(i + 1, 0, listMarker + afterRaw);
        if (numMatch) {
          let expected = parseInt(numMatch[1], 10) + 2;
          for (let k = i + 2; k < next.length; k++) {
            const m = next[k].match(/^(\d+)\.\s/);
            if (!m) break;
            next[k] = next[k].replace(/^\d+\./, String(expected) + ".");
            expected++;
          }
        }
        upd({ extra: next.join("\n") });
        extraPendingFocusRef.current = { index: i + 1, pos: 0 };
        return;
      }
      const next = [...lines];
      next[i] = beforeRaw;
      next.splice(i + 1, 0, afterRaw);
      upd({ extra: next.join("\n") });
      extraPendingFocusRef.current = { index: i + 1, pos: 0 };
      return;
    }

    if (e.key === "Backspace") {
      if (input.selectionStart !== input.selectionEnd || input.selectionStart !== 0) return;
      e.preventDefault();
      if (marker && marker.text === "") {
        // an empty heading just converted - revert it to plain "#" text so it can keep being edited/deleted
        const next = [...lines]; next[i] = "#".repeat(marker.level);
        upd({ extra: next.join("\n") });
        extraPendingFocusRef.current = { index: i, pos: marker.level };
        return;
      }
      if (i === 0) return;
      const next = [...lines];
      const prevRaw = next[i - 1] || "";
      const prevMarker = extraLineMarker(prevRaw);
      next[i - 1] = prevRaw + raw;
      next.splice(i, 1);
      upd({ extra: next.join("\n") });
      extraPendingFocusRef.current = { index: i - 1, pos: prevMarker ? prevRaw.length - prevMarker.prefix.length : prevRaw.length };
      return;
    }

    if (e.key === "ArrowUp" && i > 0) { e.preventDefault(); extraPendingFocusRef.current = { index: i - 1, pos: input.selectionStart }; return; }
    if (e.key === "ArrowDown" && i < lines.length - 1) { e.preventDefault(); extraPendingFocusRef.current = { index: i + 1, pos: input.selectionStart }; return; }
  };
  // clicking into the rendered read-view: guess which block was clicked by vertical
  // position among its rendered children, then map proportionally onto the source lines
  const extraClickToEdit = (e) => {
    const container = e.currentTarget;
    const children = Array.from(container.children || []);
    let blockIdx = 0;
    for (let k = 0; k < children.length; k++) {
      const r = children[k].getBoundingClientRect();
      if (e.clientY >= r.top) blockIdx = k; else break;
    }
    const totalLines = (editor.extra || "").split("\n").length;
    const totalBlocks = Math.max(1, children.length);
    extraEditTargetRef.current = Math.max(0, Math.min(totalLines - 1, Math.round((blockIdx / totalBlocks) * totalLines)));
    setExtraEditing(true);
  };
  const [newChecklistItem, setNewChecklistItem] = useState("");
  const addChecklistItem = () => {
    const t = newChecklistItem.trim();
    if (!t || !editor) return;
    upd({ checklist: [...(editor.checklist || []), { id: uid(), text: t, done: false }] });
    setNewChecklistItem("");
  };
  const toggleChecklistItem = (id) => {
    if (!editor) return;
    upd({ checklist: (editor.checklist || []).map((c) => (c.id === id ? { ...c, done: !c.done } : c)) });
  };
  const removeChecklistItem = (id) => {
    if (!editor) return;
    upd({ checklist: (editor.checklist || []).filter((c) => c.id !== id) });
  };
  useEffect(() => {
    if (!editor) return;
    if (tab === "task" && !isTaskLike(editor.type)) setTab("filing");
    if (tab === "discover" && editor.type !== "Discover") setTab("filing");
    if (tab === "event" && editor.type !== "Event") setTab("filing");
    if (tab === "pay" && editor.type !== "Pay") setTab("filing");
  }, [editor && editor.type, tab]);

  const empty = editor && !editor.title.trim() && !editor.content.trim();
  const labelMatches = labels.filter((l) => l.name.toLowerCase().includes(labelQuery.toLowerCase()));
  const canCreate = labelQuery.trim() && !labels.some((l) => l.name.toLowerCase() === labelQuery.trim().toLowerCase());

  return (
    <div style={st.app}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Vazirmatn:wght@400;500;600&display=swap');
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 9px; height: 9px; }
        ::-webkit-scrollbar-thumb { background: #2E3841; border-radius: 5px; }
        ::-webkit-scrollbar-track { background: transparent; }
        button { font-family: inherit; color: inherit; }
        input, textarea, select { font-family: inherit; color: ${C.text}; }
        input:focus-visible, textarea:focus-visible, button:focus-visible { outline: 2px solid ${C.personal}; outline-offset: 1px; }
        input, textarea { outline: none; }
        .nav { transition: background 120ms ease; }
        .nav:hover { background: ${C.raised}; }
        .nav.on { background: ${C.raised}; }
        .card { transition: transform 140ms ease; }
        .card:hover { transform: translateY(-2px); }
        select, input, textarea { max-width: 100%; }
        img { max-width: none; }
        .lbl:hover { background: ${C.line}; }
        @keyframes spin { to { transform: rotate(360deg); } }
        .spin { animation: spin 1s linear infinite; }
        @media (prefers-reduced-motion: reduce) { * { animation: none !important; transition: none !important; } }
      `}</style>

      {narrow && drawer && <div style={st.scrim} onClick={() => setDrawer(false)} />}
      <aside style={{ ...st.side,
        ...(narrow ? { position: "fixed", left: 0, top: 0, bottom: 0, zIndex: 40,
          transform: drawer ? "translateX(0)" : "translateX(-100%)",
          transition: "transform 180ms ease", boxShadow: drawer ? "0 0 40px rgba(0,0,0,0.5)" : "none" } : {}) }}>
        {narrow && (
          <button style={{ ...st.ghost, alignSelf: "flex-end", marginBottom: 4 }} onClick={() => setDrawer(false)}>
            <X size={16} />
          </button>
        )}
        <div style={st.brand}><span style={st.mark}>◆</span><span style={st.brandName}>Shift</span></div>
        <p style={st.tagline}>Your notes, filed your way.</p>

        <button style={st.newBtn} onClick={openNew}><Plus size={15} /> New note</button>

        <div style={{ marginTop: 16 }}>
          <div style={st.secHead}>Sections</div>
          <div className={`nav ${!activeSectionId ? "on" : ""}`} style={st.subRow} onClick={() => setActiveSectionId(null)}>
            <Layers size={12} color={C.dimmer} /><span style={st.navLbl}>Everything</span>
          </div>
          {sections.map((s) => (
            <div key={s.id} className={`nav ${activeSectionId === s.id ? "on" : ""}`} style={st.subRow}>
              <Layers size={12} color={activeSectionId === s.id ? C.personal : C.dimmer} />
              <span style={st.navLbl} onClick={() => setActiveSectionId(s.id)}>{s.name}</span>
              <button style={st.pillX} title="Delete section" onClick={(e) => confirmAction(e, `Delete section "${s.name}"? Its visibility settings are lost, notes are not affected.`, () => {
                setSections((p) => p.filter((x) => x.id !== s.id));
                if (activeSectionId === s.id) setActiveSectionId(null);
              })}><X size={9} /></button>
            </div>
          ))}
          <div style={{ display: "flex", gap: 6, marginTop: 6, padding: "0 8px" }}>
            <input style={{ ...st.textIn, fontSize: 11, padding: "3px 6px" }} placeholder="New section" value={newSectionName}
              onChange={(e) => setNewSectionName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key !== "Enter" || !newSectionName.trim()) return;
                const s = { id: uid(), name: newSectionName.trim(), domainActive: {}, categoryActive: {}, typeActive: {}, labelActive: {} };
                setSections((p) => [...p, s]); setActiveSectionId(s.id); setNewSectionName("");
              }} />
            <button style={{ ...st.ghost, flexShrink: 0 }} title="Add section" onClick={() => {
              if (!newSectionName.trim()) return;
              const s = { id: uid(), name: newSectionName.trim(), domainActive: {}, categoryActive: {}, typeActive: {}, labelActive: {} };
              setSections((p) => [...p, s]); setActiveSectionId(s.id); setNewSectionName("");
            }}><Plus size={12} /></button>
          </div>
          {activeSection && (
            <p style={{ ...st.hint, padding: "6px 8px 0" }}>
              Editing "{activeSection.name}" — the eye toggles below now set this section's visibility, not the global one.
            </p>
          )}
        </div>

        <div style={st.nav}>
          <div className={`nav ${view === "notes" && filter.kind === "all" ? "on" : ""}`} style={st.navRow}
            onClick={() => { setDrawer(false); setView("notes"); setFilter({ kind: "all" }); }}>
            <Inbox size={13} color={C.dim} /><span style={st.navLbl}>All notes</span><span style={st.ct}>{live.length}</span>
          </div>
          {criticalCount > 0 && (
            <div className={`nav ${view === "notes" && filter.kind === "critical" ? "on" : ""}`} style={st.navRow}
              onClick={() => { setDrawer(false); setView("notes"); setFilter({ kind: "critical" }); }}>
              <Flame size={13} color={C.danger} /><span style={{ ...st.navLbl, color: C.danger }}>Critical</span><span style={st.ct}>{criticalCount}</span>
            </div>
          )}
          <div className={`nav ${view === "notes" && filter.kind === "unfiled" ? "on" : ""}`} style={st.navRow}
            onClick={() => { setDrawer(false); setView("notes"); setFilter({ kind: "unfiled" }); }}>
            <Inbox size={13} color={unfiled ? C.warn : C.dimmer} />
            <span style={{ ...st.navLbl, color: unfiled ? C.warn : C.dim }}>Unfiled</span>
            <span style={st.ct}>{unfiled}</span>
          </div>
          <div style={st.viewRow}>
            {[["list", Rows, "List"], ["board", Columns, "Board"], ["calendar", Calendar, "Calendar"], ["map", MapPin, "Map"], ["recurring", Repeat, "Recurring"], ["contacts", Users, "People"]]
              .map(([k, I, label]) => (
                <button key={k} title={label} style={{ ...st.viewBtn, ...(view === k ? st.viewBtnOn : {}) }} onClick={() => { setDrawer(false); setView(k); }}>
                  <I size={14} />
                  <span style={{ fontSize: 9.5, maxWidth: "100%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{label}</span>
                </button>
              ))}
          </div>

          <div className={`nav ${view === "archive" ? "on" : ""}`} style={st.navRow} onClick={() => { setDrawer(false); setView("archive"); }}>
            <Archive size={13} color={C.dim} /><span style={st.navLbl}>Archive</span><span style={st.ct}>{archived.length}</span>
          </div>

          <div className={`nav ${view === "trash" ? "on" : ""}`} style={st.navRow} onClick={() => { setDrawer(false); setView("trash"); }}>
            <Trash2 size={13} color={C.dim} /><span style={st.navLbl}>Trash</span><span style={st.ct}>{trashed.length}</span>
          </div>

          <div className={`nav ${view === "weeklyplan" ? "on" : ""}`} style={st.navRow} onClick={() => { setDrawer(false); setView("weeklyplan"); }}>
            <Rows size={13} color={C.dim} /><span style={st.navLbl}>Weekly Plan</span>
          </div>

          {DOMAINS.map((d) => {
            const ds = DOMAIN_STYLE[d];
            const counts = catCounts[d] || {};
            return (
              <div key={d} style={{ marginTop: 16, opacity: isDomainVisible(d) ? 1 : 0.45 }}>
                <div className={`nav ${view === "notes" && filter.kind === "domain" && filter.domain === d ? "on" : ""}`}
                  style={{ ...st.navRow, color: ds.fg, fontWeight: 600 }} onClick={() => { setDrawer(false); setView("notes"); setFilter({ kind: "domain", domain: d }); }}>
                  <ds.Icon size={13} /><span style={st.navLbl}>{d}</span><span style={st.ct}>{domainCounts[d]}</span>
                  <button style={st.ghost} title={isDomainVisible(d) ? "Deactivate (hides its notes everywhere)" : "Activate"}
                    onClick={(e) => { e.stopPropagation(); toggleDomainVisible(d); }}>
                    {isDomainVisible(d) ? <Eye size={11} /> : <EyeOff size={11} />}
                  </button>
                </div>
                {(categories[d] || []).map((c, i) => (
                  <div key={c.name} {...dragHandlers("cat-" + d, i, (v) => setCategories((p) => ({ ...p, [d]: v })), categories[d] || [])}
                    className={`nav ${view === "notes" && filter.kind === "category" && filter.domain === d && filter.category === c.name ? "on" : ""}`}
                    style={{ ...st.subRow, opacity: isCatVisible(d, c.name) ? 1 : 0.45 }}>
                    <span style={st.dragHandle} title="Drag to reorder">⠿</span>
                    <button style={{ background: "none", border: "none", padding: 0, cursor: "pointer" }} title="Change emoji"
                      onClick={(e) => { e.stopPropagation(); setPicker(picker && picker.kind === "cat" && picker.domain === d && picker.name === c.name ? null : { kind: "cat", domain: d, name: c.name }); }}>
                      <span style={st.emoji}>{c.emoji}</span>
                    </button>
                    <span style={st.navLbl} onClick={() => { setDrawer(false); setView("notes"); setFilter({ kind: "category", domain: d, category: c.name }); }}>{c.name}</span>
                    <span style={st.ct}>{counts[c.name] || 0}</span>
                    <button style={st.ghost} title={isCatVisible(d, c.name) ? "Deactivate (hides its notes everywhere)" : "Activate"}
                      onClick={(e) => { e.stopPropagation(); toggleCatVisible(d, c.name); }}>
                      {isCatVisible(d, c.name) ? <Eye size={11} /> : <EyeOff size={11} />}
                    </button>
                    <button style={st.pillX} title="Remove category (notes become unfiled, not deleted)"
                      onClick={(e) => {
                        e.stopPropagation();
                        confirmAction(e, `Remove category "${c.name}"? Its notes become unfiled, not deleted.`, () => {
                          setCategories((p) => ({ ...p, [d]: p[d].filter((x) => x.name !== c.name) }));
                          setNotes((p) => p.map((n) => (n.domain === d && n.category === c.name ? { ...n, category: null } : n)));
                        });
                      }}><X size={9} /></button>
                  </div>
                ))}
                {picker && picker.kind === "cat" && picker.domain === d && (
                  <EmojiPicker
                    onPick={(emoji) => {
                      setCategories((p) => ({ ...p, [d]: p[d].map((c) => (c.name === picker.name ? { ...c, emoji } : c)) }));
                      setPicker(null);
                    }}
                    onClose={() => setPicker(null)} />
                )}
                <div style={{ display: "flex", gap: 4, alignItems: "center", padding: "4px 8px" }}>
                  <input style={{ ...st.textIn, fontSize: 11, padding: "3px 6px" }} placeholder="Add category" value={(newCat[d] || {}).name || ""}
                    onChange={(e) => setNewCat((p) => ({ ...p, [d]: { ...(p[d] || {}), name: e.target.value } }))}
                    onKeyDown={(e) => e.key === "Enter" && addCat(d)} />
                  <button style={{ ...st.ghost, flexShrink: 0 }} title="Add" onClick={() => addCat(d)}><Plus size={12} /></button>
                </div>
                {counts["Uncategorized"] > 0 && (
                  <div className={`nav ${view === "notes" && filter.kind === "category" && filter.domain === d && filter.category === "Uncategorized" ? "on" : ""}`}
                    style={st.subRow} onClick={() => { setDrawer(false); setView("notes"); setFilter({ kind: "category", domain: d, category: "Uncategorized" }); }}>
                    <span style={st.emoji}>·</span>
                    <span style={{ ...st.navLbl, color: C.dimmer }}>Uncategorized</span><span style={st.ct}>{counts["Uncategorized"]}</span>
                  </div>
                )}
              </div>
            );
          })}

          <div style={{ marginTop: 20 }}>
            <div style={st.secHead}>Types</div>
            {types.map((t) => (
              <div key={t.name} className={`nav ${view === "notes" && filter.kind === "type" && filter.type === t.name ? "on" : ""}`}
                style={{ ...st.subRow, opacity: isTypeVisible(t.name) ? 1 : 0.45 }}>
                <TypeIcon name={t.name} size={13} color={C.dim} />
                <span style={st.navLbl} onClick={() => { setDrawer(false); setView("notes"); setFilter({ kind: "type", type: t.name }); }}>{t.name}</span>
                <span style={st.ct}>{typeCounts[t.name] || 0}</span>
                <button style={st.ghost} title={isTypeVisible(t.name) ? "Deactivate (hides its notes everywhere)" : "Activate"}
                  onClick={() => toggleTypeVisible(t.name)}>
                  {isTypeVisible(t.name) ? <Eye size={11} /> : <EyeOff size={11} />}
                </button>
              </div>
            ))}
          </div>

          <div style={{ marginTop: 20 }}>
            <div style={st.secHead}>People</div>
            {contacts.length > 10 && (
              <div style={{ padding: "0 8px 6px" }}>
                <input style={{ ...st.textIn, width: "100%", fontSize: 11, padding: "5px 8px" }}
                  placeholder="Search people…" value={peopleSidebarQuery}
                  onChange={(e) => setPeopleSidebarQuery(e.target.value)} />
              </div>
            )}
            {peopleSidebarQuery.trim() ? (
              <div style={{ paddingLeft: 8 }}>
                {contacts.filter((c) => c.name.toLowerCase().includes(peopleSidebarQuery.trim().toLowerCase()))
                  .map((m) => (
                    <div key={m.id} style={{ ...st.subRow, opacity: m.active === false ? 0.45 : 1 }}>
                      <span style={st.navLbl} onClick={() => setPersonModal(m.id)}>{m.name}</span>
                      <span style={{ fontSize: 9, color: C.dimmer }}>{contactGroupNames(m).join(", ")}</span>
                      <button style={st.ghost} title={m.active === false ? "Activate" : "Deactivate"}
                        onClick={() => setContacts((p) => p.map((x) => (x.id === m.id ? { ...x, active: x.active === false ? true : false } : x)))}>
                        {m.active === false ? <EyeOff size={10} /> : <Eye size={10} />}
                      </button>
                    </div>
                  ))}
                {contacts.filter((c) => c.name.toLowerCase().includes(peopleSidebarQuery.trim().toLowerCase())).length === 0 && (
                  <p style={st.hint}>No matches.</p>
                )}
              </div>
            ) : (
            <>
            {Object.entries(contacts.reduce((acc, c) => {
              const gs = contactGroupNames(c);
              gs.forEach((g) => { (acc[g] = acc[g] || []).push(c); });
              return acc;
            }, {})).sort(([a], [b]) => (a === "Ungrouped" ? 1 : b === "Ungrouped" ? -1 : a.localeCompare(b))).map(([group, members]) => {
              const ids = members.map((m) => m.id);
              const count = live.filter((n) => (n.contacts || []).some((id) => ids.includes(id)) || (n.assignees || []).some((id) => ids.includes(id))).length;
              const allInactive = members.every((m) => m.active === false);
              const expanded = !!expandedGroups[group];
              return (
                <div key={group}>
                  <div className={`nav ${view === "notes" && filter.kind === "group" && filter.group === group ? "on" : ""}`}
                    style={{ ...st.subRow, opacity: allInactive ? 0.45 : 1 }}>
                    <button style={{ background: "none", border: "none", padding: 0, cursor: "pointer", color: C.dimmer, display: "flex" }}
                      onClick={() => setExpandedGroups((p) => ({ ...p, [group]: !p[group] }))}>
                      {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                    </button>
                    <Users size={12} color={C.dimmer} />
                    <span style={st.navLbl} onClick={() => { setDrawer(false); setView("notes"); setFilter({ kind: "group", group }); }}>
                      {group} <span style={{ fontSize: 9, color: C.dimmer }}>({members.length})</span>
                    </span>
                    <span style={st.ct}>{count}</span>
                    <button style={st.ghost} title={allInactive ? "Activate" : "Deactivate (hides their notes everywhere)"}
                      onClick={() => setContacts((p) => p.map((x) => (ids.includes(x.id) ? { ...x, active: allInactive ? true : false } : x)))}>
                      {allInactive ? <EyeOff size={11} /> : <Eye size={11} />}
                    </button>
                  </div>
                  {expanded && (
                    <div style={{ paddingLeft: 22 }}>
                      {members.slice(0, 10).map((m) => (
                        <div key={m.id} style={{ ...st.subRow, opacity: m.active === false ? 0.45 : 1 }}>
                          <span style={st.navLbl} onClick={() => setPersonModal(m.id)}>{m.name}</span>
                          <button style={st.ghost} title={m.active === false ? "Activate" : "Deactivate"}
                            onClick={() => setContacts((p) => p.map((x) => (x.id === m.id ? { ...x, active: x.active === false ? true : false } : x)))}>
                            {m.active === false ? <EyeOff size={10} /> : <Eye size={10} />}
                          </button>
                        </div>
                      ))}
                      {members.length > 10 && (
                        <button style={{ ...st.link, marginLeft: 8 }} onClick={() => setGroupSearchModal(group)}>
                          +{members.length - 10} more…
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
            </>
            )}
          </div>

          <div style={{ marginTop: 20 }}>
            <div style={st.secHead}>Labels</div>
            {labels.map((l) => (
              <div key={l.name} className={`nav ${view === "notes" && filter.kind === "label" && filter.label === l.name ? "on" : ""}`}
                style={{ ...st.subRow, opacity: isLabelVisible(l.name) ? 1 : 0.45 }}>
                <span style={{ ...st.swatch, background: l.color }} />
                <span style={st.navLbl} onClick={() => { setDrawer(false); setView("notes"); setFilter({ kind: "label", label: l.name }); }}>{l.name}</span>
                <span style={st.ct}>{labelCounts[l.name] || 0}</span>
                <button style={st.ghost} title={isLabelVisible(l.name) ? "Deactivate (hides its notes everywhere)" : "Activate"}
                  onClick={() => toggleLabelVisible(l.name)}>
                  {isLabelVisible(l.name) ? <Eye size={11} /> : <EyeOff size={11} />}
                </button>
              </div>
            ))}
          </div>
        </div>

        <button style={st.footBtn} onClick={() => setSettingsOpen(true)}>
          <Settings size={13} /><span style={{ flex: 1, textAlign: "left" }}>Types &amp; categories</span>
        </button>
        <button style={st.footBtn} onClick={() => { setDrawer(false); setCloudOpen(true); }}>
          <Cloud size={13} color={session ? C.personal : C.dimmer} />
          <span style={{ flex: 1, textAlign: "left" }}>{session ? "Synced" : cloud ? "Sign in" : "Set up sync"}</span>
          {session && <span style={{ ...st.swatch, background: C.personal }} />}
        </button>
      </aside>

      <main style={st.main}>
        <header style={{ ...st.top, ...(phone ? { flexDirection: "column", alignItems: "stretch", gap: 9 } : {}) }}>
          <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
            {narrow && (
              <button style={st.hamburger} onClick={() => setDrawer(true)} title="Menu">
                <Layers size={15} />
              </button>
            )}
            <div style={{ ...st.searchBox, ...(narrow ? { width: "100%", flex: 1 } : {}) }}>
            <Search size={14} color={C.dimmer} />
            <input style={st.searchIn} placeholder="Search notes" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            {(view === "notes" || view === "archive" || view === "list" || view === "board") && (
              <div style={st.segRow}>
                {[["both", "Both"], ["tasks", "Tasks"], ["subtasks", "Subtasks"]].map(([k, label]) => (
                  <button key={k} style={{ ...st.miniSeg, ...(taskScope === k ? st.segOn : {}) }} onClick={() => setTaskScope(k)}>{label}</button>
                ))}
              </div>
            )}
            {(view === "notes" || view === "archive") && (
              <>
                <select style={st.sel} value={sortBy} onChange={(e) => setSortBy(e.target.value)} title="Sort">
                  <option value="newest">Newest</option>
                  <option value="priority">Priority</option>
                  <option value="deadline">Deadline</option>
                  <option value="queue">Queue</option>
                  <option value="effort">Effort</option>
                </select>
                <select style={st.sel} value={groupBy} onChange={(e) => setGroupBy(e.target.value)} title="Group">
                  <option value="none">No grouping</option>
                  <option value="category">By category</option>
                  <option value="type">By type</option>
                  <option value="queue">By queue</option>
                  {taskContext && <option value="trigger">By trigger</option>}
                  {discoverContext && <option value="kind">By kind</option>}
                </select>
                <select style={{ ...st.sel, ...(filterPriority != null ? st.selActive : {}) }}
                  value={filterPriority == null ? "" : filterPriority}
                  onChange={(e) => setFilterPriority(e.target.value === "" ? null : Number(e.target.value))}
                  title="Filter by priority: shows this and more urgent">
                  <option value="">All priorities</option>
                  {PRIORITIES.map((p) => <option key={p.v} value={p.v}>{p.name}+ up</option>)}
                </select>
                <select style={{ ...st.sel, ...(filterEffort != null ? st.selActive : {}) }}
                  value={filterEffort == null ? "" : filterEffort}
                  onChange={(e) => setFilterEffort(e.target.value === "" ? null : Number(e.target.value))}
                  title="Filter by effort: shows this and easier">
                  <option value="">All efforts</option>
                  {[1, 2, 3, 4, 5].map((e) => <option key={e} value={e}>{e} and under</option>)}
                </select>
                <select style={{ ...st.sel, ...(filterQueue != null ? st.selActive : {}) }}
                  value={filterQueue || ""}
                  onChange={(e) => setFilterQueue(e.target.value || null)}
                  title="Filter by queue: shows this and later stages">
                  <option value="">All queues</option>
                  {QUEUES.map((q) => <option key={q} value={q}>{q}+ down</option>)}
                </select>
                <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
                  <input type="datetime-local" style={{ ...st.sel, ...(filterDate ? st.selActive : {}) }}
                    value={filterDate || ""} onChange={(e) => setFilterDate(e.target.value || null)}
                    title="Filter by date: shows notes due at or before this" />
                  {filterDate && (
                    <button style={st.ghost} title="Clear date filter" onClick={() => setFilterDate(null)}><X size={12} /></button>
                  )}
                </div>
              </>
            )}
            <span style={st.crumb}>
              {view === "archive" ? "Archive"
                : view === "list" ? "List"
                : view === "board" ? "Board"
                : view === "calendar" ? "Calendar"
                : view === "map" ? "Map"
                : view === "recurring" ? "Recurring"
                : view === "contacts" ? "People"
                : filter.kind === "all" ? "All notes"
                : filter.kind === "unfiled" ? "Unfiled"
                : filter.kind === "domain" ? filter.domain
                : filter.kind === "category" ? `${filter.domain} / ${filter.category}`
                : filter.kind === "type" ? filter.type
                : filter.kind === "critical" ? "Critical"
                : filter.kind === "contact" ? contactName(filter.contact)
                : filter.kind === "group" ? filter.group
                : filter.label}
            </span>
          </div>
        </header>

        {error && (
          <div style={st.errBar}><AlertCircle size={14} /><span style={{ flex: 1 }}>{error}</span>
            <button style={st.ghost} onClick={() => setError(null)}><X size={13} /></button></div>
        )}

        {(view === "notes" || view === "archive") && (
        <div style={st.grid}>
          {view === "notes" && (() => {
            const now = new Date();
            const windowEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 2, 23, 59, 59);
            const isTodayOrPast = (d) => { const dt = toLocalDate(d); return dt && dt <= windowEnd; };
            const dateItems = dailyKindOn.dates ? live.filter((n) => {
              if (n.doneAt) return false;
              const dueTrig = (n.triggers || (n.trigger ? [n.trigger] : [])).find((t) => t.kind === "date");
              return (n.deadline && isTodayOrPast(n.deadline))
                || (dueTrig && isTodayOrPast(dueTrig.at))
                || (n.recommendedDate && isTodayOrPast(n.recommendedDate));
            }) : [];
            const rememberItems = dailyKindOn.remember ? live.filter((n) => n.type === "Remember") : [];
            const reminderItems = dailyKindOn.reminders ? live.filter((n) => {
              if (!n.reminder) return false;
              if (n.reminder.kind === "once") return n.reminder.at && isTodayOrPast(n.reminder.at);
              if (n.reminder.kind === "repeat" && n.reminder.at) {
                const t = toLocalDate(n.reminder.at);
                if (!t) return false;
                const todayAt = new Date(now.getFullYear(), now.getMonth(), now.getDate(), t.getHours(), t.getMinutes());
                return todayAt <= now;
              }
              return false;
            }) : [];
            const discoverItemsAll = dailyKindOn.discover ? live.filter((n) => n.type === "Discover") : [];
            const discoverItems = discoverItemsAll.filter((n) => n.queue === "Next");
            const groups = [
              ["dates", "Due soon", Clock, dateItems, C.danger],
              ["remember", "Remember", Bell, rememberItems, C.work],
              ["reminders", "Reminders", Bell, reminderItems, C.warn],
              ["discover", "To discover · next up", Compass, discoverItems, C.personal],
            ];
            const totalCount = groups.reduce((a, [, , , items]) => a + items.length, 0);
            const dayName = now.toLocaleDateString(undefined, { weekday: "long" });
            const dateStr = now.toLocaleDateString(undefined, { month: "long", day: "numeric" });
            return (
              <div style={{ marginBottom: 22 }}>
                <div style={{
                  background: `linear-gradient(135deg, ${C.raised}, ${C.surface})`,
                  border: `1px solid ${C.line}`, borderRadius: 16, padding: "16px 18px", marginBottom: 12,
                }}>
                  <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", flexWrap: "wrap", gap: 6, marginBottom: 14 }}>
                    <div>
                      <div style={{ fontSize: 17, fontWeight: 700, color: C.text }}>{dayName}</div>
                      <div style={{ fontSize: 11.5, color: C.dimmer }}>{dateStr}</div>
                    </div>
                    <div style={{ fontSize: 11.5, color: C.dimmer }}>
                      {totalCount === 0 ? "All clear" : `${totalCount} item${totalCount === 1 ? "" : "s"} today`}
                    </div>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 10 }}>
                    {groups.map(([k, label, Icon, items, color]) => {
                      const on = dailyKindOn[k];
                      return (
                        <button key={k} onClick={() => setDailyKindOn((p) => ({ ...p, [k]: !p[k] }))}
                          style={{
                            display: "flex", flexDirection: "column", gap: 6, textAlign: "left",
                            background: on ? color + "16" : C.ink + "80",
                            border: `1px solid ${on ? color + "40" : C.line}`,
                            borderRadius: 12, padding: "10px 12px", cursor: "pointer",
                            opacity: on ? 1 : 0.5, transition: "opacity .15s, background .15s",
                          }}>
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                            <Icon size={15} color={color} />
                            <span style={{ fontSize: 18, fontWeight: 700, color: on ? C.text : C.dimmer }}>{items.length}</span>
                          </div>
                          <span style={{ fontSize: 10.5, color: C.dim, lineHeight: 1.25 }}>{label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
                {totalCount === 0 ? (
                  <p style={st.hint}>Nothing due today.</p>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                    {groups.filter(([, , , items]) => items.length > 0).map(([k, label, Icon, items, color]) => (
                      <div key={k}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                          <Icon size={11} color={color} />
                          <span style={{ fontSize: 11, fontWeight: 600, color: C.dim }}>{label}</span>
                          <span style={st.ct}>{items.length}</span>
                        </div>
                        <div style={st.listCol}>
                          {items.map((n) => (
                            <div key={k + n.id} style={{ ...st.listRow, borderLeft: `2px solid ${color}`, paddingLeft: 9 }} onClick={() => openNote(n)}>
                              <span style={{ flex: 1, ...rtl(noteLabel(n)) }}>{noteLabel(n)}</span>
                              {n.domain && <span style={{ ...st.chip, color: DOMAIN_STYLE[n.domain].fg }}>{n.domain}</span>}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })()}
          {visible.length === 0 ? (
            <div style={st.empty}>
              <Inbox size={26} color={C.dimmer} />
              <p style={st.emptyT}>{view === "archive" ? "Nothing archived yet" : "Nothing here yet"}</p>
              <p style={st.emptyB}>{view === "archive" ? "Notes you mark Done land here." : "Start a note, or paste a screenshot of your Keep board."}</p>
            </div>
          ) : (
            grouped.map((g) => (
              <div key={g.key || "all"} style={g.pinned ? { marginBottom: 18 } : undefined}>
                {g.key && (
                  <div style={st.groupHead}>{g.pinned ? <Star size={11} fill={C.warn} color={C.warn} /> : <Layers size={11} />} {g.pinned ? "Pinned" : g.key}<span style={st.ct}>{g.items.length}</span></div>
                )}
                <div style={st.masonryRow}>
                  {distributeColumns(g.items.map((n) => {
                    const ds = n.domain ? DOMAIN_STYLE[n.domain] : null;
                    const cat = n.domain && n.category ? catOf(n.domain, n.category) : null;
                    const t = typeOf(n.type);
                    const BigIcon = (t && ICONS[t.icon]) || null;
                    const pri = PRIORITIES.find((p) => p.v === n.priority);
                    const overdue = n.deadline && !n.doneAt && toLocalDate(n.deadline) && toLocalDate(n.deadline) < new Date();
                    return (
                      <div key={n.id} className="card" onClick={() => openNote(n)}
                        style={{ ...st.card,
                          background: ds ? ds.tint : C.surface,
                          borderColor: n.critical ? C.danger : (n.pinned ? C.warn : (ds ? ds.edge : C.line)),
                          boxShadow: n.critical ? `0 0 0 1px ${C.danger}44` : (n.pinned ? `0 0 0 1px ${C.warn}44` : "none"),
                          opacity: n.archived ? 0.72 : 1 }}>
                        {BigIcon && (
                          <div style={st.bigIcon}><BigIcon size={54} color={ds ? ds.fg : C.dim} strokeWidth={1.2} /></div>
                        )}
                        <div style={st.cardTop}>
                          <div style={st.chips}>
                            {t && <span style={st.chip}><TypeIcon name={n.type} size={10} color={C.dim} /> {t.name}</span>}
                            {ds && (
                              <span style={{ ...st.domChip, color: ds.fg, borderColor: ds.edge }} title={n.domain}>
                                <ds.Icon size={11} />
                                {cat && <><ChevronRight size={10} style={{ opacity: 0.55 }} />{cat.emoji} {cat.name}</>}
                              </span>
                            )}
                            {n.critical && <span style={st.critChip}><Flame size={10} /> Critical</span>}
                          </div>
                          <div style={{ display: "flex", gap: 2, flexShrink: 0 }}>
                            <button style={st.ghost} title="Duplicate" onClick={(e) => { e.stopPropagation(); duplicateNote(n.id); }}>
                              <Copy size={13} />
                            </button>
                            <button style={{ ...st.ghost, ...(n.pinned ? { color: C.warn } : {}) }} title={n.pinned ? "Unpin" : "Pin"}
                              onClick={(e) => { e.stopPropagation(); togglePinned(n.id); }}>
                              <Star size={13} fill={n.pinned ? C.warn : "none"} />
                            </button>
                            {!n.archived && (
                              <button style={st.ghost} title={["Task", "Pay", "Event"].includes(n.type) ? "Mark done" : "Archive"}
                                onClick={(e) => { e.stopPropagation(); markDone(n.id); }}>
                                {["Task", "Pay", "Event"].includes(n.type) ? <Check size={13} /> : <Archive size={13} />}
                              </button>
                            )}
                            {n.archived && (
                              <button style={st.ghost} title="Restore" onClick={(e) => { e.stopPropagation(); restoreNote(n.id); }}>
                                <ArchiveRestore size={13} />
                              </button>
                            )}
                            <button style={st.ghost} title="Delete" onClick={(e) => { e.stopPropagation(); deleteNote(n.id, e); }}><Trash2 size={12} /></button>
                          </div>
                        </div>
                        {n.title && <h3 style={{ ...st.cardTitle, ...rtl(n.title) }}>{n.title}</h3>}
                        {(() => {
                          const pay = n.type === "Pay" ? parsePayment(`${n.content}\n${n.extra || ""}`) : null;
                          const links = extractLinks(n);
                          return (
                            <>
                              {pay && (
                                <div style={st.payCard}>
                                  <div style={st.payTop}>
                                    <CreditCard size={13} color={C.warn} />
                                    <span style={st.payLabel}>Amount due</span>
                                    {n.doneAt && <span style={st.payPaid}>PAID</span>}
                                  </div>
                                  <div style={st.payAmount} dir="ltr">
                                    {pay.display}<span style={st.payCur}>{pay.currency}</span>
                                  </div>
                                  {(n.deadline || (n.trigger && n.trigger.kind === "date" && n.trigger.at)) && (
                                    <div style={st.payDue}>
                                      <Clock size={10} /> due {fmtDate(n.deadline || n.trigger.at)}
                                    </div>
                                  )}
                                  <div style={st.payStripe} />
                                </div>
                              )}
                              {!links.length && (
                                <p style={{ ...st.cardBody, ...rtl(n.content) }}>
                                  {n.content.slice(0, pay ? 120 : 190)}
                                  {n.content.length > (pay ? 120 : 190) ? "\u2026" : ""}
                                </p>
                              )}
                              {links.length > 0 && (
                                <div style={st.linkStack}>
                                  {links.slice(0, 3).map((u, li) => (
                                    <LinkPreviewCard key={u} url={u} first={li === 0} last={li === Math.min(links.length, 3) - 1 && links.length <= 3} />
                                  ))}
                                  {links.length > 3 && (
                                    <button style={st.moreLinksBtn} onClick={(e) => { e.stopPropagation(); setLinksModal(n.id); }}>
                                      +{links.length - 3} more link{links.length - 3 > 1 ? "s" : ""}
                                    </button>
                                  )}
                                </div>
                              )}
                            </>
                          );
                        })()}
                        <div style={st.pillWrap}>
                          {n.queue && <span style={{ ...st.trigPill, color: QUEUE_COLOR[n.queue] }}>{n.queue}</span>}
                          {pri && n.priority <= 2 && (() => {
                            const PI = PRIORITY_ICONS[pri.icon];
                            return <span style={{ ...st.trigPill, color: pri.color }} title={pri.name}><PI size={11} /></span>;
                          })()}
                          {n.effort && <span style={st.trigPill} title={`Effort ${n.effort} of 5`}><Gauge size={11} color={C.dim} /> {n.effort}</span>}
                          {(n.checklist || []).length > 0 && (
                            <span style={st.trigPill} title="Checklist"><CheckSquare size={11} color={C.dim} /> {n.checklist.filter((c) => c.done).length}/{n.checklist.length}</span>
                          )}
                          {(n.relatedDates || []).length > 0 && fmtDate(n.relatedDates[0]) && (
                            <span style={st.trigPill} title="Related"><Calendar size={11} color={C.dim} /> {fmtDate(n.relatedDates[0])}{n.relatedDates.length > 1 ? ` +${n.relatedDates.length - 1}` : ""}</span>
                          )}
                          {n.recommendedDate && fmtDate(n.recommendedDate) && <span style={st.trigPill} title="Suggested"><CalendarClock size={11} color={C.dim} /> {fmtDate(n.recommendedDate)}</span>}
                          {n.trigger && n.trigger.kind === "date" && fmtDate(n.trigger.at) && (
                            <span style={st.trigPill} title="Due"><Clock size={11} color={C.warn} /> {fmtDate(n.trigger.at)}</span>
                          )}
                          {n.deadline && fmtDate(n.deadline) && (
                            <span style={{ ...st.trigPill, color: overdue ? C.danger : C.dim, borderColor: overdue ? C.danger + "66" : C.line }} title={overdue ? "Overdue" : "Deadline"}>
                              <Flag size={11} /> {fmtDate(n.deadline)}
                            </span>
                          )}
                          {n.doneAt && fmtDate(n.doneAt) && <span style={{ ...st.trigPill, color: C.personal }} title="Done"><Check size={11} /> {fmtDate(n.doneAt)}</span>}
                          {n.trigger && n.trigger.kind === "location" && n.trigger.place && n.trigger.place.name && (
                            <span style={st.trigPill}><MapPin size={11} color={C.personal} /> {n.trigger.place.name}</span>
                          )}
                          {n.trigger && n.trigger.kind === "custom" && n.trigger.name && (
                            <span style={st.trigPill}><Zap size={11} color={C.warn} /> {n.trigger.name}</span>
                          )}
                          {n.reminder && (n.reminder.kind !== "once" || fmtDate(n.reminder.at)) && (
                            <span style={st.trigPill}><Repeat size={11} color={C.work} /> {n.reminder.kind === "once"
                              ? fmtDate(n.reminder.at)
                              : `Every ${n.reminder.every || 1} ${n.reminder.unit || "week"}${(n.reminder.every || 1) > 1 ? "s" : ""}`}</span>
                          )}
                          {n.discoverClass && <span style={st.trigPill}><Compass size={11} color={C.dim} /> {n.discoverClass}</span>}
                        </div>
                        {(() => {
                          const people = [...new Set([...(n.contacts || []), ...(n.assignees || [])])];
                          if (!people.length && !(n.labels || []).length) return null;
                          return (
                            <div style={st.metaLine}>
                              {people.map((cid) => (
                                <span key={cid} style={{ ...st.metaPill, color: C.work, borderColor: C.work + "44" }}>
                                  <User size={9} /> {cid === "me" ? "Me" : contactName(cid)}
                                </span>
                              ))}
                              {(n.labels || []).map((ln) => {
                                const l = labelOf(ln);
                                const col = l ? l.color : C.dim;
                                return <span key={ln} style={{ ...st.metaPill, color: col, borderColor: col + "44" }}>{ln}</span>;
                              })}
                            </div>
                          );
                        })()}
                      </div>
                    );
                  }), columnCount).map((col, ci) => (
                    <div key={ci} style={st.masonryCol}>{col}</div>
                  ))}
                </div>
              </div>
            ))
          )}
          {archivedForFilter.length > 0 && (
            <div style={{ marginTop: 24 }}>
              <div style={st.groupHead}><Archive size={11} /> Archived<span style={st.ct}>{archivedForFilter.length}</span></div>
              <div style={st.listCol}>
                {archivedForFilter.map((n) => (
                  <div key={n.id} style={st.listRow} onClick={() => openNote(n)}>
                    {n.type && <TypeIcon name={n.type} size={12} color={C.dimmer} />}
                    <span style={{ flex: 1, ...rtl(noteLabel(n)) }}>{noteLabel(n)}</span>
                    {n.doneAt && <span style={st.chip}>{fmtDate(n.doneAt)}</span>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        )}

        {view === "list" && (
          <div style={{ padding: phone ? "0 10px 20px" : "0 20px 24px", overflowX: "auto" }}>
            <div style={{ display: "flex", gap: 16, marginBottom: 10, flexWrap: "wrap" }}>
              <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: C.dim, cursor: "pointer", width: "fit-content" }}>
                <input type="checkbox" checked={listShowArchived} onChange={(e) => setListShowArchived(e.target.checked)} />
                Include archived
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: C.dim, cursor: "pointer", width: "fit-content" }}>
                <input type="checkbox" checked={listGroupByType} onChange={(e) => setListGroupByType(e.target.checked)} />
                Group by type
              </label>
            </div>
            <table style={st.listTable}>
              {(() => {
                const renderListRow = (n) => {
                  const cat = n.domain && (categories[n.domain] || []).find((c) => c.name === n.category);
                  const pri = PRIORITIES.find((p) => p.v === n.priority);
                  return (
                    <tr key={n.id} style={st.listTr} onClick={() => openNote(n)}>
                      <td style={{ ...st.listTd, ...rtl(n.title || n.content), maxWidth: 280 }}>
                        {n.parent && <span style={{ opacity: 0.5, marginRight: 4 }}>↳</span>}{(n.title || n.content || "").slice(0, 70) || "Untitled"}
                        {n.critical && <Flame size={10} color={C.danger} style={{ marginLeft: 6 }} />}
                      </td>
                      <td style={st.listTd}>{n.domain || "—"}</td>
                      <td style={st.listTd}>{cat ? `${cat.emoji} ${n.category}` : (n.category || "—")}</td>
                      <td style={st.listTd}>{n.type || "—"}</td>
                      <td style={st.listTd}>{n.status
                        ? <span style={{ ...st.trigPill, color: STATUS_COLOR[n.status] }}>{n.status}</span> : "—"}</td>
                      <td style={st.listTd}>{n.queue
                        ? <span style={{ ...st.trigPill, color: QUEUE_COLOR[n.queue] }}>{n.queue}</span> : "—"}</td>
                      <td style={st.listTd}>{pri ? pri.name : "—"}</td>
                      <td style={st.listTd}>{n.effort || "—"}</td>
                      <td style={st.listTd}>{fmtDate((n.relatedDates || [])[0]) || "—"}</td>
                      <td style={st.listTd}>{fmtDate(n.recommendedDate) || "—"}</td>
                      <td style={st.listTd}>{fmtDate((n.trigger && n.trigger.kind === "date") ? n.trigger.at : null) || "—"}</td>
                      <td style={st.listTd}>{fmtDate(n.deadline) || "—"}</td>
                      <td style={st.listTd}>{fmtDate(n.doneAt) || "—"}</td>
                    </tr>
                  );
                };
                return (
                <>
              <thead>
                <tr>
                  {[["title", "Note"], ["domain", "Domain"], ["category", "Category"], ["type", "Type"],
                    ["status", "Status"], ["queue", "Queue"], ["priority", "Priority"], ["effort", "Effort"],
                    ["related", "Related"], ["recommendedDate", "Suggested"], ["due", "Due"], ["deadline", "Deadline"], ["done", "Done"]].map(([field, label]) => {
                    const idx = sortChain.findIndex((s) => s.field === field);
                    const dir = idx !== -1 ? sortChain[idx].dir : null;
                    return (
                      <th key={field} style={st.listTh}
                        title="Click to sort, shift-click to add as a secondary sort"
                        onClick={(e) => toggleSortChain(field, e.shiftKey)}>
                        <span style={{ display: "flex", alignItems: "center", gap: 4, cursor: "pointer" }}>
                          {label}
                          {dir && <ArrowUpDown size={11} style={{ opacity: dir === "asc" ? 1 : 0.5, transform: dir === "desc" ? "scaleY(-1)" : "none" }} />}
                          {idx > 0 && <span style={{ fontSize: 9, opacity: 0.6 }}>{idx + 1}</span>}
                        </span>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {(() => {
                  if (!listGroupByType) return listSorted.map((n) => renderListRow(n));
                  // group by type first (stable - keeps each type's own current sort order),
                  // so every type gets exactly one header no matter how the rows were sorted
                  const buckets = new Map();
                  listSorted.forEach((n) => {
                    const t = n.type || "No type";
                    if (!buckets.has(t)) buckets.set(t, []);
                    buckets.get(t).push(n);
                  });
                  const orderedTypes = [...types.map((t) => t.name).filter((t) => buckets.has(t)),
                    ...[...buckets.keys()].filter((t) => !types.some((x) => x.name === t))];
                  const rows = [];
                  orderedTypes.forEach((t) => {
                    rows.push(
                      <tr key={"g-" + t}><td colSpan={13} style={{ ...st.listTd, background: C.raised, fontWeight: 600, color: C.dim }}>
                        {t !== "No type" && <TypeIcon name={t} size={12} color={C.dim} style={{ marginRight: 6, verticalAlign: -2 }} />}{t}
                        <span style={st.ct}>{buckets.get(t).length}</span>
                      </td></tr>
                    );
                    buckets.get(t).forEach((n) => rows.push(renderListRow(n)));
                  });
                  return rows;
                })()}
              </tbody>
                </>
                );
              })()}
            </table>
            {listSorted.length === 0 && <p style={st.emptyB}>Nothing matches here yet.</p>}
          </div>
        )}

        {view === "board" && (
          <div style={{ display: "flex", gap: 12, padding: phone ? "0 10px 20px" : "0 20px 24px", overflowX: "auto", alignItems: "flex-start" }}>
            {STATUSES.map((status) => {
              const items = visible.filter((n) => n.status === status);
              return (
                <div key={status} style={st.boardCol}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    const id = e.dataTransfer.getData("text/note-id");
                    if (!id) return;
                    setNotes((p) => p.map((n) => (n.id === id
                      ? { ...n, status,
                          doneAt: status === "Done" ? (n.doneAt || new Date().toISOString()) : (n.status === "Done" ? null : n.doneAt),
                          archived: status === "Done" ? true : (n.status === "Done" ? false : n.archived) }
                      : n)));
                  }}>
                  <div style={st.boardColHead}>
                    <span style={{ width: 8, height: 8, borderRadius: 2, background: STATUS_COLOR[status] }} />
                    <span style={{ fontWeight: 600, fontSize: 12.5 }}>{status}</span>
                    <span style={st.ct}>{items.length}</span>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {items.map((n) => {
                      const pri = PRIORITIES.find((p) => p.v === n.priority);
                      return (
                        <div key={n.id} style={{ ...st.boardCard, ...(n.pinned ? { borderColor: C.warn } : {}) }} draggable
                          onDragStart={(e) => e.dataTransfer.setData("text/note-id", n.id)}
                          onClick={() => openNote(n)}>
                          {n.title && <div style={{ ...st.cardTitle, fontSize: 12.5, ...rtl(n.title) }}>{n.title}</div>}
                          <div style={{ ...st.cardBody, fontSize: 12, WebkitLineClamp: 3, ...rtl(n.content) }}>{n.content.slice(0, 100)}</div>
                          <div style={st.pillWrap}>
                            {n.pinned && <span style={st.critChip}><Star size={9} fill={C.warn} /></span>}
                            {n.queue && <span style={{ ...st.trigPill, color: QUEUE_COLOR[n.queue] }}>{n.queue}</span>}
                            {pri && n.priority <= 2 && <span style={{ ...st.trigPill, color: pri.color }}>{pri.name}</span>}
                            {n.trigger && n.trigger.kind === "date" && fmtDate(n.trigger.at) && <span style={st.trigPill} title="Due"><Clock size={10} color={C.warn} /> {fmtDate(n.trigger.at)}</span>}
                            {n.deadline && fmtDate(n.deadline) && <span style={st.trigPill} title="Deadline"><Flag size={10} /> {fmtDate(n.deadline)}</span>}
                            {n.critical && <span style={st.critChip}><Flame size={9} /></span>}
                          </div>
                        </div>
                      );
                    })}
                    {items.length === 0 && <p style={{ ...st.hint, textAlign: "center", padding: "10px 0" }}>Drop here</p>}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {view === "calendar" && (
          <div style={st.grid}>
            {(() => {
              const first = new Date(calMonth.y, calMonth.m, 1);
              const startPad = (first.getDay() + 6) % 7; // Monday-first
              const days = new Date(calMonth.y, calMonth.m + 1, 0).getDate();
              const key = (d) => `${calMonth.y}-${calMonth.m}-${d}`;
              const buckets = {};
              const put = (iso, note, kind) => {
                if (!iso) return;
                const d = new Date(iso);
                if (isNaN(d) || d.getFullYear() !== calMonth.y || d.getMonth() !== calMonth.m) return;
                const k = key(d.getDate());
                (buckets[k] = buckets[k] || []).push({ note, kind });
              };
              notes.forEach((n) => {
                if (!isNoteVisible(n)) return;
                // Final date structure, used everywhere: Related < Suggested < Due < Dead < Done
                // in importance. A note can carry several; the calendar shows only the single
                // most important one per note - and if THAT one is toggled off, the note simply
                // doesn't show, it does not fall back to a lower-priority date.
                const dateTrigger = (n.triggers || (n.trigger ? [n.trigger] : [])).find((t) => t.kind === "date");
                const chosen = n.doneAt ? ["done", n.doneAt]
                  : n.deadline ? ["dead", n.deadline]
                  : dateTrigger ? ["due", dateTrigger.at]
                  : n.recommendedDate ? ["suggested", n.recommendedDate]
                  : (n.relatedDates || []).length ? ["related", n.relatedDates[0]]
                  : null;
                if (chosen && calKindOn[chosen[0]]) put(chosen[1], n, chosen[0]);
              });
              const monthName = first.toLocaleString(undefined, { month: "long", year: "numeric" });
              const today = new Date();
              const kindColor = { done: C.personal, dead: C.danger, due: C.warn, suggested: C.work, related: C.dim };
              const kindLabel = { done: "Done", dead: "Deadline", due: "Due", suggested: "Suggested", related: "Related" };
              return (
                <>
                  <div style={st.calHead}>
                    <button style={st.mapZoomBtn} title="Previous month"
                      onClick={() => setCalMonth((c) => (c.m === 0 ? { y: c.y - 1, m: 11 } : { ...c, m: c.m - 1 }))}><ChevronUp size={13} /></button>
                    <button style={st.mapZoomBtn} title="Next month"
                      onClick={() => setCalMonth((c) => (c.m === 11 ? { y: c.y + 1, m: 0 } : { ...c, m: c.m + 1 }))}><ChevronDown size={13} /></button>
                    <span style={{ fontSize: 15, fontWeight: 600 }}>{monthName}</span>
                    <button style={st.noBtn} onClick={() => { const d = new Date(); setCalMonth({ y: d.getFullYear(), m: d.getMonth() }); }}>Today</button>
                    <div style={{ display: "flex", gap: 10, marginLeft: phone ? 0 : "auto", flexWrap: "wrap" }}>
                      {Object.entries(kindColor).map(([k, col]) => {
                        const on = calKindOn[k];
                        return (
                          <button key={k} onClick={() => setCalKindOn((p) => ({ ...p, [k]: !p[k] }))}
                            title={on ? "Hide from calendar" : "Show in calendar"}
                            style={{ ...st.hint, display: "flex", alignItems: "center", gap: 5, background: "none",
                              border: "none", cursor: "pointer", padding: 0, opacity: on ? 1 : 0.4,
                              textDecoration: on ? "none" : "line-through" }}>
                            <span style={{ width: 7, height: 7, borderRadius: 2, background: on ? col : C.dimmer }} /> {kindLabel[k]}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  {narrow ? (
                    <div style={st.listCol}>
                      {Array.from({ length: days }).map((_, i) => {
                        const day = i + 1;
                        const items = buckets[key(day)] || [];
                        if (!items.length) return null;
                        const isToday = today.getFullYear() === calMonth.y && today.getMonth() === calMonth.m && today.getDate() === day;
                        const dow = new Date(calMonth.y, calMonth.m, day).toLocaleString(undefined, { weekday: "short" });
                        return (
                          <div key={day} style={{ ...st.agendaDay, borderColor: isToday ? C.personal : C.line }}>
                            <div style={st.agendaHead}>
                              <span style={{ color: isToday ? C.personal : C.text, fontWeight: 600 }}>{dow} {day}</span>
                              <span style={st.ct}>{items.length}</span>
                            </div>
                            {items.map((it, k2) => (
                              <div key={k2} style={{ ...st.listRow, borderLeft: `3px solid ${kindColor[it.kind]}` }}
                                onClick={() => openNote(it.note)}>
                                <span style={{ ...st.chip, color: kindColor[it.kind] }}>{kindLabel[it.kind]}</span>
                                <span style={{ flex: 1, ...rtl(noteLabel(it.note)) }}>{noteLabel(it.note)}</span>
                              </div>
                            ))}
                          </div>
                        );
                      })}
                      {Object.keys(buckets).length === 0 && <p style={st.hint}>Nothing dated this month.</p>}
                    </div>
                  ) : (
                  <div style={st.calGrid}>
                    {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
                      <div key={d} style={st.calDow}>{d}</div>
                    ))}
                    {Array.from({ length: startPad }).map((_, i) => <div key={"pad" + i} />)}
                    {Array.from({ length: days }).map((_, i) => {
                      const day = i + 1;
                      const items = buckets[key(day)] || [];
                      const isToday = today.getFullYear() === calMonth.y && today.getMonth() === calMonth.m && today.getDate() === day;
                      return (
                        <div key={day} style={{ ...st.calCell, borderColor: isToday ? C.personal : C.lineSoft }}>
                          <span style={{ ...st.calNum, color: isToday ? C.personal : C.dimmer }}>{day}</span>
                          {items.slice(0, 4).map((it, k2) => (
                            <div key={k2} style={{ ...st.calItem, borderLeft: `2px solid ${kindColor[it.kind]}` }}
                              title={`${kindLabel[it.kind]} — ${noteLabel(it.note)}`} onClick={() => openNote(it.note)}>
                              <span style={rtl(noteLabel(it.note))}>{noteLabel(it.note).slice(0, 22)}</span>
                            </div>
                          ))}
                          {items.length > 4 && <span style={st.hint}>+{items.length - 4} more</span>}
                        </div>
                      );
                    })}
                  </div>
                  )}
                </>
              );
            })()}
          </div>
        )}

        {view === "map" && (() => {
          const soonNow = new Date();
          const soonEnd = new Date(soonNow.getFullYear(), soonNow.getMonth(), soonNow.getDate() + 7, 23, 59, 59);
          const isSoonNote = (n) => {
            if (n.doneAt) return false;
            const isTodayOrPast = (d) => { const dt = toLocalDate(d); return dt && dt <= soonEnd; };
            const dueTrig = (n.triggers || (n.trigger ? [n.trigger] : [])).find((t) => t.kind === "date");
            return (n.deadline && isTodayOrPast(n.deadline))
              || (dueTrig && isTodayOrPast(dueTrig.at))
              || (n.recommendedDate && isTodayOrPast(n.recommendedDate));
          };
          const locTrigger = (n) => (n.triggers || (n.trigger ? [n.trigger] : [])).find((t) => t.kind === "location");
          const withTrigger = live.filter((n) => locTrigger(n));
          const withPlaces = live.filter((n) => (n.places || []).length > 0);
          const located = [...new Set([...withTrigger, ...withPlaces])];
          const unplaced = located.filter((n) => {
            const t = locTrigger(n);
            const triggerUnplaced = t && (!t.place || t.place.lat == null);
            const placesUnplaced = (n.places || []).some((pid) => { const p = places.find((x) => x.id === pid); return p && p.lat == null; });
            return triggerUnplaced || placesUnplaced;
          });

          // group notes by the place they share, so a place with several notes shows one pin
          const groups = new Map(); // placeKey -> { name, lat, lng, items: [{n}] }
          withTrigger.forEach((n) => {
            const p = locTrigger(n).place;
            if (!p || p.lat == null) return;
            const key = p.id || p.name;
            if (!groups.has(key)) groups.set(key, { name: p.name, lat: p.lat, lng: p.lng, items: [] });
            groups.get(key).items.push(n);
          });
          withPlaces.forEach((n) => {
            (n.places || []).forEach((pid) => {
              const p = places.find((x) => x.id === pid);
              if (!p || p.lat == null) return;
              if (!groups.has(pid)) groups.set(pid, { name: p.name, lat: p.lat, lng: p.lng, items: [] });
              groups.get(pid).items.push(n);
            });
          });
          const pins = [...groups.entries()].map(([key, g]) => ({
            id: key, lat: g.lat, lng: g.lng, place: g.name,
            done: g.items.every((n) => n.doneAt),
            items: g.items.map((n) => ({ id: n.id, label: noteLabel(n), done: !!n.doneAt, soon: isSoonNote(n) })),
          }));

          return (
            <div style={{ ...st.grid, display: "flex", flexDirection: "column", height: "100%" }}>
              {located.length === 0 ? (
                <div style={st.empty}>
                  <MapPin size={26} color={C.dimmer} />
                  <p style={st.emptyT}>No place-based notes yet</p>
                  <p style={st.emptyB}>Give a note a location trigger or a related place and it appears here.</p>
                </div>
              ) : (
                <>
                  <MapBoard pins={pins} onOpen={(id) => openNote(noteById(id))} tall />
                  {unplaced.length > 0 && (
                    <p style={{ ...st.hint, marginTop: 8 }}>
                      {unplaced.length} note(s) reference a place without map coordinates yet — set one in Types &amp; categories &gt; Saved places.
                    </p>
                  )}
                </>
              )}
            </div>
          );
        })()}

        {view === "weeklyplan" && (() => {
          const routineKindColor = (k) => {
            const idx = routineKinds.indexOf(k);
            const palette = [C.work, C.personal, C.warn, "#C58FD4", "#7FC8DE", "#E08A7C"];
            return palette[idx % palette.length] || C.dim;
          };
          const routines = live.filter((n) => n.type === "Routine" && n.routineRecurring);
          const daily = routines.filter((n) => n.routineRecurring.unit === "day");
          const weekly = routines.filter((n) => n.routineRecurring.unit === "week");
          const other = routines.filter((n) => !["day", "week"].includes(n.routineRecurring.unit));
          const todayIdx = new Date().getDay();
          const order = [1, 2, 3, 4, 5, 6, 0]; // Monday-first
          return (
            <div style={{ ...st.grid, maxWidth: 1100 }}>
              {routines.length === 0 ? (
                <div style={st.empty}>
                  <Repeat size={26} color={C.dimmer} />
                  <p style={st.emptyT}>No routines yet</p>
                  <p style={st.emptyB}>Create a Routine-type note with a recurring schedule and it shows up here.</p>
                </div>
              ) : (
                <>
                  <div style={{ display: "grid", gridTemplateColumns: narrow ? "1fr" : "repeat(7, 1fr)", gap: 10 }}>
                    {order.map((wi) => {
                      const isToday = wi === todayIdx;
                      const items = [...daily, ...weekly.filter((n) => (n.routineRecurring.daysOfWeek || []).includes(wi))];
                      return (
                        <div key={wi} style={{ background: isToday ? C.raised : C.surface, border: `1px solid ${isToday ? C.personal + "66" : C.line}`,
                          borderRadius: 12, padding: 10, minHeight: 120 }}>
                          <div style={{ fontWeight: 700, fontSize: 12.5, color: isToday ? C.personal : C.text, marginBottom: 8 }}>
                            {WEEKDAY_NAMES[wi]}{isToday && <span style={{ fontSize: 9, marginLeft: 5, color: C.dimmer }}>today</span>}
                          </div>
                          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                            {items.length === 0 && <span style={{ ...st.hint, opacity: 0.5 }}>—</span>}
                            {items.map((n) => (
                              <div key={n.id} onClick={() => openNote(n)} style={{ cursor: "pointer", padding: "6px 8px", borderRadius: 8,
                                background: routineKindColor(n.routineKind) + "18", border: `1px solid ${routineKindColor(n.routineKind)}40` }}>
                                <div style={{ fontSize: 11.5, color: C.text, ...rtl(noteLabel(n)) }}>{noteLabel(n)}</div>
                                {n.routineKind && <div style={{ fontSize: 9.5, color: routineKindColor(n.routineKind), marginTop: 2 }}>{n.routineKind}</div>}
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  {other.length > 0 && (
                    <div style={{ marginTop: 18 }}>
                      <div style={st.groupHead}><Repeat size={11} /> Other routines<span style={st.ct}>{other.length}</span></div>
                      <div style={st.listCol}>
                        {other.map((n) => (
                          <div key={n.id} style={st.listRow} onClick={() => openNote(n)}>
                            <Repeat size={12} color={routineKindColor(n.routineKind)} />
                            <span style={{ flex: 1, ...rtl(noteLabel(n)) }}>{noteLabel(n)}</span>
                            <span style={st.chip}>Every {n.routineRecurring.every || 1} {n.routineRecurring.unit}{(n.routineRecurring.every || 1) > 1 ? "s" : ""}</span>
                            {n.routineKind && <span style={st.chip}>{n.routineKind}</span>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          );
        })()}

        {view === "trash" && (() => {
          const sorted = [...trashed].sort((a, b) => (b.trashedAt || 0) - (a.trashedAt || 0));
          return (
            <div style={st.grid}>
              {sorted.length === 0 ? (
                <div style={st.empty}>
                  <Trash2 size={26} color={C.dimmer} />
                  <p style={st.emptyT}>Trash is empty</p>
                  <p style={st.emptyB}>Deleted notes stay here for 30 days before being permanently removed.</p>
                </div>
              ) : (
                <div style={st.listCol}>
                  {sorted.map((n) => {
                    const daysLeft = Math.max(0, 30 - Math.floor((Date.now() - (n.trashedAt || 0)) / (24 * 60 * 60 * 1000)));
                    return (
                      <div key={n.id} style={st.listRow}>
                        {n.type && <TypeIcon name={n.type} size={12} color={C.dimmer} />}
                        <span style={{ flex: 1, ...rtl(noteLabel(n)) }}>{noteLabel(n)}</span>
                        <span style={st.chip}>{daysLeft} day{daysLeft === 1 ? "" : "s"} left</span>
                        <button style={st.ghost} title="Restore" onClick={() => restoreFromTrash(n.id)}><ArchiveRestore size={13} /></button>
                        <button style={st.ghost} title="Delete forever" onClick={(e) => deleteForever(n.id, e)}><Trash2 size={13} color={C.danger} /></button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })()}

        {view === "recurring" && (() => {
          const withReminder = recKindOn.reminder ? live.filter((n) => n.reminder && n.reminder.kind === "repeat").map((n) => ({ n, src: "reminder", rec: n.reminder })) : [];
          const withRoutine = recKindOn.routine ? live.filter((n) => n.routineRecurring && n.routineRecurring.kind === "repeat").map((n) => ({ n, src: "routine", rec: n.routineRecurring })) : [];
          const withRem = [...withReminder, ...withRoutine];
          const groupOf = (item) => {
            const r = item.rec;
            if (r.unit === "week" && (r.daysOfWeek || []).length) return r.daysOfWeek.map((d) => WEEKDAY_NAMES[d]).join(", ");
            return `Every ${r.every || 1} ${r.unit || "week"}${(r.every || 1) > 1 ? "s" : ""}`;
          };
          const order = ["Every 1 day", "Every 1 week", "Every 1 month", "Every 1 year"];
          const map = new Map();
          withRem.forEach((item) => { const g = groupOf(item); if (!map.has(g)) map.set(g, []); map.get(g).push(item); });
          const keys = [...map.keys()].sort((a, b) => {
            const ai = order.indexOf(a), bi = order.indexOf(b);
            return (ai === -1 ? 50 : ai) - (bi === -1 ? 50 : bi) || a.localeCompare(b);
          });
          return (
            <div style={st.grid}>
              <div style={{ display: "flex", gap: 14, marginBottom: 12 }}>
                {[["reminder", "Reminder recurring", Bell], ["routine", "Routine recurring", Repeat]].map(([k, label, Icon]) => (
                  <button key={k} onClick={() => setRecKindOn((p) => ({ ...p, [k]: !p[k] }))}
                    style={{ ...st.hint, display: "flex", alignItems: "center", gap: 5, background: "none", border: "none",
                      cursor: "pointer", padding: 0, opacity: recKindOn[k] ? 1 : 0.4, textDecoration: recKindOn[k] ? "none" : "line-through" }}>
                    <Icon size={11} /> {label}
                  </button>
                ))}
              </div>
              {withRem.length === 0 ? (
                <div style={st.empty}>
                  <Repeat size={26} color={C.dimmer} />
                  <p style={st.emptyT}>Nothing recurring</p>
                  <p style={st.emptyB}>Add a reminder or a routine to a note and it shows up here.</p>
                </div>
              ) : keys.map((g) => (
                <div key={g} style={{ marginBottom: 18 }}>
                  <div style={st.groupHead}><Repeat size={11} /> {g}<span style={st.ct}>{map.get(g).length}</span></div>
                  <div style={st.listCol}>
                    {map.get(g).map((item) => (
                      <div key={item.src + item.n.id} style={st.listRow} onClick={() => openNote(item.n)}>
                        {item.src === "routine" ? <Repeat size={12} color={C.warn} /> : (item.n.type && <TypeIcon name={item.n.type} size={12} color={C.dimmer} />)}
                        <span style={{ flex: 1, ...rtl(noteLabel(item.n)) }}>{noteLabel(item.n)}</span>
                        {item.n.routineKind && <span style={st.chip}>{item.n.routineKind}</span>}
                        {item.rec.at && <span style={st.chip}><Clock size={10} /> {fmtDate(item.rec.at)}</span>}
                        {item.n.domain && <span style={{ ...st.chip, color: DOMAIN_STYLE[item.n.domain].fg }}>{item.n.domain}</span>}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          );
        })()}

        {view === "contacts" && (
          <div style={st.grid}>
            <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
              <input style={st.textIn} placeholder="Add a person" value={newContact}
                onChange={(e) => setNewContact(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key !== "Enter") return;
                  e.preventDefault();
                  const n = newContact.trim();
                  if (n && !contacts.some((c) => c.name.toLowerCase() === n.toLowerCase())) setContacts((p) => [...p, { id: uid(), name: n }]);
                  setNewContact("");
                }} />
              <button type="button" style={st.okBtn} onClick={() => {
                const n = newContact.trim();
                if (n && !contacts.some((c) => c.name.toLowerCase() === n.toLowerCase())) setContacts((p) => [...p, { id: uid(), name: n }]);
                setNewContact("");
              }}><UserPlus size={12} /> Add</button>
              <button style={st.secBtn} onClick={() => setPeopleListView((v) => !v)}>
                {peopleListView ? <><Users size={13} /> Card view</> : <><Rows size={13} /> List view</>}
              </button>
            </div>
            {contacts.length === 0 ? (
              <div style={st.empty}>
                <Users size={26} color={C.dimmer} />
                <p style={st.emptyT}>No people yet</p>
                <p style={st.emptyB}>Add a person above, or tag one on a note.</p>
              </div>
            ) : peopleListView ? (
              <div style={{ overflowX: "auto" }}>
                <table style={st.listTable}>
                  <thead><tr>
                    {["Name", "Kind", "Group(s)", "Status", "Phone", "Job title", "Company/Position", "Notes"].map((h) => (
                      <th key={h} style={st.listTh}>{h}</th>
                    ))}
                  </tr></thead>
                  <tbody>
                    {contacts.map((c) => (
                      <tr key={c.id} style={st.listTr} onClick={() => setPersonModal(c.id)}>
                        <td style={st.listTd}>{c.name}</td>
                        <td style={st.listTd}>{c.contactKind || "Person"}</td>
                        <td style={st.listTd}>{(c.groups || (c.group ? [c.group] : [])).join(", ") || "—"}</td>
                        <td style={st.listTd}>{c.status || "—"}</td>
                        <td style={{ ...st.listTd, direction: "ltr", textAlign: "left" }}>{c.phone || "—"}</td>
                        <td style={st.listTd}>{c.jobTitle || "—"}</td>
                        <td style={st.listTd}>{c.jobPosition || "—"}</td>
                        <td style={{ ...st.listTd, maxWidth: 200 }}>{c.profileNotes ? c.profileNotes.slice(0, 60) : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              Object.entries(contacts.reduce((acc, c) => {
                const gs = contactGroupNames(c);
                gs.forEach((g) => { (acc[g] = acc[g] || []).push(c); });
                return acc;
              }, {})).sort(([a], [b]) => (a === "Ungrouped" ? 1 : b === "Ungrouped" ? -1 : a.localeCompare(b))).map(([group, members]) => (
                <div key={group} style={{ marginBottom: 22 }}>
                  <div style={st.groupHead}><Users size={11} /> {group}<span style={st.ct}>{members.length}</span></div>
                  <div style={st.masonryRow}>
                    {distributeColumns(members.map((c) => {
                      const mine = live.filter((n) => (n.contacts || []).includes(c.id) || (n.assignees || []).includes(c.id));
                      return (
                        <div key={c.id} className="card" style={{ ...st.card, background: C.surface, borderColor: C.line, opacity: c.active === false ? 0.55 : 1, cursor: "pointer" }}
                          onClick={() => setPersonModal(c.id)}>
                          <div style={st.cardTop}>
                            <div style={st.chips}>
                              <span style={{ ...st.domChip, color: C.work, borderColor: C.work + "55" }}>
                                {c.contactKind === "Company" ? <Briefcase size={10} /> : <User size={10} />} {c.name}
                                {c.status && <span style={{ width: 7, height: 7, borderRadius: "50%", marginLeft: 4,
                                  background: c.status === "Warm" ? C.warn : c.status === "OK" ? C.work : C.dim }} title={c.status} />}
                              </span>
                            </div>
                            <span style={st.ct}>{mine.length}</span>
                          </div>
                        </div>
                      );
                    }), columnCount).map((col, ci) => (
                      <div key={ci} style={st.masonryCol}>{col}</div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </main>

      {groupSearchModal && (() => {
        const members = contacts.filter((c) => contactGroupNames(c).includes(groupSearchModal));
        const q = groupSearchQuery.trim().toLowerCase();
        const filtered = q ? members.filter((c) => c.name.toLowerCase().includes(q)) : members;
        return (
          <div style={st.overlay} onMouseDown={overlayMouseDown} onClick={overlayClickClose(() => { setGroupSearchModal(null); setGroupSearchQuery(""); })}>
            <div style={st.modal} onClick={(e) => e.stopPropagation()}>
              <div style={st.modalHead}>
                <h2 style={st.modalTitle}>{groupSearchModal} ({members.length})</h2>
                <button style={st.ghost} onClick={() => { setGroupSearchModal(null); setGroupSearchQuery(""); }}><X size={15} /></button>
              </div>
              <input autoFocus style={st.textIn} placeholder="Search people…" value={groupSearchQuery}
                onChange={(e) => setGroupSearchQuery(e.target.value)} />
              <div style={{ ...st.listCol, maxHeight: "60vh", overflowY: "auto" }}>
                {filtered.map((m) => (
                  <div key={m.id} style={{ ...st.listRow, opacity: m.active === false ? 0.45 : 1 }}>
                    <span style={{ flex: 1, cursor: "pointer" }} onClick={() => { setPersonModal(m.id); setGroupSearchModal(null); setGroupSearchQuery(""); }}>
                      {m.name}
                    </span>
                    <button style={st.ghost} title={m.active === false ? "Activate" : "Deactivate"}
                      onClick={() => setContacts((p) => p.map((x) => (x.id === m.id ? { ...x, active: x.active === false ? true : false } : x)))}>
                      {m.active === false ? <EyeOff size={12} /> : <Eye size={12} />}
                    </button>
                  </div>
                ))}
                {filtered.length === 0 && <p style={st.hint}>No matches.</p>}
              </div>
            </div>
          </div>
        );
      })()}

      {linksModal && (() => {
        const n = notes.find((x) => x.id === linksModal);
        if (!n) return null;
        const links = extractLinks(n);
        return (
          <div style={st.overlay} onMouseDown={overlayMouseDown} onClick={overlayClickClose(() => setLinksModal(null))}>
            <div style={st.modal} onClick={(e) => e.stopPropagation()}>
              <div style={st.modalHead}>
                <h2 style={st.modalTitle}>Links ({links.length})</h2>
                <button style={st.ghost} onClick={() => setLinksModal(null)}><X size={15} /></button>
              </div>
              <div style={{ ...st.linkStack, maxHeight: "60vh", overflowY: "auto" }}>
                {links.map((u, li) => (
                  <LinkPreviewCard key={u} url={u} first={li === 0} last={li === links.length - 1} />
                ))}
              </div>
            </div>
          </div>
        );
      })()}

      {personModal && (() => {
        const c = contacts.find((x) => x.id === personModal);
        if (!c) return null;
        const mine = live.filter((n) => (n.contacts || []).includes(c.id) || (n.assignees || []).includes(c.id));
        const assigned = mine.filter((n) => (n.assignees || []).includes(c.id));
        const referred = live.filter((n) => n.referrer === c.id);
        const patchC = (f) => setContacts((p) => p.map((x) => (x.id === c.id ? { ...x, ...f } : x)));
        const companies = contacts.filter((x) => x.contactKind === "Company" && x.id !== c.id);
        const otherPeople = contacts.filter((x) => x.id !== c.id);
        return (
          <div style={st.overlay} onMouseDown={overlayMouseDown} onClick={overlayClickClose(() => setPersonModal(null))}>
            <div style={st.modal} onClick={(e) => e.stopPropagation()}>
              <div style={st.modalHead}>
                {renaming && renaming.list === "person" && renaming.index === c.id ? (
                  <input autoFocus style={{ ...st.titleIn, flex: 1 }} value={renaming.value}
                    onChange={(e) => setRenaming({ list: "person", index: c.id, value: e.target.value })}
                    onBlur={() => { const v = renaming.value.trim() || c.name; patchC({ name: v }); setRenaming(null); }}
                    onKeyDown={(e) => { if (e.key === "Enter") e.target.blur(); if (e.key === "Escape") setRenaming(null); }} />
                ) : (
                  <h2 onClick={() => setRenaming({ list: "person", index: c.id, value: c.name })} style={{ ...st.modalTitle, cursor: "text" }}>
                    {c.contactKind === "Company" ? <Briefcase size={16} style={{ marginRight: 6, verticalAlign: -2 }} /> : <User size={16} style={{ marginRight: 6, verticalAlign: -2 }} />}
                    {c.name}
                  </h2>
                )}
                <div style={{ display: "flex", gap: 6 }}>
                  <button style={st.ghost} title={c.active === false ? "Activate" : "Deactivate (hides their notes everywhere)"}
                    onClick={() => patchC({ active: c.active === false ? true : false })}>
                    {c.active === false ? <EyeOff size={13} /> : <Eye size={13} />}
                  </button>
                  <button style={st.ghost} title="Delete person" onClick={(e) => confirmAction(e, `Delete ${c.name}? This can't be undone.`, () => {
                    setContacts((p) => p.filter((x) => x.id !== c.id));
                    setNotes((p) => p.map((n) => ({ ...n,
                      contacts: (n.contacts || []).filter((x) => x !== c.id),
                      assignees: (n.assignees || []).filter((x) => x !== c.id),
                      referrer: n.referrer === c.id ? null : n.referrer })));
                    setPersonModal(null);
                  })}><Trash2 size={13} /></button>
                  <button style={st.ghost} onClick={() => setPersonModal(null)}><X size={15} /></button>
                </div>
              </div>

              <div style={st.wrapRow}>
                <span style={st.chip}>{assigned.length} assigned</span>
                <span style={st.chip}>{referred.length} referred</span>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 9 }}>
                <div style={{ display: "flex", gap: 8 }}>
                  {["Person", "Company"].map((k) => (
                    <button key={k} style={{ ...st.qChip, ...(c.contactKind === k || (!c.contactKind && k === "Person") ? st.numChipOn : {}) }}
                      onClick={() => patchC({ contactKind: k })}>{k}</button>
                  ))}
                </div>

                <div>
                  <span style={st.pickLbl}>Status</span>
                  <div style={{ display: "flex", gap: 8, marginTop: 3 }}>
                    {[["Cold", C.dim], ["OK", C.work], ["Warm", C.warn]].map(([k, col]) => (
                      <button key={k} style={{ ...st.qChip, ...(c.status === k ? { background: col, borderColor: col, color: C.ink } : {}) }}
                        onClick={() => patchC({ status: c.status === k ? null : k })}>{k}</button>
                    ))}
                  </div>
                </div>

                <div>
                  <span style={st.pickLbl}>Groups</span>
                  <div style={st.wrapRow}>
                    {(c.groups || []).map((g) => (
                      <span key={g} style={{ ...st.labelPill, color: C.personal, borderColor: C.personal + "55" }}>
                        {g}
                        <button style={st.pillX} onClick={() => patchC({ groups: (c.groups || []).filter((x) => x !== g) })}><X size={9} /></button>
                      </span>
                    ))}
                    <SearchCreatePicker items={[...new Set(contacts.flatMap((x) => x.groups || []))].filter((g) => !(c.groups || []).includes(g)).map((g) => ({ id: g, name: g }))}
                      buttonLabel="Group" buttonIcon={Users}
                      onPick={(g) => patchC({ groups: [...new Set([...(c.groups || []), g.name])] })}
                      onCreate={(name) => patchC({ groups: [...new Set([...(c.groups || []), name])] })} />
                  </div>
                </div>

                <div style={{ display: "flex", gap: 8 }}>
                  <div style={{ flex: 1 }}>
                    <span style={st.pickLbl}>First name</span>
                    <input style={{ ...st.textIn, width: "100%", marginTop: 3 }} value={c.firstName || ""}
                      onChange={(e) => patchC({ firstName: e.target.value })} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <span style={st.pickLbl}>Last name</span>
                    <input style={{ ...st.textIn, width: "100%", marginTop: 3 }} value={c.lastName || ""}
                      onChange={(e) => patchC({ lastName: e.target.value })} />
                  </div>
                </div>
                <div>
                  <span style={st.pickLbl}>Known as</span>
                  <input style={{ ...st.textIn, width: "100%", marginTop: 3 }} value={c.name}
                    onChange={(e) => patchC({ name: e.target.value })} />
                </div>
                <div>
                  <span style={st.pickLbl}>Phone</span>
                  <input style={{ ...st.textIn, width: "100%", marginTop: 3 }} dir="ltr" value={c.phone || ""}
                    onChange={(e) => patchC({ phone: e.target.value })} />
                </div>
                <div>
                  <span style={st.pickLbl}>Where met</span>
                  <div style={st.wrapRow}>
                    {c.metPlace && (
                      <span style={{ ...st.labelPill, color: C.personal, borderColor: C.personal + "55" }}>
                        {(places.find((p) => p.id === c.metPlace) || {}).name || "Unknown"}
                        <button style={st.pillX} onClick={() => patchC({ metPlace: null })}><X size={9} /></button>
                      </span>
                    )}
                    {!c.metPlace && (
                      <SearchCreatePicker items={places} buttonLabel="Place" buttonIcon={MapPin}
                        onPick={(p) => patchC({ metPlace: p.id })}
                        onCreate={(name) => { const id = uid(); setPlaces((pl) => [...pl, { id, name }]); patchC({ metPlace: id }); }} />
                    )}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <div style={{ flex: 1 }}>
                    <span style={st.pickLbl}>Job title</span>
                    <input style={{ ...st.textIn, width: "100%", marginTop: 3 }} value={c.jobTitle || ""}
                      onChange={(e) => patchC({ jobTitle: e.target.value })} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <span style={st.pickLbl}>Job position</span>
                    <input style={{ ...st.textIn, width: "100%", marginTop: 3 }} value={c.jobPosition || ""}
                      onChange={(e) => patchC({ jobPosition: e.target.value })} />
                  </div>
                </div>

                <div>
                  <span style={st.pickLbl}>Relations</span>
                  <p style={st.hint}>A is [model] of B — shown on both. Company affiliation goes here too (Employee/Employer, Owner, etc).</p>
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    {effectiveRelations(c, contacts).map((r, i) => (
                      <div key={i} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{ fontSize: 12, color: C.dim }}>{r.label} of</span>
                        <span style={{ fontSize: 12, color: C.text, flex: 1, cursor: "pointer" }}
                          onClick={() => { setPersonModal(r.otherId); setPendingRelModel(""); }}>{contactName(r.otherId)}</span>
                        <button style={st.pillX} title="Remove"
                          onClick={() => setContacts((p) => p.map((x) => (x.id === r.ownerId ? { ...x, relations: (x.relations || []).filter((rr) => rr.to !== r.targetId) } : x)))}>
                          <X size={9} />
                        </button>
                      </div>
                    ))}
                    <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                      <select style={st.sel} value={pendingRelModel} onChange={(e) => setPendingRelModel(e.target.value)} required>
                        <option value="">Relation…</option>
                        {RELATION_MODELS.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
                      </select>
                      <span style={{ fontSize: 11, color: C.dimmer }}>of</span>
                      <SearchCreatePicker items={otherPeople} buttonLabel="Person/Company" buttonIcon={User}
                        onPick={(target) => {
                          if (!pendingRelModel) { alert("Choose a relation first."); return; }
                          patchC({ relations: [...(c.relations || []).filter((r) => r.to !== target.id), { to: target.id, modelId: pendingRelModel }] });
                          setPendingRelModel("");
                        }}
                        onCreate={(name) => {
                          if (!pendingRelModel) { alert("Choose a relation first."); return; }
                          const id = uid();
                          setContacts((p) => [...p, { id, name, contactKind: "Person", relations: [] }]);
                          patchC({ relations: [...(c.relations || []), { to: id, modelId: pendingRelModel }] });
                          setPendingRelModel("");
                        }} />
                    </div>
                  </div>
                </div>

                <div>
                  <span style={st.pickLbl}>Intro</span>
                  <textarea style={{ ...st.teachIn, width: "100%", minHeight: 40, marginTop: 3 }}
                    placeholder="A short intro…" value={c.intro || ""}
                    onChange={(e) => patchC({ intro: e.target.value })} />
                </div>
                <div>
                  <span style={st.pickLbl}>Notes</span>
                  <textarea style={{ ...st.teachIn, width: "100%", minHeight: 60, marginTop: 3 }}
                    placeholder="Anything worth remembering…" value={c.profileNotes || ""}
                    onChange={(e) => patchC({ profileNotes: e.target.value })} />
                </div>
              </div>

              <div style={{ ...st.listCol, marginTop: 9 }}>
                {mine.slice(0, 8).map((n) => (
                  <div key={n.id} style={st.listRow} onClick={() => { setPersonModal(null); openNote(n); }}>
                    {n.type && <TypeIcon name={n.type} size={11} color={C.dimmer} />}
                    <span style={{ flex: 1, ...rtl(noteLabel(n)) }}>{noteLabel(n).slice(0, 40)}</span>
                  </div>
                ))}
                {mine.length === 0 && <span style={st.hint}>No notes yet.</span>}
              </div>
              <button style={{ ...st.relAdd, marginTop: 9 }}
                onClick={() => { setPersonModal(null); setDrawer(false); setView("notes"); setFilter({ kind: "contact", contact: c.id }); }}>
                See all notes
              </button>
            </div>
          </div>
        );
      })()}

      {editor && (
        <div style={st.overlay} onMouseDown={overlayMouseDown} onClick={overlayClickClose(closeEditor)}>
          <button style={st.overlayCloseBtn} onClick={closeEditor} title="Close"><X size={18} /></button>
          <div style={st.modal} onClick={(e) => e.stopPropagation()}>
                <div style={st.headBar}>
                  <button title={editor.critical ? "Too critical to miss!" : "Mark too critical to miss"}
                    style={{ ...st.headIconBtn, ...(editor.critical ? { color: C.danger, borderColor: C.danger + "66", background: C.danger + "18" } : {}) }}
                    onClick={() => upd({ critical: !editor.critical })}>
                    <Flame size={13} />
                  </button>
                  <div style={{ position: "relative" }}>
                    <button title="Reminder" style={{ ...st.headIconBtn, ...(activeMore === "reminder" ? st.tabBtnOn : {}), position: "relative" }}
                      onClick={() => setActiveMore((o) => (o === "reminder" ? null : "reminder"))}>
                      <Bell size={13} />
                      {!!editor.reminder && <span style={st.moreDot} />}
                    </button>
                    {activeMore === "reminder" && (
                      <div style={st.morePopover} onClick={(e) => e.stopPropagation()}>
                        <div style={st.remBox}>
                          <div style={st.sectionHead}><Bell size={13} color={C.work} /><span>Reminder</span></div>
                          <div style={st.segRow}>
                            {["none", "once", "repeat"].map((k) => (
                              <button key={k} style={{ ...st.seg, ...(((editor.reminder && editor.reminder.kind) || "none") === k ? st.segOn : {}) }}
                                onClick={() => upd({ reminder: k === "none" ? null
                                  : k === "once" ? { kind: "once", at: "" }
                                  : { kind: "repeat", every: 1, unit: "week", at: "" } })}>
                                {k === "none" ? "None" : k === "once" ? "Once" : "Repeating"}
                              </button>
                            ))}
                          </div>
                          {editor.reminder && editor.reminder.kind === "once" && (
                            <DateTimeField value={editor.reminder.at || ""} onChange={(v) => upd({ reminder: { ...editor.reminder, at: v } })} />
                          )}
                          {editor.reminder && editor.reminder.kind === "repeat" && (
                            <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                              <div style={{ display: "flex", gap: 7, alignItems: "center", flexWrap: "wrap" }}>
                                <span style={st.pickLbl}>Every</span>
                                <input type="number" min="1" style={{ ...st.dateIn, width: 62 }} value={editor.reminder.every || 1}
                                  onChange={(e) => upd({ reminder: { ...editor.reminder, every: Math.max(1, +e.target.value || 1) } })} />
                                <select style={st.sel} value={editor.reminder.unit || "week"}
                                  onChange={(e) => upd({ reminder: { ...editor.reminder, unit: e.target.value, daysOfWeek: e.target.value === "week" ? editor.reminder.daysOfWeek : undefined } })}>
                                  {REPEAT_UNITS.map((u) => <option key={u} value={u}>{u}{(editor.reminder.every || 1) > 1 ? "s" : ""}</option>)}
                                </select>
                              </div>
                              {editor.reminder.unit === "week" && (
                                <div style={{ display: "flex", gap: 4 }}>
                                  {WEEKDAY_NAMES.map((wd, wi) => {
                                    const on = (editor.reminder.daysOfWeek || []).includes(wi);
                                    return (
                                      <button key={wi} type="button" style={{ ...st.qChip, padding: "4px 7px", ...(on ? st.numChipOn : {}) }}
                                        onClick={() => {
                                          const cur = editor.reminder.daysOfWeek || [];
                                          upd({ reminder: { ...editor.reminder, daysOfWeek: on ? cur.filter((x) => x !== wi) : [...cur, wi].sort() } });
                                        }}>{wd[0]}</button>
                                    );
                                  })}
                                </div>
                              )}
                              <div style={{ display: "flex", gap: 7, alignItems: "center" }}>
                                <span style={st.pickLbl}>from</span>
                                <DateTimeField value={editor.reminder.at || ""} onChange={(v) => upd({ reminder: { ...editor.reminder, at: v } })} />
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                  <button title="More (labels, people, places, dates, images, files)"
                    style={{ ...st.headIconBtn, ...(moreExpanded ? st.tabBtnOn : {}), position: "relative" }}
                    onClick={() => setMoreExpanded((o) => !o)}>
                    <Plus size={13} />
                    {((editor.labels || []).length > 0 || (editor.contacts || []).length > 0 || (editor.places || []).length > 0
                      || (editor.relatedDates || []).length > 0 || (editor.images || []).length > 0 || (editor.attachments || []).length > 0) && <span style={st.moreDot} />}
                  </button>

                  <div style={{ flex: 1, minWidth: 0, display: "flex", justifyContent: "center" }}>
                    {editor.showTitle ? (
                      <input ref={titleRef} style={{ ...st.titleIn, width: "100%", textAlign: "center", ...rtl(editor.title) }} placeholder="Title" value={editor.title}
                        onChange={(e) => upd({ title: e.target.value })}
                        onKeyDown={(e) => { if (e.key === "Backspace" && !editor.title) { e.preventDefault(); upd({ showTitle: false }); contentRef.current && contentRef.current.focus(); } }} />
                    ) : (
                      <button style={st.addTitle} onClick={() => { upd({ showTitle: true }); setTimeout(() => titleRef.current && titleRef.current.focus(), 0); }}>
                        <Plus size={10} /> Add title
                      </button>
                    )}
                  </div>

                  <button title={editor.pinned ? "Unpin" : "Pin"}
                    style={{ ...st.headIconBtn, ...(editor.pinned ? { color: C.warn, borderColor: C.warn + "66", background: C.warn + "18" } : {}) }}
                    onClick={() => upd({ pinned: !editor.pinned })}>
                    <Star size={13} fill={editor.pinned ? C.warn : "none"} />
                  </button>
                  {editor.id && !editor.archived && (
                    <button title="Done" style={st.headIconBtn} onClick={() => markDone(editor.id)}><Check size={13} /></button>
                  )}
                  {editor.id && editor.archived && (
                    <button title="Restore" style={st.headIconBtn} onClick={() => { restoreNote(editor.id); setEditor(null); }}><ArchiveRestore size={13} /></button>
                  )}
                  {editor.id && (
                    <button title="Delete" style={st.headIconBtn} onClick={(e) => deleteNote(editor.id, e)}><Trash2 size={13} /></button>
                  )}
                </div>

                {editor.doneAt && (
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: -4, marginBottom: 2 }}>
                    <span style={st.pickLbl}>Done on</span>
                    <DateTimeField value={editor.doneAt} onChange={(v) => upd({ doneAt: v || null })} />
                  </div>
                )}

                {moreExpanded && (
                  <div style={{ ...st.moreIconRow, position: "relative" }}>
                    {[["label", Tag, "Labels", (editor.labels || []).length > 0],
                      ["people", User, "People", (editor.contacts || []).length > 0],
                      ["places", MapPin, "Places", (editor.places || []).length > 0],
                      ["dates", CalendarClock, "Related dates", (editor.relatedDates || []).length > 0],
                      ["images", ImageIcon, "Images", (editor.images || []).length > 0],
                      ["attachments", Paperclip, "Attachments", (editor.attachments || []).length > 0]].map(([k, Icon, label, has]) => (
                      <button key={k} title={label}
                        style={{ ...st.headIconBtn, ...(activeMore === k ? st.tabBtnOn : {}), position: "relative" }}
                        onClick={() => setActiveMore((o) => (o === k ? null : k))}>
                        <Icon size={13} />
                        {has && <span style={st.moreDot} />}
                      </button>
                    ))}

                    {activeMore && (
                      <div style={st.morePopover} onClick={(e) => e.stopPropagation()}>
                        {activeMore === "label" && (
                        <div style={st.labelRow}>
                          {editor.labels.map((ln) => {
                            const l = labelOf(ln);
                            return (
                              <span key={ln} style={{ ...st.labelPill, color: l ? l.color : C.dim, borderColor: (l ? l.color : C.dim) + "55" }}>
                                {ln}<button style={st.pillX} onClick={() => toggleLabel(ln)}><X size={9} /></button>
                              </span>
                            );
                          })}
                          <div style={{ position: "relative" }}>
                            <button style={st.labelAdd} onClick={() => setLabelOpen((o) => !o)}><Tag size={11} /> Label</button>
                            {labelOpen && (
                              <div style={st.pop}>
                                <input autoFocus style={st.popIn} placeholder="Find or create" value={labelQuery}
                                  onChange={(e) => setLabelQuery(e.target.value)} onKeyDown={(e) => e.key === "Enter" && canCreate && createLabel()} />
                                <div style={{ maxHeight: 150, overflowY: "auto" }}>
                                  {labelMatches.map((l) => (
                                    <div key={l.name} className="lbl" style={st.popRow} onClick={() => toggleLabel(l.name)}>
                                      <span style={{ ...st.swatch, background: l.color }} title="Change colour"
                                        onClick={(e) => { e.stopPropagation(); cycleLabelColor(l.name); }} />
                                      <span style={{ flex: 1 }}>{l.name}</span>
                                      {editor.labels.includes(l.name) && <Check size={11} color={C.personal} />}
                                    </div>
                                  ))}
                                  {canCreate && (
                                    <div className="lbl" style={st.popRow} onClick={createLabel}>
                                      <Plus size={12} /><span>Create "{labelQuery.trim()}"</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                        )}
                        {moreContent(activeMore)}
                      </div>
                    )}
                  </div>
                )}

                <textarea ref={contentRef} style={{ ...st.contentIn, ...rtl(editor.content) }} placeholder="Take a note…"
                  value={editor.content} onChange={(e) => upd({ content: e.target.value })} />

                {/* extra description — one box: rendered by default, click to edit, toolbar buttons instead of typed syntax. Lives above the tabs. */}
                <div>
                  {!extraOpen && (
                    <button style={editor.extra && editor.extra.trim() ? st.extraBoxFilled : st.extraBoxEmpty}
                      onClick={() => { setExtraOpen(true); if (!(editor.extra && editor.extra.trim())) setExtraEditing(true); }}>
                      {editor.extra && editor.extra.trim() ? (
                        <span style={{ ...rtl(editor.extra), color: C.text }}>{editor.extra.trim().slice(0, 80)}{editor.extra.trim().length > 80 ? "…" : ""}</span>
                      ) : (
                        <span style={{ color: C.dimmer }}><Plus size={12} style={{ verticalAlign: -2, marginRight: 4 }} />Add extra description</span>
                      )}
                    </button>
                  )}
                  {extraOpen && (
                    <button style={st.collapseBtn} onClick={() => { setExtraOpen(false); setExtraEditing(false); }}>
                      <ChevronDown size={11} /> Extra description
                    </button>
                  )}
                  {extraOpen && (
                    extraEditing || !(editor.extra && editor.extra.trim()) ? (
                      <>
                        <div style={{ display: "flex", gap: 3, flexWrap: "wrap", marginTop: 6 }}>
                          <button style={st.mdBtn} title="Heading" onMouseDown={(e) => e.preventDefault()} onClick={() => extraLinePrefix("# ")}><Heading1 size={13} /></button>
                          <button style={st.mdBtn} title="Subheading" onMouseDown={(e) => e.preventDefault()} onClick={() => extraLinePrefix("## ")}><Heading2 size={13} /></button>
                          <button style={st.mdBtn} title="Bold" onMouseDown={(e) => e.preventDefault()} onClick={() => extraWrapSelection("**")}><Bold size={13} /></button>
                          <button style={st.mdBtn} title="Italic" onMouseDown={(e) => e.preventDefault()} onClick={() => extraWrapSelection("*")}><Italic size={13} /></button>
                          <button style={st.mdBtn} title="Bullet list" onMouseDown={(e) => e.preventDefault()} onClick={() => extraLinePrefix("- ")}><List size={13} /></button>
                          <button style={st.mdBtn} title="Numbered list" onMouseDown={(e) => e.preventDefault()} onClick={() => extraNumberedList()}><span style={{ fontSize: 12, fontWeight: 700, width: 13, textAlign: "center" }}>1.</span></button>
                          <button style={st.mdBtn} title="Checklist" onMouseDown={(e) => e.preventDefault()} onClick={() => extraLinePrefix("- [ ] ")}><CheckSquare size={13} /></button>
                          <button style={st.mdBtn} title="Quote" onMouseDown={(e) => e.preventDefault()} onClick={() => extraLinePrefix("> ")}><Quote size={13} /></button>
                          <button style={st.mdBtn} title="Code" onMouseDown={(e) => e.preventDefault()} onClick={() => extraWrapSelection("`")}><Code size={13} /></button>
                          <button style={st.mdBtn} title="Link" onMouseDown={(e) => e.preventDefault()} onClick={extraInsertLink}><LinkIcon size={13} /></button>
                          <button style={st.mdBtn} title="Divider" onMouseDown={(e) => e.preventDefault()} onClick={extraInsertDivider}><Minus size={13} /></button>
                        </div>
                        <div
                          style={{ ...st.teachIn, ...rtl(editor.extra), marginTop: 6, width: "100%", minHeight: 220,
                            display: "flex", flexDirection: "column", gap: 2 }}
                          onBlur={() => {
                            setTimeout(() => {
                              const root = extraContainerRef.current;
                              if (root && !root.contains(document.activeElement)) setExtraEditing(false);
                            }, 0);
                          }}
                          ref={extraContainerRef}>
                          {(editor.extra || "").split("\n").map((line, i, arr) => {
                            const marker = extraLineMarker(line);
                            const level = marker ? marker.level : 0;
                            const fontSize = level === 1 ? 19 : level === 2 ? 16 : 12.5;
                            const fontWeight = level ? 700 : 400;
                            const selected = extraLineSel && i >= extraLineSel.start && i <= extraLineSel.end;
                            return (
                              <div key={i} onMouseDown={() => extraLineMouseDown(i)}
                                style={{ borderRadius: 4, background: selected ? C.work + "33" : "transparent",
                                  display: "flex", alignItems: "flex-start", gap: 6 }}>
                                {marker && marker.num != null && (
                                  <span style={{ flexShrink: 0, padding: "1px 0", fontSize: 12.5, color: C.dim, userSelect: "none" }}>
                                    {marker.num}.
                                  </span>
                                )}
                                <textarea rows={1}
                                  ref={(el) => { extraLineRefs.current[i] = el; if (el) extraAutoResize(el); }}
                                  value={marker ? marker.text : line}
                                  placeholder={i === 0 && arr.length === 1 && !line ? "Write more detail…" : ""}
                                  autoFocus={extraEditing && i === (extraEditTargetRef.current ?? arr.length - 1)}
                                  style={{
                                    width: "100%", resize: "none", overflow: "hidden", border: "none", outline: "none",
                                    background: "transparent", color: C.text, fontFamily: "inherit",
                                    fontSize, fontWeight, lineHeight: level ? 1.35 : 1.5,
                                    padding: level === 1 ? "6px 0 2px" : level === 2 ? "4px 0 2px" : "1px 0",
                                  }}
                                  onFocus={() => { extraFocusedLineRef.current = i; }}
                                  onChange={(e) => { onExtraLineChange(i, e.target.value); extraAutoResize(e.target); }}
                                  onKeyDown={(e) => extraLineKeyDown(i, e)} />
                              </div>
                            );
                          })}
                        </div>
                      </>
                    ) : (
                      <div style={{ ...st.mdBox, ...rtl(editor.extra), marginTop: 6, cursor: "text", minHeight: 220 }}
                        onClick={extraClickToEdit}>
                        <Markdown text={editor.extra} />
                      </div>
                    )
                  )}
                </div>

                {(() => {
                  const tabs = [["filing", "Filing"],
                    ...(isTaskLike(editor.type) ? [["task", "Task"]] : []),
                    ...(editor.type === "Event" ? [["event", "Event"]] : []),
                    ...(editor.type === "Pay" ? [["pay", "Pay"]] : []),
                    ...(editor.type === "Discover" ? [["discover", "Discover"]] : []),
                    ...(editor.type === "Routine" ? [["routine", "Routine"]] : [])];
                  if (tabs.length < 2) return null;
                  return (
                    <div style={st.tabBar}>
                      {tabs.map(([k, label]) => (
                        <button key={k} style={{ ...st.tabBtn, ...(tab === k ? st.tabBtnOn : {}) }} onClick={() => setTab(k)}>{label}</button>
                      ))}
                    </div>
                  );
                })()}

                {/* filing — chosen by you, or by Claude through the connector */}
                {tab === "filing" && (
                  <div style={st.sectionBox}>
                    <div style={st.fieldRow}>
                      <span style={st.pickLbl}>Domain</span>
                      <div style={st.wrapRow}>
                        {DOMAINS.map((d) => {
                          const ds = DOMAIN_STYLE[d];
                          const on = editor.domain === d;
                          return (
                            <button key={d}
                              style={{ ...st.qChip, ...(on ? { background: ds.tint, borderColor: ds.fg, color: ds.fg, fontWeight: 600 } : {}) }}
                              onClick={() => upd({ domain: on ? null : d, category: null })}>
                              <ds.Icon size={11} /> {d}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {editor.domain && (
                      <div style={st.fieldRow}>
                        <span style={st.pickLbl}>Category</span>
                        <div style={st.wrapRow}>
                          {(categories[editor.domain] || []).map((c) => (
                            <button key={c.name}
                              style={{ ...st.qChip, ...(editor.category === c.name ? st.numChipOn : {}) }}
                              onClick={() => upd({ category: editor.category === c.name ? null : c.name })}>
                              {c.emoji} {c.name}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {editor.fileReason && <p style={st.reason}>{editor.fileReason}</p>}
                  </div>
                )}

                {/* trigger — up to one each of Date / Location / Custom, all can be on at once. Same for Task and Event. */}
                {((tab === "task" && isTaskLike(editor.type)) || (tab === "event" && editor.type === "Event")) && (
                  <div style={st.trigBox}>
                    <div style={st.sectionHead}><Target size={13} color={C.warn} /><span>Trigger</span></div>
                    <p style={st.hint}>When any of these arrive, it activates. Turn on as many as apply.</p>
                    <div style={st.segRow}>
                      {[["date", <><Clock size={11} /> Date</>], ["location", <><MapPin size={11} /> Place</>], ["custom", <><Zap size={11} /> Custom</>]].map(([k, label]) => {
                        const on = !!triggerSlot(k);
                        return (
                          <button key={k} style={{ ...st.seg, ...(on ? st.segOn : {}) }}
                            onClick={() => on ? clearTriggerSlot(k)
                              : setTriggerSlot(k, k === "date" ? { kind: "date", at: "" }
                                : k === "location" ? { kind: "location", place: null }
                                : { kind: "custom", name: "" })}>
                            {label}
                          </button>
                        );
                      })}
                    </div>

                    {triggerSlot("date") && (
                      <DateTimeField value={triggerSlot("date").at || ""} onChange={(v) => setTriggerSlot("date", { kind: "date", at: v })} />
                    )}

                    {triggerSlot("location") && (
                      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        {places.length > 0 && (
                          <select style={st.sel} value={(triggerSlot("location").place && triggerSlot("location").place.id) || ""}
                            onChange={(e) => setTriggerSlot("location", { kind: "location", place: places.find((x) => x.id === e.target.value) || null })}>
                            <option value="">Saved places…</option>
                            {places.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                          </select>
                        )}
                        <div style={{ display: "flex", gap: 8 }}>
                          <input style={st.textIn} placeholder="Or type a place name"
                            value={(triggerSlot("location").place && triggerSlot("location").place.name) || ""}
                            onChange={(e) => setTriggerSlot("location", { kind: "location", place: { ...(triggerSlot("location").place || {}), id: (triggerSlot("location").place && triggerSlot("location").place.id) || uid(), name: e.target.value } })} />
                          <button style={st.mapBtn} onClick={() => { setMapSeed(null); setMapDraft(null); setMapOpen(true); }}><Crosshair size={12} /> Map</button>
                        </div>
                        {triggerSlot("location").place && triggerSlot("location").place.name && !places.some((p) => p.name === triggerSlot("location").place.name) && (
                          <button style={st.link} onClick={() => setPlaces((p) => [...p, { ...triggerSlot("location").place, id: triggerSlot("location").place.id || uid() }])}>
                            Save “{triggerSlot("location").place.name}” to my places
                          </button>
                        )}
                      </div>
                    )}

                    {triggerSlot("custom") && (
                      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        <div style={st.wrapRow}>
                          {customTriggers.map((c) => (
                            <button key={c} onClick={() => setTriggerSlot("custom", { kind: "custom", name: c })}
                              style={{ ...st.qChip, ...(triggerSlot("custom").name === c ? st.numChipOn : {}) }}>{c}</button>
                          ))}
                          {customTriggers.length === 0 && <span style={st.hint}>None saved — add some in Types &amp; categories.</span>}
                        </div>
                        <input style={st.textIn} placeholder="Or write a one-off condition"
                          value={triggerSlot("custom").name || ""}
                          onChange={(e) => setTriggerSlot("custom", { kind: "custom", name: e.target.value })} />
                        {triggerSlot("custom").name && !customTriggers.includes(triggerSlot("custom").name) && (
                          <button style={st.link} onClick={() => setCustomTriggers((p) => [...p, triggerSlot("custom").name])}>
                            Save “{triggerSlot("custom").name}” as a reusable trigger
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* task attributes */}
                {((tab === "task" && isTaskLike(editor.type)) || (tab === "event" && editor.type === "Event")) && (
                  <div style={st.taskBox}>
                    <div style={st.sectionHead}><Gauge size={13} color={C.warn} /><span>{editor.type === "Event" ? "Event details" : "Task details"}</span></div>

                    <div style={st.fieldRow}>
                      <span style={st.pickLbl}>Status</span>
                      <div style={st.wrapRow}>
                        {STATUSES.map((s) => (
                          <button key={s} onClick={() => {
                            const next = editor.status === s ? null : s;
                            if (next === "Done") upd({ status: next, doneAt: editor.doneAt || new Date().toISOString(), archived: true });
                            else upd({ status: next, doneAt: editor.status === "Done" ? null : editor.doneAt, archived: editor.status === "Done" ? false : editor.archived });
                          }}
                            style={{ ...st.qChip, ...(editor.status === s ? st.numChipOn : {}) }}>
                            {s}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div style={st.fieldRow}>
                      <span style={st.pickLbl}>Queue</span>
                      <div style={st.wrapRow}>
                        {QUEUES.map((q) => (
                          <button key={q} onClick={() => upd({ queue: editor.queue === q ? null : q })}
                            style={{ ...st.qChip, ...(editor.queue === q ? { background: QUEUE_COLOR[q], borderColor: QUEUE_COLOR[q], color: C.ink, fontWeight: 600 } : {}) }}>
                            {q}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div style={st.fieldRow}>
                      <span style={st.pickLbl}>Priority</span>
                      <div style={st.wrapRow}>
                        {PRIORITIES.map((p) => {
                          const I = PRIORITY_ICONS[p.icon];
                          const on = editor.priority === p.v;
                          return (
                            <button key={p.v} onClick={() => upd({ priority: on ? null : p.v })}
                              style={{ ...st.qChip, ...(on ? { background: p.color, borderColor: p.color, color: C.ink, fontWeight: 600 } : {}) }}>
                              <I size={11} /> {p.name}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div style={st.fieldRow}>
                      <span style={st.pickLbl}>Effort</span>
                      <div style={st.wrapRow}>
                        {[1, 2, 3, 4, 5].map((e) => (
                          <button key={e} title={`Effort ${e} of 5`} onClick={() => upd({ effort: editor.effort === e ? null : e })}
                            style={{ ...st.numChip, ...(editor.effort === e ? st.numChipOn : {}) }}>{e}</button>
                        ))}
                      </div>
                    </div>

                    {editor.type !== "Event" && (
                      <>
                        <div style={st.fieldRow}>
                          <span style={st.pickLbl}>Suggested</span>
                          <DateTimeField value={editor.recommendedDate || ""} onChange={(v) => upd({ recommendedDate: v || null })} />
                        </div>
                        <div style={st.fieldRow}>
                          <span style={st.pickLbl}>Deadline</span>
                          <DateTimeField value={editor.deadline || ""} onChange={(v) => upd({ deadline: v || null })} />
                        </div>
                      </>
                    )}

                    <div style={st.fieldRow}>
                      <span style={st.pickLbl}>Assignees</span>
                      <div style={st.wrapRow}>
                        {contacts.map((c) => (
                          <button key={c.id} style={{ ...st.qChip, ...((editor.assignees || []).includes(c.id) ? st.numChipOn : {}) }}
                            onClick={() => upd({ assignees: (editor.assignees || []).includes(c.id)
                              ? editor.assignees.filter((a) => a !== c.id) : [...(editor.assignees || []), c.id] })}>
                            {c.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* checklist — lives inside the Task modal */}
                {tab === "task" && editor.type === "Task" && (
                  <div style={st.taskBox}>
                    <div style={st.sectionHead}><CheckSquare size={13} color={C.warn} /><span>Checklist</span>
                      {(editor.checklist || []).length > 0 && (
                        <span style={st.ct}>{(editor.checklist || []).filter((c) => c.done).length}/{editor.checklist.length}</span>
                      )}
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                      {(editor.checklist || []).map((c) => (
                        <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <button style={{ ...st.qChip, padding: 4, ...(c.done ? { background: C.personal, borderColor: C.personal } : {}) }}
                            onClick={() => toggleChecklistItem(c.id)}>
                            <Check size={11} color={c.done ? C.ink : "transparent"} />
                          </button>
                          <span style={{ flex: 1, ...rtl(c.text), textDecoration: c.done ? "line-through" : "none", color: c.done ? C.dimmer : C.text, fontSize: 13 }}>
                            {c.text}
                          </span>
                          <button style={st.ghost} onClick={() => removeChecklistItem(c.id)}><X size={11} /></button>
                        </div>
                      ))}
                    </div>
                    <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
                      <input style={st.textIn} placeholder="Add a checklist item" value={newChecklistItem}
                        onChange={(e) => setNewChecklistItem(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") addChecklistItem(); }} />
                      <button style={st.okBtn} onClick={addChecklistItem}><Plus size={12} /></button>
                    </div>
                  </div>
                )}

                {/* pay */}
                {tab === "pay" && editor.type === "Pay" && (
                  <div style={st.taskBox}>
                    <div style={st.sectionHead}><CreditCard size={13} color={C.warn} /><span>Pay details</span></div>
                    <div style={st.fieldRow}>
                      <span style={st.pickLbl}>Suggested</span>
                      <DateTimeField value={editor.recommendedDate || ""} onChange={(v) => upd({ recommendedDate: v || null })} />
                    </div>
                    <div style={st.fieldRow}>
                      <span style={st.pickLbl}>Deadline</span>
                      <DateTimeField value={editor.deadline || ""} onChange={(v) => upd({ deadline: v || null })} />
                    </div>
                  </div>
                )}

                {/* discover */}
                {tab === "routine" && editor.type === "Routine" && (
                  <div style={st.taskBox}>
                    <div style={st.sectionHead}><Repeat size={13} color={C.warn} /><span>Routine</span></div>
                    <div style={st.fieldRow}>
                      <span style={st.pickLbl}>Kind</span>
                      <div style={st.wrapRow}>
                        {routineKinds.map((d) => (
                          <button key={d} onClick={() => upd({ routineKind: editor.routineKind === d ? null : d })}
                            style={{ ...st.qChip, ...(editor.routineKind === d ? st.numChipOn : {}) }}>{d}</button>
                        ))}
                      </div>
                    </div>
                    <div style={st.fieldRow}>
                      <span style={st.pickLbl}>Recurring</span>
                      <div style={{ display: "flex", flexDirection: "column", gap: 7, flex: 1 }}>
                        <div style={st.segRow}>
                          {["none", "repeat"].map((k) => (
                            <button key={k} style={{ ...st.seg, ...(((editor.routineRecurring && editor.routineRecurring.kind) || "none") === k ? st.segOn : {}) }}
                              onClick={() => upd({ routineRecurring: k === "none" ? null : { kind: "repeat", every: 1, unit: "week", at: "", daysOfWeek: [] } })}>
                              {k === "none" ? "None" : "Repeating"}
                            </button>
                          ))}
                        </div>
                        {editor.routineRecurring && (
                          <div style={{ display: "flex", gap: 7, alignItems: "center", flexWrap: "wrap" }}>
                            <span style={st.pickLbl}>Every</span>
                            <input type="number" min="1" style={{ ...st.dateIn, width: 62 }} value={editor.routineRecurring.every || 1}
                              onChange={(e) => upd({ routineRecurring: { ...editor.routineRecurring, every: Math.max(1, +e.target.value || 1) } })} />
                            <select style={st.sel} value={editor.routineRecurring.unit || "day"}
                              onChange={(e) => upd({ routineRecurring: { ...editor.routineRecurring, unit: e.target.value } })}>
                              {REPEAT_UNITS.map((u) => <option key={u} value={u}>{u}{(editor.routineRecurring.every || 1) > 1 ? "s" : ""}</option>)}
                            </select>
                          </div>
                        )}
                        {editor.routineRecurring && editor.routineRecurring.unit === "week" && (
                          <div style={{ display: "flex", gap: 4 }}>
                            {WEEKDAY_NAMES.map((wd, wi) => {
                              const on = (editor.routineRecurring.daysOfWeek || []).includes(wi);
                              return (
                                <button key={wi} type="button" style={{ ...st.qChip, padding: "4px 7px", ...(on ? st.numChipOn : {}) }}
                                  onClick={() => {
                                    const cur = editor.routineRecurring.daysOfWeek || [];
                                    upd({ routineRecurring: { ...editor.routineRecurring, daysOfWeek: on ? cur.filter((x) => x !== wi) : [...cur, wi].sort() } });
                                  }}>{wd[0]}</button>
                              );
                            })}
                          </div>
                        )}
                        {editor.routineRecurring && (
                          <div style={{ display: "flex", gap: 7, alignItems: "center" }}>
                            <span style={st.pickLbl}>from</span>
                            <DateTimeField value={editor.routineRecurring.at || ""} onChange={(v) => upd({ routineRecurring: { ...editor.routineRecurring, at: v } })} />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {tab === "discover" && editor.type === "Discover" && (
                  <div style={st.taskBox}>
                    <div style={st.sectionHead}><Compass size={13} color={C.warn} /><span>Discover</span></div>
                    <div style={st.fieldRow}>
                      <span style={st.pickLbl}>Kind</span>
                      <div style={st.wrapRow}>
                        {discoverClasses.map((d) => (
                          <button key={d} onClick={() => upd({ discoverClass: editor.discoverClass === d ? null : d })}
                            style={{ ...st.qChip, ...(editor.discoverClass === d ? st.numChipOn : {}) }}>{d}</button>
                        ))}
                      </div>
                    </div>
                    <div style={st.fieldRow}>
                      <span style={st.pickLbl}>Referrer</span>
                      <select style={st.sel} value={editor.referrer || ""} onChange={(e) => upd({ referrer: e.target.value || null })}>
                        <option value="">Nobody</option>
                        {contacts.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    </div>
                    <div style={st.fieldRow}>
                      <span style={st.pickLbl}>Queue</span>
                      <div style={st.wrapRow}>
                        {QUEUES.map((q) => (
                          <button key={q} onClick={() => upd({ queue: editor.queue === q ? null : q })}
                            style={{ ...st.qChip, ...(editor.queue === q ? { background: QUEUE_COLOR[q], borderColor: QUEUE_COLOR[q], color: C.ink, fontWeight: 600 } : {}) }}>
                            {q}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* relations */}
                {((tab === "task" && isTaskLike(editor.type)) || (tab === "event" && editor.type === "Event")) && (() => {
                  const self = noteById(editor.id) || {};
                  const RelRow = ({ icon, title, ids, kind, empty }) => (
                    <div style={st.fieldRow}>
                      <span style={st.pickLbl}>{title}</span>
                      <div style={st.wrapRow}>
                        {(ids || []).length === 0 && <span style={st.hint}>{empty}</span>}
                        {(ids || []).map((rid) => {
                          const rn = noteById(rid);
                          return (
                            <span key={rid} style={{ ...st.relPill, opacity: rn && rn.doneAt ? 0.55 : 1 }}
                              onClick={() => rn && openNote(rn)}>
                              {rn && rn.doneAt && <Check size={9} color={C.personal} />}
                              {icon}
                              <span style={rtl(noteLabel(rn))}>{noteLabel(rn)}</span>
                              <button style={st.pillX} onClick={(e) => { e.stopPropagation(); unlink(editor.id, rid, kind); }}><X size={9} /></button>
                            </span>
                          );
                        })}
                        <button style={st.relAdd} onClick={() => { const id = ensureSaved(); if (id) setRelPicker({ kind, from: id }); }}>
                          <Plus size={10} /> Link
                        </button>
                      </div>
                    </div>
                  );
                  const relCount = (self.blockers || []).length + (self.blocking || []).length +
                    (self.related || []).length + (self.children || []).length + (self.parent ? 1 : 0);
                  return (
                    <div style={st.relBox}>
                      <button style={st.collapseBtn} onClick={() => setRelationsOpen((o) => !o)}>
                        {relationsOpen ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
                        <Layers size={13} color={C.personal} /> Relations{relCount > 0 ? ` (${relCount})` : ""}
                      </button>
                      {relationsOpen && (
                        <>
                      <RelRow title="Blocked by" kind="blocker" ids={self.blockers} empty="Nothing blocking this"
                        icon={<Ban size={9} color={C.danger} />} />
                      <RelRow title="Waiting on this" kind="blocking" ids={self.blocking} empty="Nothing waiting"
                        icon={<Clock size={9} color={C.warn} />} />
                      <RelRow title="Related" kind="related" ids={self.related} empty="No related notes"
                        icon={<Layers size={9} color={C.work} />} />
                      <div style={st.fieldRow}>
                        <span style={st.pickLbl}>Parent</span>
                        <div style={st.wrapRow}>
                          {self.parent ? (
                            <span style={st.relPill} onClick={() => openNote(noteById(self.parent))}>
                              <ChevronUp size={9} color={C.dim} />
                              <span style={rtl(noteLabel(noteById(self.parent)))}>{noteLabel(noteById(self.parent))}</span>
                              <button style={st.pillX} onClick={(e) => { e.stopPropagation(); unlink(editor.id, self.parent, "parent"); }}><X size={9} /></button>
                            </span>
                          ) : (
                            <button style={st.relAdd} onClick={() => { const id = ensureSaved(); if (id) setRelPicker({ kind: "parent", from: id }); }}>
                              <Plus size={10} /> Set parent
                            </button>
                          )}
                        </div>
                      </div>
                      <div>
                        <div style={st.fieldRow}>
                          <span style={st.pickLbl}>Subtasks</span>
                          <button style={st.relAdd} onClick={() => { const id = ensureSaved(); if (id) setRelPicker({ kind: "child", from: id }); }}>
                            <Plus size={10} /> Add subtask
                          </button>
                        </div>
                        {(self.children || []).length > 0 && (
                          <div style={st.subList}>
                            {self.children.map((cid) => {
                              const cn = noteById(cid);
                              if (!cn) return null;
                              return (
                                <div key={cid} style={st.subRowItem}>
                                  <button style={{ ...st.subCheck, ...(cn.doneAt ? st.subCheckOn : {}) }}
                                    title={cn.doneAt ? "Reopen" : "Mark done"}
                                    onClick={() => (cn.doneAt ? restoreNote(cid) : markDone(cid))}>
                                    {cn.doneAt && <Check size={10} color={C.ink} />}
                                  </button>
                                  <span style={{ flex: 1, textDecoration: cn.doneAt ? "line-through" : "none",
                                    color: cn.doneAt ? C.dimmer : C.text, cursor: "pointer", ...rtl(noteLabel(cn)) }}
                                    onClick={() => openNote(cn)}>{noteLabel(cn)}</span>
                                  {cn.priority && (() => {
                                    const pp = PRIORITIES.find((x) => x.v === cn.priority);
                                    if (!pp) return null;
                                    const PI = PRIORITY_ICONS[pp.icon];
                                    return <span style={{ ...st.chip, color: pp.color }}><PI size={9} /></span>;
                                  })()}
                                  <button style={st.pillX} onClick={() => unlink(editor.id, cid, "child")}><X size={9} /></button>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                      </>
                      )}
                    </div>
                  );
                })()}

                {tab === "filing" && (
                <div style={st.typePickRow}>
                  <span style={st.pickLbl}>Type</span>
                  {types.map((t) => {
                    const I = ICONS[t.icon] || FileText;
                    const on = editor.type === t.name;
                    return (
                      <button key={t.name} title={t.name}
                        style={{ ...st.typePick, ...(on ? st.typePickOn : {}) }}
                        onClick={() => upd({ type: on ? null : t.name, proposedType: null })}>
                        <I size={12} /> {t.name}
                      </button>
                    );
                  })}
                </div>

                )}
          </div>
        </div>
      )}

      {confirmState && (
        <div ref={confirmRef} style={{
          position: "fixed", left: confirmState.x, ...(confirmState.upward ? { bottom: window.innerHeight - confirmState.y } : { top: confirmState.y }),
          width: 260, background: C.surface, border: `1px solid ${C.line}`, borderRadius: 10,
          padding: 12, boxShadow: "0 8px 24px rgba(0,0,0,0.4)", zIndex: 400, display: "flex", flexDirection: "column", gap: 10,
        }}>
          <p style={{ margin: 0, fontSize: 12.5, color: C.text, lineHeight: 1.45 }}>{confirmState.message}</p>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button style={{ ...st.ghost, padding: "6px 12px", border: `1px solid ${C.line}`, borderRadius: 7 }}
              onClick={() => setConfirmState(null)}>Cancel</button>
            <button style={{ display: "flex", alignItems: "center", gap: 5, background: C.danger, color: C.ink,
              border: "none", borderRadius: 7, padding: "6px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}
              onClick={() => { const fn = confirmState.onConfirm; setConfirmState(null); fn && fn(); }}>
              <Trash2 size={12} /> Delete
            </button>
          </div>
        </div>
      )}

      {relPicker && (() => {
        const self = noteById(relPicker.from) || {};
        const taken = new Set([relPicker.from, ...(self.blockers || []), ...(self.blocking || []),
          ...(self.related || []), ...(self.children || []), self.parent].filter(Boolean));
        const q = relQuery.trim().toLowerCase();
        const options = notes
          .filter((n) => !taken.has(n.id))
          .filter((n) => !q || (n.title || "").toLowerCase().includes(q) || n.content.toLowerCase().includes(q))
          .slice(0, 60);
        const titles = { blocker: "Blocked by which note?", blocking: "What is waiting on this?",
          related: "Relate to which note?", parent: "Which note is the parent?", child: "Add which note as a subtask?" };
        return (
          <div style={{ ...st.overlay, zIndex: 60 }} onMouseDown={overlayMouseDown} onClick={overlayClickClose(() => setRelPicker(null))}>
            <div style={st.modal} onClick={(e) => e.stopPropagation()}>
              <div style={st.modalHead}>
                <h2 style={st.modalTitle}>{titles[relPicker.kind]}</h2>
                <button style={st.ghost} onClick={() => setRelPicker(null)}><X size={15} /></button>
              </div>
              <input autoFocus style={st.textIn} placeholder="Search your notes" value={relQuery}
                onChange={(e) => setRelQuery(e.target.value)} />
              <div style={{ maxHeight: "50vh", overflowY: "auto", display: "flex", flexDirection: "column", gap: 6 }}>
                {options.length === 0 && <p style={st.hint}>No other notes match.</p>}
                {options.map((n) => {
                  const t = typeOf(n.type);
                  return (
                    <div key={n.id} className="lbl" style={st.relOption}
                      onClick={() => { link(relPicker.from, n.id, relPicker.kind); setRelPicker(null); setRelQuery(""); }}>
                      {t && <TypeIcon name={n.type} size={12} color={C.dimmer} />}
                      <span style={{ flex: 1, ...rtl(noteLabel(n)) }}>{noteLabel(n)}</span>
                      {n.doneAt && <Check size={11} color={C.personal} />}
                      {n.domain && <span style={{ ...st.chip, color: DOMAIN_STYLE[n.domain].fg }}>{n.domain}</span>}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        );
      })()}

      {mapOpen && (
        <div style={{ ...st.overlay, zIndex: 60 }} onMouseDown={overlayMouseDown} onClick={overlayClickClose(() => { setMapOpen(false); setMapTarget(null); })}>
          <div style={{ ...st.modal, width: 470 }} onClick={(e) => e.stopPropagation()}>
            <h2 style={st.modalTitle}>{mapTarget ? "Set place location" : "Pick a place"}</h2>
            <MapPicker onChange={setMapDraft} initial={mapSeed} />
            <input style={st.textIn} placeholder={mapTarget === "new" ? "Place name (required)" : "Name this place (optional)"}
              value={mapName} onChange={(e) => setMapName(e.target.value)} />
            <div style={st.foot}>
              <button style={st.noBtn} onClick={() => { setMapOpen(false); setMapTarget(null); }}>Cancel</button>
              <button style={st.primaryBtn} onClick={savePlaceFromMap}
                disabled={mapTarget === "new" && !mapName.trim()}>
                <MapPin size={12} /> {mapTarget ? "Save" : "Use this place"}
              </button>
            </div>
          </div>
        </div>
      )}

      {cloudOpen && (
        <div style={st.overlay} onMouseDown={overlayMouseDown} onClick={overlayClickClose(() => setCloudOpen(false))}>
          <div style={st.modal} onClick={(e) => e.stopPropagation()}>
            <div style={st.modalHead}>
              <h2 style={st.modalTitle}>Sync &amp; backup</h2>
              <button style={st.ghost} onClick={() => setCloudOpen(false)}><X size={15} /></button>
            </div>

            <div style={st.cloudState}>
              <Cloud size={15} color={session ? C.personal : C.dimmer} />
              <span style={{ flex: 1 }}>
                {session ? <>Synced as <strong>{session.user.email}</strong></>
                  : cloud ? "Project connected — not signed in yet"
                  : "Notes are saved on this device only"}
              </span>
            </div>

            {cloudMsg && (
              <div style={{ ...st.cloudMsg, color: cloudMsg.bad ? C.danger : C.personal,
                borderColor: (cloudMsg.bad ? C.danger : C.personal) + "55" }}>
                {cloudMsg.text}
              </div>
            )}

            {!session && (
              <>
                <h3 style={st.subHead}>Sign in</h3>
                <p style={st.hint}>No password. We email you a link — tap it and you're in.</p>
                <div style={{ display: "flex", gap: 8 }}>
                  <input style={st.textIn} type="email" placeholder="you@example.com" value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && sendMagicLink()} />
                  <button style={st.okBtn} onClick={sendMagicLink} disabled={cloudBusy}>
                    {cloudBusy ? <Loader2 size={12} className="spin" /> : <Check size={12} />} Send link
                  </button>
                </div>

                {!cloud && (
                  <>
                    <h3 style={{ ...st.subHead, marginTop: 10 }}>Connect a project</h3>
                    <p style={st.hint}>Only needed if this copy of Shift has no project built in.</p>
                    <input style={st.textIn} placeholder="Project URL" value={cloudForm.url}
                      onChange={(e) => setCloudForm((f) => ({ ...f, url: e.target.value }))} />
                    <input style={st.textIn} placeholder="Publishable key" value={cloudForm.key}
                      onChange={(e) => setCloudForm((f) => ({ ...f, key: e.target.value }))} />
                    <button style={st.primaryBtn} onClick={saveCloudConfig} disabled={cloudBusy}>
                      <Cloud size={13} /> Connect
                    </button>
                  </>
                )}
              </>
            )}

            {session && (
              <>
                <p style={st.hint}>
                  Every change saves to this device first, then to your project. Sign in on another
                  device with the same email and your notes follow you.
                </p>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button style={st.primaryBtn} onClick={pushEverything} disabled={cloudBusy}>
                    {cloudBusy ? <Loader2 size={13} className="spin" /> : <Cloud size={13} />} Upload everything now
                  </button>
                  <button style={st.noBtn} onClick={signOutCloud}>Sign out</button>
                </div>
              </>
            )}

            <h3 style={{ ...st.subHead, marginTop: 10 }}>Backup file</h3>
            <p style={st.hint}>A copy of everything you can keep anywhere. Works with or without sync.</p>
            <button style={st.secBtn} onClick={exportBackup}>Download backup (.json)</button>
            <button style={{ ...st.secBtn, marginTop: 8 }} onClick={exportCsv}>Export notes (.csv — List view columns)</button>
            <label style={{ ...st.secBtn, marginTop: 8, display: "inline-flex", cursor: "pointer" }}>
              Import notes (.csv)
              <input type="file" accept=".csv" style={{ display: "none" }}
                onChange={(e) => { if (e.target.files[0]) importCsv(e.target.files[0]); e.target.value = ""; }} />
            </label>
          </div>
        </div>
      )}

      {settingsOpen && (
        <div style={st.overlay} onMouseDown={overlayMouseDown} onClick={overlayClickClose(() => setSettingsOpen(false))}>
          <div style={st.modal} onClick={(e) => e.stopPropagation()}>
            <div style={st.modalHead}><h2 style={st.modalTitle}>Types &amp; categories</h2>
              <button style={st.ghost} onClick={() => setSettingsOpen(false)}><X size={15} /></button></div>

            <h3 style={st.subHead}>Types</h3>
            <p style={st.hint}>Fixed set, not editable — each note gets one of these. Toggle visibility from the sidebar.</p>
            <div style={st.wrapRow}>
              {types.map((t) => (
                <span key={t.name} style={{ ...st.itemChip, opacity: t.active === false ? 0.5 : 1 }}>
                  <TypeIcon name={t.name} size={13} color={C.text} />
                  <span>{t.name}</span>
                </span>
              ))}
            </div>

            <div style={{ marginTop: 18 }}>
              <h3 style={st.subHead}>Labels</h3>
              <p style={st.hint}>Reorder, recolour by clicking the swatch, or remove.</p>
              <div style={{ ...st.wrapRow, marginTop: 8 }}>
                {labels.length === 0 && <p style={st.hint}>No labels yet — add them from a note.</p>}
                {labels.map((l, i) => (
                  <span key={l.name} style={{ ...st.itemChip, opacity: l.active === false ? 0.5 : 1 }} {...dragHandlers("labels", i, setLabels, labels)}>
                    <span style={st.dragHandle} title="Drag to reorder">⠿</span>
                    <button style={{ ...st.swatch, width: 12, height: 12, background: l.color, border: "none" }}
                      title="Change colour" onClick={() => cycleLabelColor(l.name)} />
                    {renaming && renaming.list === "labels" && renaming.index === i ? (
                      <input autoFocus style={st.renameIn} value={renaming.value}
                        onChange={(e) => setRenaming({ list: "labels", index: i, value: e.target.value })}
                        onBlur={() => { const v = renaming.value.trim() || l.name; renameLabelEverywhere(l.name, v); setLabels((p) => p.map((x, xi) => (xi === i ? { ...x, name: v } : x))); setRenaming(null); }}
                        onKeyDown={(e) => { if (e.key === "Enter") e.target.blur(); if (e.key === "Escape") setRenaming(null); }} />
                    ) : (
                      <span onClick={() => setRenaming({ list: "labels", index: i, value: l.name })} style={{ cursor: "text" }}>{l.name}</span>
                    )}
                    <button style={st.pillX} title="Remove label"
                      onClick={(e) => confirmAction(e, `Remove label "${l.name}" from all notes?`, () => {
                        setLabels((p) => p.filter((x) => x.name !== l.name));
                        setNotes((p) => p.map((n) => ({ ...n, labels: (n.labels || []).filter((x) => x !== l.name) })));
                      })}><X size={9} /></button>
                  </span>
                ))}
              </div>
            </div>

            <div style={{ marginTop: 18 }}>
              <h3 style={st.subHead}>Discover kinds</h3>
              <div style={{ ...st.wrapRow, marginTop: 8 }}>
                {discoverClasses.map((d, i) => (
                  <span key={d} style={st.itemChip} {...dragHandlers("discover", i, setDiscoverClasses, discoverClasses)}>
                    <span style={st.dragHandle} title="Drag to reorder">⠿</span>
                    {renaming && renaming.list === "discover" && renaming.index === i ? (
                      <input autoFocus style={st.renameIn} value={renaming.value}
                        onChange={(e) => setRenaming({ list: "discover", index: i, value: e.target.value })}
                        onBlur={() => { const v = renaming.value.trim() || d; renameDiscoverEverywhere(d, v); setDiscoverClasses((p) => p.map((x, xi) => (xi === i ? v : x))); setRenaming(null); }}
                        onKeyDown={(e) => { if (e.key === "Enter") e.target.blur(); if (e.key === "Escape") setRenaming(null); }} />
                    ) : (
                      <span onClick={() => setRenaming({ list: "discover", index: i, value: d })} style={{ cursor: "text" }}>{d}</span>
                    )}
                    <button style={st.pillX} onClick={(e) => confirmAction(e, `Remove discover kind "${d}"?`, () => setDiscoverClasses((p) => p.filter((x) => x !== d)))}><X size={9} /></button>
                  </span>
                ))}
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 9 }}>
                <input style={st.textIn} placeholder="New kind, e.g. Album" value={newDiscover}
                  onChange={(e) => setNewDiscover(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && newDiscover.trim() && !discoverClasses.includes(newDiscover.trim())) { setDiscoverClasses((p) => [...p, newDiscover.trim()]); setNewDiscover(""); } }} />
                <button style={st.okBtn} onClick={() => { if (newDiscover.trim() && !discoverClasses.includes(newDiscover.trim())) { setDiscoverClasses((p) => [...p, newDiscover.trim()]); setNewDiscover(""); } }}>Add</button>
              </div>
            </div>

            <div style={{ marginTop: 18 }}>
              <h3 style={st.subHead}>Routine kinds</h3>
              <div style={{ ...st.wrapRow, marginTop: 8 }}>
                {routineKinds.map((d, i) => (
                  <span key={d} style={st.itemChip} {...dragHandlers("routineKinds", i, setRoutineKinds, routineKinds)}>
                    <span style={st.dragHandle} title="Drag to reorder">⠿</span>
                    {renaming && renaming.list === "routineKinds" && renaming.index === i ? (
                      <input autoFocus style={st.renameIn} value={renaming.value}
                        onChange={(e) => setRenaming({ list: "routineKinds", index: i, value: e.target.value })}
                        onBlur={() => {
                          const v = renaming.value.trim() || d;
                          setNotes((p) => p.map((n) => (n.routineKind === d ? { ...n, routineKind: v } : n)));
                          setRoutineKinds((p) => p.map((x, xi) => (xi === i ? v : x)));
                          setRenaming(null);
                        }}
                        onKeyDown={(e) => { if (e.key === "Enter") e.target.blur(); if (e.key === "Escape") setRenaming(null); }} />
                    ) : (
                      <span onClick={() => setRenaming({ list: "routineKinds", index: i, value: d })} style={{ cursor: "text" }}>{d}</span>
                    )}
                    <button style={st.pillX} onClick={(e) => confirmAction(e, `Remove routine kind "${d}"?`, () => setRoutineKinds((p) => p.filter((x) => x !== d)))}><X size={9} /></button>
                  </span>
                ))}
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 9 }}>
                <input style={st.textIn} placeholder="New kind, e.g. Grow" value={newRoutineKind}
                  onChange={(e) => setNewRoutineKind(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && newRoutineKind.trim() && !routineKinds.includes(newRoutineKind.trim())) { setRoutineKinds((p) => [...p, newRoutineKind.trim()]); setNewRoutineKind(""); } }} />
                <button style={st.okBtn} onClick={() => { if (newRoutineKind.trim() && !routineKinds.includes(newRoutineKind.trim())) { setRoutineKinds((p) => [...p, newRoutineKind.trim()]); setNewRoutineKind(""); } }}>Add</button>
              </div>
            </div>

            <div style={{ marginTop: 18 }}>
              <h3 style={st.subHead}>People groups</h3>
              <p style={st.hint}>Rename or remove a group across every person at once. Removing a group just ungroups its members - it never deletes people.</p>
              <div style={{ ...st.wrapRow, marginTop: 8 }}>
                {allGroupNames().length === 0 && <p style={st.hint}>No groups yet — add one below, or create one from a person's profile.</p>}
                {allGroupNames().map((g, i) => {
                  const memberCount = contacts.filter((c) => contactGroupNames(c).includes(g)).length;
                  return (
                    <span key={g} style={st.itemChip}>
                      <Users size={11} color={C.dimmer} />
                      {renaming && renaming.list === "peopleGroups" && renaming.index === i ? (
                        <input autoFocus style={st.renameIn} value={renaming.value}
                          onChange={(e) => setRenaming({ list: "peopleGroups", index: i, value: e.target.value })}
                          onBlur={() => { const v = renaming.value.trim() || g; renameGroupEverywhere(g, v); setRenaming(null); }}
                          onKeyDown={(e) => { if (e.key === "Enter") e.target.blur(); if (e.key === "Escape") setRenaming(null); }} />
                      ) : (
                        <span onClick={() => setRenaming({ list: "peopleGroups", index: i, value: g })} style={{ cursor: "text" }}>
                          {g} <span style={{ fontSize: 9, color: C.dimmer }}>({memberCount})</span>
                        </span>
                      )}
                      <button style={st.pillX} title="Remove group"
                        onClick={(e) => confirmAction(e, `Remove group "${g}"? Members will just become ungrouped.`, () => deleteGroupEverywhere(g))}><X size={9} /></button>
                    </span>
                  );
                })}
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 9 }}>
                <input style={st.textIn} placeholder="New group, e.g. Family" value={newPeopleGroup}
                  onChange={(e) => setNewPeopleGroup(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && newPeopleGroup.trim() && !allGroupNames().includes(newPeopleGroup.trim())) { setPeopleGroups((p) => [...p, newPeopleGroup.trim()]); setNewPeopleGroup(""); } }} />
                <button style={st.okBtn} onClick={() => { if (newPeopleGroup.trim() && !allGroupNames().includes(newPeopleGroup.trim())) { setPeopleGroups((p) => [...p, newPeopleGroup.trim()]); setNewPeopleGroup(""); } }}>Add</button>
              </div>
            </div>

            <div style={{ marginTop: 18 }}>
              <h3 style={st.subHead}>Custom triggers</h3>
              <p style={st.hint}>Conditions that aren't a date or a place — "when I get home", "next time I shop".</p>
              <div style={{ ...st.wrapRow, marginTop: 8 }}>
                {customTriggers.length === 0 && <p style={st.hint}>None yet.</p>}
                {customTriggers.map((c, i) => (
                  <span key={c} style={st.itemChip} {...dragHandlers("triggers", i, setCustomTriggers, customTriggers)}>
                    <span style={st.dragHandle} title="Drag to reorder">⠿</span>
                    <Zap size={11} color={C.warn} />
                    {renaming && renaming.list === "triggers" && renaming.index === i ? (
                      <input autoFocus style={st.renameIn} value={renaming.value}
                        onChange={(e) => setRenaming({ list: "triggers", index: i, value: e.target.value })}
                        onBlur={() => { const v = renaming.value.trim() || c; setCustomTriggers((p2) => p2.map((x, xi) => (xi === i ? v : x))); setRenaming(null); }}
                        onKeyDown={(e) => { if (e.key === "Enter") e.target.blur(); if (e.key === "Escape") setRenaming(null); }} />
                    ) : (
                      <span onClick={() => setRenaming({ list: "triggers", index: i, value: c })} style={{ cursor: "text" }}>{c}</span>
                    )}
                    <button style={st.pillX} onClick={(e) => confirmAction(e, `Remove custom trigger "${c}"?`, () => setCustomTriggers((p2) => p2.filter((x) => x !== c)))}><X size={9} /></button>
                  </span>
                ))}
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 9 }}>
                <input style={st.textIn} placeholder="New trigger condition" value={newTrigger}
                  onChange={(e) => setNewTrigger(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && newTrigger.trim() && !customTriggers.includes(newTrigger.trim())) { setCustomTriggers((p2) => [...p2, newTrigger.trim()]); setNewTrigger(""); } }} />
                <button style={st.okBtn} onClick={() => { if (newTrigger.trim() && !customTriggers.includes(newTrigger.trim())) { setCustomTriggers((p2) => [...p2, newTrigger.trim()]); setNewTrigger(""); } }}>Add</button>
              </div>

              <h3 style={{ ...st.subHead, marginTop: 16 }}>Saved places</h3>
              <p style={st.hint}>Name is required; location is optional — set it on a map if you like.</p>
              <div style={{ ...st.wrapRow, marginTop: 8 }}>
                {places.length === 0 && <p style={st.hint}>None saved yet.</p>}
                {places.map((p, i) => (
                  <span key={p.id} style={st.itemChip} {...dragHandlers("places", i, setPlaces, places)}>
                    <span style={st.dragHandle} title="Drag to reorder">⠿</span>
                    <MapPin size={11} color={p.lat != null ? C.personal : C.dimmer} />
                    {renaming && renaming.list === "places" && renaming.index === i ? (
                      <input autoFocus style={st.renameIn} value={renaming.value}
                        onChange={(e) => setRenaming({ list: "places", index: i, value: e.target.value })}
                        onBlur={() => { const v = renaming.value.trim() || p.name; setPlaces((x) => x.map((y, yi) => (yi === i ? { ...y, name: v } : y))); setRenaming(null); }}
                        onKeyDown={(e) => { if (e.key === "Enter") e.target.blur(); if (e.key === "Escape") setRenaming(null); }} />
                    ) : (
                      <span onClick={() => setRenaming({ list: "places", index: i, value: p.name })} style={{ cursor: "text" }}>{p.name}</span>
                    )}
                    <button style={st.ghost} title={p.lat != null ? "Change location" : "Set location on map"}
                      onClick={() => { setMapTarget(p.id); const seed = p.lat != null ? { lat: p.lat, lng: p.lng } : null; setMapSeed(seed); setMapDraft(seed); setMapName(""); setMapOpen(true); }}>
                      <Crosshair size={11} />
                    </button>
                    {p.lat != null && (
                      <button style={st.ghost} title="Clear location" onClick={() => setPlaces((x) => x.map((y) => (y.id === p.id ? { ...y, lat: undefined, lng: undefined } : y)))}>
                        <X size={9} />
                      </button>
                    )}
                    <button style={st.pillX} title="Remove place" onClick={(e) => confirmAction(e, `Remove place "${p.name}"?`, () => setPlaces((x) => x.filter((y) => y.id !== p.id)))}><X size={9} /></button>
                  </span>
                ))}
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 9 }}>
                <input style={st.textIn} placeholder="New place name" value={newPlace}
                  onChange={(e) => setNewPlace(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && newPlace.trim()) { setPlaces((p) => [...p, { id: uid(), name: newPlace.trim() }]); setNewPlace(""); } }} />
                <button style={st.okBtn} onClick={() => { if (newPlace.trim()) { setPlaces((p) => [...p, { id: uid(), name: newPlace.trim() }]); setNewPlace(""); } }}>Add</button>
                <button style={st.secBtn} title="Add a place by picking it on a map"
                  onClick={() => { setMapTarget("new"); setMapSeed(null); setMapDraft(null); setMapName(newPlace.trim()); setNewPlace(""); setMapOpen(true); }}>
                  <MapPin size={12} /> Add via map
                </button>
              </div>

              <h3 style={{ ...st.subHead, marginTop: 16 }}>Notifications</h3>
              <p style={st.hint}>
                {notifPerm === "granted"
                  ? "Enabled. Reminders fire while Shift is open or running in the background on this device."
                  : notifPerm === "denied"
                  ? "Blocked by the browser. Re-enable it for this site in your browser or phone settings."
                  : "Off. Turn on to get a notification when a reminder is due."}
              </p>
              <p style={{ ...st.hint, marginTop: -4 }}>
                Honest limit: this checks reminders while the app is open, installed, or briefly woken by the
                browser — not a guaranteed OS alarm if the phone has fully closed it. Good for daily use; don't
                rely on it for anything truly time-critical.
              </p>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {notifPerm !== "granted" && (
                  <button style={st.okBtn} onClick={requestNotifPermission}><Bell size={12} /> Turn on notifications</button>
                )}
                <button style={st.secBtn} onClick={sendTestNotification} disabled={notifPerm !== "granted"}>
                  Send test notification
                </button>
              </div>

              <h3 style={{ ...st.subHead, marginTop: 16 }}>Claude's memory</h3>
              <p style={st.hint}>
                When you correct or teach Claude through the connector, it remembers here — synced with everything
                else, so it's the same list on every device. Claude can add to this; only you can remove from it.
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 7, marginTop: 8 }}>
                {claudeMemory.length === 0 && <p style={st.hint}>Nothing remembered yet.</p>}
                {[...claudeMemory].reverse().map((m) => (
                  <div key={m.id} style={st.lesson}>
                    <span style={{ flex: 1, ...rtl(m.text) }}>{m.text}</span>
                    <button style={st.ghost} onClick={() => setClaudeMemory((p) => p.filter((x) => x.id !== m.id))}><X size={11} /></button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------------- styles ---------------- */

const st = {
  app: { display: "flex", height: "100vh", width: "100%", background: C.ink, color: C.text,
    fontFamily: "'Inter', system-ui, sans-serif", fontSize: 14 },

  side: { width: 246, minWidth: 246, background: C.surface, borderRight: `1px solid ${C.lineSoft}`,
    display: "flex", flexDirection: "column", padding: "20px 14px" },
  brand: { display: "flex", alignItems: "center", gap: 8 },
  mark: { color: C.personal, fontSize: 13 },
  brandName: { fontSize: 19, fontWeight: 700, letterSpacing: -0.3 },
  tagline: { fontSize: 12, color: C.dimmer, margin: "3px 0 16px 0" },
  newBtn: { display: "flex", alignItems: "center", justifyContent: "center", gap: 6, background: C.personal,
    color: C.ink, border: "none", borderRadius: 9, padding: "9px 12px", fontSize: 13, fontWeight: 600, cursor: "pointer" },
  fileBanner: { display: "flex", alignItems: "center", gap: 7, background: "rgba(224,179,65,0.10)", color: C.warn,
    border: "1px solid rgba(224,179,65,0.25)", borderRadius: 9, padding: "8px 10px", fontSize: 12, cursor: "pointer", marginTop: 8 },
  suggestBanner: { display: "flex", alignItems: "center", gap: 7, background: C.raised, color: C.dim,
    border: `1px solid ${C.line}`, borderRadius: 9, padding: "7px 10px", fontSize: 12, cursor: "pointer", marginTop: 8 },
  nav: { flex: 1, overflowY: "auto", marginTop: 18, marginRight: -6, paddingRight: 4 },
  navRow: { display: "flex", alignItems: "center", gap: 9, padding: "7px 9px", borderRadius: 7, cursor: "pointer", fontSize: 13 },
  subRow: { display: "flex", alignItems: "center", gap: 9, padding: "6px 9px 6px 22px", borderRadius: 7, cursor: "pointer", fontSize: 12.5, color: C.dim },
  navLbl: { flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  ct: { fontSize: 11, color: C.dimmer },
  emoji: { fontSize: 12, width: 15, textAlign: "center" },
  swatch: { width: 9, height: 9, borderRadius: 3, flexShrink: 0, cursor: "pointer" },
  secHead: { fontSize: 11, color: C.dimmer, padding: "0 9px 6px" },
  footBtn: { display: "flex", alignItems: "center", gap: 7, background: "none", border: `1px solid ${C.line}`,
    borderRadius: 8, padding: "8px 10px", fontSize: 12, color: C.dim, cursor: "pointer", marginTop: 7 },

  main: { flex: 1, display: "flex", flexDirection: "column", minWidth: 0, width: "100%" },
  top: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap",
    padding: "12px 16px", borderBottom: `1px solid ${C.lineSoft}` },
  searchBox: { display: "flex", alignItems: "center", gap: 8, background: C.surface, border: `1px solid ${C.line}`,
    borderRadius: 9, padding: "8px 12px", width: 280, maxWidth: "100%", minWidth: 0 },
  searchIn: { border: "none", background: "transparent", fontSize: 13, width: "100%" },
  crumb: { fontSize: 13, color: C.dim },
  errBar: { display: "flex", alignItems: "center", gap: 9, background: "rgba(224,138,124,0.10)", color: C.danger,
    padding: "9px 22px", fontSize: 12.5, borderBottom: "1px solid rgba(224,138,124,0.2)" },
  grid: { flex: 1, overflowY: "auto", overflowX: "hidden", padding: "16px" },
  listTable: { width: "100%", borderCollapse: "collapse", fontSize: 12.5 },
  listTh: { textAlign: "left", padding: "8px 10px", borderBottom: `1px solid ${C.line}`, color: C.dim,
    fontWeight: 600, whiteSpace: "nowrap", userSelect: "none" },
  listTr: { cursor: "pointer", borderBottom: `1px solid ${C.line}` },
  listTd: { padding: "7px 10px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", color: C.text },
  boardCol: { minWidth: 220, width: 220, flexShrink: 0, background: C.raised, borderRadius: 10, padding: 8,
    maxHeight: "calc(100vh - 160px)", overflowY: "auto" },
  boardColHead: { display: "flex", alignItems: "center", gap: 6, padding: "4px 4px 8px" },
  boardCard: { background: C.surface, border: `1px solid ${C.line}`, borderRadius: 8, padding: 8, cursor: "grab" },
  empty: { display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", padding: "70px 20px", gap: 4 },
  emptyT: { fontSize: 16, fontWeight: 600, margin: "10px 0 0" },
  emptyB: { fontSize: 13, color: C.dimmer, margin: 0 },

  masonryRow: { display: "flex", gap: 14, alignItems: "flex-start" },
  masonryCol: { flex: 1, minWidth: 0, display: "flex", flexDirection: "column" },
  card: { position: "relative", overflow: "hidden", breakInside: "avoid", marginBottom: 16, borderRadius: 12,
    border: "1px solid", padding: "13px 14px", cursor: "pointer" },
  bigIcon: { position: "absolute", right: -6, bottom: -6, opacity: 0.13, pointerEvents: "none" },
  cardTop: { display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8, marginBottom: 8 },
  chips: { display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" },
  domChip: { display: "inline-flex", alignItems: "center", gap: 4, fontSize: 10.5, fontWeight: 600,
    border: "1px solid", borderRadius: 6, padding: "2px 7px" },
  chip: { display: "inline-flex", alignItems: "center", gap: 4, fontSize: 10.5, color: C.dim,
    background: "rgba(255,255,255,0.04)", borderRadius: 6, padding: "2px 7px" },
  cardTitle: { fontSize: 14.5, fontWeight: 600, margin: "0 0 5px", position: "relative" },
  cardBody: { fontSize: 12.5, lineHeight: 1.55, color: C.dim, margin: 0, whiteSpace: "pre-wrap", position: "relative" },
  trigPill: { display: "inline-flex", alignItems: "center", gap: 5, marginTop: 9, fontSize: 11,
    background: "rgba(255,255,255,0.05)", border: `1px solid ${C.line}`, borderRadius: 6, padding: "3px 8px", position: "relative" },
  labelPill: { display: "inline-flex", alignItems: "center", gap: 4, fontSize: 10.5, border: "1px solid",
    borderRadius: 20, padding: "2px 8px" },

  overlay: { position: "fixed", inset: 0, background: "rgba(8,11,14,0.72)", backdropFilter: "blur(3px)",
    display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, padding: 12 },
  overlayCloseBtn: { position: "fixed", top: "calc(env(safe-area-inset-top, 0px) + 14px)", right: 16, zIndex: 55,
    width: 34, height: 34, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
    background: "rgba(18,23,28,0.85)", border: `1px solid ${C.line}`, color: C.text, cursor: "pointer" },
  modal: { background: C.surface, border: `1px solid ${C.line}`, borderRadius: 14, width: 530, maxWidth: "96vw",
    maxHeight: "90vh", overflowY: "auto", overflowX: "hidden", padding: "16px 16px 18px", display: "flex", flexDirection: "column", gap: 11,
    boxShadow: "0 24px 70px rgba(0,0,0,0.5)" },
  modalHead: { display: "flex", alignItems: "center", justifyContent: "space-between" },
  modalTitle: { fontSize: 17, fontWeight: 600, margin: 0 },
  headBar: { display: "flex", alignItems: "center", gap: 6, marginBottom: 4 },
  headIconBtn: { display: "flex", alignItems: "center", justifyContent: "center", width: 28, height: 28,
    border: `1px solid ${C.line}`, borderRadius: 8, background: "transparent", color: C.dim, cursor: "pointer", flexShrink: 0 },
  mdBtn: { display: "flex", alignItems: "center", justifyContent: "center", width: 26, height: 26,
    border: `1px solid ${C.line}`, borderRadius: 6, background: C.raised, color: C.dim, cursor: "pointer" },
  moreIconRow: { display: "flex", gap: 4, flexWrap: "wrap", margin: "2px 0 4px" },
  morePopover: { position: "absolute", top: "calc(100% + 4px)", left: 0, zIndex: 20, minWidth: 240, maxWidth: 320,
    maxHeight: 280, overflowY: "auto", background: C.raised, border: `1px solid ${C.line}`, borderRadius: 10,
    padding: 10, boxShadow: "0 8px 24px rgba(0,0,0,0.4)" },
  moreDot: { position: "absolute", top: 3, right: 3, width: 5, height: 5, borderRadius: 3, background: C.personal },
  titleRow: { display: "flex", alignItems: "center", gap: 6 },
  titleIn: { flex: 1, border: "none", background: "transparent", fontSize: 17, fontWeight: 600, padding: "2px 0" },
  addTitle: { alignSelf: "flex-start", display: "flex", alignItems: "center", gap: 4, background: "none",
    border: `1px dashed ${C.line}`, borderRadius: 20, padding: "3px 10px", fontSize: 11, color: C.dimmer, cursor: "pointer" },
  contentIn: { border: "none", background: "transparent", fontSize: 13.5, lineHeight: 1.6, minHeight: 110, resize: "vertical" },
  drop: { display: "flex", flexDirection: "column", alignItems: "center", gap: 7, border: `1.5px dashed ${C.line}`,
    borderRadius: 10, padding: "20px 12px", fontSize: 12, color: C.dimmer, cursor: "pointer" },

  sectionBox: { background: C.raised, border: `1px solid ${C.line}`, borderRadius: 10, padding: "11px 13px",
    display: "flex", flexDirection: "column", gap: 8 },
  trigBox: { background: "rgba(224,179,65,0.06)", border: "1px solid rgba(224,179,65,0.22)", borderRadius: 10,
    padding: "11px 13px", display: "flex", flexDirection: "column", gap: 9 },
  teachBox: { background: "rgba(224,179,65,0.06)", border: "1px solid rgba(224,179,65,0.22)", borderRadius: 10,
    padding: "11px 13px", display: "flex", flexDirection: "column", gap: 8 },
  sectionHead: { display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, fontWeight: 600 },
  reason: { fontSize: 12, color: C.dimmer, lineHeight: 1.5, margin: 0, fontStyle: "italic" },
  pend: { display: "inline-flex", alignItems: "center", fontSize: 10, color: C.warn,
    background: "rgba(224,179,65,0.12)", borderRadius: 5, padding: "2px 6px" },
  link: { alignSelf: "flex-start", background: "none", border: "none", color: C.work, fontSize: 11.5,
    cursor: "pointer", padding: 0, textDecoration: "underline" },
  correct: { display: "flex", flexWrap: "wrap", gap: 7, alignItems: "center" },
  sel: { background: C.ink, border: `1px solid ${C.line}`, borderRadius: 7, padding: "6px 8px", fontSize: 12 },
  selActive: { borderColor: C.work, color: C.work },
  sugTitle: { fontSize: 13.5, fontWeight: 600, margin: 0 },
  sugBody: { fontSize: 12.5, lineHeight: 1.55, color: C.dim, margin: 0, whiteSpace: "pre-wrap" },
  teachIn: { background: C.ink, border: `1px solid ${C.line}`, borderRadius: 8, padding: "8px 10px",
    fontSize: 12.5, minHeight: 54, resize: "vertical" },

  segRow: { display: "flex", gap: 6 },
  seg: { display: "flex", alignItems: "center", gap: 5, background: "transparent", border: `1px solid ${C.line}`,
    borderRadius: 7, padding: "5px 11px", fontSize: 12, color: C.dim, cursor: "pointer" },
  segOn: { background: C.warn, borderColor: C.warn, color: C.ink, fontWeight: 600 },
  dateIn: { background: C.ink, border: `1px solid ${C.line}`, borderRadius: 8, padding: "8px 10px", fontSize: 12.5, colorScheme: "dark" },
  textIn: { flex: 1, background: C.ink, border: `1px solid ${C.line}`, borderRadius: 8, padding: "8px 10px", fontSize: 12.5 },
  mapBtn: { display: "flex", alignItems: "center", gap: 5, background: C.raised, border: `1px solid ${C.line}`,
    borderRadius: 8, padding: "8px 12px", fontSize: 12, color: C.dim, cursor: "pointer" },
  mapFrame: { position: "relative", overflow: "hidden", borderRadius: 10, border: `1px solid ${C.line}`,
    background: C.raised, cursor: "grab", userSelect: "none" },
  mapPin: { position: "absolute", left: "50%", top: "50%", transform: "translate(-50%,-100%)", pointerEvents: "none" },
  mapZoom: { position: "absolute", right: 8, top: 8, display: "flex", flexDirection: "column", gap: 4 },
  mapZoomBtn: { width: 26, height: 26, display: "flex", alignItems: "center", justifyContent: "center",
    background: C.surface, border: `1px solid ${C.line}`, borderRadius: 6, cursor: "pointer" },

  typePickRow: { display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" },
  pickLbl: { fontSize: 11, color: C.dimmer, marginRight: 2 },
  typePick: { display: "inline-flex", alignItems: "center", gap: 5, background: "transparent",
    border: `1px solid ${C.line}`, borderRadius: 7, padding: "4px 10px", fontSize: 11.5, color: C.dim, cursor: "pointer" },
  typePickOn: { background: "rgba(99,201,168,0.14)", borderColor: C.personal, color: C.personal, fontWeight: 600 },
  pendBtn: { display: "inline-flex", alignItems: "center", background: "none", border: "none", cursor: "pointer",
    color: C.warn, padding: 0, marginLeft: 4 },
  taskBox: { background: "rgba(224,179,65,0.06)", border: "1px solid rgba(224,179,65,0.22)", borderRadius: 10,
    padding: "11px 13px", display: "flex", flexDirection: "column", gap: 9 },
  remBox: { background: "rgba(124,160,232,0.06)", border: "1px solid rgba(124,160,232,0.22)", borderRadius: 10,
    padding: "11px 13px", display: "flex", flexDirection: "column", gap: 9 },
  fieldRow: { display: "flex", alignItems: "center", gap: 9, flexWrap: "wrap" },
  qChip: { display: "inline-flex", alignItems: "center", gap: 4, background: "transparent", border: `1px solid ${C.line}`,
    borderRadius: 6, padding: "4px 9px", fontSize: 11, color: C.dim, cursor: "pointer" },
  numChip: { minWidth: 28, background: "transparent", border: `1px solid ${C.line}`, borderRadius: 6,
    padding: "4px 8px", fontSize: 11, color: C.dim, cursor: "pointer" },
  numChipOn: { background: "rgba(99,201,168,0.16)", borderColor: C.personal, color: C.personal, fontWeight: 600 },
  collapseBtn: { display: "flex", alignItems: "center", gap: 5, background: "none", border: "none",
    color: C.dimmer, fontSize: 11.5, cursor: "pointer", padding: 0 },
  extraBoxEmpty: { display: "block", width: "100%", textAlign: "left", background: "transparent",
    border: `1px dashed ${C.line}`, borderRadius: 8, padding: "10px 12px", fontSize: 12.5, cursor: "pointer" },
  extraBoxFilled: { display: "block", width: "100%", textAlign: "left", background: C.raised,
    border: `1px solid ${C.line}`, borderRadius: 8, padding: "10px 12px", fontSize: 12.5, cursor: "pointer" },
  critBtn: { alignSelf: "flex-start", display: "flex", alignItems: "center", gap: 6, background: "transparent",
    border: `1px solid ${C.line}`, borderRadius: 7, padding: "5px 11px", fontSize: 11.5, color: C.dim, cursor: "pointer" },
  critOn: { background: "rgba(224,138,124,0.16)", borderColor: C.danger, color: C.danger, fontWeight: 600 },
  critChip: { display: "inline-flex", alignItems: "center", gap: 4, fontSize: 10.5, fontWeight: 700, color: C.danger,
    background: "rgba(224,138,124,0.15)", borderRadius: 6, padding: "2px 7px" },
  doneBtn: { display: "flex", alignItems: "center", gap: 6, background: "rgba(99,201,168,0.16)", color: C.personal,
    border: `1px solid ${C.personal}`, borderRadius: 8, padding: "8px 14px", fontSize: 12.5, fontWeight: 600, cursor: "pointer" },
  pillWrap: { display: "flex", flexWrap: "wrap", gap: 5, position: "relative" },
  groupHead: { display: "flex", alignItems: "center", gap: 6, fontSize: 11.5, color: C.dim, textTransform: "uppercase",
    letterSpacing: 0.4, margin: "4px 0 10px", paddingBottom: 6, borderBottom: `1px solid ${C.lineSoft}` },
  arrowBtn: { display: "flex", alignItems: "center", justifyContent: "center", width: 16, height: 16,
    background: "none", border: "none", color: C.dimmer, cursor: "pointer", padding: 0 },
  relBox: { background: "rgba(99,201,168,0.06)", border: "1px solid rgba(99,201,168,0.22)", borderRadius: 10,
    padding: "11px 13px", display: "flex", flexDirection: "column", gap: 9 },
  relPill: { display: "inline-flex", alignItems: "center", gap: 5, background: C.ink, border: `1px solid ${C.line}`,
    borderRadius: 20, padding: "3px 7px 3px 10px", fontSize: 11, cursor: "pointer", maxWidth: 230,
    overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" },
  relAdd: { display: "inline-flex", alignItems: "center", gap: 4, background: "none", border: `1px dashed ${C.line}`,
    borderRadius: 20, padding: "3px 10px", fontSize: 11, color: C.dimmer, cursor: "pointer" },
  relOption: { display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", borderRadius: 8,
    border: `1px solid ${C.line}`, background: C.raised, fontSize: 12.5, cursor: "pointer" },
  subList: { display: "flex", flexDirection: "column", gap: 5, marginTop: 7 },
  subRowItem: { display: "flex", alignItems: "center", gap: 8, background: C.ink, border: `1px solid ${C.line}`,
    borderRadius: 8, padding: "6px 9px", fontSize: 12 },
  subCheck: { width: 15, height: 15, borderRadius: 4, border: `1px solid ${C.line}`, background: "transparent",
    cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, padding: 0 },
  subCheckOn: { background: C.personal, borderColor: C.personal },
  viewRow: { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 5, margin: "10px 0 4px" },
  viewBtn: { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4,
    background: C.raised, border: `1px solid ${C.line}`, borderRadius: 8, padding: "8px 3px", color: C.dim,
    cursor: "pointer", minWidth: 0, overflow: "hidden", lineHeight: 1.1 },
  viewBtnOn: { background: "rgba(99,201,168,0.14)", borderColor: C.personal, color: C.personal },
  calHead: { display: "flex", alignItems: "center", gap: 8, marginBottom: 14, flexWrap: "wrap" },
  agendaDay: { border: "1px solid", borderRadius: 10, background: C.surface, padding: "9px 11px",
    display: "flex", flexDirection: "column", gap: 6 },
  agendaHead: { display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 12.5 },
  scrim: { position: "fixed", inset: 0, background: "rgba(8,11,14,0.6)", zIndex: 39 },
  hamburger: { display: "flex", alignItems: "center", justifyContent: "center", width: 34, height: 34,
    background: C.surface, border: `1px solid ${C.line}`, borderRadius: 9, color: C.dim, cursor: "pointer", flexShrink: 0 },
  calGrid: { display: "grid", gridTemplateColumns: "repeat(7, minmax(0, 1fr))", gap: 6 },
  calDow: { fontSize: 10.5, color: C.dimmer, textAlign: "center", paddingBottom: 4, textTransform: "uppercase", letterSpacing: 0.4 },
  calCell: { minHeight: 92, minWidth: 0, border: "1px solid", borderRadius: 8, background: C.surface, padding: 6,
    display: "flex", flexDirection: "column", gap: 3, overflow: "hidden" },
  calNum: { fontSize: 11, fontWeight: 600 },
  calItem: { fontSize: 10, color: C.dim, background: C.raised, borderRadius: 4, padding: "2px 5px",
    cursor: "pointer", overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" },
  listCol: { display: "flex", flexDirection: "column", gap: 6 },
  listRow: { display: "flex", alignItems: "center", gap: 8, background: C.surface, border: `1px solid ${C.line}`,
    borderRadius: 8, padding: "8px 11px", fontSize: 12.5, cursor: "pointer" },
  mapMarker: { position: "absolute", transform: "translate(-50%,-100%)", background: "none", border: "none",
    cursor: "pointer", padding: 0 },
  mapPinLabel: { fontSize: 10, color: C.text, background: "rgba(18,23,28,0.85)", padding: "1px 5px",
    borderRadius: 4, marginTop: 1, whiteSpace: "nowrap", pointerEvents: "none" },
  mapSoonLabels: { display: "flex", flexDirection: "column", alignItems: "center", gap: 1, marginTop: 2, pointerEvents: "none" },
  mapSoonLabel: { display: "flex", alignItems: "center", gap: 3, fontSize: 9.5, fontWeight: 600, color: C.ink,
    background: C.warn, padding: "1px 5px", borderRadius: 4, whiteSpace: "nowrap", maxWidth: 160,
    overflow: "hidden", textOverflow: "ellipsis" },
  mapTooltip: { position: "absolute", bottom: "100%", marginBottom: 4, background: C.raised,
    border: `1px solid ${C.line}`, borderRadius: 6, padding: "4px 8px", fontSize: 11, color: C.text,
    whiteSpace: "nowrap", pointerEvents: "none", zIndex: 5 },
  mapPopup: { position: "absolute", bottom: "100%", marginBottom: 6, background: C.raised,
    border: `1px solid ${C.line}`, borderRadius: 9, padding: 8, minWidth: 160, maxWidth: 240,
    boxShadow: "0 8px 24px rgba(0,0,0,0.4)", zIndex: 10 },
  mapPopupItem: { display: "flex", alignItems: "center", gap: 5, background: "none", border: "none",
    padding: "4px 5px", borderRadius: 5, fontSize: 12, color: C.text, cursor: "pointer", width: "100%" },
  tabBar: { display: "flex", gap: 4, background: C.ink, border: `1px solid ${C.line}`, borderRadius: 9, padding: 3 },
  tabBtn: { flex: 1, background: "transparent", border: "none", borderRadius: 7, padding: "7px 6px",
    fontSize: 12, color: C.dim, cursor: "pointer" },
  tabBtnOn: { background: C.raised, color: C.text, fontWeight: 600 },
  miniSeg: { background: "transparent", border: `1px solid ${C.line}`, borderRadius: 6, padding: "3px 9px",
    fontSize: 10.5, color: C.dim, cursor: "pointer" },
  mdBox: { background: C.ink, border: `1px solid ${C.line}`, borderRadius: 8, padding: "9px 11px",
    marginTop: 6, fontSize: 12.5, lineHeight: 1.6, minHeight: 44 },
  mdP: { margin: "0 0 6px", lineHeight: 1.6 },
  mdH: { fontWeight: 700, margin: "8px 0 5px", lineHeight: 1.35 },
  mdList: { margin: "0 0 6px", paddingInlineStart: 18 },
  mdLi: { margin: "2px 0", lineHeight: 1.55 },
  mdQuote: { margin: "5px 0", paddingInlineStart: 10, borderInlineStart: `2px solid ${C.line}`, color: C.dim },
  mdHr: { border: "none", borderTop: `1px solid ${C.line}`, margin: "9px 0" },
  mdCode: { background: C.raised, borderRadius: 4, padding: "1px 5px", fontSize: 11.5, fontFamily: "ui-monospace, monospace" },
  mdLink: { color: C.work, textDecoration: "underline", wordBreak: "break-word" },
  mdTodo: { display: "flex", alignItems: "flex-start", gap: 7, margin: "3px 0", lineHeight: 1.55 },
  mdCheck: { width: 13, height: 13, borderRadius: 3, border: `1px solid ${C.line}`, flexShrink: 0,
    marginTop: 3, display: "flex", alignItems: "center", justifyContent: "center" },
  mdCheckOn: { background: C.personal, borderColor: C.personal },
  moveBox: { borderTop: `1px dashed ${C.line}`, paddingTop: 8 },
  moveHead: { display: "flex", alignItems: "center", gap: 4, fontSize: 10.5, color: C.dimmer, textTransform: "uppercase", letterSpacing: 0.3 },

  payCard: { position: "relative", overflow: "hidden", background: "linear-gradient(135deg, rgba(224,179,65,0.16), rgba(224,138,124,0.10))",
    border: "1px solid rgba(224,179,65,0.32)", borderRadius: 10, padding: "10px 12px 12px", margin: "2px 0 9px" },
  payTop: { display: "flex", alignItems: "center", gap: 6, marginBottom: 4 },
  payLabel: { fontSize: 10, color: C.dim, textTransform: "uppercase", letterSpacing: 0.5 },
  payPaid: { marginInlineStart: "auto", fontSize: 9.5, fontWeight: 700, letterSpacing: 0.6, color: C.personal,
    border: `1px solid ${C.personal}`, borderRadius: 4, padding: "1px 5px" },
  payAmount: { fontSize: 22, fontWeight: 700, letterSpacing: -0.5, lineHeight: 1.15, fontVariantNumeric: "tabular-nums" },
  payCur: { fontSize: 11, fontWeight: 500, color: C.dim, marginInlineStart: 5 },
  payDue: { display: "flex", alignItems: "center", gap: 4, fontSize: 10.5, color: C.dim, marginTop: 5 },
  payStripe: { position: "absolute", insetInlineEnd: -18, top: -18, width: 74, height: 74, borderRadius: "50%",
    background: "rgba(224,179,65,0.10)" },

  linkStack: { display: "flex", flexDirection: "column", marginTop: 9, position: "relative" },
  linkRow: { display: "flex", alignItems: "center", gap: 8, background: C.ink, border: `1px solid ${C.line}`,
    borderTop: "none", padding: "7px 9px", textDecoration: "none", color: "inherit", overflow: "hidden" },
  favicon: { borderRadius: 3, flexShrink: 0, background: C.raised },
  linkText: { display: "flex", flexDirection: "column", minWidth: 0, lineHeight: 1.3 },
  linkTitle: { fontSize: 11.5, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  linkHost: { fontSize: 10, color: C.dimmer, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  moreLinksBtn: { display: "block", width: "100%", textAlign: "center", background: C.ink,
    border: `1px solid ${C.line}`, borderTop: "none", borderBottomLeftRadius: 9, borderBottomRightRadius: 9,
    padding: "6px 8px", fontSize: 11, color: C.dim, cursor: "pointer" },
  richLinkRow: { display: "flex", alignItems: "stretch", gap: 0, background: C.ink, border: `1px solid ${C.line}`,
    borderTop: "none", textDecoration: "none", color: "inherit", overflow: "hidden", minHeight: 84 },
  richLinkImg: { width: "38%", maxWidth: 140, objectFit: "cover", flexShrink: 0, background: C.raised },
  richLinkBody: { display: "flex", flexDirection: "column", gap: 3, minWidth: 0, padding: "9px 11px", justifyContent: "center" },
  richLinkSite: { display: "flex", alignItems: "center", gap: 5, fontSize: 10, color: C.dimmer },
  richLinkTitle: { fontSize: 12.5, fontWeight: 600, color: C.text, overflow: "hidden", textOverflow: "ellipsis",
    display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" },
  richLinkDesc: { fontSize: 11, color: C.dim, overflow: "hidden", textOverflow: "ellipsis",
    display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" },
  richLinkUrl: { fontSize: 10, color: C.dimmer, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },

  metaLine: { display: "flex", flexWrap: "wrap", alignItems: "center", gap: 6, marginTop: 10, position: "relative" },
  metaType: { display: "inline-flex", alignItems: "center", gap: 4, fontSize: 10.5, color: C.dimmer,
    paddingInlineEnd: 6, marginInlineEnd: 1, borderInlineEnd: `1px solid ${C.line}` },
  metaPill: { display: "inline-flex", alignItems: "center", gap: 3, fontSize: 10, border: "1px solid",
    borderRadius: 20, padding: "1px 7px" },
  faviconWrap: { position: "relative", width: 16, height: 16, flexShrink: 0, display: "inline-flex",
    alignItems: "center", justifyContent: "center" },
  faviconLetter: { position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center",
    background: C.raised, borderRadius: 3, fontSize: 9, fontWeight: 700, color: C.dim },
  mapOffline: { position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center",
    justifyContent: "center", gap: 8, padding: 20, textAlign: "center", fontSize: 12, color: C.dimmer,
    background: `repeating-linear-gradient(45deg, ${C.raised}, ${C.raised} 10px, ${C.surface} 10px, ${C.surface} 20px)` },
  cloudState: { display: "flex", alignItems: "center", gap: 9, background: C.raised, border: `1px solid ${C.line}`,
    borderRadius: 9, padding: "10px 12px", fontSize: 12.5 },
  cloudMsg: { border: "1px solid", borderRadius: 8, padding: "8px 11px", fontSize: 12, lineHeight: 1.5 },
  labelRow: { display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" },
  labelAdd: { display: "flex", alignItems: "center", gap: 5, background: "none", border: `1px dashed ${C.line}`,
    borderRadius: 20, padding: "4px 11px", fontSize: 11.5, color: C.dimmer, cursor: "pointer" },
  pillX: { background: "none", border: "none", cursor: "pointer", padding: 0, marginLeft: 3, opacity: 0.7, display: "flex" },
  pop: { position: "absolute", bottom: "calc(100% + 7px)", left: 0, width: 215, background: C.raised,
    border: `1px solid ${C.line}`, borderRadius: 10, padding: 7, zIndex: 5, boxShadow: "0 14px 36px rgba(0,0,0,0.45)" },
  popIn: { width: "100%", background: C.ink, border: `1px solid ${C.line}`, borderRadius: 7, padding: "6px 9px", fontSize: 12, marginBottom: 5 },
  popRow: { display: "flex", alignItems: "center", gap: 8, padding: "6px 8px", borderRadius: 6, fontSize: 12, cursor: "pointer" },

  foot: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8,
    borderTop: `1px solid ${C.lineSoft}`, paddingTop: 12, marginTop: 2 },
  primaryBtn: { display: "flex", alignItems: "center", gap: 6, background: C.personal, color: C.ink, border: "none",
    borderRadius: 8, padding: "8px 15px", fontSize: 12.5, fontWeight: 600, cursor: "pointer" },
  secBtn: { display: "flex", alignItems: "center", gap: 6, background: C.raised, color: C.dim,
    border: `1px solid ${C.line}`, borderRadius: 8, padding: "8px 14px", fontSize: 12.5, cursor: "pointer" },
  closeBtn: { background: C.raised, border: `1px solid ${C.line}`, borderRadius: 8, padding: "8px 18px",
    fontSize: 12.5, fontWeight: 500, cursor: "pointer" },
  okBtn: { display: "flex", alignItems: "center", gap: 5, background: "rgba(99,201,168,0.14)", color: C.personal,
    border: "1px solid rgba(99,201,168,0.3)", borderRadius: 7, padding: "6px 12px", fontSize: 12, cursor: "pointer" },
  noBtn: { display: "flex", alignItems: "center", gap: 5, background: "transparent", color: C.dim,
    border: `1px solid ${C.line}`, borderRadius: 7, padding: "6px 12px", fontSize: 12, cursor: "pointer" },
  ghost: { background: "none", border: "none", cursor: "pointer", color: C.dimmer, padding: 2, display: "flex", flexShrink: 0 },


  hint: { fontSize: 12, color: C.dimmer, margin: 0, lineHeight: 1.5 },
  subHead: { fontSize: 13.5, fontWeight: 600, margin: "6px 0 0" },
  stat: { flex: 1, background: C.raised, border: `1px solid ${C.line}`, borderRadius: 9, padding: "9px 11px",
    display: "flex", flexDirection: "column", gap: 1 },
  statN: { fontSize: 19, fontWeight: 700 },
  lesson: { display: "flex", alignItems: "center", gap: 8, background: C.raised, border: `1px solid ${C.line}`,
    borderRadius: 9, padding: "9px 11px", fontSize: 12.5 },
  wrong: { background: "rgba(224,138,124,0.12)", color: C.danger, borderRadius: 5, padding: "2px 7px" },
  right: { background: "rgba(99,201,168,0.12)", color: C.personal, borderRadius: 5, padding: "2px 7px" },

  wrapRow: { display: "flex", flexWrap: "wrap", gap: 7 },
  itemChip: { display: "inline-flex", alignItems: "center", gap: 6, background: C.raised, border: `1px solid ${C.line}`,
    borderRadius: 20, padding: "5px 8px 5px 11px", fontSize: 12 },
  dragHandle: { cursor: "grab", color: C.dimmer, fontSize: 11, lineHeight: 1, userSelect: "none" },
  renameIn: { border: `1px solid ${C.line}`, background: C.surface, color: C.text, borderRadius: 5,
    fontSize: 12, padding: "1px 5px", width: 90 },
  pickerPanel: { background: C.raised, border: `1px solid ${C.line}`, borderRadius: 10, padding: 10,
    display: "flex", flexDirection: "column", gap: 8, marginTop: 8 },
  pickerScroll: { maxHeight: 210, overflowY: "auto", display: "flex", flexDirection: "column", gap: 8, paddingRight: 4 },
  pickerGroup: { fontSize: 10.5, color: C.dimmer, marginBottom: 4 },
  chipIconBtn: { display: "flex", alignItems: "center", justifyContent: "center", width: 24, height: 24,
    background: C.ink, border: `1px solid ${C.line}`, borderRadius: 6, cursor: "pointer", padding: 0 },
  iconGrid: { display: "grid", gridTemplateColumns: "repeat(10, 1fr)", gap: 5 },
  iconBtn: { display: "flex", alignItems: "center", justifyContent: "center", height: 28, background: C.raised,
    border: `1px solid ${C.line}`, borderRadius: 7, cursor: "pointer", color: C.dim },
  iconBtnOn: { background: "rgba(99,201,168,0.15)", borderColor: C.personal, color: C.personal },
  emojiGrid: { display: "grid", gridTemplateColumns: "repeat(12, 1fr)", gap: 4, margin: "8px 0" },
  emojiBtn: { height: 26, background: C.raised, border: `1px solid ${C.line}`, borderRadius: 6, cursor: "pointer", fontSize: 13 },
};
