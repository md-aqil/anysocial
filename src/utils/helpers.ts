import { randomBytes, createHash } from 'crypto';

export function generateStateToken(): string {
  return randomBytes(32).toString('base64url');
}

export function generateCodeVerifier(): string {
  return randomBytes(32).toString('base64url');
}

export function generateCodeChallenge(verifier: string): string {
  const hash = createHash('sha256').update(verifier).digest();
  return hash.toString('base64url');
}

export function sanitizeAccount(account: any): any {
  const { accessToken, refreshToken, ...sanitized } = account;
  return sanitized;
}

export function buildAuthUrl(
  baseUrl: string,
  params: Record<string, string>
): string {
  const url = new URL(baseUrl);
  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.append(key, value);
  });
  return url.toString();
}
