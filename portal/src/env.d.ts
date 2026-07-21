/// <reference path="../.astro/types.d.ts" />
/// <reference types="astro/client" />

type PortalProfile = {
  id: string;
  client_id: string | null;
  role: 'admin' | 'client';
  full_name: string | null;
};

declare namespace App {
  interface Locals {
    user: import('@supabase/supabase-js').User | null;
    profile: PortalProfile | null;
  }
}
