// Netlify serverless function: aggregates remaining API credits across providers.
// API keys live in environment variables and never reach the browser.
// All three balance-check calls below are free and do not consume credits.

const PROVIDERS = {
  leadmagic: async () => {
    const key = process.env.LEADMAGIC_API_KEY;
    if (!key) throw new Error("Missing LEADMAGIC_API_KEY");
    const r = await fetch("https://api.leadmagic.io/v1/credits", {
      headers: { "X-API-Key": key },
    });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const d = await r.json();
    return {
      credits: d.credits,
      detail: d.is_frozen ? `Frozen: ${d.credits_frozen}` : "Liquid balance",
    };
  },

  icypeas: async () => {
    const key = process.env.ICYPEAS_API_KEY;
    const email = process.env.ICYPEAS_USER_EMAIL;
    if (!key || !email) throw new Error("Missing ICYPEAS_API_KEY or ICYPEAS_USER_EMAIL");
    const r = await fetch("https://app.icypeas.com/api/a/actions/subscription-information", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: key },
      body: JSON.stringify({ email }),
    });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const d = await r.json();
    const daily = d.quotas && d.quotas.daily ? ` · ${d.quotas.daily}/day` : "";
    return { credits: d.credits, detail: `${d.plan || "Plan"}${daily}` };
  },

  bounceban: async () => {
    const key = process.env.BOUNCEBAN_API_KEY;
    if (!key) throw new Error("Missing BOUNCEBAN_API_KEY");
    const r = await fetch("https://api.bounceban.com/v1/account", {
      headers: { Authorization: key },
    });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const d = await r.json();
    return { credits: d.available_credits, detail: d.owner_email || "Account" };
  },

  discolike: async () => {
    const key = process.env.DISCOLIKE_API_KEY;
    if (!key) throw new Error("Missing DISCOLIKE_API_KEY");
    const r = await fetch("https://api.discolike.com/v1/usage", {
      headers: { "x-discolike-key": key },
    });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const d = await r.json();
    const available = Number(d.total_available_spend || 0);
    const spent = Number(d.month_to_date_spend || 0);
    const remaining = Math.round((available - spent) * 100) / 100;
    return {
      credits: remaining,
      unit: "usd", // DiscoLike credits are denominated in spend ($)
      detail: `$${spent.toFixed(2)} of $${available.toFixed(2)} used · ${d.account_status}`,
    };
  },

  aiark: async () => {
    const key = process.env.AIARK_API_KEY;
    if (!key) throw new Error("Missing AIARK_API_KEY");
    const r = await fetch("https://api.ai-ark.com/api/developer-portal/v1/payments/credits", {
      headers: { "X-TOKEN": key, "Content-Type": "application/json" },
    });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const d = await r.json();
    return { credits: d.total, detail: "Remaining credits" };
  },

  zerobounce: async () => {
    const key = process.env.ZEROBOUNCE_API_KEY;
    if (!key) throw new Error("Missing ZEROBOUNCE_API_KEY");
    const r = await fetch(`https://api.zerobounce.net/v2/getcredits?api_key=${encodeURIComponent(key)}`);
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const d = await r.json();
    const credits = Number(d.Credits);
    // ZeroBounce returns "-1" for an invalid key / error state.
    if (!Number.isFinite(credits) || credits < 0) throw new Error("Invalid API key");
    return { credits, detail: "Email validation credits" };
  },

  millionverifier: async () => {
    const key = process.env.MILLIONVERIFIER_API_KEY;
    if (!key) throw new Error("Missing MILLIONVERIFIER_API_KEY");
    const r = await fetch(`https://api.millionverifier.com/api/v3/credits?api=${encodeURIComponent(key)}`);
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const d = await r.json();
    if (d.error) throw new Error(String(d.error));
    return { credits: d.credits, detail: "Email verification credits" };
  },
};

const META = {
  leadmagic: { name: "LeadMagic", color: "#6366f1" },
  icypeas: { name: "Icypeas", color: "#06b6d4" },
  bounceban: { name: "BounceBan", color: "#f59e0b" },
  discolike: { name: "DiscoLike", color: "#ec4899" },
  aiark: { name: "AI Ark", color: "#22c55e" },
  zerobounce: { name: "ZeroBounce", color: "#a855f7" },
  millionverifier: { name: "MillionVerifier", color: "#14b8a6" },
};

exports.handler = async () => {
  const ids = Object.keys(PROVIDERS);

  const providers = await Promise.all(
    ids.map(async (id) => {
      const base = { id, name: META[id].name, color: META[id].color };
      try {
        const result = await PROVIDERS[id]();
        return { ...base, ok: true, ...result };
      } catch (err) {
        return { ...base, ok: false, credits: null, error: String(err.message || err) };
      }
    })
  );

  return {
    statusCode: 200,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
    body: JSON.stringify({ updatedAt: new Date().toISOString(), providers }),
  };
};
