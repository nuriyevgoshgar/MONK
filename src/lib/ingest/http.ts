// A deliberately slow HTTP client for the crawl.
//
// Every request goes through one shared queue, so concurrency is impossible by
// construction rather than by discipline: the crawler cannot accidentally
// hammer the source site no matter how it is called.

export type PoliteClientOptions = {
  userAgent: string;
  /** Minimum gap between requests. Raised to match robots.txt Crawl-delay. */
  delayMs: number;
  timeoutMs?: number;
  maxRetries?: number;
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export class PoliteClient {
  private readonly userAgent: string;
  private delayMs: number;
  private readonly timeoutMs: number;
  private readonly maxRetries: number;
  private queue: Promise<unknown> = Promise.resolve();
  private lastRequestAt = 0;

  public requestCount = 0;

  constructor(options: PoliteClientOptions) {
    this.userAgent = options.userAgent;
    this.delayMs = Math.max(1000, options.delayMs);
    this.timeoutMs = options.timeoutMs ?? 30_000;
    this.maxRetries = options.maxRetries ?? 3;
  }

  /** Crawl-delay from robots.txt only ever slows us down, never speeds us up. */
  respectCrawlDelay(crawlDelayMs: number | null) {
    if (crawlDelayMs && crawlDelayMs > this.delayMs) this.delayMs = crawlDelayMs;
  }

  get currentDelayMs() {
    return this.delayMs;
  }

  private async waitForTurn() {
    const elapsed = Date.now() - this.lastRequestAt;
    if (elapsed < this.delayMs) await sleep(this.delayMs - elapsed);
    this.lastRequestAt = Date.now();
  }

  private async request(url: string): Promise<Response> {
    let lastError: unknown;

    for (let attempt = 0; attempt <= this.maxRetries; attempt += 1) {
      await this.waitForTurn();

      try {
        const response = await fetch(url, {
          headers: {
            "User-Agent": this.userAgent,
            Accept: "text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8",
          },
          redirect: "follow",
          signal: AbortSignal.timeout(this.timeoutMs),
        });

        this.requestCount += 1;

        // Back off hard when asked to, honouring Retry-After.
        if (response.status === 429 || response.status >= 500) {
          const retryAfter = Number(response.headers.get("retry-after"));
          const backoff = Number.isFinite(retryAfter) && retryAfter > 0
            ? retryAfter * 1000
            : this.delayMs * 2 ** attempt;

          lastError = new Error(`HTTP ${response.status} from ${url}`);

          if (attempt < this.maxRetries) {
            await sleep(backoff);
            continue;
          }
        }

        return response;
      } catch (error) {
        lastError = error;
        if (attempt < this.maxRetries) await sleep(this.delayMs * 2 ** attempt);
      }
    }

    throw lastError instanceof Error ? lastError : new Error(`Failed to fetch ${url}`);
  }

  /** Serialised through a single queue so only one request is ever in flight. */
  fetchText(url: string): Promise<{ status: number; body: string; url: string }> {
    const run = this.queue.then(async () => {
      const response = await this.request(url);
      return {
        status: response.status,
        body: response.ok ? await response.text() : "",
        url: response.url || url,
      };
    });

    // Keep the chain alive even when one request rejects.
    this.queue = run.catch(() => undefined);
    return run;
  }
}
