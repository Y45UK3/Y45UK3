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
  // PROFILE_TOKEN can see private repos; fallback sees public owner repos only.
  const url = process.env.PROFILE_TOKEN
    ? "https://api.github.com/user/repos?visibility=all&affiliation=owner&sort=pushed&per_page=100"
    : "https://api.github.com/users/" + owner + "/repos?sort=pushed&per_page=100";
  const repos = await gh(url);
  return repos
    .filter(r => !r.archived && !r.fork && r.name !== owner)
    .sort((a,b) => new Date(b.pushed_at) - new Date(a.pushed_at));
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
  if (hours <= 12) return { label: "ACTIVE BUILD", detail: "commits within 12h", pulse: true };
  if (hours <= 72) return { label: "RECENTLY ACTIVE", detail: "updated within 3 days", pulse: true };
  if (hours <= 168) return { label: "IN PROGRESS", detail: "updated this week", pulse: false };
  return { label: "QUIET MODE", detail: "no recent pushes", pulse: false };
}

function ago(date) {
  const mins = Math.max(1, Math.floor((Date.now() - new Date(date).getTime()) / 60000));
  if (mins < 60) return mins + "m ago";
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return hrs + "h ago";
  const days = Math.floor(hrs / 24);
  return days + "d ago";
}

function techPanel(repo, status) {
  const current = esc(prettyRepo(repo.name).toUpperCase());
  return `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="220" viewBox="0 0 900 220">
  <defs>
    <linearGradient id="bg" x1="0" x2="1"><stop offset="0" stop-color="#07111f"/><stop offset=".55" stop-color="#0b1730"/><stop offset="1" stop-color="#111d3d"/></linearGradient>
    <linearGradient id="line" x1="0" x2="1"><stop offset="0" stop-color="#E30118"/><stop offset=".55" stop-color="#4570C0"/><stop offset="1" stop-color="#E30118"/></linearGradient>
    <pattern id="grid" width="36" height="36" patternUnits="userSpaceOnUse"><path d="M36 0H0V36" fill="none" stroke="#22314f" stroke-width="1" opacity=".45"/></pattern>
    <filter id="glow"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
    <style>
      text{font-family:Inter,ui-sans-serif,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
      .small{font-size:12px;fill:#8ea3c7;letter-spacing:1.4px}.name{font-size:28px;font-weight:750;fill:#fff}.ign{font-size:28px;font-weight:750;fill:#E30118}
      .label{font-size:11px;font-weight:650;fill:#8ea3c7;letter-spacing:.7px}.value{font-size:13px;font-weight:650;fill:#dbe7ff}
    </style>
  </defs>
  <rect width="900" height="220" rx="16" fill="url(#bg)" stroke="#2b3b5f"/><rect width="900" height="220" rx="16" fill="url(#grid)" opacity=".7"/>
  <rect x="0" y="0" width="900" height="4" rx="2" fill="url(#line)"><animate attributeName="opacity" values=".65;1;.65" dur="2.6s" repeatCount="indefinite"/></rect>
  <text x="34" y="38" class="small">PROFILE // ACTIVITY TELEMETRY</text>
  <text x="34" y="83" class="name">THUMULA </text><text x="165" y="83" class="ign">"Y45UK3"</text><text x="315" y="83" class="name"> KULAJITHA</text>

  <g transform="translate(34 116)"><rect width="190" height="58" rx="8" fill="#0b1327" stroke="#263b63"/><text x="16" y="21" class="label">PRIMARY DOMAIN</text><text x="16" y="43" class="value">ESPORTS OPERATIONS</text></g>
  <g transform="translate(238 116)"><rect width="190" height="58" rx="8" fill="#0b1327" stroke="#263b63"/><text x="16" y="21" class="label">BUILD MODE</text><text x="16" y="43" class="value">AUTOMATION / DEV</text></g>
  <g transform="translate(442 116)"><rect width="190" height="58" rx="8" fill="#0b1327" stroke="#263b63"/><text x="16" y="21" class="label">CURRENT SYSTEM</text><text x="16" y="43" class="value">${current.slice(0,24)}</text></g>
  <g transform="translate(646 116)"><rect width="220" height="58" rx="8" fill="#0b1327" stroke="#263b63"/><text x="16" y="21" class="label">STATUS</text><circle cx="18" cy="42" r="5" fill="#E30118" filter="url(#glow)">${status.pulse ? '<animate attributeName="opacity" values=".35;1;.35" dur="1.4s" repeatCount="indefinite"/>' : ""}</circle><text x="32" y="46" class="value">${status.label}</text></g>
  <rect x="-180" y="194" width="180" height="2" fill="#4570C0" opacity=".85"><animate attributeName="x" from="-180" to="900" dur="4s" repeatCount="indefinite"/></rect>
  </svg>`;
}

