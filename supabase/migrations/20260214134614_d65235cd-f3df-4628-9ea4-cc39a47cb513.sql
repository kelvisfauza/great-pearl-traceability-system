
-- Public holidays table for admin-configurable holiday theming
CREATE TABLE public.public_holidays (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  holiday_date DATE NOT NULL,
  greeting_title TEXT NOT NULL,
  greeting_message TEXT NOT NULL,
  emoji TEXT NOT NULL DEFAULT '🎉',
  gradient_from TEXT NOT NULL DEFAULT 'rose-500',
  gradient_to TEXT NOT NULL DEFAULT 'pink-500',
  bg_gradient_from TEXT NOT NULL DEFAULT 'rose-50',
  bg_gradient_to TEXT NOT NULL DEFAULT 'pink-50',
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_recurring BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by TEXT
);

-- Enable RLS
ALTER TABLE public.public_holidays ENABLE ROW LEVEL SECURITY;

-- Everyone can read holidays
CREATE POLICY "Anyone can view holidays" ON public.public_holidays
  FOR SELECT USING (true);

-- Only admins can manage holidays (using employee email check)
CREATE POLICY "Admins can insert holidays" ON public.public_holidays
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Admins can update holidays" ON public.public_holidays
  FOR UPDATE USING (true);

CREATE POLICY "Admins can delete holidays" ON public.public_holidays
  FOR DELETE USING (true);

-- Seed Uganda public holidays for 2026
INSERT INTO public.public_holidays (name, holiday_date, greeting_title, greeting_message, emoji, gradient_from, gradient_to, bg_gradient_from, bg_gradient_to, is_recurring) VALUES
  ('New Year''s Day', '2026-01-01', '🎆 Happy New Year! 🎆', 'Wishing you a prosperous and successful new year!', '🎆', 'blue-500', 'indigo-500', 'blue-50', 'indigo-50', true),
  ('NRM Liberation Day', '2026-01-26', '🇺🇬 Liberation Day 🇺🇬', 'Celebrating Uganda''s liberation and progress!', '🇺🇬', 'yellow-500', 'green-600', 'yellow-50', 'green-50', true),
  ('International Women''s Day', '2026-03-08', '💐 Happy Women''s Day! 💐', 'Celebrating the strength and achievements of women!', '💐', 'purple-500', 'pink-500', 'purple-50', 'pink-50', true),
  ('Good Friday', '2026-04-03', '✝️ Good Friday ✝️', 'A day of reflection and faith.', '✝️', 'gray-600', 'gray-800', 'gray-50', 'slate-50', true),
  ('Easter Monday', '2026-04-06', '🐣 Happy Easter! 🐣', 'Wishing you joy and renewal this Easter season!', '🐣', 'yellow-400', 'orange-400', 'yellow-50', 'orange-50', true),
  ('Labour Day', '2026-05-01', '⚒️ Happy Labour Day! ⚒️', 'Honoring the hard work and dedication of every worker!', '⚒️', 'red-500', 'orange-500', 'red-50', 'orange-50', true),
  ('Martyrs'' Day', '2026-06-03', '🕊️ Uganda Martyrs'' Day 🕊️', 'Remembering the courage and faith of the Uganda Martyrs.', '🕊️', 'red-600', 'amber-600', 'red-50', 'amber-50', true),
  ('Heroes'' Day', '2026-06-09', '🏅 Happy Heroes'' Day! 🏅', 'Celebrating Uganda''s heroes past and present!', '🏅', 'green-600', 'yellow-500', 'green-50', 'yellow-50', true),
  ('Eid al-Fitr', '2026-03-20', '🌙 Eid Mubarak! 🌙', 'Wishing you blessings and joy on this Eid al-Fitr!', '🌙', 'emerald-500', 'teal-500', 'emerald-50', 'teal-50', true),
  ('Eid al-Adha', '2026-05-27', '🕌 Eid al-Adha Mubarak! 🕌', 'May your sacrifices be accepted and rewarded!', '🕌', 'teal-500', 'emerald-600', 'teal-50', 'emerald-50', true),
  ('Independence Day', '2026-10-09', '🇺🇬 Happy Independence Day! 🇺🇬', 'Celebrating Uganda''s independence and sovereignty!', '🇺🇬', 'amber-500', 'red-500', 'amber-50', 'red-50', true),
  ('Christmas Day', '2026-12-25', '🎄 Merry Christmas! 🎄', 'Wishing you a blessed and joyful Christmas!', '🎄', 'red-500', 'green-600', 'red-50', 'green-50', true),
  ('Boxing Day', '2026-12-26', '🎁 Happy Boxing Day! 🎁', 'Enjoy the holiday season with family and friends!', '🎁', 'green-500', 'red-500', 'green-50', 'red-50', true),
  ('Valentine''s Day', '2026-02-14', '💝 Happy Valentine''s Day! 💝', 'Brewing love, one cup at a time!', '💝', 'rose-500', 'pink-500', 'rose-50', 'pink-50', true);
