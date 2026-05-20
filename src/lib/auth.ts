import type { AstroCookies } from 'astro';
import { getSetting } from './settings';

const COOKIE_NAME = 'onerun_admin';

export async function verifyPassword(password: string): Promise<boolean> {
  const stored = await getSetting('admin_password');
  if (!stored) {
    return password === 'onerun2026';
  }
  return password === stored;
}

export function isAdmin(cookies: AstroCookies): boolean {
  return cookies.get(COOKIE_NAME)?.value === 'true';
}

export function setAdminCookie(cookies: AstroCookies): void {
  cookies.set(COOKIE_NAME, 'true', {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24,
  });
}

export function clearAdminCookie(cookies: AstroCookies): void {
  cookies.delete(COOKIE_NAME, { path: '/' });
}
