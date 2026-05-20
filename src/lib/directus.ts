type QueryValue = string | number | boolean | null | undefined;

export interface DirectusConfig {
  url: string;
  token: string;
}

export interface DirectusRace {
  id: number;
  slug: string;
  name: string;
  city: string;
  icon: string;
  date: string;
  month: number;
  price_from: string;
  terrain: string;
  status: 'open' | 'soldout' | 'express';
  desc1: string;
  desc2: string;
  included?: string[];
  sort?: number;
}

export interface DirectusHotel {
  id: number;
  slug: string;
  race: string | DirectusRace;
  name: string;
  area: string;
  stars: number;
  features?: string[];
  website?: string;
  sort?: number;
}

export interface DirectusPackage {
  id: number;
  slug: string;
  hotel: string | DirectusHotel;
  type: 'single' | 'twin';
  label: string;
  runner_count: number;
  price: number;
  currency: string;
  total_seats: number;
  booked_seats: number;
  active: boolean;
}

export interface DirectusBooking {
  id: number;
  reference: string;
  race: string | DirectusRace;
  hotel: string | DirectusHotel;
  package: string | DirectusPackage;
  status: 'pending' | 'paid' | 'cancellation_requested' | 'cancelled' | 'failed';
  total_amount: number;
  currency: string;
  revolut_order_id?: string | null;
  revolut_payment_id?: string | null;
  cancellation_token_hash: string;
  cancelled_at?: string | null;
}

export interface DirectusRunner {
  id?: string | number;
  booking: string | DirectusBooking;
  full_name: string;
  email: string;
  phone: string;
  nationality: string;
  passport_id: string;
  expected_time: string;
  certificate?: string | null;
  requirements?: string | null;
}

export function getDirectusConfig(): DirectusConfig {
  const url = process.env.DIRECTUS_URL?.replace(/\/+$/, '');
  const token = process.env.DIRECTUS_TOKEN;

  if (!url) throw new Error('DIRECTUS_URL is not configured');
  if (!token) throw new Error('DIRECTUS_TOKEN is not configured');

  return { url, token };
}

function buildUrl(path: string, query?: Record<string, QueryValue>): string {
  const { url } = getDirectusConfig();
  const fullUrl = new URL(`${url}${path}`);

  Object.entries(query || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null) fullUrl.searchParams.set(key, String(value));
  });

  return fullUrl.toString();
}

export async function directusRequest<T>(path: string, init: RequestInit = {}, query?: Record<string, QueryValue>): Promise<T> {
  const { token } = getDirectusConfig();
  const headers: Record<string, string> = { Authorization: `Bearer ${token}` };

  new Headers(init.headers).forEach((value, key) => {
    headers[key] = value;
  });

  if (init.body && !headers['content-type'] && !(init.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(buildUrl(path, query), { ...init, headers });
  if (!response.ok) {
    const message = await response.text().catch(() => response.statusText);
    throw new Error(`Directus request failed (${response.status}): ${message}`);
  }

  return response.json() as Promise<T>;
}

export async function directusGetItems<T>(collection: string, query?: Record<string, QueryValue>): Promise<T[]> {
  const result = await directusRequest<{ data: T[] }>(`/items/${collection}`, {}, query);
  return result.data;
}

export async function directusGetItem<T>(collection: string, id: string | number, query?: Record<string, QueryValue>): Promise<T> {
  const result = await directusRequest<{ data: T }>(`/items/${collection}/${id}`, {}, query);
  return result.data;
}

export async function directusCreateItem<T>(collection: string, item: Record<string, unknown>): Promise<T> {
  const result = await directusRequest<{ data: T }>(`/items/${collection}`, {
    method: 'POST',
    body: JSON.stringify(item),
  });
  return result.data;
}

export async function directusUpdateItem<T>(collection: string, id: string | number, item: Record<string, unknown>): Promise<T> {
  const result = await directusRequest<{ data: T }>(`/items/${collection}/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(item),
  });
  return result.data;
}

export async function directusUploadFile(file: File): Promise<string> {
  const form = new FormData();
  form.set('file', file);
  const result = await directusRequest<{ data: { id: string } }>('/files', {
    method: 'POST',
    body: form,
  });
  return result.data.id;
}
