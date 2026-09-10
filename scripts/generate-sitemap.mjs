// Regenerates dist/sitemap.xml after the build with one entry per active
// product, in addition to the static pages. Runs automatically as an npm
// "postbuild" hook (npm runs post<script> after <script> automatically).
// Never fails the build: if the Supabase fetch fails for any reason, the
// static sitemap.xml that Vite already copied from public/ is left in place.
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(import.meta.url)) + "/..";

function loadEnv() {
  const envPath = resolve(root, ".env");
  if (!existsSync(envPath)) return {};
  const env = {};
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    env[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
  }
  return env;
}

const STATIC_URLS = [
  { loc: "https://buenoexports.com/", priority: "1.0" },
  { loc: "https://buenoexports.com/shop", priority: "0.9" },
  { loc: "https://buenoexports.com/products", priority: "0.7" },
  { loc: "https://buenoexports.com/export", priority: "0.7" },
  { loc: "https://buenoexports.com/certifications", priority: "0.5" },
  { loc: "https://buenoexports.com/about", priority: "0.5" },
  { loc: "https://buenoexports.com/blog", priority: "0.5" },
  { loc: "https://buenoexports.com/contact", priority: "0.5" },
  { loc: "https://buenoexports.com/legal/privacy", priority: "0.2" },
  { loc: "https://buenoexports.com/legal/terms", priority: "0.2" },
  { loc: "https://buenoexports.com/legal/returns", priority: "0.2" },
];

async function fetchProductSlugs(url, anonKey) {
  const res = await fetch(`${url}/rest/v1/products?select=slug&is_active=eq.true`, {
    headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}` },
  });
  if (!res.ok) throw new Error(`Supabase REST error ${res.status}`);
  const rows = await res.json();
  return rows.map((r) => r.slug).filter(Boolean);
}

function buildXml(urls) {
  const body = urls.map((u) => `  <url><loc>${u.loc}</loc><priority>${u.priority}</priority></url>`).join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`;
}

async function main() {
  const env = { ...loadEnv(), ...process.env };
  const url = env.VITE_SUPABASE_URL;
  const anonKey = env.VITE_SUPABASE_PUBLISHABLE_KEY;
  const distSitemap = resolve(root, "dist/sitemap.xml");

  if (!url || !anonKey) {
    console.warn("[generate-sitemap] VITE_SUPABASE_URL/VITE_SUPABASE_PUBLISHABLE_KEY not found — keeping static sitemap.xml as-is.");
    return;
  }

  try {
    const slugs = await fetchProductSlugs(url, anonKey);
    const productUrls = slugs.map((slug) => ({ loc: `https://buenoexports.com/product/${slug}`, priority: "0.8" }));
    writeFileSync(distSitemap, buildXml([...STATIC_URLS, ...productUrls]));
    console.log(`[generate-sitemap] Wrote dist/sitemap.xml with ${STATIC_URLS.length} static + ${productUrls.length} product URLs.`);
  } catch (err) {
    console.warn("[generate-sitemap] Failed to fetch products, keeping static sitemap.xml as-is:", err.message);
  }
}

main();
