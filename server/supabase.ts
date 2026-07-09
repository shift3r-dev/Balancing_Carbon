import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables for local testing
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.warn(
    '⚠️ Supabase environment variables (SUPABASE_URL, SUPABASE_ANON_KEY/SUPABASE_SERVICE_ROLE_KEY) are missing.\n' +
    'The app will continue using the secure in-memory/JSON filesystem database backup.\n' +
    'To enable persistent cloud storage, define these in your Vercel/local environment.'
  );
}

// Create a single supabase client instance
export const supabase = (supabaseUrl && supabaseKey) 
  ? createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      }
    })
  : null;

/**
 * SQL Table Schemas for Supabase:
 * Run this SQL in your Supabase SQL Editor to create the tables matching Balancing Carbon's data structures!
 * 
 * -- 1. ORGANISATIONS
 * CREATE TABLE organisations (
 *   id TEXT PRIMARY KEY,
 *   name TEXT NOT NULL,
 *   industry TEXT,
 *   location TEXT,
 *   employee_count INTEGER,
 *   reporting_year TEXT,
 *   target_reduction_percent INTEGER
 * );
 * 
 * -- 2. USERS
 * CREATE TABLE users (
 *   id TEXT PRIMARY KEY,
 *   name TEXT NOT NULL,
 *   email TEXT UNIQUE NOT NULL,
 *   password_hash TEXT NOT NULL,
 *   role TEXT NOT NULL,
 *   organisation_id TEXT REFERENCES organisations(id) ON DELETE CASCADE
 * );
 * 
 * -- 3. FACILITIES
 * CREATE TABLE facilities (
 *   id TEXT PRIMARY KEY,
 *   organisation_id TEXT REFERENCES organisations(id) ON DELETE CASCADE,
 *   name TEXT NOT NULL,
 *   location TEXT NOT NULL,
 *   industry_type TEXT NOT NULL,
 *   production_output NUMERIC NOT NULL,
 *   production_unit TEXT NOT NULL,
 *   reporting_period TEXT NOT NULL,
 *   electricity_consumption NUMERIC NOT NULL,
 *   fuel_consumption NUMERIC NOT NULL,
 *   fuel_type TEXT NOT NULL,
 *   renewable_energy_usage NUMERIC NOT NULL,
 *   emissions_scope_1 NUMERIC NOT NULL,
 *   emissions_scope_2 NUMERIC NOT NULL,
 *   carbon_intensity NUMERIC NOT NULL,
 *   esg_readiness_status TEXT NOT NULL
 * );
 * 
 * -- 4. ENERGY_RECORDS
 * CREATE TABLE energy_records (
 *   id TEXT PRIMARY KEY,
 *   organisation_id TEXT REFERENCES organisations(id) ON DELETE CASCADE,
 *   facility_id TEXT REFERENCES facilities(id) ON DELETE CASCADE,
 *   date DATE NOT NULL,
 *   reporting_period TEXT NOT NULL,
 *   energy_type TEXT NOT NULL,
 *   quantity NUMERIC NOT NULL,
 *   unit TEXT NOT NULL,
 *   source_document TEXT,
 *   notes TEXT,
 *   emissions NUMERIC NOT NULL,
 *   audit_trail JSONB NOT NULL
 * );
 * 
 * -- 5. ESG_QUESTIONS
 * CREATE TABLE esg_questions (
 *   id TEXT PRIMARY KEY,
 *   organisation_id TEXT REFERENCES organisations(id) ON DELETE CASCADE,
 *   category TEXT NOT NULL,
 *   question TEXT NOT NULL,
 *   answer TEXT,
 *   evidence TEXT,
 *   score INTEGER DEFAULT 0,
 *   status TEXT NOT NULL,
 *   recommendation TEXT,
 *   assigned_user TEXT,
 *   review_status TEXT NOT NULL
 * );
 * 
 * -- 6. OEM_QUESTIONNAIRES
 * CREATE TABLE oem_questionnaires (
 *   id TEXT PRIMARY KEY,
 *   organisation_id TEXT REFERENCES organisations(id) ON DELETE CASCADE,
 *   title TEXT NOT NULL,
 *   oem_name TEXT NOT NULL,
 *   due_date DATE NOT NULL,
 *   status TEXT NOT NULL,
 *   questions JSONB NOT NULL
 * );
 * 
 * -- 7. DOCUMENTS
 * CREATE TABLE documents (
 *   id TEXT PRIMARY KEY,
 *   organisation_id TEXT REFERENCES organisations(id) ON DELETE CASCADE,
 *   name TEXT NOT NULL,
 *   category TEXT NOT NULL,
 *   upload_date DATE NOT NULL,
 *   facility_id TEXT,
 *   period TEXT NOT NULL,
 *   size TEXT NOT NULL,
 *   ai_status TEXT NOT NULL,
 *   evidence_usage TEXT
 * );
 * 
 * -- 8. REPORTS
 * CREATE TABLE reports (
 *   id TEXT PRIMARY KEY,
 *   organisation_id TEXT REFERENCES organisations(id) ON DELETE CASCADE,
 *   title TEXT NOT NULL,
 *   type TEXT NOT NULL,
 *   period TEXT NOT NULL,
 *   created_date DATE NOT NULL,
 *   summary TEXT,
 *   status TEXT NOT NULL,
 *   download_url TEXT
 * );
 * 
 * -- 9. AI_CONVERSATIONS
 * CREATE TABLE ai_conversations (
 *   id TEXT PRIMARY KEY,
 *   organisation_id TEXT REFERENCES organisations(id) ON DELETE CASCADE,
 *   title TEXT NOT NULL,
 *   last_updated TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
 *   messages JSONB NOT NULL
 * );
 * 
 * -- 10. AUDIT_LOGS
 * CREATE TABLE audit_logs (
 *   id TEXT PRIMARY KEY,
 *   organisation_id TEXT REFERENCES organisations(id) ON DELETE CASCADE,
 *   user_id TEXT NOT NULL,
 *   user_email TEXT NOT NULL,
 *   action TEXT NOT NULL,
 *   details TEXT NOT NULL,
 *   timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
 * );
 */
