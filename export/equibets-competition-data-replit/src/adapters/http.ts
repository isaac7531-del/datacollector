export interface HttpRequestOptions {
  headers?: Record<string, string>;
  timeoutMs?: number;
  signal?: AbortSignal;
}

export interface HttpClient {
  getText(url: string, options?: HttpRequestOptions): Promise<string>;
  getJson<T>(url: string, options?: HttpRequestOptions): Promise<T>;
}

export class FetchHttpClient implements HttpClient {
  constructor(private readonly defaultTimeoutMs = 30_000) {}

  async getText(url: string, options: HttpRequestOptions = {}): Promise<string> {
    const response = await this.request(url, options);
    return response.text();
  }

  async getJson<T>(url: string, options: HttpRequestOptions = {}): Promise<T> {
    const response = await this.request(url, options);
    return (await response.json()) as T;
  }

  private async request(url: string, options: HttpRequestOptions): Promise<Response> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? this.defaultTimeoutMs);

    if (options.signal) {
      if (options.signal.aborted) {
        controller.abort();
      } else {
        options.signal.addEventListener("abort", () => controller.abort(), { once: true });
      }
    }

    try {
      const response = await fetch(url, {
        method: "GET",
        headers: options.headers,
        signal: controller.signal
      });

      if (!response.ok) {
        throw new Error(`GET ${url} failed with ${response.status} ${response.statusText}`);
      }

      return response;
    } finally {
      clearTimeout(timeout);
    }
  }
}
