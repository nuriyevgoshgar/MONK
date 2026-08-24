// robots.txt fetching and matching (RFC 9309).
//
// This exists because the crawl must obey the source site's rules even though
// nobody checked them by hand: the script refuses to fetch a path this module
// says is disallowed. Fetch failures fail CLOSED — an unreadable robots.txt is
// treated as "do not crawl", never as permission.

export type RobotsRules = {
  allow: string[];
  disallow: string[];
  crawlDelayMs: number | null;
  /** True when the site served no robots.txt at all (404), which means no restrictions. */
  absent: boolean;
};

/** "MONK/0.1 (+https://…)" -> "monk", the token robots.txt groups are keyed by. */
export function userAgentToken(userAgent: string): string {
  return (userAgent.split("/")[0] ?? userAgent).trim().toLowerCase();
}

// Parses the groups and keeps the one matching our token, else the `*` group.
export function parseRobots(body: string, token: string): RobotsRules {
  const groups = new Map<string, { allow: string[]; disallow: string[]; delay: number | null }>();
  let active: string[] = [];
  let lastLineWasAgent = false;

  const ensure = (agent: string) => {
    if (!groups.has(agent)) groups.set(agent, { allow: [], disallow: [], delay: null });
    return groups.get(agent)!;
  };

  for (const rawLine of body.split(/\r?\n/)) {
    const line = rawLine.split("#")[0].trim();
    if (!line) continue;

    const separator = line.indexOf(":");
    if (separator === -1) continue;

    const field = line.slice(0, separator).trim().toLowerCase();
    const value = line.slice(separator + 1).trim();

    if (field === "user-agent") {
      // Consecutive user-agent lines share one group of rules.
      if (!lastLineWasAgent) active = [];
      active.push(value.toLowerCase());
      ensure(value.toLowerCase());
      lastLineWasAgent = true;
      continue;
    }

    lastLineWasAgent = false;
    if (active.length === 0) continue;

    for (const agent of active) {
      const group = ensure(agent);

      if (field === "disallow") group.disallow.push(value);
      else if (field === "allow") group.allow.push(value);
      else if (field === "crawl-delay") {
        const seconds = Number(value);
        if (Number.isFinite(seconds) && seconds >= 0) group.delay = seconds * 1000;
      }
    }
  }

  const group = groups.get(token) ?? groups.get("*");

  return {
    allow: group?.allow ?? [],
    // An empty Disallow value means "nothing is disallowed", so drop it.
    disallow: (group?.disallow ?? []).filter((path) => path !== ""),
    crawlDelayMs: group?.delay ?? null,
    absent: false,
  };
}

// robots.txt wildcards: * matches any run of characters, $ anchors the end.
function ruleToRegExp(rule: string): RegExp {
  const escaped = rule
    .replace(/[.+?^${}()|[\]\\]/g, "\\$&")
    .replace(/\*/g, ".*");

  return escaped.endsWith("\\$")
    ? new RegExp("^" + escaped.slice(0, -2) + "$")
    : new RegExp("^" + escaped);
}

function longestMatch(path: string, rules: string[]): number {
  let best = -1;

  for (const rule of rules) {
    if (ruleToRegExp(rule).test(path)) best = Math.max(best, rule.length);
  }

  return best;
}

/** RFC 9309: the longest matching rule wins; Allow wins a tie. */
export function isAllowed(rules: RobotsRules, url: string): boolean {
  if (rules.absent) return true;

  const path = new URL(url).pathname + new URL(url).search;
  const allow = longestMatch(path, rules.allow);
  const disallow = longestMatch(path, rules.disallow);

  if (disallow === -1) return true;
  return allow >= disallow;
}

export async function fetchRobots(
  baseUrl: string,
  userAgent: string,
): Promise<RobotsRules> {
  const target = new URL("/robots.txt", baseUrl).toString();
  const response = await fetch(target, {
    headers: { "User-Agent": userAgent, Accept: "text/plain" },
    signal: AbortSignal.timeout(20_000),
  });

  // No robots.txt means no restrictions.
  if (response.status === 404 || response.status === 410) {
    return { allow: [], disallow: [], crawlDelayMs: null, absent: true };
  }

  if (!response.ok) {
    throw new Error(
      `robots.txt returned ${response.status}. Refusing to crawl: an unreadable ` +
        `robots.txt is treated as "disallowed", not as permission.`,
    );
  }

  return parseRobots(await response.text(), userAgentToken(userAgent));
}
