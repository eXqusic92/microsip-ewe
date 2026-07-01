"use strict";

const crypto = require("crypto");

function text(value, fallback = "") {
  return value === null || value === undefined ? fallback : String(value).trim();
}

function nowIso() {
  return new Date().toISOString();
}

function normalizeUsername(value) {
  return text(value).toLowerCase();
}

function isValidUsername(value) {
  const username = normalizeUsername(value);
  const login = /^[a-z0-9._-]{3,32}$/.test(username);
  const email =
    username.length <= 120 &&
    /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/.test(
      username
    );
  return login || email;
}

function safeUser(user) {
  if (!user) {
    return null;
  }
  return {
    id: user.id,
    username: user.username,
    name: user.name || user.username,
    role: user.role || "user",
    createdAt: user.createdAt,
    updatedAt: user.updatedAt
  };
}

function parseSeedAdmins(value) {
  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => {
      const separator = item.indexOf(":");
      if (separator < 1) {
        return null;
      }
      const username = normalizeUsername(item.slice(0, separator));
      const password = item.slice(separator + 1);
      return username && password ? { username, password, name: username } : null;
    })
    .filter(Boolean);
}

function hashPassword(password, iterations) {
  const salt = crypto.randomBytes(16).toString("hex");
  const digest = "sha256";
  const hash = crypto
    .pbkdf2Sync(String(password), salt, iterations, 32, digest)
    .toString("hex");
  return `pbkdf2:${digest}:${iterations}:${salt}:${hash}`;
}

function verifyPassword(password, stored) {
  const [scheme, digest, iterationsRaw, salt, expectedHash] = String(
    stored || ""
  ).split(":");
  if (scheme !== "pbkdf2" || !digest || !iterationsRaw || !salt || !expectedHash) {
    return false;
  }

  const iterations = Number(iterationsRaw);
  if (!Number.isFinite(iterations) || iterations <= 0) {
    return false;
  }

  const actual = crypto.pbkdf2Sync(String(password), salt, iterations, 32, digest);
  const expected = Buffer.from(expectedHash, "hex");
  return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
}

function mapUser(row) {
  if (!row) {
    return null;
  }
  return {
    id: row.id,
    username: row.username,
    name: row.name,
    role: row.role || "user",
    password: row.password_hash,
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : null,
    updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : null
  };
}

function mapSession(row) {
  if (!row) {
    return null;
  }
  return {
    id: row.id,
    userId: row.user_id,
    csrfToken: row.csrf_token,
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : null,
    updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : null,
    lastSeenAt: row.last_seen_at ? new Date(row.last_seen_at).toISOString() : null,
    expiresAt: row.expires_at ? new Date(row.expires_at).toISOString() : null
  };
}

class AuthService {
  constructor(config, pool, sendJson) {
    if (!pool) {
      throw new Error("AuthService requires app-state PostgreSQL pool");
    }
    this.config = config.auth || {};
    this.pool = pool;
    this.sendJson = sendJson;
    this.readyPromise = null;
  }

  get cookieName() {
    return this.config.sessionCookieName || "client_info_sid";
  }

  get csrfHeaderName() {
    return this.config.csrfHeaderName || "x-csrf-token";
  }

  get ttlMillis() {
    return Math.max(60 * 1000, Number(this.config.sessionTtlMillis || 0));
  }

  get touchIntervalMillis() {
    return Math.max(
      0,
      Math.min(5 * 60 * 1000, Math.floor(this.ttlMillis / 4))
    );
  }

  get pbkdf2Iterations() {
    return Math.max(100000, Number(this.config.pbkdf2Iterations || 210000));
  }

  get minPasswordLength() {
    return Math.max(8, Number(this.config.minPasswordLength || 8));
  }

  sessionSecret() {
    const secret = text(this.config.sessionSecret);
    if (!secret || secret === "change-me") {
      throw new Error("AUTH_SESSION_SECRET is required");
    }
    return secret;
  }

  ensureReady() {
    if (!this.readyPromise) {
      this.readyPromise = this.prepare();
    }
    return this.readyPromise;
  }

