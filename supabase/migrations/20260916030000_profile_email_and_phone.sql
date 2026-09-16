-- profiles never stored email at all, and the signup trigger only saved
-- full_name even though phone was already being passed in as auth metadata.
-- Add email, capture phone on signup too, and backfill existing users from
-- what auth.users already has.
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email TEXT;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, phone, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NEW.raw_user_meta_data->>'phone',
    NEW.email
  );
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user');
  RETURN NEW;
END;
$$;

UPDATE public.profiles p
SET
  email = COALESCE(p.email, u.email),
  phone = COALESCE(p.phone, u.raw_user_meta_data->>'phone')
FROM auth.users u
WHERE u.id = p.user_id;
