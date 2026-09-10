
-- Contact form submissions (was previously posted to an external Google Apps Script URL)
CREATE TABLE public.contact_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    message TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'read')),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.contact_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can submit a contact message" ON public.contact_messages FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins can manage contact messages" ON public.contact_messages FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Newsletter signups (footer form was previously a no-op)
CREATE TABLE public.newsletter_subscribers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.newsletter_subscribers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can subscribe" ON public.newsletter_subscribers FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins can manage newsletter subscribers" ON public.newsletter_subscribers FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Where contact-form notification emails should be sent, and the low-stock alert threshold
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS contact_notification_email TEXT;
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS low_stock_threshold INTEGER NOT NULL DEFAULT 5;
