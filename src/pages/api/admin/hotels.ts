import type { APIRoute } from 'astro';
import { isAdmin } from '../../../lib/auth';
import { db } from '../../../db/index';
import { hotels } from '../../../db/schema';

export const POST: APIRoute = async ({ request, cookies }) => {
  if (!isAdmin(cookies)) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  try {
    const body = await request.json();
    await db.insert(hotels).values({
      id: body.id,
      race_id: body.race_id,
      name: body.name,
      area: body.area,
      stars: body.stars,
      features: JSON.stringify(body.features || []),
      single_price: body.single_price,
      twin_price: body.twin_price,
      total_seats: body.total_seats || 50,
      website: body.website || '',
    });
    return new Response(JSON.stringify({ ok: true }), { status: 201 });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 400 });
  }
};
