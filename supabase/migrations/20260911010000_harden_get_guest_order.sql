
-- Minor hardening: return an explicit column list instead of the full orders
-- row (to_jsonb(o)), so the guest_access_token itself (and any future column
-- added to `orders`) isn't echoed back in the response. Not a fix for an
-- active vulnerability — the caller already has the token — just avoids
-- over-exposing columns as the table grows.
CREATE OR REPLACE FUNCTION public.get_guest_order(_order_id UUID, _token UUID)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'order', jsonb_build_object(
      'id', o.id, 'order_number', o.order_number, 'full_name', o.full_name, 'phone', o.phone,
      'email', o.email, 'address', o.address, 'city', o.city, 'state', o.state, 'pincode', o.pincode,
      'total_amount', o.total_amount, 'status', o.status, 'notes', o.notes,
      'coupon_code', o.coupon_code, 'discount_amount', o.discount_amount,
      'shipping_amount', o.shipping_amount, 'tax_amount', o.tax_amount,
      'payment_method', o.payment_method, 'payment_status', o.payment_status,
      'created_at', o.created_at
    ),
    'items', COALESCE((SELECT jsonb_agg(to_jsonb(oi)) FROM public.order_items oi WHERE oi.order_id = o.id), '[]'::jsonb)
  ) INTO _result
  FROM public.orders o
  WHERE o.id = _order_id AND o.guest_access_token = _token;

  RETURN _result;
END;
$$;
GRANT EXECUTE ON FUNCTION public.get_guest_order TO anon, authenticated;
