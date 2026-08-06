
-- Coupons / discount codes
CREATE TABLE public.coupons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT NOT NULL UNIQUE,
    discount_type TEXT NOT NULL DEFAULT 'percent' CHECK (discount_type IN ('percent', 'flat')),
    discount_value NUMERIC NOT NULL,
    min_order_amount NUMERIC NOT NULL DEFAULT 0,
    max_discount NUMERIC,
    usage_limit INTEGER,
    times_used INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
-- No public SELECT policy: coupons are only readable/redeemable via the
-- validate_coupon() function below, so anon users can't browse valid codes.
CREATE POLICY "Admins can manage coupons" ON public.coupons FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Orders: track which coupon (if any) was applied and how much was discounted
ALTER TABLE public.orders ADD COLUMN coupon_code TEXT;
ALTER TABLE public.orders ADD COLUMN discount_amount NUMERIC NOT NULL DEFAULT 0;

-- Validate a coupon code against an order amount without exposing the coupons table
CREATE OR REPLACE FUNCTION public.validate_coupon(_code TEXT, _order_amount NUMERIC)
RETURNS TABLE(valid BOOLEAN, discount_amount NUMERIC, message TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  c RECORD;
  calc_discount NUMERIC;
BEGIN
  SELECT * INTO c FROM public.coupons WHERE upper(code) = upper(_code) AND is_active = true;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 0::numeric, 'Invalid coupon code';
    RETURN;
  END IF;

  IF c.expires_at IS NOT NULL AND c.expires_at < now() THEN
    RETURN QUERY SELECT false, 0::numeric, 'This coupon has expired';
    RETURN;
  END IF;

  IF c.usage_limit IS NOT NULL AND c.times_used >= c.usage_limit THEN
    RETURN QUERY SELECT false, 0::numeric, 'This coupon has reached its usage limit';
    RETURN;
  END IF;

  IF _order_amount < c.min_order_amount THEN
    RETURN QUERY SELECT false, 0::numeric, ('Minimum order amount is ₹' || c.min_order_amount);
    RETURN;
  END IF;

  IF c.discount_type = 'percent' THEN
    calc_discount := round(_order_amount * c.discount_value / 100, 2);
    IF c.max_discount IS NOT NULL AND calc_discount > c.max_discount THEN
      calc_discount := c.max_discount;
    END IF;
  ELSE
    calc_discount := c.discount_value;
  END IF;

  IF calc_discount > _order_amount THEN
    calc_discount := _order_amount;
  END IF;

  RETURN QUERY SELECT true, calc_discount, 'Coupon applied!';
END;
$$;

-- Increment usage count after an order is successfully placed with this coupon
CREATE OR REPLACE FUNCTION public.redeem_coupon(_code TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.coupons SET times_used = times_used + 1 WHERE upper(code) = upper(_code);
END;
$$;
