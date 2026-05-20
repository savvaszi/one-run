import type { APIRoute } from 'astro';
import { isAdmin } from '../../../lib/auth';
import { db } from '../../../db/index';
import { races } from '../../../db/schema';

export const GET: APIRoute = async ({ cookies }) => {
  if (!isAdmin(cookies)) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  const all = await db.select().from(races).all();
  return new Response(JSON.stringify(all), { status: 200 });
};

export const POST: APIRoute = async ({ request, cookies }) => {
  if (!isAdmin(cookies)) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  try {
    const body = await request.json();
    await db.insert(races).values({
      id: body.id,
      name: body.name,
      city: body.city,
      icon: body.icon || 'berlin',
      date: body.date,
      month: body.month,
      price_from: body.price_from,
      terrain: body.terrain,
      status: body.status,
      desc1: body.desc1,
      desc2: body.desc2 || '',
      photos: JSON.stringify(body.photos || []),
      included: JSON.stringify(body.included || ['Race entry & bib', 'Hotel (3 nights)', 'Transfers', 'Welcome dinner', 'Race day support', 'Local SIM']),
    });
    return new Response(JSON.stringify({ ok: true }), { status: 201 });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 400 });
  }
};
