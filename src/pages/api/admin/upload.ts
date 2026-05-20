import type { APIRoute } from 'astro';
import { isAdmin } from '../../../lib/auth';
import { writeFile } from 'fs/promises';
import { join } from 'path';

export const POST: APIRoute = async ({ request, cookies }) => {
  if (!isAdmin(cookies)) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    if (!file) return new Response(JSON.stringify({ error: 'No file' }), { status: 400 });

    const ext = file.name.split('.').pop() || 'jpg';
    const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());
    const uploadDir = join(process.cwd(), 'src', 'data', 'uploads');
    await writeFile(join(uploadDir, filename), buffer);

    return new Response(JSON.stringify({ url: `/uploads/${filename}` }), { status: 200 });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
};
