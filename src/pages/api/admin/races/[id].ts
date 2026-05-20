import type { APIRoute } from 'astro';
import { isAdmin } from '../../../../lib/auth';
import { db } from '../../../../db/index';
import { races } from '../../../../db/schema';
import { eq } from 'drizzle-orm';

export const PUT: APIRoute = async ({ request, cookies, params }) => {
  if (!isAdmin(cookies)) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  try {
    const body = await request.json();
    await db.update(races).set({
      name: body.name, city: body.city, icon: body.icon, date: body.date,
      month: body.month, price_from: body.price_from, terrain: body.terrain,
      status: body.status, desc1: body.desc1, desc2: body.desc2,
      photos: JSON.stringify(body.photos || []),
      included: JSON.stringify(body.included || []),
      updated_at: new Date().toISOString(),
    }).where(eq(races.id, params.id!));
    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 400 });
  }
};

export const DELETE: APIRoute = async ({ cookies, params }) => {
  if (!isAdmin(cookies)) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  await db.delete(races).where(eq(races.id, params.id!));
  return new Response(JSON.stringify({ ok: true }), { status: 200 });
};
