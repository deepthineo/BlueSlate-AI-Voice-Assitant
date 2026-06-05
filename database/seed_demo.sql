-- ============================================================
-- BLUESLATE — Demo Seed Data for XP League Frisco
-- Paste this entire file into Supabase SQL Editor and click Run
-- ============================================================

-- Fixed IDs
-- org_id      = a0000000-0000-0000-0000-000000000001
-- location_id = b0000000-0000-0000-0000-000000000001

-- ============================================================
-- CALLS
-- ============================================================
insert into calls (id, location_id, org_id, twilio_call_sid, from_number, to_number, status, duration_sec, transcript, summary, sentiment_score, started_at, ended_at)
values

-- Call 1: Booked a trial
('c0000000-0000-0000-0000-000000000001',
 'b0000000-0000-0000-0000-000000000001',
 'a0000000-0000-0000-0000-000000000001',
 'CA_DEMO_001', '+14695550101', '+14695559999',
 'completed', 187,
 E'Caller: Hi, I''m calling about esports programs for my son. He''s 12.\nAgent: Hi! Thanks for calling XP League Frisco! I''m Alex. We have amazing programs for 12-year-olds. Which games does he play?\nCaller: Mostly Fortnite and Minecraft. He''s really into it.\nAgent: Perfect! Our Fortnite squad training runs Tuesday and Thursday evenings. Would you like to book a free trial session?\nCaller: Yes, that sounds great! How do I sign up?\nAgent: I can get you booked right now. What''s your name and best email?\nCaller: Sarah Johnson, sarah.johnson@gmail.com\nAgent: Perfect Sarah! I''ve noted a free trial for your son. Our team will email you within the hour with the confirmation.\nCaller: Wonderful, thank you so much!\nAgent: Thanks for calling XP League Frisco! See you on the battlefield!',
 'Parent booked a free trial for 12-year-old interested in Fortnite/Minecraft programs.',
 0.82, now() - interval '2 days 3 hours', now() - interval '2 days 3 hours' + interval '187 seconds'),

-- Call 2: Pricing inquiry, hot lead
('c0000000-0000-0000-0000-000000000002',
 'b0000000-0000-0000-0000-000000000001',
 'a0000000-0000-0000-0000-000000000001',
 'CA_DEMO_002', '+14695550102', '+14695559999',
 'completed', 142,
 E'Caller: Hey, what are your monthly prices for esports coaching?\nAgent: Great question! Our programs start at $149/month for two sessions per week, and $229/month for unlimited access including tournament prep.\nCaller: And how long are the sessions?\nAgent: Each session is 90 minutes. Our coaches are collegiate-level players — really top notch.\nCaller: That''s actually really reasonable. Do you have a schedule I can look at?\nAgent: Absolutely! I can send our full schedule to your email. What''s the best address?\nCaller: Mike.Torres@outlook.com. Thanks!\nAgent: Done! You''ll get it within a few minutes. Feel free to call back with any questions.',
 'Pricing inquiry — interested in monthly program, requested schedule via email.',
 0.61, now() - interval '1 day 8 hours', now() - interval '1 day 8 hours' + interval '142 seconds'),

-- Call 3: Upset caller, bad experience elsewhere
('c0000000-0000-0000-0000-000000000003',
 'b0000000-0000-0000-0000-000000000001',
 'a0000000-0000-0000-0000-000000000001',
 'CA_DEMO_003', '+14695550103', '+14695559999',
 'completed', 98,
 E'Caller: We tried another esports place and it was a disaster. Coaches didn''t show up half the time.\nAgent: I''m really sorry to hear that — that''s so frustrating. At XP League Frisco we have a strict attendance policy for coaches, and every session is supervised.\nCaller: How do I know you''re different?\nAgent: We offer a free trial so you can see the quality firsthand, with zero commitment. Would that help ease the concern?\nCaller: Maybe. Let me think about it and call back.\nAgent: Absolutely, no pressure. We''d love to earn your trust. Call anytime!',
 'Skeptical parent with bad prior experience — open to free trial, will call back.',
 -0.21, now() - interval '3 days 1 hour', now() - interval '3 days 1 hour' + interval '98 seconds'),

