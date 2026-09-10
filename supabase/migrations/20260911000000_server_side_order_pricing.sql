
-- CRITICAL SECURITY FIX: place_order_atomic previously trusted client-supplied
-- price/discount/shipping/tax values, letting anyone place an order at a price
-- of their choosing (the RPC is granted to `anon` for guest checkout, so no
-- login is even required). This version re-derives every monetary value from
-- the database (products/product_variants for price, coupons for discount,
-- site_settings for shipping/tax) and ignores whatever the client sends for
-- those fields. Only product_id/variant_id/quantity are taken from the client.
DROP FUNCTION IF EXISTS public.place_order_atomic(
  TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, NUMERIC, TEXT, JSONB, NUMERIC, NUMERIC, TEXT, TEXT, TEXT
);

CREATE OR REPLACE FUNCTION public.place_order_atomic(
  _full_name TEXT, _phone TEXT, _email TEXT, _address TEXT, _city TEXT, _state TEXT, _pincode TEXT,
  _notes TEXT, _coupon_code TEXT, _payment_method TEXT, _items JSONB
)
RETURNS TABLE(order_id UUID, order_number TEXT, guest_access_token UUID, total_amount NUMERIC)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _user_id UUID := auth.uid();
  _item JSONB;
  _subtotal NUMERIC := 0;
  _discount NUMERIC := 0;
  _shipping NUMERIC := 0;
  _tax NUMERIC := 0;
  _total NUMERIC := 0;
  _qty INTEGER;
  _pid UUID;
  _vid UUID;
  _line_price NUMERIC;
  _line_name TEXT;
  _line_image TEXT;
  _line_sku TEXT;
  _line_label TEXT;
  _new_order_id UUID;
  _new_order_number TEXT;
  _new_token UUID;
  _coupon RECORD;
  _settings RECORD;
