import type { APIRoute } from 'astro';

export const prerender = false;

// Downloadable CSV template for bulk task import.
export const GET: APIRoute = () => {
  const header = 'title,description,assignee_email,priority,due_date,project';
  const example1 = 'Write Q3 SEO report,Draft and review before the client call,jane@roblestech.net,high,2026-08-15,Promix Nutrition';
  const example2 = 'Fix contact form,Spam getting through,,medium,,';
  const csv = [
    header,
    example1,
    example2,
    '# priority = low | medium | high   ·   due_date = YYYY-MM-DD   ·   assignee_email must match a PPM member   ·   project is optional (created if new)',
  ].join('\n');

  return new Response(csv, {
    headers: {
      'content-type': 'text/csv; charset=utf-8',
      'content-disposition': 'attachment; filename="ppm-task-template.csv"',
    },
  });
};
