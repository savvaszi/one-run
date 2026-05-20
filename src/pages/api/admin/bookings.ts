import type { APIRoute } from 'astro';
import { isAdmin } from '../../../lib/auth';
import { db } from '../../../db/index';
import { bookings, runners } from '../../../db/schema';
import { eq, desc } from 'drizzle-orm';

export const GET: APIRoute = async ({ cookies }) => {
  if (!isAdmin(cookies)) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  const all = await db.select().from(bookings).orderBy(desc(bookings.created_at)).all();
  return new Response(JSON.stringify(all), { status: 200 });
};
