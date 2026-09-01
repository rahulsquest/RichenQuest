/**
 * In-memory, per-IP rate limiter.
 *
 * WHY IN-MEMORY
 *   AppSail runs this process without a shared cache, and adding Redis for one
 *   public form would be more infrastructure than the problem deserves. The
 *   trade-off is stated honestly rather than hidden: see LIMITATIONS below.
 *
 * WHY IT EXISTS
 *   POST /api/leads is public, unauthenticated, and writes a Lead to Zoho CRM.
 *   Without a limit, one script can fill the CRM with junk faster than a
 *   counsellor can delete it. The existing email-based upsert dedupes repeat
 *   submissions of the SAME address, but a bot varying the address bypasses
 *   that entirely.
 *
 * LIMITATIONS — real, and worth knowing before relying on this:
 *   - Per process. If AppSail ever runs more than one instance, each holds its
 *     own counters and the effective limit multiplies by the instance count.
 *   - Resets on restart/redeploy.
 *   - Keyed by IP, so a shared NAT (a school, an office, a phone network) is
 *     one bucket. The limit is set high enough that a real family submitting
 *     an inquiry, then a contact message, then correcting a typo, is nowhere
 *     near it.
 *   It stops casual floods and accidental double-submits. It is not a defence
 *   against a distributed attacker, and is not presented as one.
 */

/*  Bounded on purpose. An unbounded Map keyed by attacker-controlled IPs is
 *  itself a memory-exhaustion vector — the limiter would become the DoS. */
const MAX_TRACKED_IPS = 10000;

function createRateLimiter({ windowMs, max, name }) {
  const hits = new Map();   // ip -> { count, resetAt }

  function sweep(now) {
    for (const [ip, rec] of hits) {
      if (rec.resetAt <= now) hits.delete(ip);
    }
  }

  return function rateLimit(req, res, next) {
    const now = Date.now();

    /*  Express populates req.ip from X-Forwarded-For only when trust proxy is
     *  configured; devServer sets it. Falling back to the socket address means
     *  a misconfiguration degrades to "limit by proxy" — stricter than
     *  intended, never weaker. */
    const ip = req.ip || (req.socket && req.socket.remoteAddress) || 'unknown';

    let rec = hits.get(ip);
    if (!rec || rec.resetAt <= now) {
      rec = { count: 0, resetAt: now + windowMs };
      /*  Sweep only when the table is actually large, and only on a window
       *  boundary, so the common path stays O(1). */
      if (hits.size >= MAX_TRACKED_IPS) {
        sweep(now);
        /*  Still full after sweeping means every tracked window is live.
         *  Refusing to track a new IP is safer than growing without bound;
         *  the request is allowed through rather than blocked, because
         *  failing closed here would let a flood lock out real students. */
        if (hits.size >= MAX_TRACKED_IPS) return next();
      }
      hits.set(ip, rec);
    }

    rec.count += 1;

    if (rec.count > max) {
      const retryAfter = Math.max(1, Math.ceil((rec.resetAt - now) / 1000));
      res.setHeader('Retry-After', String(retryAfter));
      return res.status(429).json({
        success: false,
        error: {
          code: 'RATE_LIMITED',
          /*  No counts, no window, no IP — a caller learns it was throttled,
           *  not how to pace around the limiter. */
          message: 'Too many requests. Please wait a few minutes and try again.',
          retryAfterSeconds: retryAfter
        },
        timestamp: new Date().toISOString()
      });
    }

    return next();
  };
}

module.exports = { createRateLimiter, MAX_TRACKED_IPS };
