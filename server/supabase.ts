import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.warn(
    'Supabase environment variables are missing. Define SUPABASE_URL and SUPABASE_ANON_KEY or SUPABASE_SERVICE_ROLE_KEY before using persistent cloud storage.',
  );
}

export const supabase = (supabaseUrl && supabaseKey)
  ? createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    })
  : null;

/**
 * Database setup lives in server/migrations.
 *
 * Fresh Supabase project order:
 * 1. 000_base_schema.sql
 * 2. 001_activity_carbon_engine.sql
 * 3. 002_phase2_carbon_intelligence.sql
 * 4. 003_demo_seed.sql, optional demo data after registering a test user
 *
 * The current runtime API is implemented in server.ts and uses Supabase Auth
 * plus profiles.organisation_id for tenant scoping.
 */
