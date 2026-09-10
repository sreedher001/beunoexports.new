import { useState } from "react";
import ScrollReveal from "@/components/ScrollReveal";
import { Phone, Mail, MapPin, Send } from "lucide-react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";

const contactSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  email: z.string().trim().email("Valid email required").max(255),
  phone: z.string().trim().min(1, "Phone is required").max(20),
  message: z.string().trim().min(1, "Message is required").max(2000),
});

const Contact = () => {
  const [form, setForm] = useState({ name: "", email: "", phone: "", message: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();

  const result = contactSchema.safeParse(form);

  if (!result.success) {
    const fieldErrors: Record<string, string> = {};
    result.error.errors.forEach((err) => {
      if (err.path[0]) fieldErrors[err.path[0] as string] = err.message;
    });
    setErrors(fieldErrors);
    return;
  }

  setErrors({});

  const { error } = await supabase.from("contact_messages").insert({
    name: form.name,
    email: form.email,
    phone: form.phone,
    message: form.message,
  });

  if (error) {
    setErrors({ message: "Failed to send your message. Please try again or contact us on WhatsApp." });
    return;
  }

  setSubmitted(true);

  // Best-effort admin notification email — never blocks the success state above.
  supabase.functions.invoke("send-contact-email", { body: form }).catch(() => {});

  // reset form after submit
  setForm({
    name: "",
    email: "",
    phone: "",
    message: "",
  });
};

  return (
    <>
      <section className="spice-gradient text-primary-foreground">
        <div className="container mx-auto px-4 py-20 md:py-28 lg:px-8 text-center">
          <h1 className="mb-4 animate-fade-up" style={{ lineHeight: 1.1 }}>Contact Us</h1>
          <p className="opacity-80 text-lg max-w-2xl mx-auto animate-fade-up" style={{ animationDelay: "100ms" }}>
            Get in touch for bulk pricing, samples, or any export inquiry.
          </p>
        </div>
      </section>

      <section className="section-padding">
        <div className="container mx-auto max-w-5xl">
          <div className="grid gap-12 md:grid-cols-5">
            {/* Info */}
            <ScrollReveal className="md:col-span-2">
              <h2 className="mb-6">Let's Talk Spices</h2>
              <div className="space-y-5">
                <div className="flex items-start gap-3">
                  <Phone className="h-5 w-5 text-secondary mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-semibold">Phone / WhatsApp</p>
                    <a href="tel:+918428450081" className="text-sm text-muted-foreground hover:text-foreground">+91 84284 50081</a>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Mail className="h-5 w-5 text-secondary mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-semibold">Email</p>
                    <a href="mailto:info@buenoexports.com" className="text-sm text-muted-foreground hover:text-foreground">info@buenoexports.com</a>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <MapPin className="h-5 w-5 text-secondary mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-semibold">Location</p>
                    <p className="text-sm text-muted-foreground">India</p>
                  </div>
                </div>
              </div>
              <div className="mt-8">
                <a
                  href="https://wa.me/918428450081"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-lg bg-[#25D366] px-5 py-2.5 text-sm font-semibold text-white shadow transition-all hover:shadow-lg active:scale-[0.97]"
                >
                  Chat on WhatsApp
                </a>
              </div>
            </ScrollReveal>

            {/* Form */}
            <ScrollReveal className="md:col-span-3" delay={100}>
              {submitted ? (
                <div className="rounded-xl border border-border bg-card p-10 text-center shadow-sm">
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-secondary/20">
                    <Send className="h-7 w-7 text-secondary" />
                  </div>
                  <h3 className="mb-2">Thank You!</h3>
                  <p className="text-muted-foreground">We've received your inquiry and will respond within 24 hours.</p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="rounded-xl border border-border bg-card p-6 md:p-8 shadow-sm space-y-5">
                  {[
                    { key: "name", label: "Full Name", type: "text", placeholder: "Your name" },
                    { key: "email", label: "Email Address", type: "email", placeholder: "you@company.com" },
                    { key: "phone", label: "Phone Number", type: "tel", placeholder: "+1 234 567 890" },
                  ].map((f) => (
                    <div key={f.key}>
                      <label className="block text-sm font-semibold mb-1.5">{f.label}</label>
                      <input
                        type={f.type}
                        placeholder={f.placeholder}
                        value={form[f.key as keyof typeof form]}
                        onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                        className="w-full rounded-lg border border-input bg-background px-4 py-2.5 text-sm outline-none transition-colors focus:border-secondary focus:ring-1 focus:ring-secondary/30"
                      />
                      {errors[f.key] && <p className="text-xs text-destructive mt-1">{errors[f.key]}</p>}
                    </div>
                  ))}
                  <div>
                    <label className="block text-sm font-semibold mb-1.5">Message</label>
                    <textarea
                      rows={4}
                      placeholder="Tell us about your spice requirements..."
                      value={form.message}
                      onChange={(e) => setForm({ ...form, message: e.target.value })}
                      className="w-full rounded-lg border border-input bg-background px-4 py-2.5 text-sm outline-none transition-colors focus:border-secondary focus:ring-1 focus:ring-secondary/30 resize-none"
                    />
                    {errors.message && <p className="text-xs text-destructive mt-1">{errors.message}</p>}
                  </div>
                  <button
                    type="submit"
                    className="w-full rounded-lg bg-primary px-6 py-3 text-sm font-bold text-primary-foreground shadow-md transition-all hover:shadow-lg active:scale-[0.98]"
                  >
                    Send Inquiry
                  </button>
                </form>
              )}
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* Location */}
      <section className="warm-bg">
        <div className="container mx-auto px-4 py-12 lg:px-8">
          <ScrollReveal>
            <div className="rounded-xl border border-border bg-card p-10 text-center shadow-md">
              <MapPin className="h-8 w-8 text-secondary mx-auto mb-3" />
              <p className="font-semibold">Our full address is coming soon.</p>
              <p className="text-sm text-muted-foreground mt-1">
                In the meantime, reach us by phone, email, or WhatsApp above and we'll get back to you.
              </p>
            </div>
          </ScrollReveal>
        </div>
      </section>
    </>
  );
};

export default Contact;
