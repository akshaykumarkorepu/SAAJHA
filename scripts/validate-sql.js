/* eslint-disable @typescript-eslint/no-require-imports */
// Static validator for Saajha database migrations and RPC definitions
// Run via: node scripts/validate-sql.js

const fs = require('fs');
const path = require('path');

function checkFile(relPath, fn) {
  const fullPath = path.join(__dirname, '..', relPath);
  if (!fs.existsSync(fullPath)) {
    throw new Error(`File not found: ${relPath}`);
  }
  const content = fs.readFileSync(fullPath, 'utf8');
  fn(content, relPath);
}

let failures = 0;

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ FAIL: ${message}`);
    failures++;
  } else {
    console.log(`✅ PASS: ${message}`);
  }
}

console.log('--- SAAJHA SQL STATIC AUDIT & VALIDATION ---');

// 1. Check for pg_catalog.coalesce (invalid PostgreSQL syntax)
const sqlFiles = [
  'supabase/migrations/20261030000001_initial_schema.sql',
  'supabase/migrations/20261030000002_functions_and_triggers.sql',
  'supabase/migrations/20261030000003_rls_policies.sql',
  'supabase/combined_setup.sql',
  'supabase/seed.sql',
  'supabase/verification_tests.sql',
  'supabase/create_auth_users.sql'
];

for (const file of sqlFiles) {
  checkFile(file, (content, name) => {
    assert(!content.includes('pg_catalog.coalesce'), `${name} does not use invalid pg_catalog.coalesce`);
  });
}

// 2. Check hash consistency between record_audit_event and verify_ledger
checkFile('supabase/migrations/20261030000002_functions_and_triggers.sql', (content) => {
  assert(content.includes("SET search_path = pg_catalog, public, extensions, pg_temp"), "Functions include extensions in search_path");
  assert(content.includes("digest(\n      convert_to("), "record_audit_event converts input to UTF8 bytea for digest()");
  assert(content.includes("digest(\n        convert_to("), "verify_ledger converts input to UTF8 bytea for digest()");
  assert(content.includes("GRANT EXECUTE ON FUNCTION public.readiness_check TO anon, authenticated;"), "readiness_check granted to anon and authenticated");
  assert(content.includes("GRANT EXECUTE ON FUNCTION public.verify_ledger TO anon, authenticated;"), "verify_ledger granted to anon and authenticated");
  assert(content.includes("NOTIFY pgrst, 'reload schema';"), "PostgREST schema reload signal is present");
});

// 3. Check combined_setup.sql includes all components
checkFile('supabase/combined_setup.sql', (content) => {
  assert(content.includes('public.institutions'), "combined_setup.sql contains institutions table");
  assert(content.includes('public.readiness_check'), "combined_setup.sql contains readiness_check function");
  assert(content.includes('public.verify_ledger'), "combined_setup.sql contains verify_ledger function");
  assert(content.includes('student@saajha.org'), "combined_setup.sql contains demo auth users with valid TLD");
  assert(!content.includes('public.digest(') || content.includes('CREATE OR REPLACE FUNCTION public.digest'), "combined_setup.sql does not call unqualified public.digest without wrapper definition");
});

// 4. Check verification_tests.sql
checkFile('supabase/verification_tests.sql', (content) => {
  assert(content.includes('public.readiness_check'), "verification_tests.sql tests readiness_check");
  assert(content.includes('public.request_booking'), "verification_tests.sql tests request_booking");
  assert(content.includes('public.decide_booking'), "verification_tests.sql tests decide_booking");
  assert(content.includes('public.check_out'), "verification_tests.sql tests check_out");
  assert(content.includes('public.return_booking'), "verification_tests.sql tests return_booking");
  assert(content.includes('public.verify_ledger'), "verification_tests.sql tests verify_ledger");
  assert(content.includes('DELETE FROM public.bookings WHERE id = v_booking_id;'), "verification_tests.sql cleans up test booking");
});

if (failures > 0) {
  console.error(`\n❌ ${failures} test(s) failed.`);
  process.exit(1);
} else {
  console.log('\n🎉 ALL STATIC SQL & LEDGER AUDIT CHECKS PASSED!');
  process.exit(0);
}
