
-- Separate, admin-editable homepage hero banner per catalog mode (retail vs
-- wholesale — see CatalogModeContext). NULL/empty fields fall back to the
-- site's built-in defaults on the frontend, so this is safe to leave unset.
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS banner_retail_image_url TEXT;
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS banner_retail_title TEXT;
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS banner_retail_subtitle TEXT;
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS banner_retail_cta_text TEXT;
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS banner_retail_cta_link TEXT;

ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS banner_wholesale_image_url TEXT;
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS banner_wholesale_title TEXT;
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS banner_wholesale_subtitle TEXT;
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS banner_wholesale_cta_text TEXT;
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS banner_wholesale_cta_link TEXT;
