
-- Retail vs Wholesale catalog split
ALTER TABLE public.products
  ADD COLUMN catalog_type TEXT NOT NULL DEFAULT 'retail' CHECK (catalog_type IN ('retail', 'wholesale')),
  ADD COLUMN moq INTEGER;

CREATE INDEX idx_products_catalog_type ON public.products(catalog_type);