-- Call 4: Quick info, no interest
('c0000000-0000-0000-0000-000000000004',
 'b0000000-0000-0000-0000-000000000001',
 'a0000000-0000-0000-0000-000000000001',
 'CA_DEMO_004', '+14695550104', '+14695559999',
 'completed', 45,
 E'Caller: Do you do adult leagues?\nAgent: Currently our programs are for players aged 8-18. We don''t have adult leagues yet.\nCaller: Okay, thanks. Never mind then.\nAgent: No problem! Feel free to call if anything changes.',
 'Caller asking about adult leagues — not a fit, no interest.',
 0.05, now() - interval '4 days 5 hours', now() - interval '4 days 5 hours' + interval '45 seconds'),

-- Call 5: High-value multi-kid family
('c0000000-0000-0000-0000-000000000005',
 'b0000000-0000-0000-0000-000000000001',
 'a0000000-0000-0000-0000-000000000001',
 'CA_DEMO_005', '+14695550105', '+14695559999',
 'completed', 231,
 E'Caller: Hi I have two kids, ages 10 and 14, both love gaming. Do you have programs for both age groups?\nAgent: Absolutely! We have separate tracks — our Junior League for 8-12 year olds and Advanced League for 13 and up. Both could join the same evening sessions.\nCaller: Oh that would be convenient. Do you offer a family discount?\nAgent: Yes! Enrolling two kids gets you 20% off the second enrollment. That brings it to around $359/month for both.\nCaller: That''s great. Can I come visit the facility first?\nAgent: Of course! We do facility tours on Saturdays from 10am to noon. Want me to note you down for this Saturday?\nCaller: Yes please. Name is David Kim.\nAgent: Perfect David! See you Saturday. We''ll send a confirmation to your number.',
 'High-value lead: 2 kids interested, asked about family discount, booked facility tour for Saturday.',
 0.91, now() - interval '5 hours', now() - interval '5 hours' + interval '231 seconds'),

-- Call 6: No answer
('c0000000-0000-0000-0000-000000000006',
 'b0000000-0000-0000-0000-000000000001',
 'a0000000-0000-0000-0000-000000000001',
 'CA_DEMO_006', '+14695550106', '+14695559999',
 'no_answer', 0,
 null, null, null,
 now() - interval '6 days 2 hours', now() - interval '6 days 2 hours'),

-- Call 7: Callback request
('c0000000-0000-0000-0000-000000000007',
 'b0000000-0000-0000-0000-000000000001',
 'a0000000-0000-0000-0000-000000000001',
 'CA_DEMO_007', '+14695550107', '+14695559999',
 'completed', 67,
 E'Caller: I want to talk to a human coach, not a bot.\nAgent: Totally understand! Our head coach Marcus is available Monday through Friday 3pm-7pm. Want me to have him call you back?\nCaller: Yes, have him call me at 3pm tomorrow.\nAgent: Done! I''ve noted a callback for Marcus at 3pm tomorrow. Is this number the best to reach you?\nCaller: Yes.\nAgent: Perfect. Talk soon!',
 'Caller requested callback from human coach — scheduled for 3pm tomorrow.',
 0.22, now() - interval '1 day 2 hours', now() - interval '1 day 2 hours' + interval '67 seconds'),

-- Call 8: Tournament registration
('c0000000-0000-0000-0000-000000000008',
 'b0000000-0000-0000-0000-000000000001',
 'a0000000-0000-0000-0000-000000000001',
 'CA_DEMO_008', '+14695550108', '+14695559999',
 'completed', 119,
 E'Caller: Is there an upcoming tournament I can register my daughter for?\nAgent: Yes! We have our Summer Showdown on July 12th — open to all skill levels, ages 10-18. Registration is $25 per player.\nCaller: She plays Valorant. Is that one of the games?\nAgent: Valorant is one of our featured titles for the Summer Showdown! Would you like to register her today?\nCaller: Yes! Her name is Priya Patel, she''s 15.\nAgent: Awesome! Priya is registered for the Summer Showdown on July 12th. Confirmation will go to this number.',
 'Registered 15-year-old for Summer Showdown Valorant tournament on July 12th.',
 0.88, now() - interval '12 hours', now() - interval '12 hours' + interval '119 seconds')

on conflict do nothing;

