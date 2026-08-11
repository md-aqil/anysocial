import dns from 'dns/promises';
import net from 'net';

/**
 * SSRF protection helper.
 *
 * Validates that a user-supplied URL is safe to fetch server-side:
 *  - scheme must be http/https
 *  - host must resolve to a public IP (no loopback, private, link-local,
 *    unique-local, or reserved ranges — blocks cloud metadata at 169.254.169.254)
 *
 * Use `assertPublicUrl()` before any server-side fetch of a user-provided URL.
 */

function ipIsPrivate(ip: string): boolean {
  if (net.isIPv4(ip)) {
    const parts = ip.split('.').map((n) => parseInt(n, 10));
    const [a, b] = parts;
    if (a === 10) return true; // 10.0.0.0/8
    if (a === 127) return true; // loopback
    if (a === 0) return true; // "this" network
    if (a === 172 && b >= 16 && b <= 31) return true; // 172.16.0.0/12
    if (a === 192 && b === 168) return true; // 192.168.0.0/16
    if (a === 169 && b === 254) return true; // link-local incl. cloud metadata
    if (a === 100 && b >= 64 && b <= 127) return true; // 100.64.0.0/10 CGNAT
    if (a >= 224) return true; // multicast / reserved
    return false;
  }

  if (net.isIPv6(ip)) {
    const lower = ip.toLowerCase();
    if (lower === '::1' || lower === '::') return true; // loopback / unspecified
    if (lower.startsWith('fe80')) return true; // link-local
    if (lower.startsWith('fc') || lower.startsWith('fd')) return true; // unique-local
    // IPv4-mapped IPv6 (::ffff:a.b.c.d)
    const mapped = lower.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
    if (mapped) return ipIsPrivate(mapped[1]);
    return false;
  }

  // Unknown format — treat as unsafe
  return true;
}

/**
 * Throws if the URL is malformed, uses a disallowed scheme, or resolves to a
 * non-public address. Returns the parsed URL on success.
 */
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

  // If the host is already a literal IP, validate it directly.
  if (net.isIP(hostname)) {
    if (ipIsPrivate(hostname)) {
      throw new Error('URL resolves to a blocked (private) address');
    }
    return parsed;
  }

  // Otherwise resolve all A/AAAA records and ensure every one is public.
  let addresses: { address: string }[];
  try {
    addresses = await dns.lookup(hostname, { all: true });
  } catch {
    throw new Error('Could not resolve host');
  }

  if (addresses.length === 0) {
    throw new Error('Could not resolve host');
  }

  for (const { address } of addresses) {
    if (ipIsPrivate(address)) {
      throw new Error('URL resolves to a blocked (private) address');
    }
  }

  return parsed;
}