  async prepare() {
    await this.cleanupExpiredSessions();
    const count = await this.userCount();
    if (count > 0) {
      return;
    }

    const seedAdmins = parseSeedAdmins(this.config.seedAdmins);
    if (!seedAdmins.length) {
      throw new Error("AUTH_SEED_ADMINS is required when users table is empty");
    }

    for (const admin of seedAdmins) {
      if (!isValidUsername(admin.username)) {
        throw new Error(`Invalid AUTH_SEED_ADMINS username: ${admin.username}`);
      }
      if (String(admin.password || "").length < this.minPasswordLength) {
        throw new Error(
          `AUTH_SEED_ADMINS password for ${admin.username} must be at least ${this.minPasswordLength} chars`
        );
      }
    }

    for (const admin of seedAdmins) {
      await this.createUser({
        username: admin.username,
        password: admin.password,
        name: admin.name || admin.username,
        role: "admin"
      });
    }
  }

  async userCount() {
    const result = await this.pool.query("SELECT count(*)::int AS count FROM users");
    return Number(result.rows[0] && result.rows[0].count) || 0;
  }

  async createUser({ username, password, name, role = "user" }) {
    const current = nowIso();
    const normalizedUsername = normalizeUsername(username);
    const passwordHash = hashPassword(password, this.pbkdf2Iterations);
    const result = await this.pool.query(
      `
        INSERT INTO users (
          id, username, name, role, password_hash, permissions, created_at, updated_at
        )
        VALUES ($1, $2, $3, $4, $5, '[]'::jsonb, $6, $6)
        ON CONFLICT (username) DO NOTHING
        RETURNING *
      `,
      [
        crypto.randomUUID(),
        normalizedUsername,
        text(name, normalizedUsername) || normalizedUsername,
        role === "admin" ? "admin" : "user",
        passwordHash,
        current
      ]
    );
    return mapUser(result.rows[0]);
  }

  async readUserByUsername(username) {
    const result = await this.pool.query(
      `
        SELECT id, username, name, role, password_hash, created_at, updated_at
        FROM users
        WHERE username = $1
        LIMIT 1
      `,
      [normalizeUsername(username)]
    );
    return mapUser(result.rows[0]);
  }

  async readUserById(userId) {
    const result = await this.pool.query(
      `
        SELECT id, username, name, role, password_hash, created_at, updated_at
        FROM users
        WHERE id = $1
        LIMIT 1
      `,
      [text(userId)]
    );
    return mapUser(result.rows[0]);
  }

  signSessionId(sessionId) {
    return crypto
      .createHmac("sha256", this.sessionSecret())
      .update(sessionId)
      .digest("base64url");
  }

  packSessionCookie(sessionId) {
    return `${sessionId}.${this.signSessionId(sessionId)}`;
  }

