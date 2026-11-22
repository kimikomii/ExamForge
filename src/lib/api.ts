const HTML_WAKE_MAX_RETRIES = 2;
const HTML_WAKE_DELAY_MS = 3000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function postExamWithProgress<T>(
  url: string,
  payload: unknown,
  onStatus?: (message: string) => void
): Promise<T> {
  for (let attempt = 0; attempt <= HTML_WAKE_MAX_RETRIES; attempt += 1) {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const rawText = await res.text();
    const trimmedLower = rawText.trimStart().toLowerCase();
    const isHtmlWakePage =
      trimmedLower.startsWith('<!doctype') || trimmedLower.startsWith('<html');

    if (isHtmlWakePage) {
      if (attempt < HTML_WAKE_MAX_RETRIES) {
        onStatus?.('Waking up AI server, please wait...');
        await sleep(HTML_WAKE_DELAY_MS);
        continue;
      }

      throw new Error(
        `HTTP ${res.status}: The preview server is still waking up (returned an HTML page). Please wait a moment and try again.`
      );
    }

    let parsed: any = null;
    try {
      parsed = rawText ? JSON.parse(rawText) : null;
    } catch {
      throw new Error(
        `HTTP ${res.status}: ${rawText.slice(0, 300) || res.statusText || 'Invalid server response'}`
      );
    }

    if (!res.ok) {
      const errMsg =
        typeof parsed?.error === 'string'
          ? parsed.error
          : typeof parsed?.message === 'string'
            ? parsed.message
            : rawText || res.statusText || 'Request failed';
      throw new Error(errMsg.startsWith('HTTP ') ? errMsg : `HTTP ${res.status}: ${errMsg}`);
    }

    if (parsed === null) {
      throw new Error(`HTTP ${res.status}: Empty JSON payload returned from server.`);
    }

    return parsed as T;
  }

  throw new Error('Request failed after waking up server.');
}
