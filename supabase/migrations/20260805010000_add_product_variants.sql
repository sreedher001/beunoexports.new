
-- Product variants (e.g. 250g / 500g / 1kg), each with its own price, mrp, and stock
CREATE TABLE public.product_variants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
    label TEXT NOT NULL,
    price NUMERIC NOT NULL DEFAULT 0,
    mrp NUMERIC NOT NULL DEFAULT 0,
    stock INTEGER NOT NULL DEFAULT 0,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Variants are viewable by everyone" ON public.product_variants FOR SELECT USING (true);
CREATE POLICY "Admins can manage variants" ON public.product_variants FOR ALL USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_product_variants_product ON public.product_variants(product_id);

CREATE TRIGGER update_product_variants_updated_at BEFORE UPDATE ON public.product_variants
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Cart items: allow one line per (product, variant) combo
ALTER TABLE public.cart_items ADD COLUMN variant_id UUID REFERENCES public.product_variants(id) ON DELETE CASCADE;

ALTER TABLE public.cart_items DROP CONSTRAINT IF EXISTS cart_items_user_product_unique;
ALTER TABLE public.cart_items DROP CONSTRAINT IF EXISTS cart_items_user_id_product_id_key;

-- Products without a variant: one cart line per product (variant_id IS NULL)
CREATE UNIQUE INDEX cart_items_user_product_no_variant_unique ON public.cart_items(user_id, product_id) WHERE variant_id IS NULL;
-- Products with variants: one cart line per (product, variant)
CREATE UNIQUE INDEX cart_items_user_product_variant_unique ON public.cart_items(user_id, product_id, variant_id) WHERE variant_id IS NOT NULL;

-- Order items: preserve which variant was ordered
ALTER TABLE public.order_items ADD COLUMN variant_label TEXT;
