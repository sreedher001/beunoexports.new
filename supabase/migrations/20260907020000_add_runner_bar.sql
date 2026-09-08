
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS runner_enabled BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS runner_text TEXT;
