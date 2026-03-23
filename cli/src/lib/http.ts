import { resolveBaseUrl } from "./config.js";
import { CliError, normalizeNetworkError } from "./errors.js";

export interface RequestJsonOptions {
  baseUrl?: string;
  path: string;
  query?: Record<string, string | number | boolean | undefined>;
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
}

interface BuildRelayUrlOptions {
  baseUrl: string | undefined;
  path: string;
  query: Record<string, string | number | boolean | undefined> | undefined;
}

export function buildRelayUrl({
  baseUrl,
  path,
  query,
}: BuildRelayUrlOptions): string {
  const root = resolveBaseUrl(baseUrl);
  const url = new URL(path, `${root}/`);

  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value === undefined) {
        continue;
      }
      url.searchParams.set(key, String(value));
    }
  }

  return url.toString();
}

export async function requestJson<T>({
  baseUrl,
  path,
  query,
  timeoutMs = 5_000,
  fetchImpl = fetch,
}: RequestJsonOptions): Promise<T> {
  const url = buildRelayUrl({ baseUrl, path, query });
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetchImpl(url, {
      method: "GET",
      signal: controller.signal,
      headers: {
        accept: "application/json",
      },
    });

    if (!response.ok) {
      throw new CliError(
        `request failed: ${url} (${response.status} ${response.statusText})`,
      );
    }

    return (await response.json()) as T;
  } catch (error) {
    throw normalizeNetworkError(error, url);
  } finally {
    clearTimeout(timeoutId);
  }
}
