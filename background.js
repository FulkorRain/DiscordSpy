/*
  Discord WordWatch Notifier (Firefox MV2)

  - Loads words from words.txt (one term per line)
  - Receives NEW_MESSAGE from content script
  - If message content matches any term, fires a notification that includes the message text
*/

let lastNotificationTime = 0;
const MIN_INTERVAL_MS = 10000; // avoid notification spam

let keywordIndex = null;

function normalize(s) {
  return (s || "").normalize("NFKC").toLowerCase();
}

function isSimpleWord(term) {
  // letters/numbers/_ only (no spaces/punctuation). Unicode-safe.
  return /^[\p{L}\p{N}_]+$/u.test(term);
}

function buildIndex(rawText) {
  const lines = (rawText || "")
    .split(/\r?\n/g)
    .map(s => s.trim())
    .filter(Boolean);

  const seen = new Set();
  const deduped = [];
  for (const l of lines) {
    const n = normalize(l);
    if (!seen.has(n)) { seen.add(n); deduped.push(n); }
  }

  const simpleSet = new Set();
  const phrases = [];
  for (const term of deduped) {
    if (isSimpleWord(term)) simpleSet.add(term);
    else phrases.push(term);
  }

  return { simpleSet, phrases, count: deduped.length };
}

function tokenize(textNorm) {
  // Split into word-ish tokens (Unicode letters/numbers/_).
  return textNorm.split(/[^\p{L}\p{N}_]+/u).filter(Boolean);
}

function findMatches(messageText) {
  if (!keywordIndex) return [];
  const textNorm = normalize(messageText);
  if (!textNorm) return [];

  const matches = [];
  const tokens = tokenize(textNorm);

  // Exact token matches for simple terms
  for (const t of tokens) {
    if (keywordIndex.simpleSet.has(t)) matches.push(t);
  }

  // Substring matches for phrases / non-simple terms
  for (const p of keywordIndex.phrases) {
    if (textNorm.includes(p)) matches.push(p);
  }

  // De-dupe, preserve order
  const out = [];
  const seen = new Set();
  for (const m of matches) {
    if (!seen.has(m)) { seen.add(m); out.push(m); }
  }
  return out;
}

async function loadWordList() {
  try {
    const url = (typeof browser !== "undefined" ? browser.runtime.getURL("words.txt") : chrome.runtime.getURL("words.txt"));
    const res = await fetch(url);
    const txt = await res.text();
    keywordIndex = buildIndex(txt);
    console.log("[WordWatch] Loaded words:", keywordIndex.count);
  } catch (e) {
    console.warn("[WordWatch] Failed to load words.txt", e);
    keywordIndex = buildIndex("");
  }
}

function notify({ url, author, content, matches }) {
  const now = Date.now();
  if (now - lastNotificationTime < MIN_INTERVAL_MS) return;
  lastNotificationTime = now;

  const api = (typeof browser !== "undefined") ? browser : chrome;

  const top = matches.slice(0, 5).join(", ");
  const snippet = (content || "").replace(/\s+/g, " ").trim();
  const msg = `${author ? author + ": " : ""}${snippet}`.slice(0, 190);

  api.notifications.create({
    type: "basic",
    iconUrl: "icon128.png",
    title: `WordWatch match: ${top}`,
    message: msg || `Matched on: ${url}`,
    priority: 2
  });
}

// Load list on startup/install
(function init() {
  loadWordList();
})();

// Receive messages from content script
const apiRT = (typeof browser !== "undefined") ? browser.runtime : chrome.runtime;

apiRT.onMessage.addListener((message, sender) => {
  if (!message || message.type !== "NEW_MESSAGE") return;

  // Ensure we have the list loaded (in case of race)
  if (!keywordIndex) {
    loadWordList().then(() => {
      const matches = findMatches(message.content || "");
      if (matches.length) {
        notify({
          url: sender?.tab?.url || "Discord",
          author: message.author || "",
          content: message.content || "",
          matches
        });
      }
    });
    return;
  }

  const matches = findMatches(message.content || "");
  if (!matches.length) return;

  notify({
    url: sender?.tab?.url || "Discord",
    author: message.author || "",
    content: message.content || "",
    matches
  });
});
