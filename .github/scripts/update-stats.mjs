import fs from "node:fs";
import path from "node:path";

const username = process.env.GITHUB_REPOSITORY_OWNER || "Y45UK3";
const token = process.env.GITHUB_TOKEN;

if (!token) throw new Error("GITHUB_TOKEN is required");

const outDir = path.join(process.cwd(), ".github", "assets");
fs.mkdirSync(outDir, { recursive: true });

const headers = {
  Authorization: `Bearer ${token}`,
  "User-Agent": `${username}-profile-stats`,
  Accept: "application/vnd.github+json",
};

const escapeXml = (value = "") =>
  String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");

async function github(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: { ...headers, ...(options.headers || {}) },
  });
  if (!response.ok) {
    throw new Error(`GitHub API ${response.status}: ${await response.text()}`);
  }
  return response.json();
}

async function getContributions() {
  const query = `
    query($login: String!) {
      user(login: $login) {
        contributionsCollection {
          contributionCalendar {
            weeks {
              contributionDays {
                date
                contributionCount
              }
            }
          }
        }
      }
    }
  `;

  const data = await github("https://api.github.com/graphql", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, variables: { login: username } }),
  });

  const days =
    data?.data?.user?.contributionsCollection?.contributionCalendar?.weeks
      ?.flatMap((week) => week.contributionDays) || [];

  const now = new Date();
  const months = [];

  for (let i = 11; i >= 0; i--) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    months.push({
      key: `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`,
      label: d.toLocaleString("en-US", { month: "short", timeZone: "UTC" }),
      count: 0,
    });
  }

  const map = new Map(months.map((m) => [m.key, m]));
  for (const day of days) {
    const key = day.date.slice(0, 7);
    if (map.has(key)) map.get(key).count += day.contributionCount;
  }
  return months;
}

