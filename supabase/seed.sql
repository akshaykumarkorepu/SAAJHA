-- Seed Data for Saajha Campus Resource Platform
-- Uses fictional demo entities matching CLAUDE.md §10 and src/lib/mock.ts
-- DO NOT PUT SENSITIVE DATA OR SERVICE ROLE KEYS HERE.

-- 1. Institutions
INSERT INTO public.institutions (id, name, short_code) VALUES
  ('00000000-0000-4000-a000-000000000001', 'NIT Warangal', 'NITW'),
  ('00000000-0000-4000-a000-000000000002', 'Kakatiya Institute (demo)', 'KITSW')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, short_code = EXCLUDED.short_code;

-- 2. Profiles
INSERT INTO public.profiles (id, full_name, email, role, institution_id, department, roll_no, verified, weekly_credits, reliability) VALUES
  ('00000000-0000-4000-a000-000000000101', 'Aarav Reddy', 'student@saajha.demo', 'student', '00000000-0000-4000-a000-000000000001', 'ECE', '22ECB0F14', true, 8, 96),
  ('00000000-0000-4000-a000-000000000102', 'Diya Sharma', 'student2@saajha.demo', 'student', '00000000-0000-4000-a000-000000000001', 'Mechanical', '23MEB0A27', true, 6, 92),
  ('00000000-0000-4000-a000-000000000103', 'Karthik Rao', 'partner@saajha.demo', 'student', '00000000-0000-4000-a000-000000000002', 'EEE', 'K22EE031', true, 6, 100),
  ('00000000-0000-4000-a000-000000000104', 'Dr. Lakshmi Narayana', 'owner@saajha.demo', 'owner', '00000000-0000-4000-a000-000000000001', 'ECE · Instrumentation & Media Lab', NULL, true, 10, 100),
  ('00000000-0000-4000-a000-000000000105', 'Prof. Suresh Babu', 'manager@saajha.demo', 'manager', '00000000-0000-4000-a000-000000000001', 'Dean (Academic) Office', NULL, true, 10, 100),
  ('00000000-0000-4000-a000-000000000106', 'Neha Kulkarni', 'admin@saajha.demo', 'admin', '00000000-0000-4000-a000-000000000001', 'Saajha Admin', NULL, true, 10, 100),
  ('00000000-0000-4000-a000-000000000107', 'Ravi Teja', 'makerspace@saajha.demo', 'owner', '00000000-0000-4000-a000-000000000001', 'Makerspace (Mechanical)', NULL, true, 10, 100),
  ('00000000-0000-4000-a000-000000000108', 'Anitha G.', 'spaces@saajha.demo', 'owner', '00000000-0000-4000-a000-000000000001', 'Academic Section · Rooms', NULL, true, 10, 100),
  ('00000000-0000-4000-a000-000000000109', 'Meera Iyer', 'meera@saajha.demo', 'student', '00000000-0000-4000-a000-000000000001', 'Civil', '22CEB0B09', true, 10, 100)
ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name, role = EXCLUDED.role, email = EXCLUDED.email;

-- 3. Badges
INSERT INTO public.badges (id, code, name, description) VALUES
  ('00000000-0000-4000-a000-000000000201', 'LAB_SAFETY_1', 'Lab Safety Level 1', 'General lab safety induction: PPE, fire exits, ESD and first aid.'),
  ('00000000-0000-4000-a000-000000000202', 'PRINTER_3D', '3D Printer Trained', 'Hands-on Makerspace session on slicing, bed levelling and filament changes.'),
  ('00000000-0000-4000-a000-000000000203', 'SCOPE_BASIC', 'Oscilloscope Basics', 'Probe compensation, triggering and safe measurement on bench scopes.')
ON CONFLICT (id) DO NOTHING;

-- 4. User Badges
INSERT INTO public.user_badges (user_id, badge_id, issued_by, issued_at, status) VALUES
  -- Student (Aarav has all 3)
  ('00000000-0000-4000-a000-000000000101', '00000000-0000-4000-a000-000000000201', '00000000-0000-4000-a000-000000000105', now() - interval '60 days', 'active'),
  ('00000000-0000-4000-a000-000000000101', '00000000-0000-4000-a000-000000000202', '00000000-0000-4000-a000-000000000105', now() - interval '60 days', 'active'),
  ('00000000-0000-4000-a000-000000000101', '00000000-0000-4000-a000-000000000203', '00000000-0000-4000-a000-000000000105', now() - interval '60 days', 'active'),
  -- Student 2 (Diya has safety active, 3D printer pending)
  ('00000000-0000-4000-a000-000000000102', '00000000-0000-4000-a000-000000000201', '00000000-0000-4000-a000-000000000105', now() - interval '40 days', 'active'),
  ('00000000-0000-4000-a000-000000000102', '00000000-0000-4000-a000-000000000202', NULL, NULL, 'pending'),
  -- Partner (Karthik has scope)
  ('00000000-0000-4000-a000-000000000103', '00000000-0000-4000-a000-000000000203', '00000000-0000-4000-a000-000000000105', now() - interval '30 days', 'active')
ON CONFLICT (user_id, badge_id) DO NOTHING;

