import { Link } from "react-router-dom";
import ScrollReveal from "@/components/ScrollReveal";
import { Package, Tag, Truck, FileCheck, Globe, ShieldCheck } from "lucide-react";

const services = [
  { icon: Package, title: "Bulk Export Services", desc: "Large-volume spice exports with competitive pricing. FCL and LCL shipments tailored to your needs with complete export documentation." },
  { icon: Tag, title: "Private Labeling", desc: "White-label and private-label spice packaging for your brand. Custom formulation, packaging design support, and brand compliance." },
  { icon: Package, title: "Packaging Solutions", desc: "From bulk jute bags to retail-ready pouches — we offer flexible packaging options including vacuum-sealed, nitrogen-flushed, and custom formats." },
  { icon: Truck, title: "Logistics & Shipping", desc: "End-to-end logistics management including inland transport, port handling, containerization, and freight forwarding to any global destination." },
  { icon: FileCheck, title: "International Compliance", desc: "Complete documentation including phytosanitary certificates, certificates of origin, health certificates, and customs declarations for seamless import." },
  { icon: Globe, title: "Market-Specific Grades", desc: "Spice grades customized to meet specific market requirements — whether it's EU, USA, Middle East, or Asian quality standards." },
];

const ExportPage = () => {
  return (
    <>
      <section className="spice-gradient text-primary-foreground">
        <div className="container mx-auto px-4 py-20 md:py-28 lg:px-8 text-center">
          <h1 className="mb-4 animate-fade-up" style={{ lineHeight: 1.1 }}>Export Services</h1>
          <p className="opacity-80 text-lg max-w-2xl mx-auto animate-fade-up" style={{ animationDelay: "100ms" }}>
            Comprehensive spice export solutions — from sourcing to delivery at your doorstep.
          </p>
        </div>
      </section>

      <section className="section-padding">
        <div className="container mx-auto">
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {services.map((s, i) => (
              <ScrollReveal key={s.title} delay={i * 80}>
                <div className="rounded-xl border border-border bg-card p-7 shadow-sm transition-shadow hover:shadow-md h-full">
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-secondary/15">
                    <s.icon className="h-6 w-6 text-secondary" />
                  </div>
                  <h3 className="font-display text-lg font-semibold mb-3">{s.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{s.desc}</p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* Process */}
      <section className="section-padding warm-bg">
        <div className="container mx-auto max-w-4xl">
          <ScrollReveal className="text-center mb-12">
            <h2 className="text-balance">How We Work</h2>
          </ScrollReveal>
          <div className="grid gap-6 md:grid-cols-4">
            {[
              { step: "01", title: "Inquiry", desc: "Share your requirements" },
              { step: "02", title: "Sample", desc: "Receive quality samples" },
              { step: "03", title: "Order", desc: "Confirm pricing & terms" },
              { step: "04", title: "Delivery", desc: "On-time global shipping" },
            ].map((s, i) => (
              <ScrollReveal key={s.step} delay={i * 100}>
                <div className="text-center">
                  <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground font-display text-lg font-bold">
                    {s.step}
                  </div>
                  <h3 className="font-display text-lg font-semibold mb-1">{s.title}</h3>
                  <p className="text-sm text-muted-foreground">{s.desc}</p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      <section className="section-padding">
        <div className="container mx-auto text-center max-w-2xl">
          <ScrollReveal>
            <ShieldCheck className="h-10 w-10 text-secondary mx-auto mb-4" />
            <h2 className="mb-4 text-balance">Start Your Spice Import Journey</h2>
            <p className="text-muted-foreground mb-6">
              Whether you need bulk raw spices or retail-ready private label products, our export team is ready to help.
            </p>
            <Link
              to="/contact"
              className="inline-flex items-center rounded-lg bg-primary px-7 py-3 text-sm font-bold text-primary-foreground shadow-lg transition-all hover:shadow-xl active:scale-[0.97]"
            >
              Request a Quote
            </Link>
          </ScrollReveal>
        </div>
      </section>
    </>
  );
};

export default ExportPage;
