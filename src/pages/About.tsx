import ScrollReveal from "@/components/ScrollReveal";
import heroImg from "@/assets/hero-spices.jpg";
import { Globe, Target, Eye, ShieldCheck, Users, Leaf } from "lucide-react";

const About = () => {
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0">
          <img src={heroImg} alt="Indian spices" className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-primary/80" />
        </div>
        <div className="relative container mx-auto px-4 py-20 md:py-28 lg:px-8 text-center">
          <h1 className="text-primary-foreground mb-4 animate-fade-up" style={{ lineHeight: 1.1 }}>About BuenoExports</h1>
          <p className="text-primary-foreground/80 text-lg max-w-2xl mx-auto animate-fade-up" style={{ animationDelay: "100ms" }}>
            A trusted name in premium Indian spice exports since day one.
          </p>
        </div>
      </section>

      {/* Story */}
      <section className="section-padding">
        <div className="container mx-auto max-w-4xl">
          <ScrollReveal>
            <div className="grid gap-12 md:grid-cols-2 items-center">
              <div>
                <p className="text-sm font-semibold uppercase tracking-widest text-secondary mb-3">Our Story</p>
                <h2 className="mb-4">From Indian Farms to Global Markets</h2>
                <p className="text-muted-foreground mb-4">
                  BuenoExports was founded with a simple mission: to bring the finest Indian spices to the world. We work directly with farmers across India's spice-rich regions — from Kerala's pepper plantations to Rajasthan's chili fields.
                </p>
                <p className="text-muted-foreground">
                  Our commitment to quality, transparent sourcing, and international compliance has made us a preferred partner for importers, food manufacturers, and distributors across 30+ countries.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { num: "30+", label: "Export Countries" },
                  { num: "500+", label: "Tons Annually" },
                  { num: "100%", label: "Quality Tested" },
                  { num: "24/7", label: "Support" },
                ].map((s) => (
                  <div key={s.label} className="rounded-xl border border-border bg-card p-5 text-center shadow-sm">
                    <p className="font-display text-2xl font-bold text-secondary">{s.num}</p>
                    <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* Mission & Vision */}
      <section className="section-padding warm-bg">
        <div className="container mx-auto max-w-4xl">
          <div className="grid gap-8 md:grid-cols-2">
            <ScrollReveal>
              <div className="rounded-xl border border-border bg-card p-8 shadow-sm h-full">
                <Target className="h-8 w-8 text-secondary mb-4" />
                <h3 className="mb-3">Our Mission</h3>
                <p className="text-muted-foreground text-sm">
                  To be the most reliable and quality-focused Indian spice export company, delivering premium products that exceed international standards and create lasting partnerships worldwide.
                </p>
              </div>
            </ScrollReveal>
            <ScrollReveal delay={100}>
              <div className="rounded-xl border border-border bg-card p-8 shadow-sm h-full">
                <Eye className="h-8 w-8 text-secondary mb-4" />
                <h3 className="mb-3">Our Vision</h3>
                <p className="text-muted-foreground text-sm">
                  To position Indian spices as the global gold standard by combining traditional sourcing wisdom with modern quality assurance, reaching every continent with authentic flavors.
                </p>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="section-padding">
        <div className="container mx-auto max-w-4xl">
          <ScrollReveal className="text-center mb-12">
            <h2 className="text-balance">What Drives Us</h2>
          </ScrollReveal>
          <div className="grid gap-6 sm:grid-cols-3">
            {[
              { icon: ShieldCheck, title: "Quality First", desc: "Every batch tested for purity, potency, and safety before export." },
              { icon: Users, title: "Partnership", desc: "Long-term relationships with farmers and buyers built on trust." },
              { icon: Leaf, title: "Sustainability", desc: "Ethical sourcing and eco-conscious processing practices." },
            ].map((v, i) => (
              <ScrollReveal key={v.title} delay={i * 80}>
                <div className="text-center p-6">
                  <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-secondary/20">
                    <v.icon className="h-6 w-6 text-secondary" />
                  </div>
                  <h3 className="font-display text-lg font-semibold mb-2">{v.title}</h3>
                  <p className="text-sm text-muted-foreground">{v.desc}</p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* Global Presence */}
      <section className="section-padding-sm spice-gradient text-primary-foreground">
        <div className="container mx-auto text-center max-w-2xl">
          <ScrollReveal>
            <Globe className="h-10 w-10 mx-auto mb-4 opacity-80" />
            <h2 className="mb-4 text-balance">Global Export Expertise</h2>
            <p className="opacity-80">
              With deep knowledge of international trade regulations, documentation, and logistics, BuenoExports ensures smooth, compliant shipments to any destination worldwide.
            </p>
          </ScrollReveal>
        </div>
      </section>
    </>
  );
};

export default About;