-- ============================================================
-- LEADS
-- ============================================================
insert into leads (id, location_id, org_id, call_id, name, phone, email, core_interest, call_outcome, status, score, score_reason, notes, raw_extraction)
values

-- Lead 1: Sarah Johnson — booked
('d0000000-0000-0000-0000-000000000001',
 'b0000000-0000-0000-0000-000000000001',
 'a0000000-0000-0000-0000-000000000001',
 'c0000000-0000-0000-0000-000000000001',
 'Sarah Johnson', '+14695550101', 'sarah.johnson@gmail.com',
 'Fortnite & Minecraft program for 12-year-old son',
 'booked', 'booked', 88,
 'Explicitly booked a free trial, gave email, enthusiastic tone.',
 'Send trial confirmation email and follow up within 24hrs to confirm attendance.',
 '{"age_of_player": 12, "games": ["Fortnite", "Minecraft"], "parent_name": "Sarah Johnson", "trial_requested": true}'::jsonb),

-- Lead 2: Mike Torres — qualified
('d0000000-0000-0000-0000-000000000002',
 'b0000000-0000-0000-0000-000000000001',
 'a0000000-0000-0000-0000-000000000001',
 'c0000000-0000-0000-0000-000000000002',
 'Mike Torres', '+14695550102', 'mike.torres@outlook.com',
 'Monthly program pricing and schedule',
 'info_requested', 'qualified', 71,
 'Asked specific pricing questions, provided email for schedule — high buying intent.',
 'Follow up in 2 days — send pricing comparison sheet.',
 '{"pricing_asked": true, "schedule_requested": true, "email_captured": true}'::jsonb),

-- Lead 3: Anonymous skeptic — new
('d0000000-0000-0000-0000-000000000003',
 'b0000000-0000-0000-0000-000000000001',
 'a0000000-0000-0000-0000-000000000001',
 'c0000000-0000-0000-0000-000000000003',
 null, '+14695550103', null,
 'Free trial to replace bad prior experience',
 'callback_needed', 'new', 52,
 'Interested but skeptical. Offered free trial and said will call back.',
 'If no callback in 3 days, have coach call this number personally.',
 '{"sentiment": "negative_prior_experience", "open_to_trial": true}'::jsonb),

-- Lead 4: David Kim — booked (high value)
('d0000000-0000-0000-0000-000000000004',
 'b0000000-0000-0000-0000-000000000001',
 'a0000000-0000-0000-0000-000000000001',
 'c0000000-0000-0000-0000-000000000005',
 'David Kim', '+14695550105', null,
 'Programs for 2 kids (ages 10 & 14) + family discount',
 'booked', 'booked', 95,
 'Two-kid family — $359/mo revenue, facility tour booked for Saturday. Highest-intent lead.',
 'Prep Saturday tour personally — high LTV prospect. Confirm Friday afternoon.',
 '{"num_kids": 2, "kid_ages": [10, 14], "family_discount_discussed": true, "tour_booked": "Saturday"}'::jsonb),

-- Lead 5: Priya Patel (tournament) — converted
('d0000000-0000-0000-0000-000000000005',
 'b0000000-0000-0000-0000-000000000001',
 'a0000000-0000-0000-0000-000000000001',
 'c0000000-0000-0000-0000-000000000008',
 'Priya Patel', '+14695550108', null,
 'Summer Showdown Valorant tournament registration',
 'booked', 'converted', 78,
 'Tournament registration completed. Good upsell opportunity for monthly coaching.',
 'Upsell to coaching program after tournament. Offer post-tournament debrief session.',
 '{"game": "Valorant", "age": 15, "tournament": "Summer Showdown", "registration_date": "July 12"}'::jsonb),

-- Lead 6: Callback request — contacted
('d0000000-0000-0000-0000-000000000006',
 'b0000000-0000-0000-0000-000000000001',
 'a0000000-0000-0000-0000-000000000001',
 'c0000000-0000-0000-0000-000000000007',
 null, '+14695550107', null,
 'Wants to speak with human coach',
 'callback_needed', 'contacted', 45,
 'Requested human callback — trust issue with AI. Low-friction next step.',
 'Coach Marcus to call at 3pm today. Do not send automated messages.',
 '{"callback_time": "3pm", "coach_assigned": "Marcus", "prefers_human": true}'::jsonb)

on conflict do nothing;
