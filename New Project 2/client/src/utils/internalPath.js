/**
 * Constrain a navigation target to a path inside this app.
 *
 * WHY
 *   react-router 6.30.4 (latest 6.x) carries an open-redirect advisory: a
 *   target beginning with a backslash, or with a scheme, can navigate away
 *   from the app — the "leading to XSS" variant via a javascript: target.
 *   The published fix is react-router 7, a major upgrade of the routing layer
 *   of a working site.
 *
 *   That upgrade is not warranted here, because the sink is not currently
 *   reachable: every dynamic target in this client is server-generated
 *   (notification.actionUrl, nextAction.targetRoute) and today only ever
 *   holds a literal like '/documents'. The query parameters a visitor can
 *   set (?country, ?degree) feed form field values, never a navigation.
 *
 *   But "not reachable today" rests on the server never emitting a hostile
 *   value, which is a weaker guarantee than the code enforcing it. This
 *   closes the sink at the point of use, which holds no matter what the
 *   backend sends and no matter which router version is installed — and
 *   costs nothing, unlike the major upgrade.
 *
 * @param {unknown} target   candidate route, usually from the API
 * @param {string}  fallback where to point when the target is not internal
 * @returns {string} a same-app absolute path
 */
export function internalPath(target, fallback = '/') {
  if (typeof target !== 'string') return fallback;

  const value = target.trim();

  /*  Must be a single-slash absolute path. This rejects, in order: the empty
   *  string; '//evil.com' and '/\evil.com', which browsers treat as
   *  protocol-relative and send off-origin; and anything carrying a scheme,
   *  which covers 'javascript:' and 'data:' as well as 'https:'. Backslashes
   *  are rejected outright rather than normalised — no legitimate route in
   *  this app contains one, so there is nothing to preserve. */
  if (!value.startsWith('/')) return fallback;
  if (value.includes('\\')) return fallback;
  if (value.startsWith('//')) return fallback;
  if (/^\/+[a-z][a-z0-9+.-]*:/i.test(value)) return fallback;

  return value;
}
