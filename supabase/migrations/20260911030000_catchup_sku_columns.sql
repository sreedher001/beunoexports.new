
-- Catch-up: the original SKU migration (20260907010000) was never applied.
-- Only adding the plain columns here — NOT recreating place_order_atomic,
-- since the current live version (from 20260911000000) is already correct
-- and secure, and already captures SKU per line via its own lookups.
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS sku TEXT;
ALTER TABLE public.product_variants ADD COLUMN IF NOT EXISTS sku TEXT;
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS sku TEXT;
