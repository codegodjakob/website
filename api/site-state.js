"use strict";

const TABLE = process.env.SUPABASE_SITE_STATE_TABLE || "site_state";
const STATE_ROW_ID = Number(process.env.SUPABASE_SITE_STATE_ID || "1");

function json(res, status, payload) {
  res.statusCode = status;
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.end(JSON.stringify(payload));
}

async function readJsonBody(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk)));
  }
  if (!chunks.length) return {};
  const text = Buffer.concat(chunks).toString("utf8").trim();
  if (!text) return {};
  return JSON.parse(text);
}

function normalizeUrl(url) {
  if (!url) return "";
  return String(url).replace(/\/+$/, "");
}

async function supabaseFetch(path, init) {
  const url = normalizeUrl(process.env.SUPABASE_URL);
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  }

  return fetch(`${url}${path}`, {
    ...init,
    headers: {
      apikey: key,
      authorization: `Bearer ${key}`,
      ...(init?.headers || {})
    }
  });
}

module.exports = async (req, res) => {
  res.setHeader("cache-control", "no-store");

  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    res.end();
    return;
  }

  if (req.method === "GET") {
    try {
      const response = await supabaseFetch(
        `/rest/v1/${TABLE}?id=eq.${STATE_ROW_ID}&select=data,updated_at&limit=1`,
        { method: "GET" }
      );
      if (!response.ok) {
        const detail = await response.text();
        json(res, response.status, { error: "Read failed", detail });
        return;
      }
      const rows = await response.json();
      const row = Array.isArray(rows) ? rows[0] : null;
      json(res, 200, {
        data: row?.data || null,
        updatedAt: row?.updated_at || null
      });
    } catch (error) {
      json(res, 500, { error: "Server read error", detail: String(error?.message || error) });
    }
    return;
  }

  if (req.method === "POST") {
    const adminToken = process.env.ADMIN_SYNC_TOKEN || "";
    if (!adminToken) {
      json(res, 500, { error: "ADMIN_SYNC_TOKEN is not configured" });
      return;
    }

    let body;
    try {
      body = await readJsonBody(req);
    } catch (error) {
      json(res, 400, { error: "Invalid JSON body" });
      return;
    }

    const providedToken = String(req.headers["x-admin-token"] || body?.token || "").trim();
    if (!providedToken || providedToken !== adminToken) {
      json(res, 401, { error: "Unauthorized" });
      return;
    }

    if (!body?.data || typeof body.data !== "object" || Array.isArray(body.data)) {
      json(res, 400, { error: "Body must contain a data object" });
      return;
    }

    try {
      const response = await supabaseFetch(`/rest/v1/${TABLE}?on_conflict=id`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          prefer: "resolution=merge-duplicates,return=representation"
        },
        body: JSON.stringify([{ id: STATE_ROW_ID, data: body.data }])
      });
      if (!response.ok) {
        const detail = await response.text();
        json(res, response.status, { error: "Write failed", detail });
        return;
      }
      const rows = await response.json();
      const row = Array.isArray(rows) ? rows[0] : null;
      json(res, 200, { ok: true, updatedAt: row?.updated_at || null });
    } catch (error) {
      json(res, 500, { error: "Server write error", detail: String(error?.message || error) });
    }
    return;
  }

  json(res, 405, { error: "Method not allowed" });
};