function contributionsSvg(months) {
  const width = 900;
  const height = 300;
  const chartTop = 66;
  const chartBottom = 242;
  const left = 46;
  const right = 24;
  const gap = 10;
  const max = Math.max(...months.map((m) => m.count), 1);
  const usable = width - left - right;
  const barWidth = (usable - gap * (months.length - 1)) / months.length;

  const bars = months.map((m, i) => {
    const x = left + i * (barWidth + gap);
    const h = Math.max(2, ((chartBottom - chartTop) * m.count) / max);
    const y = chartBottom - h;
    return `
      <rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${barWidth.toFixed(1)}" height="${h.toFixed(1)}" rx="7" fill="url(#barGradient)">
        <animate attributeName="height" from="0" to="${h.toFixed(1)}" dur="0.8s" begin="${(i * 0.05).toFixed(2)}s" fill="freeze"/>
        <animate attributeName="y" from="${chartBottom}" to="${y.toFixed(1)}" dur="0.8s" begin="${(i * 0.05).toFixed(2)}s" fill="freeze"/>
      </rect>
      <text x="${(x + barWidth / 2).toFixed(1)}" y="${Math.max(y - 9, 48).toFixed(1)}" text-anchor="middle" class="count">${m.count}</text>
      <text x="${(x + barWidth / 2).toFixed(1)}" y="270" text-anchor="middle" class="month">${m.label}</text>`;
  }).join("");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs>
    <linearGradient id="bg" x1="0" x2="1">
      <stop offset="0" stop-color="#0d1117"/>
      <stop offset="1" stop-color="#111827"/>
    </linearGradient>
    <linearGradient id="barGradient" x1="0" y1="1" x2="0" y2="0">
      <stop offset="0" stop-color="#2563EB"/>
      <stop offset="0.55" stop-color="#7C3AED"/>
      <stop offset="1" stop-color="#A78BFA"/>
    </linearGradient>
    <style>
      .title{font:700 18px 'Segoe UI',Arial,sans-serif;fill:#e6edf3}
      .sub{font:400 11px 'Segoe UI',Arial,sans-serif;fill:#8b949e}
      .month{font:500 11px 'Segoe UI',Arial,sans-serif;fill:#8b949e}
      .count{font:700 10px 'Segoe UI',Arial,sans-serif;fill:#e6edf3}
    </style>
  </defs>
  <rect width="100%" height="100%" rx="14" fill="url(#bg)" stroke="#30363d"/>
  <text x="28" y="34" class="title">Contributions per Month</text>
  <text x="872" y="34" text-anchor="end" class="sub">last 12 months</text>
  <line x1="28" y1="${chartBottom}" x2="872" y2="${chartBottom}" stroke="#30363d"/>
  ${bars}
</svg>`;
}

async function getLanguages() {
  const totals = new Map();
  for (let page = 1; page <= 5; page++) {
    const repos = await github(
      `https://api.github.com/users/${username}/repos?per_page=100&page=${page}&sort=updated`
    );
    if (!repos.length) break;

    for (const repo of repos) {
      if (repo.fork || repo.archived) continue;
      const languages = await github(repo.languages_url);
      for (const [language, bytes] of Object.entries(languages)) {
        totals.set(language, (totals.get(language) || 0) + bytes);
      }
    }
    if (repos.length < 100) break;
  }

  return [...totals.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 7);
}

function languagesSvg(entries) {
  const width = 450;
  const height = 300;
  const total = entries.reduce((sum, [, bytes]) => sum + bytes, 0) || 1;
  const colors = ["#7C3AED", "#2563EB", "#60A5FA", "#A78BFA", "#22C55E", "#F59E0B", "#EC4899"];
  const cx = entries.length ? 120 : 225;
  const cy = 158;
  const r = 72;
  const stroke = 28;
  const circumference = 2 * Math.PI * r;
  let offset = 0;

  const arcs = entries.map(([name, bytes], i) => {
    const fraction = bytes / total;
    const dash = fraction * circumference;
    const el = `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${colors[i]}" stroke-width="${stroke}" stroke-dasharray="${dash.toFixed(2)} ${(circumference - dash).toFixed(2)}" stroke-dashoffset="${(-offset).toFixed(2)}" transform="rotate(-90 ${cx} ${cy})"/>`;
    offset += dash;
    return el;
  }).join("");

  const legend = entries.map(([name, bytes], i) => {
    const pct = ((bytes / total) * 100).toFixed(1);
    const y = 90 + i * 25;
    return `
      <rect x="242" y="${y - 9}" width="10" height="10" rx="2" fill="${colors[i]}"/>
      <text x="262" y="${y}" class="lang">${escapeXml(name)}</text>
      <text x="420" y="${y}" text-anchor="end" class="pct">${pct}%</text>`;
  }).join("");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs>
    <linearGradient id="bg2" x1="0" x2="1">
      <stop offset="0" stop-color="#0d1117"/>
      <stop offset="1" stop-color="#111827"/>
    </linearGradient>
    <style>
      .title{font:700 18px 'Segoe UI',Arial,sans-serif;fill:#e6edf3}
      .lang{font:600 12px 'Segoe UI',Arial,sans-serif;fill:#c9d1d9}
      .pct{font:500 11px 'Segoe UI',Arial,sans-serif;fill:#8b949e}
      .center1{font:700 17px 'Segoe UI',Arial,sans-serif;fill:#e6edf3}
      .center2{font:500 10px 'Segoe UI',Arial,sans-serif;fill:#8b949e}
    </style>
  </defs>
  <rect width="100%" height="100%" rx="14" fill="url(#bg2)" stroke="#30363d"/>
  <text x="24" y="34" class="title">Top Languages</text>
  <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#21262d" stroke-width="${stroke}"/>
  ${arcs}
  <text x="${cx}" y="${cy - 3}" text-anchor="middle" class="center1">${entries.length}</text>
  <text x="${cx}" y="${cy + 15}" text-anchor="middle" class="center2">languages</text>
  ${legend}
</svg>`;
}


async function getProfileStats() {
  const query = `
    query($login: String!) {
      user(login: $login) {
        repositories(ownerAffiliations: OWNER, privacy: PUBLIC) { totalCount }
        followers { totalCount }
        following { totalCount }
        starredRepositories { totalCount }
        contributionsCollection {
          contributionCalendar { totalContributions }
          totalCommitContributions
          totalIssueContributions
          totalPullRequestContributions
          totalPullRequestReviewContributions
          restrictedContributionsCount
        }
      }
    }
  `;

  const data = await github("https://api.github.com/graphql", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, variables: { login: username } }),
  });

  const user = data?.data?.user;
  const c = user?.contributionsCollection || {};
  return {
    totalContributions: c?.contributionCalendar?.totalContributions || 0,
    commits: c.totalCommitContributions || 0,
    pullRequests: c.totalPullRequestContributions || 0,
    issues: c.totalIssueContributions || 0,
    reviews: c.totalPullRequestReviewContributions || 0,
    privateContributions: c.restrictedContributionsCount || 0,
    publicRepos: user?.repositories?.totalCount || 0,
    followers: user?.followers?.totalCount || 0,
    following: user?.following?.totalCount || 0,
    stars: user?.starredRepositories?.totalCount || 0,
  };
}

function profileStatsSvg(stats) {
  const width = 450;
  const height = 300;
  const items = [
    ["Contributions", stats.totalContributions],
    ["Commits", stats.commits],
    ["Pull Requests", stats.pullRequests],
    ["Issues", stats.issues],
    ["Reviews", stats.reviews],
    ["Public Repos", stats.publicRepos],
  ];

  const rows = items.map(([label, value], i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = col === 0 ? 40 : 245;
    const y = 105 + row * 58;
    return `
      <text x="${x}" y="${y}" class="value">${value}</text>
      <text x="${x}" y="${y + 18}" class="label">${label}</text>`;
  }).join("");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs>
    <linearGradient id="statsBg" x1="0" x2="1">
      <stop offset="0" stop-color="#0d1117"/>
      <stop offset="1" stop-color="#111827"/>
    </linearGradient>
    <linearGradient id="statsAccent" x1="0" x2="1">
      <stop offset="0" stop-color="#7C3AED"/>
      <stop offset="1" stop-color="#2563EB"/>
    </linearGradient>
    <style>
      .title{font:700 18px 'Segoe UI',Arial,sans-serif;fill:#e6edf3}
      .sub{font:500 11px 'Segoe UI',Arial,sans-serif;fill:#8b949e}
      .value{font:700 24px 'Segoe UI',Arial,sans-serif;fill:#e6edf3}
      .label{font:500 11px 'Segoe UI',Arial,sans-serif;fill:#8b949e}
    </style>
  </defs>
  <rect width="100%" height="100%" rx="14" fill="url(#statsBg)" stroke="#30363d"/>
  <rect x="0" y="0" width="6" height="300" rx="3" fill="url(#statsAccent)"/>
  <text x="28" y="34" class="title">GitHub Stats</text>
  <text x="28" y="54" class="sub">Last 12 months + public profile totals</text>
  ${rows}
</svg>`;
}

const contributions = await getContributions();
const languages = await getLanguages();
const profileStats = await getProfileStats();

fs.writeFileSync(path.join(outDir, "contributions.svg"), contributionsSvg(contributions));
fs.writeFileSync(path.join(outDir, "languages.svg"), languagesSvg(languages));
fs.writeFileSync(path.join(outDir, "stats.svg"), profileStatsSvg(profileStats));

console.log("Profile stats generated for", username);

// Profile stats are refreshed automatically by GitHub Actions.
