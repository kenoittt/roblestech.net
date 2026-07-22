/// <reference path="../.astro/types.d.ts" />
/// <reference types="astro/client" />

type PpmProfile = {
  id: string;
  role: 'super_admin' | 'admin' | 'staff' | 'client';
  full_name: string | null;
};

declare namespace App {
  interface Locals {
    user: import('@supabase/supabase-js').User | null;
    profile: PpmProfile | null;
  }
}
