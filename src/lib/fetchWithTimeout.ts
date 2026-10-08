// Bound Supabase connection/header waits while preserving SDK cancellation.
export async function fetchWithTimeout(input: RequestInfo | URL, init?: RequestInit) {
  const controller = new AbortController();
  const upstream = init?.signal || (input instanceof Request ? input.signal : null);
  const abort = () => controller.abort();
  upstream?.addEventListener("abort", abort, { once: true });
  if (upstream?.aborted) controller.abort();
  const timer = setTimeout(abort, 30000);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
    upstream?.removeEventListener("abort", abort);
  }
}
