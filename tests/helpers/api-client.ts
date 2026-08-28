export class TestApiClient {
  private baseUrl: string;
  private token: string | null = null;
  private cookies: Map<string, string> = new Map();

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
  }

  public setToken(token: string | null) {
    this.token = token;
  }

  public getToken(): string | null {
    return this.token;
  }

  public setCookie(cookieString: string) {
    const pair = cookieString.split(';')[0].trim();
    const equalIdx = pair.indexOf('=');
    if (equalIdx > 0) {
      const name = pair.substring(0, equalIdx).trim();
      const val = pair.substring(equalIdx + 1).trim();
      this.cookies.set(name, val);
    }
  }

  public getCookie(name: string): string | undefined {
    return this.cookies.get(name);
  }

  public clearAuth() {
    this.token = null;
    this.cookies.clear();
  }

  public getCookieHeader(): string {
    const pairs: string[] = [];
    for (const [key, val] of this.cookies.entries()) {
      pairs.push(`${key}=${val}`);
    }
    return pairs.join('; ');
  }

  public async request(path: string, options: RequestInit = {}): Promise<Response> {
    const headers: Record<string, string> = {
      ...(options.headers as Record<string, string> || {}),
    };

    if (!headers['Content-Type'] && options.body && typeof options.body === 'string') {
      headers['Content-Type'] = 'application/json';
    }

    if (this.token && !headers['Authorization']) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const cookieHeader = this.getCookieHeader();
    if (cookieHeader && !headers['Cookie']) {
      headers['Cookie'] = cookieHeader;
    }

    const fullUrl = path.startsWith('http') ? path : `${this.baseUrl}${path.startsWith('/') ? '' : '/'}${path}`;

    const response = await fetch(fullUrl, {
      ...options,
      headers,
    });

    // Capture set-cookie headers
    if (typeof response.headers.getSetCookie === 'function') {
      const setCookies = response.headers.getSetCookie();
      for (const sc of setCookies) {
        this.setCookie(sc);
      }
    } else {
      const setCookie = response.headers.get('set-cookie');
      if (setCookie) {
        // Set-Cookie strings might be comma separated if multiple
        const cookieArray = setCookie.split(/,(?=\s*[^;=]+=[^;=]+)/);
        for (const sc of cookieArray) {
          this.setCookie(sc);
        }
      }
    }

    return response;
  }

  public async post(path: string, body?: any, headers?: Record<string, string>) {
    const options: RequestInit = {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
    };
    const res = await this.request(path, options);
    const data = await res.json().catch(() => null);
    return { status: res.status, ok: res.ok, data, headers: res.headers };
  }

  public async get(path: string, headers?: Record<string, string>) {
    const options: RequestInit = {
      method: 'GET',
      headers,
    };
    const res = await this.request(path, options);
    const data = await res.json().catch(() => null);
    return { status: res.status, ok: res.ok, data, headers: res.headers };
  }

  public async delete(path: string, headers?: Record<string, string>) {
    const options: RequestInit = {
      method: 'DELETE',
      headers,
    };
    const res = await this.request(path, options);
    const data = await res.json().catch(() => null);
    return { status: res.status, ok: res.ok, data, headers: res.headers };
  }
}
