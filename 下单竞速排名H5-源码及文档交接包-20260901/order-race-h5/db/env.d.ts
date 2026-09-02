declare namespace Cloudflare {
  interface Env {
    DB: D1Database;
    CONTROL_PASSWORD?: string;
    SESSION_SECRET?: string;
  }
}
