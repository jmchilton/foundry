import type { APIRoute, GetStaticPaths } from 'astro';
import { getCollection } from 'astro:content';

export const getStaticPaths: GetStaticPaths = async () => {
  const entries = await getCollection('content');
  return entries.map(entry => ({
    params: { slug: entry.id },
    props: { entry },
  }));
};

export const GET: APIRoute = ({ props }) => {
  const { entry } = props as { entry: { body?: string } };
  return new Response(entry.body ?? '', {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
};
