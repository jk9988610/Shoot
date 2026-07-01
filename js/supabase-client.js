import { getCloudConfig } from './cloud-config.js';
import { shouldUseCloud } from './net-policy.js';

let client = null;
let libPromise = null;

async function loadCreateClient() {
  if (!libPromise) {
    libPromise = import(new URL('../vendor/supabase-js.mjs', import.meta.url).href).then((m) => {
      if (!m.createClient) throw new Error('Supabase createClient missing');
      return m.createClient;
    });
  }
  return libPromise;
}

export async function getSupabaseClient() {
  if (!shouldUseCloud()) return null;
  const cfg = getCloudConfig();
  if (!cfg.url || !cfg.anonKey) return null;
  if (!client) {
    const createClient = await loadCreateClient();
    client = createClient(cfg.url, cfg.anonKey);
  }
  return client;
}

export function invalidateSupabaseClient() {
  client = null;
  libPromise = null;
}
