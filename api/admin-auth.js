"use strict";

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

function json(res, status, payload) {
  res.statusCode = status;
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.end(JSON.stringify(payload));
}

module.exports = async (req, res) => {
  res.setHeader("cache-control", "no-store");

  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    res.end();
    return;
  }

  if (req.method !== "POST") {
    json(res, 405, { error: "Method not allowed" });
    return;
  }

  const adminToken = String(process.env.ADMIN_SYNC_TOKEN || "").trim();
  if (!adminToken) {
    json(res, 500, { error: "ADMIN_SYNC_TOKEN is not configured" });
    return;
  }

  let body = {};
  try {
    body = await readJsonBody(req);
  } catch (error) {
    json(res, 400, { error: "Invalid JSON body" });
    return;
  }

  const provided = String(req.headers["x-admin-token"] || body.token || "").trim();
  if (!provided || provided !== adminToken) {
    json(res, 401, { ok: false });
    return;
  }

  json(res, 200, { ok: true });
};
