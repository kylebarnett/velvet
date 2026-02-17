const STOP_WORDS = new Set([
  "a", "an", "the", "to", "for", "in", "on", "at", "of", "and", "or",
  "my", "me", "i", "it", "is", "be", "do",
  "please", "can", "want", "need", "would", "like", "just", "let",
  "go", "gonna", "gotta",
  "q1", "q2", "q3", "q4",
]);

/** Year references like '26, 2026, "26", '2026 */
const NOISE_PATTERN = /['"]?\d{2,4}['"]?/g;

function extractTokens(search: string): string[] {
  return search
    .toLowerCase()
    .replace(NOISE_PATTERN, " ")
    .split(/\s+/)
    .filter((t) => t.length > 0 && !STOP_WORDS.has(t));
}

/** Detect the first meaningful word from raw input (before stop-word removal) for intent classification */
function detectFirstVerb(search: string): string | null {
  const words = search.toLowerCase().trim().split(/\s+/);
  return words[0] ?? null;
}

const SYNONYMS: Record<string, string[]> = {
  create: ["create", "new", "add"],
  new: ["create", "new", "add"],
  add: ["create", "new", "add"],
  make: ["create", "new"],
  start: ["create", "new"],
  begin: ["create", "new"],
  setup: ["create", "new", "import"],
  set: ["create", "new", "toggle"],
  send: ["send", "create", "metric request", "campaign"],
  request: ["metric request", "campaign", "request", "send"],
  requests: ["metric request", "campaign", "request"],
  ask: ["metric request", "request", "send"],

  open: ["navigate"],
  view: ["navigate"],
  show: ["navigate"],
  see: ["navigate"],
  visit: ["navigate"],
  navigate: ["navigate"],
  find: ["navigate", "search"],
  browse: ["navigate"],
  check: ["navigate"],
  look: ["navigate"],

  upload: ["upload", "import", "document", "file"],
  import: ["import", "upload", "csv", "excel", "historical"],
  ingest: ["import", "upload"],
  load: ["import", "upload"],
  pull: ["import", "request"],

  toggle: ["toggle", "theme"],
  switch: ["toggle", "theme"],
  change: ["toggle", "theme"],
  turn: ["toggle", "theme"],
  flip: ["toggle", "theme"],

  company: ["companies", "company", "portfolio"],
  companies: ["companies", "company", "portfolio"],
  portfolio: ["companies", "portfolio"],
  startups: ["companies", "portfolio"],
  startup: ["companies", "portfolio"],
  org: ["companies", "company"],
  orgs: ["companies", "company"],
  organization: ["companies", "company"],

  contact: ["contacts", "contact", "people"],
  contacts: ["contacts", "contact", "people"],
  people: ["contacts", "people"],
  founders: ["contacts", "people", "founders"],
  founder: ["contacts", "founders", "company profile"],

  metric: ["metric request", "metric", "metrics"],
  metrics: ["metric request", "metric", "metrics"],
  campaign: ["metric request", "campaign"],
  campaigns: ["metric request", "campaign"],
  data: ["metric request", "import", "data"],
  collect: ["metric request", "campaign", "collect"],
  collection: ["metric request", "campaign", "collect"],
  quarterly: ["metric request", "request"],

  doc: ["document", "documents", "file"],
  docs: ["document", "documents", "file"],
  document: ["document", "documents", "file"],
  documents: ["document", "documents", "file"],
  file: ["document", "file", "upload"],
  files: ["document", "file", "upload"],
  pdf: ["document", "pdf", "file"],
  attachment: ["document", "upload", "file"],

  report: ["reports", "report", "analytics"],
  reports: ["reports", "report", "analytics"],
  analytics: ["reports", "analytics"],
  chart: ["reports", "charts"],
  charts: ["reports", "charts"],
  analysis: ["reports", "analytics"],
  visualization: ["reports", "charts"],
  graph: ["reports", "charts"],

  sheet: ["tear sheet", "tear sheets"],
  sheets: ["tear sheet", "tear sheets"],
  tear: ["tear sheet", "tear sheets"],
  summary: ["tear sheet", "overview"],
  tearsheet: ["tear sheet", "tear sheets"],

  fund: ["funds", "fund", "lp"],
  funds: ["funds", "fund", "lp"],
  lp: ["lp", "fund", "limited partner", "lp reports"],
  limited: ["lp", "limited partner"],
  partner: ["lp", "limited partner"],

  investor: ["investors", "investor"],
  investors: ["investors", "investor"],
  access: ["investors", "approval", "access"],
  approval: ["investors", "approval"],

  team: ["team", "members"],
  member: ["team", "members"],
  members: ["team", "members"],
  invite: ["team", "invite", "members"],

  activity: ["activity", "log", "history"],
  history: ["activity", "log", "historical"],
  log: ["activity", "log"],

  help: ["help", "guide", "support"],
  guide: ["help", "guide"],
  support: ["help", "support"],
  documentation: ["help", "guide"],

  dashboard: ["dashboard", "home", "overview"],
  dash: ["dashboard", "home"],
  home: ["dashboard", "home"],
  overview: ["dashboard", "overview"],

  profile: ["company profile", "settings"],
  settings: ["company profile", "settings"],
  info: ["company profile", "settings"],

  theme: ["theme", "dark", "light", "mode", "appearance", "toggle"],
  dark: ["theme", "dark", "mode", "toggle"],
  light: ["theme", "light", "mode", "toggle"],
  mode: ["theme", "mode", "appearance", "toggle"],
  appearance: ["theme", "appearance", "toggle"],
  night: ["theme", "dark", "mode", "toggle"],
  color: ["theme", "appearance", "toggle"],
  colors: ["theme", "appearance", "toggle"],

  csv: ["csv", "import", "companies"],
  excel: ["excel", "import", "historical"],
  spreadsheet: ["excel", "import", "historical"],
  historical: ["historical", "import"],
  bulk: ["bulk", "import", "csv", "excel"],
};

const ACTION_VERBS = new Set([
  "create", "new", "add", "make", "start", "begin", "setup", "set",
  "upload", "import", "ingest", "load",
  "toggle", "switch", "change", "turn", "flip",
  "send", "ask", "request", "pull",
]);

const NAVIGATION_VERBS = new Set([
  "go", "open", "view", "show", "see", "visit", "navigate",
  "find", "browse", "check", "look",
]);

const ACTION_LABEL_PREFIXES = ["create", "upload", "import", "toggle"];

function levenshtein(a: string, b: string): number {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  // Skip expensive computation for very different lengths
  if (Math.abs(a.length - b.length) > 2) return 3;

  const matrix: number[][] = [];
  for (let i = 0; i <= a.length; i++) {
    matrix[i] = [i];
    for (let j = 1; j <= b.length; j++) {
      if (i === 0) {
        matrix[i][j] = j;
      } else {
        const cost = a[i - 1] === b[j - 1] ? 0 : 1;
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j - 1] + cost,
        );
      }
    }
  }
  return matrix[a.length][b.length];
}

