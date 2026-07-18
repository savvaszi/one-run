import type { AstroCookies } from 'astro';
import { getSetting } from './settings';

const COOKIE_NAME = 'onerun_admin';

export async function verifyPassword(password: string): Promise<boolean> {
  const stored = await getSetting('admin_password');
  return Boolean(stored) && password === stored;
}

export function isAdmin(cookies: AstroCookies): boolean {
  return cookies.get(COOKIE_NAME)?.value === 'true';
}

export function setAdminCookie(cookies: AstroCookies): void {
  cookies.set(COOKIE_NAME, 'true', {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    secure: import.meta.env.PROD,
    maxAge: 60 * 60 * 24,
  });
}

export function clearAdminCookie(cookies: AstroCookies): void {
  cookies.delete(COOKIE_NAME, { path: '/' });
}