BEGIN
  IF jsonb_array_length(_items) = 0 THEN RAISE EXCEPTION 'No items to order'; END IF;

  -- Pass 1: resolve the REAL price of every line from the database and sum it.
  -- The client's price (if it even sends one) is never read.
  FOR _item IN SELECT * FROM jsonb_array_elements(_items) LOOP
    _pid := (_item->>'product_id')::UUID;
    _vid := NULLIF(_item->>'variant_id', '')::UUID;
    _qty := (_item->>'quantity')::INTEGER;
    IF _qty IS NULL OR _qty < 1 THEN RAISE EXCEPTION 'Invalid quantity'; END IF;

    _line_price := NULL;
    IF _vid IS NOT NULL THEN
      SELECT pv.price INTO _line_price FROM public.product_variants pv WHERE pv.id = _vid AND pv.product_id = _pid;
    ELSE
      SELECT p.price INTO _line_price FROM public.products p WHERE p.id = _pid AND p.is_active = true;
    END IF;
    IF _line_price IS NULL THEN RAISE EXCEPTION 'Product not found or unavailable'; END IF;

    _subtotal := _subtotal + _line_price * _qty;
  END LOOP;

  -- Coupon: validated and priced entirely server-side (inlined validate_coupon logic).
  IF _coupon_code IS NOT NULL AND length(trim(_coupon_code)) > 0 THEN
    SELECT * INTO _coupon FROM public.coupons WHERE upper(code) = upper(_coupon_code) AND is_active = true;
    IF _coupon IS NULL THEN
      RAISE EXCEPTION 'Invalid or inactive coupon code';
    END IF;
    IF _coupon.expires_at IS NOT NULL AND _coupon.expires_at < now() THEN
      RAISE EXCEPTION 'This coupon has expired';
    END IF;
    IF _coupon.usage_limit IS NOT NULL AND _coupon.times_used >= _coupon.usage_limit THEN
      RAISE EXCEPTION 'This coupon has reached its usage limit';
    END IF;
    IF _subtotal < _coupon.min_order_amount THEN
      RAISE EXCEPTION 'Order does not meet the minimum amount for this coupon';
    END IF;

    IF _coupon.discount_type = 'percent' THEN
      _discount := _subtotal * _coupon.discount_value / 100;
      IF _coupon.max_discount IS NOT NULL THEN
        _discount := LEAST(_discount, _coupon.max_discount);
      END IF;
    ELSE
      _discount := _coupon.discount_value;
    END IF;
    _discount := LEAST(_discount, _subtotal);
  END IF;

  -- Shipping & tax: computed server-side from site_settings, never from the client.
  SELECT * INTO _settings FROM public.site_settings WHERE id = true;
  _shipping := CASE
    WHEN _settings.free_shipping_threshold IS NOT NULL AND _subtotal >= _settings.free_shipping_threshold THEN 0
    ELSE COALESCE(_settings.flat_shipping_rate, 0)
  END;
  _tax := ROUND((_subtotal - _discount) * COALESCE(_settings.tax_percent, 0) / 100, 2);
  _total := GREATEST(_subtotal - _discount, 0) + _shipping + _tax;

  INSERT INTO public.orders (
    user_id, order_number, full_name, phone, email, address, city, state, pincode,
    total_amount, notes, coupon_code, discount_amount, payment_method, shipping_amount, tax_amount
  ) VALUES (
    _user_id, 'temp', _full_name, _phone, _email, _address, _city, _state, _pincode,
    _total, _notes, NULLIF(_coupon_code, ''), _discount, _payment_method, _shipping, _tax
  ) RETURNING orders.id, orders.order_number, orders.guest_access_token INTO _new_order_id, _new_order_number, _new_token;

  -- Pass 2: decrement stock and insert order_items using the SAME authoritative lookups.
  FOR _item IN SELECT * FROM jsonb_array_elements(_items) LOOP
    _pid := (_item->>'product_id')::UUID;
    _vid := NULLIF(_item->>'variant_id', '')::UUID;
    _qty := (_item->>'quantity')::INTEGER;
    _line_price := NULL; _line_name := NULL; _line_image := NULL; _line_sku := NULL; _line_label := NULL;

    IF _vid IS NOT NULL THEN
      SELECT pv.price, pv.label, pv.sku, p.name, p.image_url
        INTO _line_price, _line_label, _line_sku, _line_name, _line_image
        FROM public.product_variants pv JOIN public.products p ON p.id = pv.product_id
        WHERE pv.id = _vid AND pv.product_id = _pid;
      UPDATE public.product_variants SET stock = stock - _qty WHERE id = _vid AND stock >= _qty;
    ELSE
      SELECT price, sku, name, image_url INTO _line_price, _line_sku, _line_name, _line_image
        FROM public.products WHERE id = _pid AND is_active = true;
      UPDATE public.products SET stock = stock - _qty WHERE id = _pid AND stock >= _qty;
    END IF;
    IF _line_price IS NULL OR NOT FOUND THEN RAISE EXCEPTION 'Insufficient stock for %', COALESCE(_line_name, 'an item'); END IF;

    INSERT INTO public.order_items (
      order_id, product_id, variant_id, product_name, product_image, quantity, price, variant_label, sku
    ) VALUES (
      _new_order_id, _pid, _vid, _line_name, _line_image, _qty, _line_price, _line_label, _line_sku
    );
  END LOOP;

  IF _coupon_code IS NOT NULL AND length(trim(_coupon_code)) > 0 THEN
    UPDATE public.coupons SET times_used = times_used + 1 WHERE upper(code) = upper(_coupon_code);
  END IF;

  RETURN QUERY SELECT _new_order_id, _new_order_number, _new_token, _total;
END;
$$;
GRANT EXECUTE ON FUNCTION public.place_order_atomic TO authenticated, anon;

-- CRITICAL SECURITY FIX: redeem_coupon incremented usage with no relation to a
-- real order and was publicly callable (Postgres grants EXECUTE to PUBLIC by
-- default when a function has no explicit GRANT). It's no longer needed by any
-- client — place_order_atomic now redeems coupons internally above — so lock
-- it down entirely. validate_coupon stays public: it's read-only (no side
-- effects) and is still used for the instant "Apply coupon" preview in the UI.
REVOKE EXECUTE ON FUNCTION public.redeem_coupon(TEXT) FROM PUBLIC, anon, authenticated;

-- Give the already-built (but previously inert) per-page SEO system real
-- production values instead of leaving the row blank. COALESCE means this
-- only fills in fields the admin hasn't already set — never overwrites.
UPDATE public.site_settings SET
  default_meta_title = COALESCE(default_meta_title, 'Bueno Exports | Premium Indian Spices Exporter'),
  default_meta_description = COALESCE(default_meta_description, 'Bueno Exports supplies premium Indian spices like pepper, turmeric, and cardamom worldwide with quality and reliability.'),
  default_og_image = COALESCE(default_og_image, 'https://buenoexports.com/bueno-logo.png')
WHERE id = true;
