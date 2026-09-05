import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Client Supabase optionnel.
 *
 * Le MVP fonctionne intégralement sans Supabase : les favoris et la
 * sélection du comparateur vivent dans `localStorage`. Dès que les
 * variables d'environnement sont renseignées, ce client devient
 * disponible et permet de brancher l'authentification puis la
 * synchronisation multi-appareils.
 *
 * Schéma SQL suggéré (voir README) :
 *   create table favorites (
 *     id uuid primary key default gen_random_uuid(),
 *     user_id uuid references auth.users not null,
 *     item_id text not null,
 *     item_type text not null check (item_type in ('destination', 'hotel')),
 *     label text not null,
 *     destination text,
 *     created_at timestamptz default now(),
 *     unique (user_id, item_id)
 *   );
 */

let browserClient: SupabaseClient | null = null;

export function isSupabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}

/** Client navigateur (singleton). `null` si Supabase n'est pas configuré. */
export function getSupabaseClient(): SupabaseClient | null {
  if (!isSupabaseConfigured()) return null;
  if (!browserClient) {
    browserClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );
  }
  return browserClient;
}

/**
 * Client serveur avec la clé de service — à n'utiliser que dans des
 * route handlers ou des server actions, jamais côté navigateur.
 */
export function getSupabaseAdminClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return null;
  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
