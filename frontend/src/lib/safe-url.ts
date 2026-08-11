import dns from 'dns/promises';
import net from 'net';

/**
 * SSRF protection helper (frontend server-route copy).
 * Mirrors src/utils/safe-url.ts on the backend. Kept self-contained because the
 * Next.js app cannot import from the backend source tree.
 */

function ipIsPrivate(ip: string): boolean {
  if (net.isIPv4(ip)) {
    const [a, b] = ip.split('.').map((n) => parseInt(n, 10));
    if (a === 10) return true;
    if (a === 127) return true;
    if (a === 0) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 169 && b === 254) return true;
    if (a === 100 && b >= 64 && b <= 127) return true;
    if (a >= 224) return true;
    return false;
  }
  if (net.isIPv6(ip)) {
    const lower = ip.toLowerCase();
    if (lower === '::1' || lower === '::') return true;
    if (lower.startsWith('fe80')) return true;
    if (lower.startsWith('fc') || lower.startsWith('fd')) return true;
    const mapped = lower.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
    if (mapped) return ipIsPrivate(mapped[1]);
    return false;
  }
  return true;
}

export async function assertPublicUrl(rawUrl: string): Promise<URL> {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new Error('Invalid URL');
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error('Only http and https URLs are allowed');
  }
  const hostname = parsed.hostname;
  if (net.isIP(hostname)) {
    if (ipIsPrivate(hostname)) throw new Error('URL resolves to a blocked (private) address');
    return parsed;
  }
  let addresses: { address: string }[];
  try {
    addresses = await dns.lookup(hostname, { all: true });
  } catch {
    throw new Error('Could not resolve host');
  }
  if (addresses.length === 0) throw new Error('Could not resolve host');
  for (const { address } of addresses) {
    if (ipIsPrivate(address)) throw new Error('URL resolves to a blocked (private) address');
  }
  return parsed;
}
