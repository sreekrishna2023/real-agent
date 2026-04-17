const express = require("express");
const path = require("path");
const fs = require("fs");
const dotenv = require("dotenv");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || "dev-secret";
const USERS_FILE = path.join(__dirname, "data", "users.json");
const isProd = process.env.NODE_ENV === "production";

app.set("trust proxy", 1);

function getAllowedOrigins() {
  const raw = process.env.CLIENT_ORIGINS || process.env.CLIENT_ORIGIN || "";
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

app.use((req, res, next) => {
  const allowed = getAllowedOrigins();
  if (!allowed.length) {
    return next();
  }
  const origin = req.headers.origin;
  if (origin && allowed.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.setHeader("Vary", "Origin");
  }
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    return res.sendStatus(204);
  }
  return next();
});

function authCookieOptions() {
  return {
    httpOnly: true,
    maxAge: 7 * 24 * 60 * 60 * 1000,
    sameSite: isProd ? "none" : "lax",
    secure: isProd,
    path: "/"
  };
}

function clearAuthCookie(res) {
  res.clearCookie("token", {
    path: "/",
    httpOnly: true,
    sameSite: isProd ? "none" : "lax",
    secure: isProd
  });
}

app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));

ensureDataFiles();

function ensureDataFiles() {
  const dataDir = path.join(__dirname, "data");
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  if (!fs.existsSync(USERS_FILE)) {
    fs.writeFileSync(USERS_FILE, JSON.stringify({ users: [] }, null, 2), "utf8");
  }
}

function readUsers() {
  const raw = fs.readFileSync(USERS_FILE, "utf8");
  return JSON.parse(raw).users || [];
}

function writeUsers(users) {
  fs.writeFileSync(USERS_FILE, JSON.stringify({ users }, null, 2), "utf8");
}

function createToken(user) {
  return jwt.sign(
    { id: user.id, name: user.name, email: user.email, role: user.role || "agent" },
    JWT_SECRET,
    { expiresIn: "7d" }
  );
}

function authRequired(req, res, next) {
  const token = req.cookies?.token;
  if (!token) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    return next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid token" });
  }
}

function sanitizeUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role || "agent",
    brokerage: user.brokerage || "",
    market: user.market || ""
  };
}

app.post("/api/auth/register", async (req, res) => {
  const { name, email, password, brokerage, market } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ error: "Name, email, and password are required." });
  }
  if (password.length < 8) {
    return res.status(400).json({ error: "Password must be at least 8 characters." });
  }

  const users = readUsers();
  const exists = users.find((u) => u.email.toLowerCase() === email.toLowerCase());
  if (exists) {
    return res.status(409).json({ error: "User already exists." });
  }

  const hash = await bcrypt.hash(password, 10);
  const newUser = {
    id: Date.now().toString(),
    name,
    email,
    passwordHash: hash,
    role: "agent",
    brokerage: brokerage || "",
    market: market || "",
    createdAt: new Date().toISOString()
  };

  users.push(newUser);
  writeUsers(users);

  const token = createToken(newUser);
  res.cookie("token", token, authCookieOptions());

  return res.json({ user: sanitizeUser(newUser) });
});

app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required." });
  }

  const users = readUsers();
  const user = users.find((u) => u.email.toLowerCase() === email.toLowerCase());
  if (!user) {
    return res.status(401).json({ error: "Invalid credentials." });
  }

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) {
    return res.status(401).json({ error: "Invalid credentials." });
  }

  const token = createToken(user);
  res.cookie("token", token, authCookieOptions());

  return res.json({ user: sanitizeUser(user) });
});

app.post("/api/auth/logout", (req, res) => {
  clearAuthCookie(res);
  return res.json({ ok: true });
});

app.get("/api/auth/me", authRequired, (req, res) => {
  return res.json({ user: req.user });
});

async function fetchRentcastListings(query, limit = 5) {
  if (!process.env.RENTCAST_API_KEY) return [];
  const url = `https://api.rentcast.io/v1/listings/sale?city=${encodeURIComponent(query)}&limit=${limit}`;
  const response = await fetch(url, {
    headers: {
      accept: "application/json",
      "X-Api-Key": process.env.RENTCAST_API_KEY
    }
  });
  if (!response.ok) {
    return [];
  }
  const data = await response.json();
  return Array.isArray(data) ? data : [];
}

async function fetchSerpResults(query, limit = 5) {
  if (!process.env.SERPAPI_API_KEY) return [];
  const url = `https://serpapi.com/search.json?engine=google&q=${encodeURIComponent(query)}&num=${limit}&api_key=${process.env.SERPAPI_API_KEY}`;
  const response = await fetch(url);
  if (!response.ok) {
    return [];
  }
  const data = await response.json();
  return (data.organic_results || []).map((item) => ({
    title: item.title,
    link: item.link,
    snippet: item.snippet
  }));
}

