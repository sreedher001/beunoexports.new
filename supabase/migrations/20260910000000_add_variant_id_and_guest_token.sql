
-- Track which variant a line item was (needed to restore stock accurately on cancel)
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS variant_id UUID REFERENCES public.product_variants(id);

-- Per-order token so a guest (no auth session) can still reload their confirmation page
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS guest_access_token UUID NOT NULL DEFAULT gen_random_uuid();

-- Re-create place_order_atomic: same behavior, now also stores variant_id per line
-- and returns the guest_access_token so the client can save it for later lookups.
DROP FUNCTION IF EXISTS public.place_order_atomic(
  TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, NUMERIC, TEXT, JSONB, NUMERIC, NUMERIC, TEXT, TEXT, TEXT
);

CREATE OR REPLACE FUNCTION public.place_order_atomic(
  _full_name TEXT, _phone TEXT, _email TEXT, _address TEXT, _city TEXT, _state TEXT, _pincode TEXT,
  _notes TEXT, _coupon_code TEXT, _discount_amount NUMERIC, _payment_method TEXT, _items JSONB,
  _shipping_amount NUMERIC DEFAULT 0, _tax_amount NUMERIC DEFAULT 0,
  _payment_status TEXT DEFAULT 'pending', _razorpay_order_id TEXT DEFAULT NULL, _razorpay_payment_id TEXT DEFAULT NULL
)
RETURNS TABLE(order_id UUID, order_number TEXT, guest_access_token UUID)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _user_id UUID := auth.uid();
  _item JSONB; _subtotal NUMERIC := 0; _new_order_id UUID; _new_order_number TEXT; _new_token UUID; _qty INTEGER;
BEGIN
  IF jsonb_array_length(_items) = 0 THEN RAISE EXCEPTION 'No items to order'; END IF;
  FOR _item IN SELECT * FROM jsonb_array_elements(_items) LOOP
    _subtotal := _subtotal + (_item->>'price')::NUMERIC * (_item->>'quantity')::INTEGER;
  END LOOP;
  INSERT INTO public.orders (
    user_id, order_number, full_name, phone, email, address, city, state, pincode,
    total_amount, notes, coupon_code, discount_amount, payment_method,
    shipping_amount, tax_amount, payment_status, razorpay_order_id, razorpay_payment_id
  ) VALUES (
    _user_id, 'temp', _full_name, _phone, _email, _address, _city, _state, _pincode,
    GREATEST(_subtotal - COALESCE(_discount_amount, 0), 0) + COALESCE(_shipping_amount, 0) + COALESCE(_tax_amount, 0),
    _notes, _coupon_code, COALESCE(_discount_amount, 0), _payment_method,
    COALESCE(_shipping_amount, 0), COALESCE(_tax_amount, 0), COALESCE(_payment_status, 'pending'),
    _razorpay_order_id, _razorpay_payment_id
  ) RETURNING orders.id, orders.order_number, orders.guest_access_token INTO _new_order_id, _new_order_number, _new_token;
  FOR _item IN SELECT * FROM jsonb_array_elements(_items) LOOP
    _qty := (_item->>'quantity')::INTEGER;
    IF (_item->>'variant_id') IS NOT NULL THEN
      UPDATE public.product_variants SET stock = stock - _qty WHERE id = (_item->>'variant_id')::UUID AND stock >= _qty;
    ELSE
      UPDATE public.products SET stock = stock - _qty WHERE id = (_item->>'product_id')::UUID AND stock >= _qty;
    END IF;
    IF NOT FOUND THEN RAISE EXCEPTION 'Insufficient stock for %', (_item->>'product_name'); END IF;
    INSERT INTO public.order_items (
      order_id, product_id, variant_id, product_name, product_image, quantity, price, variant_label, sku
    ) VALUES (
      _new_order_id, (_item->>'product_id')::UUID,
      CASE WHEN (_item->>'variant_id') IS NOT NULL THEN (_item->>'variant_id')::UUID ELSE NULL END,
      _item->>'product_name', _item->>'product_image',
      _qty, (_item->>'price')::NUMERIC, _item->>'variant_label', _item->>'sku'
    );
  END LOOP;
  RETURN QUERY SELECT _new_order_id, _new_order_number, _new_token;
END;
$$;
GRANT EXECUTE ON FUNCTION public.place_order_atomic TO authenticated, anon;

-- Admin (any transition) or the order's own owner (pending -> cancelled only) can change status.
-- Restores stock when an order moves into 'cancelled' from a non-cancelled status.
CREATE OR REPLACE FUNCTION public.update_order_status(_order_id UUID, _status TEXT)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _order public.orders%ROWTYPE;
  _item public.order_items%ROWTYPE;
  _is_admin BOOLEAN := public.has_role(auth.uid(), 'admin');
BEGIN
  SELECT * INTO _order FROM public.orders WHERE id = _order_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Order not found'; END IF;

  IF NOT _is_admin THEN
    IF _order.user_id IS DISTINCT FROM auth.uid() THEN
      RAISE EXCEPTION 'Not authorized';
    END IF;
    IF _order.status <> 'pending' OR _status <> 'cancelled' THEN
      RAISE EXCEPTION 'You can only cancel a pending order';
    END IF;
  END IF;

  IF _status = 'cancelled' AND _order.status <> 'cancelled' THEN
    FOR _item IN SELECT * FROM public.order_items WHERE order_id = _order_id LOOP
      IF _item.variant_id IS NOT NULL THEN
        UPDATE public.product_variants SET stock = stock + _item.quantity WHERE id = _item.variant_id;
      ELSIF _item.product_id IS NOT NULL THEN
        UPDATE public.products SET stock = stock + _item.quantity WHERE id = _item.product_id;
      END IF;
    END LOOP;
  END IF;

  UPDATE public.orders SET status = _status WHERE id = _order_id;
END;
$$;
GRANT EXECUTE ON FUNCTION public.update_order_status TO authenticated;

-- Lets a guest (no session) fetch their own order via the token issued at checkout time.
CREATE OR REPLACE FUNCTION public.get_guest_order(_order_id UUID, _token UUID)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'order', to_jsonb(o),
    'items', COALESCE((SELECT jsonb_agg(to_jsonb(oi)) FROM public.order_items oi WHERE oi.order_id = o.id), '[]'::jsonb)
  ) INTO _result
  FROM public.orders o
  WHERE o.id = _order_id AND o.guest_access_token = _token;

  RETURN _result;
END;
$$;
GRANT EXECUTE ON FUNCTION public.get_guest_order TO anon, authenticated;
