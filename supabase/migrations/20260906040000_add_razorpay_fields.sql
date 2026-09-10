
ALTER TABLE public.orders ADD COLUMN payment_status TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'failed'));
ALTER TABLE public.orders ADD COLUMN razorpay_order_id TEXT;
ALTER TABLE public.orders ADD COLUMN razorpay_payment_id TEXT;

CREATE OR REPLACE FUNCTION public.place_order_atomic(
  _full_name TEXT,
  _phone TEXT,
  _email TEXT,
  _address TEXT,
  _city TEXT,
  _state TEXT,
  _pincode TEXT,
  _notes TEXT,
  _coupon_code TEXT,
  _discount_amount NUMERIC,
  _payment_method TEXT,
  _items JSONB,
  _shipping_amount NUMERIC DEFAULT 0,
  _tax_amount NUMERIC DEFAULT 0,
  _payment_status TEXT DEFAULT 'pending',
  _razorpay_order_id TEXT DEFAULT NULL,
  _razorpay_payment_id TEXT DEFAULT NULL
)
RETURNS TABLE(order_id UUID, order_number TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id UUID := auth.uid(); -- NULL for guest checkout (anon key, no session)
  _item JSONB;
  _subtotal NUMERIC := 0;
  _new_order_id UUID;
  _new_order_number TEXT;
  _qty INTEGER;
BEGIN
  IF jsonb_array_length(_items) = 0 THEN
    RAISE EXCEPTION 'No items to order';
  END IF;

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
  )
  RETURNING orders.id, orders.order_number INTO _new_order_id, _new_order_number;

  FOR _item IN SELECT * FROM jsonb_array_elements(_items) LOOP
    _qty := (_item->>'quantity')::INTEGER;

    IF (_item->>'variant_id') IS NOT NULL THEN
      UPDATE public.product_variants SET stock = stock - _qty
      WHERE id = (_item->>'variant_id')::UUID AND stock >= _qty;
    ELSE
      UPDATE public.products SET stock = stock - _qty
      WHERE id = (_item->>'product_id')::UUID AND stock >= _qty;
    END IF;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Insufficient stock for %', (_item->>'product_name');
    END IF;

    INSERT INTO public.order_items (
      order_id, product_id, product_name, product_image, quantity, price, variant_label
    ) VALUES (
      _new_order_id, (_item->>'product_id')::UUID, _item->>'product_name', _item->>'product_image',
      _qty, (_item->>'price')::NUMERIC, _item->>'variant_label'
    );
  END LOOP;

  RETURN QUERY SELECT _new_order_id, _new_order_number;
END;
$$;

GRANT EXECUTE ON FUNCTION public.place_order_atomic TO authenticated, anon;