  unpackSessionCookie(value) {
    const [sessionId, signature] = String(value || "").split(".");
    if (!sessionId || !signature) {
      return "";
    }

    const expected = this.signSessionId(sessionId);
    const actualBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expected);
    if (
      actualBuffer.length !== expectedBuffer.length ||
      !crypto.timingSafeEqual(actualBuffer, expectedBuffer)
    ) {
      return "";
    }
    return sessionId;
  }

  getCookie(request, name) {
    const header = String((request.headers && request.headers.cookie) || "");
    const cookies = header
      .split(";")
      .map((item) => item.trim())
      .filter(Boolean);
    const prefix = `${name}=`;
    const pair = cookies.find((item) => item.startsWith(prefix));
    if (!pair) {
      return "";
    }
    try {
      return decodeURIComponent(pair.slice(prefix.length));
    } catch {
      return "";
    }
  }

  sessionCookie(value, maxAge) {
    const secure = this.config.cookieSecure ? "; Secure" : "";
    return `${this.cookieName}=${encodeURIComponent(value)}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${maxAge}${secure}`;
  }

  setSessionCookie(response, sessionId) {
    response.setHeader(
      "Set-Cookie",
      this.sessionCookie(this.packSessionCookie(sessionId), Math.floor(this.ttlMillis / 1000))
    );
  }

  clearSessionCookie(response) {
    response.setHeader("Set-Cookie", this.sessionCookie("", 0));
  }

  requestInfo(request) {
    return {
      ip: String(
        request.headers["x-forwarded-for"] ||
        request.socket.remoteAddress ||
        ""
      )
        .split(",")[0]
        .trim(),
      userAgent: String(request.headers["user-agent"] || "").slice(0, 220)
    };
  }

  async createSession(user, request) {
    const id = crypto.randomBytes(32).toString("base64url");
    const csrfToken = crypto.randomBytes(32).toString("base64url");
    const expiresAt = new Date(Date.now() + this.ttlMillis).toISOString();
    const info = this.requestInfo(request);
    const result = await this.pool.query(
      `
        INSERT INTO user_sessions (
          id, user_id, csrf_token, expires_at, request_ip, request_user_agent
        )
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `,
      [id, user.id, csrfToken, expiresAt, info.ip, info.userAgent]
    );
    return mapSession(result.rows[0]);
  }

  async readSession(sessionId) {
    const result = await this.pool.query(
      `
        SELECT *
        FROM user_sessions
        WHERE id = $1
          AND expires_at > now()
        LIMIT 1
      `,
      [text(sessionId)]
    );
    return mapSession(result.rows[0]);
  }

  async touchSession(sessionId, request) {
    const expiresAt = new Date(Date.now() + this.ttlMillis).toISOString();
    const info = this.requestInfo(request);
    const result = await this.pool.query(
      `
        UPDATE user_sessions
        SET expires_at = $2,
            updated_at = now(),
            last_seen_at = now(),
            request_ip = $3,
            request_user_agent = $4
        WHERE id = $1
          AND expires_at > now()
        RETURNING *
      `,
      [text(sessionId), expiresAt, info.ip, info.userAgent]
    );
    return mapSession(result.rows[0]);
  }

  async deleteSession(sessionId) {
    await this.pool.query("DELETE FROM user_sessions WHERE id = $1", [
      text(sessionId)
    ]);
  }

  async cleanupExpiredSessions() {
    await this.pool.query("DELETE FROM user_sessions WHERE expires_at <= now()");
  }

  async getRequestAuth(request) {
    await this.ensureReady();
    const sessionId = this.unpackSessionCookie(
      this.getCookie(request, this.cookieName)
    );
    if (!sessionId) {
      return null;
    }

    const session = await this.readSession(sessionId);
    if (!session) {
      return null;
    }

    const user = await this.readUserById(session.userId);
    if (!user) {
      await this.deleteSession(sessionId);
      return null;
    }

    const lastSeenAt = Date.parse(session.lastSeenAt || "");
    if (
      this.touchIntervalMillis > 0 &&
      Number.isFinite(lastSeenAt) &&
      Date.now() - lastSeenAt < this.touchIntervalMillis
    ) {
      return { sessionId, session, user };
    }

    const touched = await this.touchSession(sessionId, request);
    return touched ? { sessionId, session: touched, user } : null;
  }

  async requireAuth(request, response) {
    const auth = await this.getRequestAuth(request);
    if (!auth) {
      this.sendJson(response, 401, {
        ok: false,
        error: "unauthorized",
        loginUrl: "/login"
      });
      return null;
    }

    if (!["GET", "HEAD", "OPTIONS"].includes(request.method)) {
      const csrfToken = request.headers[this.csrfHeaderName];
      if (!csrfToken || csrfToken !== auth.session.csrfToken) {
        this.sendJson(response, 403, {
          ok: false,
          error: "invalid_csrf_token"
        });
        return null;
      }
    }

    return auth;
  }

  async handleLogin(request, response, readJsonBody) {
    if (request.method !== "POST") {
      response.writeHead(405, { Allow: "POST" });
      response.end("Method not allowed");
      return;
    }

    await this.ensureReady();
    const payload = await readJsonBody(request, 32 * 1024);
    const username = normalizeUsername(payload.username);
    const password = String(payload.password || "");
    const user = await this.readUserByUsername(username);

    if (!user || !verifyPassword(password, user.password)) {
      this.sendJson(response, 401, {
        ok: false,
        error: "invalid_credentials"
      });
      return;
    }

    const session = await this.createSession(user, request);
    this.setSessionCookie(response, session.id);
    this.sendJson(response, 200, {
      ok: true,
      user: safeUser(user),
      csrfToken: session.csrfToken
    });
  }

  async handleLogout(request, response) {
    const auth = await this.requireAuth(request, response);
    if (!auth) {
      return;
    }
    await this.deleteSession(auth.sessionId);
    this.clearSessionCookie(response);
    this.sendJson(response, 200, { ok: true });
  }

  async handleMe(request, response) {
    const auth = await this.requireAuth(request, response);
    if (!auth) {
      return;
    }
    this.sendJson(response, 200, {
      ok: true,
      user: safeUser(auth.user),
      csrfToken: auth.session.csrfToken
    });
  }
}

module.exports = {
  AuthService,
  hashPassword,
  isValidUsername,
  normalizeUsername,
  parseSeedAdmins,
  safeUser,
  verifyPassword
};