function formatListings(listings) {
  if (!listings.length) return "No live listing data was found from configured listing APIs.";
  return listings
    .slice(0, 5)
    .map((l, index) => {
      const address = [l.addressLine1, l.city, l.state, l.zipCode].filter(Boolean).join(", ");
      const price = l.price ? `$${Number(l.price).toLocaleString()}` : "N/A";
      const beds = l.bedrooms ?? "N/A";
      const baths = l.bathrooms ?? "N/A";
      return `${index + 1}. ${address} | Price: ${price} | Beds: ${beds} | Baths: ${baths}`;
    })
    .join("\n");
}

function formatSearchResults(results) {
  if (!results.length) return "No web results were returned from search connector.";
  return results
    .slice(0, 5)
    .map((r, idx) => `${idx + 1}. ${r.title}\nURL: ${r.link}\nSnippet: ${r.snippet || "N/A"}`)
    .join("\n\n");
}

async function askOpenAI(messages) {
  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
    },
    body: JSON.stringify({ model, messages, temperature: 0.3 })
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error?.message || "OpenAI request failed");
  }
  return data.choices?.[0]?.message?.content || "No response generated.";
}

async function askGemini(prompt) {
  const model = process.env.GEMINI_MODEL || "gemini-1.5-flash";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`;
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.3 }
    })
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error?.message || "Gemini request failed");
  }
  return data.candidates?.[0]?.content?.parts?.[0]?.text || "No response generated.";
}

async function askAnthropic(prompt) {
  const model = process.env.ANTHROPIC_MODEL || "claude-3-5-sonnet-20241022";
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01"
    },
    body: JSON.stringify({
      model,
      max_tokens: 1024,
      temperature: 0.3,
      messages: [{ role: "user", content: prompt }]
    })
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error?.message || "Anthropic request failed");
  }
  const textBlock = (data.content || []).find((b) => b.type === "text");
  return textBlock?.text || "No response generated.";
}

app.post("/api/chat", authRequired, async (req, res) => {
  const { message, context = {} } = req.body;
  if (!message || !message.trim()) {
    return res.status(400).json({ error: "Message is required." });
  }

  try {
    const locationHint = context.location || req.user.market || "United States";
    const [listings, searchResults] = await Promise.all([
      fetchRentcastListings(locationHint, 5),
      fetchSerpResults(`real estate insights ${locationHint} Zillow market trends`, 5)
    ]);

    const systemInstruction =
      "You are an expert AI assistant for professional real estate agents. " +
      "Provide accurate, practical, and compliant guidance. " +
      "When uncertain, clearly say assumptions and suggest verification steps. " +
      "Do not fabricate legal claims. Mention that users should verify legal/financial decisions with licensed professionals.";

    const enrichedPrompt = `
SYSTEM INSTRUCTION:
${systemInstruction}

AGENT PROFILE:
Name: ${req.user.name}
Email: ${req.user.email}
Market: ${req.user.market || "Unknown"}
Brokerage: ${req.user.brokerage || "Unknown"}

LIVE LISTING DATA:
${formatListings(listings)}

WEB MARKET SIGNALS:
${formatSearchResults(searchResults)}

USER QUESTION:
${message}

Please answer with:
1) Direct answer
2) Actionable steps for the agent
3) Risks/compliance notes
4) If applicable, short property/market insights from data above.
`;

    const provider = (process.env.LLM_PROVIDER || "openai").toLowerCase();
    let answer = "";

    if (provider === "gemini") {
      if (!process.env.GEMINI_API_KEY) throw new Error("Missing GEMINI_API_KEY.");
      answer = await askGemini(enrichedPrompt);
    } else if (provider === "anthropic") {
      if (!process.env.ANTHROPIC_API_KEY) throw new Error("Missing ANTHROPIC_API_KEY.");
      answer = await askAnthropic(enrichedPrompt);
    } else {
      if (!process.env.OPENAI_API_KEY) throw new Error("Missing OPENAI_API_KEY.");
      answer = await askOpenAI([
        { role: "system", content: systemInstruction },
        { role: "user", content: enrichedPrompt }
      ]);
    }

    return res.json({
      answer,
      meta: {
        provider,
        locationHint,
        listingCount: listings.length,
        webSignalCount: searchResults.length
      }
    });
  } catch (err) {
    return res.status(500).json({
      error: "Chat request failed.",
      details: err.message
    });
  }
});

app.get("/login", (_, res) => res.sendFile(path.join(__dirname, "public", "login.html")));
app.get("/register", (_, res) => res.sendFile(path.join(__dirname, "public", "register.html")));
app.get("/dashboard", (_, res) => res.sendFile(path.join(__dirname, "public", "dashboard.html")));

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
