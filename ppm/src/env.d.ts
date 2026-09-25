/// <reference path="../.astro/types.d.ts" />
/// <reference types="astro/client" />

type PpmProfile = {
  id: string;
  role: 'super_admin' | 'admin' | 'staff' | 'client';
  full_name: string | null;
  avatar_url: string | null;
};

declare namespace App {
  interface Locals {
    user: import('@supabase/supabase-js').User | null;
    profile: PpmProfile | null;
    /* Handbook categories for the nav. Loaded in middleware rather than in the
       layout: middleware runs before the response starts streaming, and the
       Supabase client may set a refreshed session cookie during a query, which
       throws once headers are on the wire. */
    kbCategories: { id: string; slug: string; title: string; blurb: string | null; color: string; sort: number }[];
  }
}
