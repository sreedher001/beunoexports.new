
-- Catch-up migration: two earlier migrations (20260910000000, 20260910010000)
-- were never actually applied to the live database, even though the newer
-- security-fix migrations (20260911000000, 20260911010000) that depend on
-- their columns WERE applied and deployed. This adds exactly the missing
-- pieces WITHOUT touching place_order_atomic or get_guest_order — those are
-- already correct, already-secure, and already live; recreating them from
-- the old files would reintroduce the client-trusted-price vulnerability.

-- Track which variant a line item was (needed to restore stock accurately on cancel)
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS variant_id UUID REFERENCES public.product_variants(id);

-- Per-order token so a guest (no auth session) can still reload their confirmation page
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS guest_access_token UUID NOT NULL DEFAULT gen_random_uuid();

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

-- Contact form submissions (was previously posted to an external Google Apps Script URL)
CREATE TABLE IF NOT EXISTS public.contact_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    message TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'read')),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.contact_messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can submit a contact message" ON public.contact_messages;
CREATE POLICY "Anyone can submit a contact message" ON public.contact_messages FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Admins can manage contact messages" ON public.contact_messages;
CREATE POLICY "Admins can manage contact messages" ON public.contact_messages FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Newsletter signups (footer form was previously a no-op)
CREATE TABLE IF NOT EXISTS public.newsletter_subscribers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.newsletter_subscribers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can subscribe" ON public.newsletter_subscribers;
CREATE POLICY "Anyone can subscribe" ON public.newsletter_subscribers FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Admins can manage newsletter subscribers" ON public.newsletter_subscribers;
CREATE POLICY "Admins can manage newsletter subscribers" ON public.newsletter_subscribers FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Where contact-form notification emails should be sent, and the low-stock alert threshold
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS contact_notification_email TEXT;
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS low_stock_threshold INTEGER NOT NULL DEFAULT 5;