-- 5. Resources
INSERT INTO public.resources (id, owner_id, name, category, description, location, requires_approval, requires_supervision, max_hours, credit_cost, cooldown_hours, usage_rules, visibility, status) VALUES
  ('00000000-0000-4000-a000-000000000301', '00000000-0000-4000-a000-000000000107', 'Prusa MK4 3D Printer', 'fabrication', 'FDM printer with a 25 × 21 × 22 cm build volume. PLA and PETG stocked; bring your own sliced G-code on a USB stick.', 'Makerspace, Mechanical Block, Room 104', true, true, 4, 3, 24, E'A Makerspace volunteer must be present for the first layer.\nPLA and PETG only, no ABS (ventilation).\nRemove your print and clean the bed before you leave.\nPrints over 4 hours need a separate overnight request.', 'campus', 'active'),
  ('00000000-0000-4000-a000-000000000302', '00000000-0000-4000-a000-000000000104', 'Rigol DS1054Z Oscilloscope', 'test_measurement', '4-channel, 50 MHz digital storage oscilloscope with two passive probes. Good for embedded and power-electronics projects.', 'ECE Instrumentation Lab, Room 211', true, false, 3, 2, 0, E'Use only the probes in the case and return them coiled.\nNo mains-voltage measurements without supervision.\nLog your session in the bench register.', 'partner', 'active'),
  ('00000000-0000-4000-a000-000000000303', '00000000-0000-4000-a000-000000000104', 'Canon EOS 90D DSLR Kit', 'media', 'Body with 18–135 mm lens, two batteries, a 64 GB card and a tripod. Popular for club events and project videos.', 'Media Lab, Library Annexe, Room 12', true, false, 4, 2, 24, E'Charge both batteries before returning.\nFormat the card only after copying your files.\nNo use in rain or near the swimming pool.\nReport any lens scratch immediately, however small.', 'campus', 'active'),
  ('00000000-0000-4000-a000-000000000304', '00000000-0000-4000-a000-000000000104', 'Raspberry Pi 5 Kit', 'test_measurement', 'Pi 5 (8 GB) with case, 27 W supply, 64 GB microSD with Raspberry Pi OS, HDMI cable and a breadboard starter set.', 'ECE Instrumentation Lab, Room 211', false, false, 4, 1, 0, E'Don''t re-flash the card; use your own microSD for custom images.\nReturn all GPIO jumper wires in the bag.', 'partner', 'active'),
  ('00000000-0000-4000-a000-000000000305', '00000000-0000-4000-a000-000000000108', 'Seminar Hall B', 'space', '120-seat hall with a projector, two wireless mics and a podium. Good for club talks and project demos.', 'Academic Block 2, Ground Floor', true, false, 3, 4, 0, E'Faculty coordinator''s name required in the purpose.\nNo food inside the hall.\nSwitch off the AC and projector when you leave.', 'partner', 'active'),
  ('00000000-0000-4000-a000-000000000306', '00000000-0000-4000-a000-000000000108', 'Project Room 2', 'space', 'Quiet 8-seat room with a whiteboard and a 55" display. Great for team stand-ups and hackathon nights.', 'Library, 2nd Floor', false, false, 4, 1, 0, E'Leave the whiteboard clean.\nMax 8 people.', 'campus', 'active'),
  ('00000000-0000-4000-a000-000000000307', '00000000-0000-4000-a000-000000000107', 'Soldering Station (Hakko FX-888D)', 'fabrication', 'Temperature-controlled station with fume extractor, helping hands and lead-free solder.', 'Makerspace, Mechanical Block, Room 104', true, false, 2, 1, 0, E'Fume extractor on at all times.\nNever leave the iron unattended while hot.\nSafety glasses required.', 'department', 'active'),
  ('00000000-0000-4000-a000-000000000308', '00000000-0000-4000-a000-000000000104', 'Epson Portable Projector', 'media', '3,600-lumen projector with HDMI and USB-C, in a carry bag with a 5 m HDMI cable.', 'Media Lab, Library Annexe, Room 12', false, false, 4, 1, 0, E'Let the lamp cool for 5 minutes before packing.', 'campus', 'maintenance')
ON CONFLICT (id) DO NOTHING;

-- 6. Resource Badges
INSERT INTO public.resource_badges (resource_id, badge_id) VALUES
  ('00000000-0000-4000-a000-000000000301', '00000000-0000-4000-a000-000000000202'), -- 3D printer needs PRINTER_3D
  ('00000000-0000-4000-a000-000000000301', '00000000-0000-4000-a000-000000000201'), -- 3D printer needs LAB_SAFETY_1
  ('00000000-0000-4000-a000-000000000302', '00000000-0000-4000-a000-000000000203'), -- Scope needs SCOPE_BASIC
  ('00000000-0000-4000-a000-000000000307', '00000000-0000-4000-a000-000000000201')  -- Soldering needs LAB_SAFETY_1
ON CONFLICT (resource_id, badge_id) DO NOTHING;

-- 7. Availability Windows (Mon-Sat 09:00 - 18:00 default)
INSERT INTO public.availability_windows (resource_id, weekday, start_time, end_time)
SELECT r.id, w.day, '09:00'::time, '18:00'::time
FROM public.resources r
CROSS JOIN generate_series(1, 6) AS w(day)
WHERE NOT EXISTS (
  SELECT 1 FROM public.availability_windows aw
  WHERE aw.resource_id = r.id
    AND aw.weekday = w.day
    AND aw.start_time = '09:00'::time
    AND aw.end_time = '18:00'::time
);

-- 8. Notifications
INSERT INTO public.notifications (id, user_id, title, body, link, read) VALUES
  ('00000000-0000-4000-a000-000000000901', '00000000-0000-4000-a000-000000000101', 'Welcome to Saajha', 'Discover lab equipment and verify your access-readiness.', '/explore', false),
  ('00000000-0000-4000-a000-000000000902', '00000000-0000-4000-a000-000000000104', 'Lab in-charge console active', 'Review requests and confirm condition handovers.', '/owner', false)
ON CONFLICT (id) DO NOTHING;

