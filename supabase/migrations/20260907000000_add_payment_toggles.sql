
ALTER TABLE public.site_settings ADD COLUMN cod_enabled BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE public.site_settings ADD COLUMN online_payment_enabled BOOLEAN NOT NULL DEFAULT true;
