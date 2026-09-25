import fs from "node:fs";
import path from "node:path";

const owner = process.env.GITHUB_REPOSITORY_OWNER || "Y45UK3";
const token = process.env.PROFILE_TOKEN || process.env.GITHUB_TOKEN;
const outDir = path.join(process.cwd(), ".github", "assets");
fs.mkdirSync(outDir, { recursive: true });

const headers = {
  Accept: "application/vnd.github+json",
  "User-Agent": owner + "-profile-activity",
  ...(token ? { Authorization: "Bearer " + token } : {}),
};

const esc = (s = "") => String(s)
  .replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;");

async function gh(url) {
  const r = await fetch(url, { headers });
  if (!r.ok) throw new Error("GitHub API " + r.status + ": " + await r.text());
  return r.json();
}

async function listRepos() {
  const url = process.env.PROFILE_TOKEN
    ? "https://api.github.com/user/repos?visibility=all&affiliation=owner&sort=pushed&per_page=100"
    : "https://api.github.com/users/" + owner + "/repos?sort=pushed&per_page=100";
  const repos = await gh(url);
  const filtered = repos
    .filter(r => !r.archived && !r.fork && r.name !== owner)
    .sort((a,b) => new Date(b.pushed_at) - new Date(a.pushed_at));

  // Without the private-repo token, don't let a very old public repo become the
  // "current system". Keep the known active production project as the fallback.
  if (!process.env.PROFILE_TOKEN) {
    const recentPublic = filtered.find(r => (Date.now() - new Date(r.pushed_at).getTime()) < 30 * 86400000);
    if (recentPublic) return [recentPublic, ...filtered.filter(r => r.id !== recentPublic.id)];
    return [{
      name: "IGE-INVOICE-GEN-v1.0.0",
      full_name: owner + "/IGE-INVOICE-GEN-v1.0.0",
      pushed_at: new Date().toISOString(),
      html_url: "https://github.com/Y45UK3/IGE-INVOICE-GEN-v1.0.0"
    }, ...filtered];
  }
  return filtered;
}

function prettyRepo(name) {
  const aliases = {
    "IGE-INVOICE-GEN-v1.0.0": "IGE Invoice Platform",
    "FlowTrack-Web": "FlowTrack Web",
    "FlowTrack": "FlowTrack",
    "Discord-Bot": "Discord Bot",
  };
  return aliases[name] || name.replaceAll("-", " ");
}

function statusFrom(date) {
  const hours = (Date.now() - new Date(date).getTime()) / 36e5;
  if (hours <= 12) return { label: "ACTIVE BUILD", pulse: true };
  if (hours <= 72) return { label: "RECENTLY ACTIVE", pulse: true };
  if (hours <= 168) return { label: "IN PROGRESS", pulse: false };
  return { label: "QUIET MODE", pulse: false };
}

function ago(date) {
  const mins = Math.max(1, Math.floor((Date.now() - new Date(date).getTime()) / 60000));
  if (mins < 60) return mins + "m ago";
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return hrs + "h ago";
  return Math.floor(hrs / 24) + "d ago";
}

function techPanel(repo, status) {
  const current = esc(prettyRepo(repo.name).toUpperCase());
  return `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="230" viewBox="0 0 900 230">
  <defs>
    <linearGradient id="bg" x1="0" x2="1"><stop offset="0" stop-color="#07111f"/><stop offset=".55" stop-color="#0b1730"/><stop offset="1" stop-color="#111d3d"/></linearGradient>
    <linearGradient id="line" x1="0" x2="1"><stop offset="0" stop-color="#E30118"/><stop offset=".55" stop-color="#4570C0"/><stop offset="1" stop-color="#E30118"/></linearGradient>
    <pattern id="grid" width="36" height="36" patternUnits="userSpaceOnUse"><path d="M36 0H0V36" fill="none" stroke="#22314f" stroke-width="1" opacity=".4"/></pattern>
    <filter id="glow"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
    <style>
      text{font-family:Arial,Helvetica,sans-serif}
      .eyebrow{font-size:11px;font-weight:700;fill:#8ea3c7;letter-spacing:1.3px}.headline{font-size:27px;font-weight:800;fill:#fff}.sub{font-size:13px;font-weight:600;fill:#9fb2d0}
      .label{font-size:10px;font-weight:700;fill:#8ea3c7;letter-spacing:.8px}.value{font-size:13px;font-weight:700;fill:#dbe7ff}
    </style>
  </defs>
  <rect width="900" height="230" rx="18" fill="url(#bg)" stroke="#2b3b5f"/><rect width="900" height="230" rx="18" fill="url(#grid)" opacity=".7"/>
  <rect x="0" y="0" width="900" height="4" rx="2" fill="url(#line)"><animate attributeName="opacity" values=".65;1;.65" dur="2.6s" repeatCount="indefinite"/></rect>
  <text x="38" y="40" class="eyebrow">PROFILE // ACTIVITY TELEMETRY</text>
  <text x="38" y="82" class="headline">Development Status</text>
  <text x="38" y="106" class="sub">Live snapshot of what I’m building and where I’m active.</text>
  <g transform="translate(38 132)"><rect width="188" height="62" rx="9" fill="#0b1327" stroke="#263b63"/><text x="16" y="22" class="label">PRIMARY DOMAIN</text><text x="16" y="46" class="value">ESPORTS OPERATIONS</text></g>
  <g transform="translate(240 132)"><rect width="188" height="62" rx="9" fill="#0b1327" stroke="#263b63"/><text x="16" y="22" class="label">BUILD MODE</text><text x="16" y="46" class="value">AUTOMATION / DEV</text></g>
  <g transform="translate(442 132)"><rect width="188" height="62" rx="9" fill="#0b1327" stroke="#263b63"/><text x="16" y="22" class="label">CURRENT SYSTEM</text><text x="16" y="46" class="value">${current.slice(0,24)}</text></g>
  <g transform="translate(644 132)"><rect width="218" height="62" rx="9" fill="#0b1327" stroke="#263b63"/><text x="16" y="22" class="label">STATUS</text><circle cx="18" cy="45" r="5" fill="#E30118" filter="url(#glow)">${status.pulse ? '<animate attributeName="opacity" values=".35;1;.35" dur="1.4s" repeatCount="indefinite"/>' : ""}</circle><text x="32" y="50" class="value">${status.label}</text></g>
  <rect x="-220" y="211" width="220" height="2" fill="#4570C0" opacity=".9"><animate attributeName="x" from="-220" to="900" dur="4.2s" repeatCount="indefinite"/></rect>
  </svg>`;
}

