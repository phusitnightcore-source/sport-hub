-- Add required columns from Badminton Group to Sport Hub's profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS display_name TEXT,
ADD COLUMN IF NOT EXISTS skill_level TEXT CHECK (skill_level IN ('Beginner', 'Intermediate', 'Advanced'));

-- Update existing profiles to have a default display_name (using full_name or email prefix if full_name is null)
UPDATE public.profiles
SET display_name = COALESCE(full_name, split_part(email, '@', 1))
WHERE display_name IS NULL;

-- Make display_name NOT NULL now that existing rows are populated
ALTER TABLE public.profiles
ALTER COLUMN display_name SET NOT NULL;
