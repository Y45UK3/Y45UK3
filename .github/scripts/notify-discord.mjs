const webhook = process.env.DISCORD_WEBHOOK_URL;

if (!webhook) {
  console.log("DISCORD_WEBHOOK_URL is not configured; skipping Discord notification.");
  process.exit(0);
}

const repo = process.env.REPO || "Y45UK3/Y45UK3";
const sha = (process.env.SHA || "").slice(0, 7);
const runUrl = process.env.RUN_URL || `https://github.com/${repo}/actions`;

const payload = {
  username: "Y45UK3 GitHub Profile",
  avatar_url: "https://github.githubassets.com/images/modules/logos_page/GitHub-Mark.png",
  embeds: [{
    title: "GitHub Profile Update Complete",
    description: "The automated profile build and statistics refresh finished successfully.",
    url: runUrl,
    color: 14876952,
    thumbnail: { url: "https://github.githubassets.com/images/modules/logos_page/GitHub-Mark.png" },
    fields: [
      { name: "Repository", value: repo, inline: true },
      { name: "Commit", value: sha || "n/a", inline: true },
      { name: "Status", value: "✅ Completed", inline: true }
    ],
    footer: { text: 'Thumula "Y45UK3" Kulajitha • Profile Automation' },
    timestamp: new Date().toISOString()
  }]
};

const response = await fetch(webhook, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(payload)
});
if (!response.ok) throw new Error(`Discord webhook failed: ${response.status} ${await response.text()}`);
console.log("Discord notification sent.");
