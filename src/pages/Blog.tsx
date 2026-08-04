import { Link } from "react-router-dom";
import ScrollReveal from "@/components/ScrollReveal";
import { Calendar, ArrowRight } from "lucide-react";

const posts = [
  {
    slug: "top-indian-spices-exported-globally",
    title: "Top Indian Spices Exported Globally",
    excerpt: "India is the world's largest producer and exporter of spices. Discover which Indian spices dominate global markets and why buyers prefer Indian-origin products.",
    date: "March 15, 2026",
    category: "Industry",
  },
  {
    slug: "benefits-of-turmeric",
    title: "Health Benefits of Turmeric: Why the World Wants Indian Turmeric",
    excerpt: "Turmeric's curcumin content makes it one of the most sought-after spices globally. Learn about its health benefits and what makes Indian turmeric special.",
    date: "March 8, 2026",
    category: "Health",
  },
  {
    slug: "how-to-choose-quality-spices",
    title: "How to Choose Quality Spices for Import",
    excerpt: "A guide for importers on evaluating spice quality — from curcumin content in turmeric to ASTA color values in chili. Make informed sourcing decisions.",
    date: "February 28, 2026",
    category: "Guide",
  },
  {
    slug: "spice-packaging-for-export",
    title: "Spice Packaging Standards for International Export",
    excerpt: "Proper packaging ensures spice quality during transit. Explore packaging options, materials, and compliance requirements for different export markets.",
    date: "February 18, 2026",
    category: "Export",
  },
  {
    slug: "indian-black-pepper-market",
    title: "The Rise of Indian Black Pepper in Global Markets",
    excerpt: "Malabar and Tellicherry black pepper varieties are gaining premium status worldwide. Understand the grading system and market trends.",
    date: "February 10, 2026",
    category: "Market",
  },
];

const Blog = () => {
  return (
    <>
      <section className="spice-gradient text-primary-foreground">
        <div className="container mx-auto px-4 py-20 md:py-28 lg:px-8 text-center">
          <h1 className="mb-4 animate-fade-up" style={{ lineHeight: 1.1 }}>Blog & Insights</h1>
          <p className="opacity-80 text-lg max-w-2xl mx-auto animate-fade-up" style={{ animationDelay: "100ms" }}>
            Expert insights on Indian spices, export markets, and quality sourcing.
          </p>
        </div>
      </section>

      <section className="section-padding">
        <div className="container mx-auto max-w-4xl">
          <div className="space-y-8">
            {posts.map((p, i) => (
              <ScrollReveal key={p.slug} delay={i * 60}>
                <article className="group rounded-xl border border-border bg-card p-6 md:p-8 shadow-sm transition-shadow hover:shadow-md">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="rounded-md bg-secondary/15 px-2.5 py-1 text-xs font-semibold text-secondary">{p.category}</span>
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Calendar className="h-3 w-3" /> {p.date}
                    </span>
                  </div>
                  <h2 className="font-display text-xl md:text-2xl font-semibold mb-2 group-hover:text-secondary transition-colors">{p.title}</h2>
                  <p className="text-muted-foreground mb-4">{p.excerpt}</p>
                  <span className="inline-flex items-center gap-1 text-sm font-semibold text-primary transition-colors group-hover:text-secondary">
                    Read More <ArrowRight className="h-4 w-4" />
                  </span>
                </article>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>
    </>
  );
};

export default Blog;