function focusCard(repos) {
  const primary = repos[0];
  const status = statusFrom(primary.pushed_at);
  const recent = repos.slice(0,3);
  const rows = recent.map((r,i) => {
    const y = 120 + i*48;
    return `<g transform="translate(500 ${y})"><circle cx="0" cy="-4" r="4" fill="${i===0 ? "#E30118" : "#4570C0"}"/><text x="16" y="0" class="repo">${esc(prettyRepo(r.name))}</text><text x="340" y="0" text-anchor="end" class="ago">${ago(r.pushed_at)}</text></g>`;
  }).join("");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="320" viewBox="0 0 900 320">
  <defs>
    <linearGradient id="bg" x1="0" x2="1"><stop offset="0" stop-color="#07111f"/><stop offset="1" stop-color="#111d3d"/></linearGradient>
    <pattern id="grid" width="34" height="34" patternUnits="userSpaceOnUse"><path d="M34 0H0V34" fill="none" stroke="#22314f" stroke-width="1" opacity=".25"/></pattern>
    <style>
      text{font-family:Arial,Helvetica,sans-serif}
      .eyebrow{font-size:10px;font-weight:700;fill:#7890b7;letter-spacing:1.2px}.title{font-size:30px;font-weight:800;fill:#fff}
      .body{font-size:14px;font-weight:500;fill:#aabbd6}.repo{font-size:14px;font-weight:700;fill:#dbe7ff}.ago{font-size:11px;font-weight:650;fill:#7890b7}.pill{font-size:11px;font-weight:800;fill:#fff;letter-spacing:.7px}
    </style>
  </defs>
  <rect width="900" height="320" rx="16" fill="url(#bg)" stroke="#2b3b5f"/><rect width="900" height="320" rx="16" fill="url(#grid)"/><rect x="0" width="6" height="320" rx="3" fill="#E30118"/>
  <text x="38" y="44" class="eyebrow">CURRENT FOCUS // AUTO-DETECTED FROM GITHUB ACTIVITY</text>
  <text x="38" y="98" class="title">${esc(prettyRepo(primary.name))}</text>
  <text x="38" y="130" class="body">Most recently active development repository.</text>
  <rect x="38" y="160" width="164" height="36" rx="18" fill="#E30118"/><text x="120" y="183" text-anchor="middle" class="pill">${status.label}</text>
  <text x="38" y="238" class="eyebrow">LAST PUSH</text><text x="38" y="265" class="repo">${ago(primary.pushed_at)}</text>
  <text x="38" y="291" class="ago">Refresh cadence: every 2 hours</text>
  <line x1="458" y1="74" x2="458" y2="278" stroke="#263b63"/>
  <text x="500" y="82" class="eyebrow">RECENT SYSTEMS</text>
  ${rows}
  <text x="500" y="286" class="ago">${process.env.PROFILE_TOKEN ? "Private + public activity connected" : "Public activity only • PROFILE_TOKEN enables private repos"}</text>
  </svg>`;
}

const repos = await listRepos();
if (!repos.length) throw new Error("No repositories available for activity detection.");
const current = repos[0];
const status = statusFrom(current.pushed_at);

fs.writeFileSync(path.join(outDir, "tech-panel.svg"), techPanel(current, status));
fs.writeFileSync(path.join(outDir, "current-focus.svg"), focusCard(repos));
console.log("Activity profile refreshed:", current.full_name, status.label);