function focusCard(repos) {
  const top = repos.slice(0,3);
  const primary = top[0];
  const rows = top.map((r,i) => {
    const y = 118 + i*48;
    return `<g transform="translate(478 ${y})"><circle cx="0" cy="-4" r="4" fill="${i===0 ? "#E30118" : "#4570C0"}"/><text x="16" y="0" class="repo">${esc(prettyRepo(r.name))}</text><text x="365" y="0" text-anchor="end" class="ago">${ago(r.pushed_at)}</text></g>`;
  }).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="300" viewBox="0 0 900 300">
  <defs>
    <linearGradient id="bg" x1="0" x2="1"><stop offset="0" stop-color="#07111f"/><stop offset="1" stop-color="#111d3d"/></linearGradient>
    <pattern id="grid" width="34" height="34" patternUnits="userSpaceOnUse"><path d="M34 0H0V34" fill="none" stroke="#22314f" stroke-width="1" opacity=".28"/></pattern>
    <style>text{font-family:Inter,ui-sans-serif,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}.eyebrow{font-size:10px;font-weight:700;fill:#7890b7;letter-spacing:1.3px}.title{font-size:28px;font-weight:800;fill:#fff}.body{font-size:13px;font-weight:550;fill:#aabbd6}.repo{font-size:14px;font-weight:700;fill:#dbe7ff}.ago{font-size:11px;font-weight:650;fill:#7890b7}.pill{font-size:11px;font-weight:750;fill:#fff;letter-spacing:.8px}</style>
  </defs>
  <rect width="900" height="300" rx="16" fill="url(#bg)" stroke="#2b3b5f"/><rect width="900" height="300" rx="16" fill="url(#grid)"/>
  <rect x="0" y="0" width="6" height="300" rx="3" fill="#E30118"/>
  <text x="34" y="42" class="eyebrow">CURRENT FOCUS // AUTO-DETECTED FROM GITHUB ACTIVITY</text>
  <text x="34" y="91" class="title">${esc(prettyRepo(primary.name))}</text>
  <text x="34" y="120" class="body">Most recently pushed repository on your GitHub account.</text>
  <rect x="34" y="151" width="160" height="34" rx="17" fill="#E30118"/><text x="114" y="173" text-anchor="middle" class="pill">${statusFrom(primary.pushed_at).label}</text>
  <text x="34" y="218" class="eyebrow">LAST PUSH</text><text x="34" y="244" class="repo">${ago(primary.pushed_at)}</text>
  <line x1="435" y1="72" x2="435" y2="248" stroke="#263b63"/>
  <text x="478" y="74" class="eyebrow">RECENT SYSTEMS</text>
  ${rows}
  <text x="478" y="265" class="eyebrow">REFRESHES EVERY 2 HOURS</text>
  </svg>`;
}

const repos = await listRepos();
if (!repos.length) throw new Error("No repositories available for activity detection.");
const current = repos[0];
const status = statusFrom(current.pushed_at);

fs.writeFileSync(path.join(outDir, "tech-panel.svg"), techPanel(current, status));
fs.writeFileSync(path.join(outDir, "current-focus.svg"), focusCard(repos));
console.log("Activity profile refreshed:", current.full_name, status.label);
