const webhook = process.env.DISCORD_WEBHOOK_URL;

if (!webhook) {
  console.log("DISCORD_WEBHOOK_URL is not configured; skipping Discord notification.");
  process.exit(0);
}

const repo = process.env.REPO || "Y45UK3/Y45UK3";
const sha = (process.env.SHA || "").slice(0, 7);
const runUrl = process.env.RUN_URL || `https://github.com/${repo}/actions`;
const jobStatus = process.env.JOB_STATUS || "unknown";

const payload = {
  username: "Y45UK3 GitHub Profile",
  avatar_url: "https://github.githubassets.com/images/modules/logos_page/GitHub-Mark.png",
  embeds: [{
    title: jobStatus === "success" ? "GitHub Profile Update Complete" : "GitHub Profile Update Needs Attention",
    description: jobStatus === "success" ? "The automated profile build and statistics refresh finished successfully." : "The profile automation finished with a non-success status. Open the workflow run for details.",
    url: runUrl,
    color: jobStatus === "success" ? 14876952 : 15158332,
    thumbnail: { url: "https://github.githubassets.com/images/modules/logos_page/GitHub-Mark.png" },
    fields: [
      { name: "Repository", value: repo, inline: true },
      { name: "Commit", value: sha || "n/a", inline: true },
      { name: "Status", value: jobStatus === "success" ? "✅ Completed" : `⚠️ ${jobStatus}`, inline: true }
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
