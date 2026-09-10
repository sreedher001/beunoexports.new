import { Link } from "react-router-dom";
import ScrollReveal from "@/components/ScrollReveal";
import turmericImg from "@/assets/turmeric.jpg";
import chiliImg from "@/assets/red-chili.jpg";
import pepperImg from "@/assets/black-pepper.jpg";
import cardamomImg from "@/assets/cardamom.jpg";
import clovesImg from "@/assets/cloves.jpg";
import blendsImg from "@/assets/spice-blends.jpg";

const products = [
  {
    name: "Turmeric",
    category: "turmeric",
    img: turmericImg,
    desc: "Our premium turmeric is sourced from the finest Indian farms, known for its high curcumin content and vibrant golden color. Available in whole fingers, polished, and powder forms.",
    quality: "Curcumin content 3-5%, moisture <12%, no artificial coloring",
    packaging: "25kg PP bags, 50kg jute bags, custom bulk packaging",
  },
  {
    name: "Red Chili",
    category: "red-chili",
    img: chiliImg,
    desc: "Premium Indian red chili varieties including Guntur Sannam, Byadgi, and Kashmiri chili. Known for rich color, pungency, and consistent heat levels for global food manufacturing.",
    quality: "ASTA color value 80-180, SHU as per grade, moisture <11%",
    packaging: "25kg PP bags, vacuum-sealed options, custom packaging",
  },
  {
    name: "Black Pepper",
    category: "black-pepper",
    img: pepperImg,
    desc: "Malabar and Tellicherry grade black peppercorns from Kerala's finest plantations. Bold berries with intense aroma and sharp pungent flavor profile.",
    quality: "Piperine content 4-7%, moisture <12%, 500-580 g/L bulk density",
    packaging: "25kg & 50kg PP bags, jute bags, custom packaging",
  },
  {
    name: "Cardamom",
    category: "cardamom",
    img: cardamomImg,
    desc: "Premium bold green cardamom (Elettaria cardamomum) sourced from the Western Ghats. Intensely aromatic with a complex sweet-spicy flavor.",
    quality: "Bold 7mm+, volatile oil content 6-8%, moisture <12%",
    packaging: "5kg, 10kg, 25kg cartons, vacuum-sealed options",
  },
  {
    name: "Cloves",
    category: "cloves",
    img: clovesImg,
    desc: "Hand-picked premium whole cloves with high essential oil content. Sourced from select regions for consistent quality and strong aromatic properties.",
    quality: "Essential oil content 15-18%, moisture <10%, headless <5%",
    packaging: "25kg PP bags, cartons, custom packaging available",
  },
  {
    name: "Spice Blends",
    category: "spice-blends",
    img: blendsImg,
    desc: "Custom spice blends formulated to your specification. From garam masala to curry powders — we create export-ready blends for food manufacturers and brands worldwide.",
    quality: "Custom formulation, consistent batch quality, lab tested",
    packaging: "Bulk bags, retail-ready packaging, private label options",
  },
];

const Products = () => {
  return (
    <>
      <section className="spice-gradient text-primary-foreground">
        <div className="container mx-auto px-4 py-20 md:py-28 lg:px-8 text-center">
          <h1 className="mb-4 animate-fade-up" style={{ lineHeight: 1.1 }}>Our Products</h1>
          <p className="opacity-80 text-lg max-w-2xl mx-auto animate-fade-up" style={{ animationDelay: "100ms" }}>
            Export-quality Indian spices, rigorously tested and packed to international standards.
          </p>
        </div>
      </section>

      <section className="section-padding">
        <div className="container mx-auto">
          <div className="space-y-16">
            {products.map((p, i) => (
              <ScrollReveal key={p.name}>
                <div className={`grid gap-8 md:grid-cols-2 items-center ${i % 2 === 1 ? "md:[direction:rtl]" : ""}`}>
                  <div className={i % 2 === 1 ? "md:[direction:ltr]" : ""}>
                    <div className="overflow-hidden rounded-xl shadow-lg">
                      <img src={p.img} alt={`${p.name} — BuenoExports premium Indian spice`} className="w-full aspect-[4/3] object-cover" loading="lazy" />
                    </div>
                  </div>
                  <div className={i % 2 === 1 ? "md:[direction:ltr]" : ""}>
                    <h2 className="mb-3">{p.name}</h2>
                    <p className="text-muted-foreground mb-4">{p.desc}</p>
                    <div className="space-y-2 mb-6">
                      <div className="rounded-lg bg-muted p-3">
                        <p className="text-xs font-semibold uppercase tracking-wider text-secondary mb-1">Quality Specs</p>
                        <p className="text-sm text-muted-foreground">{p.quality}</p>
                      </div>
                      <div className="rounded-lg bg-muted p-3">
                        <p className="text-xs font-semibold uppercase tracking-wider text-secondary mb-1">Packaging</p>
                        <p className="text-sm text-muted-foreground">{p.packaging}</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-3">
  <Link
    to={`/shop?category=${p.category}`}
    className="px-5 py-2.5 bg-black text-white rounded-lg hover:opacity-90 transition-opacity"
  >
    View in Shop
  </Link>

  <Link
    to="/contact"
    className="px-5 py-2.5 bg-green-600 text-white rounded-lg hover:opacity-90 transition-opacity"
  >
    Get Bulk Pricing
  </Link>
</div>
                  </div>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* Bulk CTA */}
      <section className="section-padding warm-bg">
        <div className="container mx-auto text-center max-w-2xl">
          <ScrollReveal>
            <h2 className="mb-4 text-balance">Need Bulk Pricing?</h2>
            <p className="text-muted-foreground mb-6">
              We offer competitive pricing for bulk orders with custom packaging and private labeling options.
            </p>
            <Link
              to="/contact"
              className="inline-flex items-center rounded-lg bg-secondary px-7 py-3 text-sm font-bold text-secondary-foreground shadow-lg transition-all hover:shadow-xl active:scale-[0.97]"
            >
              Get Bulk Pricing
            </Link>
          </ScrollReveal>
        </div>
      </section>
    </>
  );
};

export default Products;
