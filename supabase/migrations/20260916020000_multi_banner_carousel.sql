
-- Replace the single retail/wholesale banner columns on site_settings with a
-- proper banners table supporting multiple banners per mode (admin UI caps
-- this at 3), rotated as a carousel on the homepage. Whatever was already
-- saved in the old single-banner columns is preserved here as each mode's
-- first banner (sort_order 0) before those columns are dropped.
CREATE TABLE public.banners (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mode TEXT NOT NULL CHECK (mode IN ('retail', 'wholesale')),
    sort_order INTEGER NOT NULL DEFAULT 0,
    image_url TEXT,
    title TEXT,
    subtitle TEXT,
    cta_text TEXT,
    cta_link TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.banners ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Banners are viewable by everyone" ON public.banners FOR SELECT USING (true);
CREATE POLICY "Admins can manage banners" ON public.banners FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE INDEX idx_banners_mode_sort ON public.banners(mode, sort_order);
CREATE TRIGGER update_banners_updated_at BEFORE UPDATE ON public.banners
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.banners (mode, sort_order, image_url, title, subtitle, cta_text, cta_link)
SELECT 'retail', 0, banner_retail_image_url, banner_retail_title, banner_retail_subtitle, banner_retail_cta_text, banner_retail_cta_link
FROM public.site_settings WHERE id = true
  AND (banner_retail_image_url IS NOT NULL OR banner_retail_title IS NOT NULL OR banner_retail_subtitle IS NOT NULL OR banner_retail_cta_text IS NOT NULL OR banner_retail_cta_link IS NOT NULL);

INSERT INTO public.banners (mode, sort_order, image_url, title, subtitle, cta_text, cta_link)
SELECT 'wholesale', 0, banner_wholesale_image_url, banner_wholesale_title, banner_wholesale_subtitle, banner_wholesale_cta_text, banner_wholesale_cta_link
FROM public.site_settings WHERE id = true
  AND (banner_wholesale_image_url IS NOT NULL OR banner_wholesale_title IS NOT NULL OR banner_wholesale_subtitle IS NOT NULL OR banner_wholesale_cta_text IS NOT NULL OR banner_wholesale_cta_link IS NOT NULL);

ALTER TABLE public.site_settings DROP COLUMN IF EXISTS banner_retail_image_url;
ALTER TABLE public.site_settings DROP COLUMN IF EXISTS banner_retail_title;
ALTER TABLE public.site_settings DROP COLUMN IF EXISTS banner_retail_subtitle;
ALTER TABLE public.site_settings DROP COLUMN IF EXISTS banner_retail_cta_text;
ALTER TABLE public.site_settings DROP COLUMN IF EXISTS banner_retail_cta_link;
ALTER TABLE public.site_settings DROP COLUMN IF EXISTS banner_wholesale_image_url;
ALTER TABLE public.site_settings DROP COLUMN IF EXISTS banner_wholesale_title;
ALTER TABLE public.site_settings DROP COLUMN IF EXISTS banner_wholesale_subtitle;
ALTER TABLE public.site_settings DROP COLUMN IF EXISTS banner_wholesale_cta_text;
ALTER TABLE public.site_settings DROP COLUMN IF EXISTS banner_wholesale_cta_link;