function getWords(text: string): string[] {
  return text.toLowerCase().split(/[\s\-_/]+/).filter(Boolean);
}

function scoreToken(token: string, labelWords: string[], keywordWords: string[]): number {
  let best = 0;

  // 1. Exact word match in label
  if (labelWords.includes(token)) {
    best = Math.max(best, 0.4);
  }

  // 2. Exact word match in keywords
  if (keywordWords.includes(token)) {
    best = Math.max(best, 0.2);
  }

  // 3. Prefix match in label
  if (best < 0.25 && labelWords.some((w) => w.startsWith(token) && token.length >= 2)) {
    best = Math.max(best, 0.25);
  }

  // 4. Prefix match in keywords
  if (best < 0.1 && keywordWords.some((w) => w.startsWith(token) && token.length >= 2)) {
    best = Math.max(best, 0.1);
  }

  // 5. Synonym expansion
  const expansions = SYNONYMS[token];
  if (expansions) {
    for (const syn of expansions) {
      const synWords = syn.split(/\s+/);
      // Check if synonym phrase matches within label
      const labelText = labelWords.join(" ");
      if (labelText.includes(syn)) {
        best = Math.max(best, 0.35);
      }
      // Check individual synonym words against label
      for (const sw of synWords) {
        if (labelWords.includes(sw)) {
          best = Math.max(best, 0.3);
        }
        if (keywordWords.includes(sw)) {
          best = Math.max(best, 0.15);
        }
      }
    }
  }

  // 6. Levenshtein fallback for typos (only if no match yet)
  if (best === 0 && token.length >= 3) {
    for (const w of [...labelWords, ...keywordWords]) {
      if (w.length >= 4 && levenshtein(token, w) <= 2) {
        best = Math.max(best, 0.1);
        break;
      }
    }
  }

  return best;
}

export function intentFilter(
  value: string,
  search: string,
  keywords?: string[],
): number {
  // Pass-through: server search results, recents, and AI items are always visible
  if (
    value.startsWith("result-") ||
    value.startsWith("recent-") ||
    value.startsWith("ask-ai-") ||
    value.startsWith("ai-")
  ) {
    return 1;
  }

  // Empty search: show everything
  if (!search.trim()) return 1;

  const searchLower = search.toLowerCase().trim();
  const valueLower = value.toLowerCase();

  // Direct substring match — handles "comp" → "Companies"
  if (valueLower.includes(searchLower)) return 1.0;

  // Also check if search is contained in any keyword
  if (keywords?.some((kw) => kw.toLowerCase().includes(searchLower))) return 0.8;

  // Extract meaningful tokens
  const tokens = extractTokens(search);

  // If all tokens were noise/stop words, show items at low rank
  if (tokens.length === 0) return 0.1;

  // Build corpus
  const labelWords = getWords(value);
  const keywordWords = (keywords ?? []).flatMap((kw) => getWords(kw));

  // Score each token
  let totalScore = 0;
  for (const token of tokens) {
    totalScore += scoreToken(token, labelWords, keywordWords);
  }

  // Normalize
  let score = totalScore / tokens.length;

  // Intent bonus based on the first word of the raw input
  const firstVerb = detectFirstVerb(search);
  if (firstVerb && ACTION_VERBS.has(firstVerb)) {
    // Boost action commands (labels that start with Create, Upload, Import, Toggle)
    const firstLabelWord = labelWords[0] ?? "";
    if (ACTION_LABEL_PREFIXES.includes(firstLabelWord)) {
      score *= 1.3;
    }
  } else if (firstVerb && NAVIGATION_VERBS.has(firstVerb)) {
    // Boost navigation commands (labels that don't start with action prefixes)
    const firstLabelWord = labelWords[0] ?? "";
    if (!ACTION_LABEL_PREFIXES.includes(firstLabelWord)) {
      score *= 1.2;
    }
  }

  return Math.min(1, Math.max(0, score));
}
