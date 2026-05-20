export const prerender = false;

import type { APIRoute } from 'astro';
import { isAdmin } from '../../../../lib/auth';
import { db } from '../../../../db/index';
import { hotels } from '../../../../db/schema';
import { eq } from 'drizzle-orm';

export const PUT: APIRoute = async ({ request, cookies, params }) => {
  if (!isAdmin(cookies)) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  try {
    const body = await request.json();
    await db.update(hotels).set({
      name: body.name, area: body.area, stars: body.stars,
      features: JSON.stringify(body.features || []),
      single_price: body.single_price, twin_price: body.twin_price,
      total_seats: body.total_seats, website: body.website,
      updated_at: new Date().toISOString(),
    }).where(eq(hotels.id, params.id!));
    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 400 });
  }
};

export const DELETE: APIRoute = async ({ cookies, params }) => {
  if (!isAdmin(cookies)) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  await db.delete(hotels).where(eq(hotels.id, params.id!));
  return new Response(JSON.stringify({ ok: true }), { status: 200 });
};

