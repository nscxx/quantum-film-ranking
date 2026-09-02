import { env } from 'cloudflare:workers';

const COOKIE_NAME = 'quantum_control_session';
const SESSION_DURATION_SECONDS = 8 * 60 * 60;

function getSecrets() {
  const password = env.CONTROL_PASSWORD?.trim();
  const secret = env.SESSION_SECRET?.trim();
  if (!password || !secret || secret.length < 24) throw new Error('CONTROL_AUTH_NOT_CONFIGURED');
  return { password, secret };
}

function encodeBase64Url(bytes: Uint8Array) {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function decodeBase64Url(value: string) {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(value.length / 4) * 4, '=');
  const binary = atob(padded);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

async function getSigningKey(secret: string) {
  return crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify'],
  );
}

function constantTimeTextEqual(left: string, right: string) {
  const leftBytes = new TextEncoder().encode(left);
  const rightBytes = new TextEncoder().encode(right);
  const length = Math.max(leftBytes.length, rightBytes.length);
  let difference = leftBytes.length ^ rightBytes.length;
  for (let index = 0; index < length; index += 1) {
    difference |= (leftBytes[index] ?? 0) ^ (rightBytes[index] ?? 0);
  }
  return difference === 0;
}

export function verifyControlPassword(candidate: string) {
  return constantTimeTextEqual(candidate, getSecrets().password);
}

export async function createControlSessionCookie() {
  const { secret } = getSecrets();
  const expiresAt = Math.floor(Date.now() / 1000) + SESSION_DURATION_SECONDS;
  const payload = String(expiresAt);
  const signature = new Uint8Array(
    await crypto.subtle.sign('HMAC', await getSigningKey(secret), new TextEncoder().encode(payload)),
  );
  const value = `${payload}.${encodeBase64Url(signature)}`;
  return `${COOKIE_NAME}=${value}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${SESSION_DURATION_SECONDS}`;
}

export function clearControlSessionCookie() {
  return `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0`;
}

function readCookie(request: Request, name: string) {
  const cookies = request.headers.get('cookie') ?? '';
  for (const pair of cookies.split(';')) {
    const [key, ...value] = pair.trim().split('=');
    if (key === name) return value.join('=');
  }
  return null;
}

export async function hasValidControlSession(request: Request) {
  try {
    const value = readCookie(request, COOKIE_NAME);
    if (!value) return false;
    const [payload, encodedSignature] = value.split('.');
    const expiresAt = Number(payload);
    if (!payload || !encodedSignature || !Number.isFinite(expiresAt)) return false;
    if (expiresAt <= Math.floor(Date.now() / 1000)) return false;
    const { secret } = getSecrets();
    return crypto.subtle.verify(
      'HMAC',
      await getSigningKey(secret),
      decodeBase64Url(encodedSignature),
      new TextEncoder().encode(payload),
    );
  } catch {
    return false;
  }
}

export function secureCookieSuffix(request: Request) {
  return new URL(request.url).protocol === 'https:' ? '; Secure' : '';
}
