import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Upload, Download, FileSpreadsheet } from "lucide-react";
import { toast } from "sonner";

type Category = { id: string; name: string; slug: string };

// Minimal RFC4180-ish CSV line parser: handles quoted fields (with embedded
// commas/newlines escaped as "") which a plain split(",") breaks on.
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; } else { inQuotes = false; }
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      row.push(field); field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field); field = "";
      if (row.some((f) => f.trim() !== "")) rows.push(row);
      row = [];
    } else {
      field += c;
    }
  }
  if (field !== "" || row.length > 0) { row.push(field); if (row.some((f) => f.trim() !== "")) rows.push(row); }
  return rows;
}

const BulkUpload = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [uploading, setUploading] = useState(false);
  const [results, setResults] = useState<{ success: number; failed: number; errors: string[] }>({ success: 0, failed: 0, errors: [] });

  useEffect(() => {
    supabase.from("categories").select("*").order("name").then(({ data }) => setCategories(data || []));
  }, []);

  const downloadTemplate = () => {
    const headers = "name,description,price,mrp,stock,unit,weight,category_slug,image_url,catalog_type,moq,sku";
    const example = "Premium Turmeric Powder,High curcumin content turmeric,250,299,100,kg,500g,turmeric,,retail,,TUR-001";
    const csv = headers + "\n" + example;
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "product_template.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setResults({ success: 0, failed: 0, errors: [] });

    const text = await file.text();
    const rows = parseCsv(text);
    const headers = (rows[0] || []).map((h) => h.trim().toLowerCase());
    const errors: string[] = [];
    let success = 0;

    for (let i = 1; i < rows.length; i++) {
      const values = rows[i].map((v) => v.trim());
      const row: Record<string, string> = {};
      headers.forEach((h, j) => { row[h] = values[j] || ""; });

      if (!row.name || !row.price) {
        errors.push(`Row ${i + 1}: Missing name or price`);
        continue;
      }

      const cat = categories.find((c) => c.slug === row.category_slug);
      const sku = row.sku || null;

      const productData = {
        name: row.name,
        description: row.description || null,
        price: Number(row.price) || 0,
        mrp: Number(row.mrp) || Number(row.price) || 0,
        stock: Number(row.stock) || 0,
        unit: row.unit || "kg",
        weight: row.weight || null,
        category_id: cat?.id || null,
        image_url: row.image_url || null,
        is_active: true,
        catalog_type: row.catalog_type === "wholesale" ? "wholesale" : "retail",
        moq: row.moq ? Number(row.moq) || null : null,
        sku,
      };

      // If this row's SKU matches an existing product, update it in place instead of
      // always inserting a duplicate — lets the same template be used to restock/update.
      const existing = sku ? await supabase.from("products").select("id").eq("sku", sku).maybeSingle() : { data: null };

      const { error } = existing.data
        ? await supabase.from("products").update(productData).eq("id", existing.data.id)
        : await supabase.from("products").insert({
            ...productData,
            slug: row.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") + "-" + Date.now(),
          });

      if (error) errors.push(`Row ${i + 1}: ${error.message}`);
      else success++;
    }

    setResults({ success, failed: errors.length, errors });
    setUploading(false);
    if (success > 0) toast.success(`${success} products uploaded!`);
    if (errors.length > 0) toast.error(`${errors.length} rows failed`);
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Bulk Upload Products</h1>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <h3 className="font-semibold mb-4 flex items-center gap-2"><Download className="h-5 w-5" /> Step 1: Download Template</h3>
          <p className="text-sm text-muted-foreground mb-4">Download the CSV template, fill in your products, then upload.</p>
          <button onClick={downloadTemplate}
            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground">
            <FileSpreadsheet className="h-4 w-4" /> Download CSV Template
          </button>

          <div className="mt-6">
            <h4 className="text-sm font-medium mb-2">Available Categories:</h4>
            <div className="flex flex-wrap gap-1">
              {categories.map((c) => (
                <span key={c.id} className="rounded bg-muted px-2 py-0.5 text-xs">{c.slug}</span>
              ))}
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <h3 className="font-semibold mb-4 flex items-center gap-2"><Upload className="h-5 w-5" /> Step 2: Upload CSV</h3>
          <p className="text-sm text-muted-foreground mb-4">Upload your filled CSV file to add products in bulk.</p>
          <label className="flex flex-col items-center rounded-lg border-2 border-dashed border-border p-8 cursor-pointer hover:border-secondary transition-colors">
            <Upload className="h-8 w-8 text-muted-foreground mb-2" />
            <span className="text-sm text-muted-foreground">{uploading ? "Processing..." : "Click to upload CSV"}</span>
            <input type="file" accept=".csv" onChange={handleFileUpload} disabled={uploading} className="hidden" />
          </label>

          {(results.success > 0 || results.failed > 0) && (
            <div className="mt-4 rounded-lg bg-muted p-4">
              <p className="text-sm font-medium">Results:</p>
              <p className="text-sm text-green-600">✓ {results.success} products added</p>
              {results.failed > 0 && <p className="text-sm text-destructive">✗ {results.failed} rows failed</p>}
              {results.errors.length > 0 && (
                <div className="mt-2 max-h-32 overflow-y-auto text-xs text-destructive space-y-1">
                  {results.errors.map((e, i) => <p key={i}>{e}</p>)}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BulkUpload;
