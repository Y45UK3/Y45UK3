import fs from "node:fs";
import path from "node:path";

const id = "515551543941005313";
const out = path.join(process.cwd(), ".github", "assets", "discord-presence-v2.svg");

const esc = (s = "") => String(s)
  .replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;");

let username = "Y45UK3";
let display = "@y45uk3";
let status = "unknown";
let activity = "No public activity";
let ok = false;

try {
  const r = await fetch("https://api.lanyard.rest/v1/users/" + id, {
    headers: { "User-Agent": "Y45UK3-profile-presence" }
  });
  if (r.ok) {
    const json = await r.json();
    const d = json?.data;
    if (json?.success && d) {
      ok = true;
      username = d.discord_user?.global_name || d.discord_user?.username || username;
      display = "@" + (d.discord_user?.username || "y45uk3");
      status = d.discord_status || "offline";
      const a = (d.activities || []).find(x => x.type === 0 || x.type === 4) || (d.activities || [])[0];
      activity = a?.state || a?.name || (status === "offline" ? "Offline" : "Online");
    }
  }
} catch {}

const colors = { online:"#23A55A", idle:"#F0B232", dnd:"#F23F43", offline:"#80848E", unknown:"#80848E" };
const dot = colors[status] || colors.unknown;
const label = status === "dnd" ? "Do Not Disturb" : status.charAt(0).toUpperCase() + status.slice(1);
const note = ok ? "Live Discord presence" : "Status unavailable";

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="210" viewBox="0 0 900 210">
<defs>
  <linearGradient id="bg" x1="0" x2="1"><stop offset="0" stop-color="#07111f"/><stop offset="1" stop-color="#111d3d"/></linearGradient>
  <pattern id="grid" width="34" height="34" patternUnits="userSpaceOnUse"><path d="M34 0H0V34" fill="none" stroke="#22314f" stroke-width="1" opacity=".22"/></pattern>
  <style>text{font-family:Arial,Helvetica,sans-serif}.title{font-size:25px;font-weight:800;fill:#fff}.user{font-size:17px;font-weight:750;fill:#dbe7ff}.meta{font-size:11px;font-weight:700;fill:#8ea3c7;letter-spacing:.8px}.small{font-size:12px;font-weight:500;fill:#9fb2d0}</style>
</defs>
<rect width="900" height="210" rx="16" fill="url(#bg)" stroke="#2b3b5f"/><rect width="900" height="210" rx="16" fill="url(#grid)"/><rect x="0" width="6" height="210" rx="3" fill="#5865F2"/>
<circle cx="84" cy="105" r="44" fill="#5865F2"/><text x="84" y="115" text-anchor="middle" fill="#fff" font-family="Arial,Helvetica,sans-serif" font-size="28" font-weight="800">D</text>
<text x="154" y="58" class="meta">DISCORD // LIVE PRESENCE</text>
<text x="154" y="96" class="title">${esc(username)}</text>
<text x="154" y="125" class="user">${esc(display)}</text>
<text x="154" y="157" class="small">${esc(activity)}</text>
<circle cx="700" cy="91" r="8" fill="${dot}"/><text x="720" y="98" class="user">${esc(label)}</text>
<text x="700" y="131" class="small">${esc(note)}</text>
<text x="700" y="157" class="small">ID ${id}</text>
</svg>`;

fs.writeFileSync(out, svg);
console.log("Discord presence refreshed:", status, username);

// presence-check: joined Lanyard server
