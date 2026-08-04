import ScrollReveal from "@/components/ScrollReveal";
import { Award, ShieldCheck, Leaf, FileCheck } from "lucide-react";

const certs = [
  { icon: ShieldCheck, title: "FSSAI Approved", desc: "Food Safety and Standards Authority of India certified. All products comply with Indian food safety regulations and are registered under FSSAI guidelines." },
  { icon: Award, title: "ISO Certified", desc: "ISO 22000 certified food safety management system ensuring consistent quality control, hygienic processing, and international food safety compliance." },
  { icon: Leaf, title: "Organic Certification", desc: "Select product lines carry organic certification for markets demanding certified organic spices. USDA Organic and India Organic compliant." },
  { icon: FileCheck, title: "Export Quality Standards", desc: "All products meet AGMARK grading standards for Indian spices. Regular testing for pesticide residue, aflatoxin levels, heavy metals, and microbiological safety." },
];

const Certifications = () => {
  return (
    <>
      <section className="spice-gradient text-primary-foreground">
        <div className="container mx-auto px-4 py-20 md:py-28 lg:px-8 text-center">
          <h1 className="mb-4 animate-fade-up" style={{ lineHeight: 1.1 }}>Certifications</h1>
          <p className="opacity-80 text-lg max-w-2xl mx-auto animate-fade-up" style={{ animationDelay: "100ms" }}>
            Quality assurance backed by international certifications and rigorous testing.
          </p>
        </div>
      </section>

      <section className="section-padding">
        <div className="container mx-auto max-w-4xl">
          <div className="space-y-8">
            {certs.map((c, i) => (
              <ScrollReveal key={c.title} delay={i * 80}>
                <div className="flex gap-6 rounded-xl border border-border bg-card p-6 md:p-8 shadow-sm">
                  <div className="shrink-0 flex h-14 w-14 items-center justify-center rounded-full bg-secondary/15">
                    <c.icon className="h-7 w-7 text-secondary" />
                  </div>
                  <div>
                    <h3 className="font-display text-xl font-semibold mb-2">{c.title}</h3>
                    <p className="text-muted-foreground">{c.desc}</p>
                  </div>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      <section className="section-padding-sm warm-bg">
        <div className="container mx-auto text-center max-w-2xl">
          <ScrollReveal>
            <h2 className="mb-4 text-balance">Our Quality Promise</h2>
            <p className="text-muted-foreground">
              Every shipment from BuenoExports undergoes multi-stage quality inspection — from farm procurement to final packaging. We provide complete test reports, certificates of analysis, and compliance documentation with every order.
            </p>
          </ScrollReveal>
        </div>
      </section>
    </>
  );
};

export default Certifications;
