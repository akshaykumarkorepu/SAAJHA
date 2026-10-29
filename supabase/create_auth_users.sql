-- Optional Helper: Create Supabase Auth Users for Saajha Demo Accounts
-- Run this in the Supabase Dashboard SQL Editor to allow email/password logins with Demo@1234
-- Note: This is idempotent and can be safely executed multiple times without affecting real users.

DO $$
DECLARE
  v_users JSONB := '[
    {"id": "00000000-0000-4000-a000-000000000101", "email": "student@saajha.demo", "role": "student"},
    {"id": "00000000-0000-4000-a000-000000000102", "email": "student2@saajha.demo", "role": "student"},
    {"id": "00000000-0000-4000-a000-000000000103", "email": "partner@saajha.demo", "role": "student"},
    {"id": "00000000-0000-4000-a000-000000000104", "email": "owner@saajha.demo", "role": "owner"},
    {"id": "00000000-0000-4000-a000-000000000105", "email": "manager@saajha.demo", "role": "manager"},
    {"id": "00000000-0000-4000-a000-000000000106", "email": "admin@saajha.demo", "role": "admin"}
  ]'::jsonb;
  u JSONB;
  v_pw_hash TEXT;
BEGIN
  -- Resolve pgcrypto crypt safely whether installed in 'extensions' or 'public'
  IF EXISTS (SELECT 1 FROM pg_catalog.pg_proc p JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace WHERE p.proname = 'crypt' AND n.nspname = 'extensions') THEN
    v_pw_hash := extensions.crypt('Demo@1234', extensions.gen_salt('bf'));
  ELSE
    v_pw_hash := public.crypt('Demo@1234', public.gen_salt('bf'));
  END IF;

  FOR u IN SELECT * FROM jsonb_array_elements(v_users) LOOP
    -- Only insert if neither the email nor the ID exists in auth.users
    IF NOT EXISTS (
      SELECT 1 FROM auth.users
      WHERE email = u->>'email' OR id = (u->>'id')::uuid
    ) THEN
      INSERT INTO auth.users (
        id,
        instance_id,
        aud,
        role,
        email,
        encrypted_password,
        email_confirmed_at,
        raw_app_meta_data,
        raw_user_meta_data,
        created_at,
        updated_at
      ) VALUES (
        (u->>'id')::uuid,
        '00000000-0000-0000-0000-000000000000',
        'authenticated',
        'authenticated',
        u->>'email',
        v_pw_hash,
        now(),
        '{"provider": "email", "providers": ["email"]}'::jsonb,
        jsonb_build_object('role', u->>'role'),
        now(),
        now()
      );
    END IF;

    -- Add matching identity for Supabase Auth email provider if missing
    IF NOT EXISTS (
      SELECT 1 FROM auth.identities
      WHERE user_id = (u->>'id')::uuid OR (provider = 'email' AND identity_data->>'email' = u->>'email')
    ) THEN
      INSERT INTO auth.identities (
        id,
        user_id,
        identity_data,
        provider,
        provider_id,
        last_sign_in_at,
        created_at,
        updated_at
      ) VALUES (
        u->>'id',
        (u->>'id')::uuid,
        jsonb_build_object('sub', u->>'id', 'email', u->>'email'),
        'email',
        u->>'id',
        now(),
        now(),
        now()
      );
    END IF;
  END LOOP;
END $$;
