import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Star } from "lucide-react";
import { toast } from "sonner";
import type { Tables } from "@/integrations/supabase/types";

const StarRow = ({ rating, size = "h-4 w-4" }: { rating: number; size?: string }) => (
  <div className="flex gap-0.5">
    {[1, 2, 3, 4, 5].map((n) => (
      <Star key={n} className={`${size} ${n <= rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"}`} />
    ))}
  </div>
);

const ProductReviews = ({ productId }: { productId: string }) => {
  const { user } = useAuth();
  const [reviews, setReviews] = useState<Tables<"product_reviews">[]>([]);
  const [loading, setLoading] = useState(true);
  const [myRating, setMyRating] = useState(0);
  const [myComment, setMyComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    const { data } = await supabase.from("product_reviews").select("*").eq("product_id", productId).order("created_at", { ascending: false });
    setReviews(data || []);
    setLoading(false);
    const mine = data?.find((r) => r.user_id === user?.id);
    if (mine) { setMyRating(mine.rating); setMyComment(mine.comment || ""); }
  }, [productId, user?.id]);

  useEffect(() => { load(); }, [load]);

  const submit = async () => {
    if (!user) { toast.error("Please login to leave a review"); return; }
    if (myRating === 0) { toast.error("Please select a rating"); return; }
    setSubmitting(true);
    const { error } = await supabase.from("product_reviews").upsert(
      { product_id: productId, user_id: user.id, rating: myRating, comment: myComment.trim() || null },
      { onConflict: "product_id,user_id" }
    );
    setSubmitting(false);
    if (error) { toast.error("Failed to submit review"); return; }
    toast.success("Review saved!");
    load();
  };

  const avg = reviews.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0;

  return (
    <div className="mt-12">
      <div className="flex items-center gap-3 mb-6">
        <h3 className="text-xl font-bold">Reviews</h3>
        {reviews.length > 0 && (
          <div className="flex items-center gap-2">
            <StarRow rating={Math.round(avg)} />
            <span className="text-sm text-muted-foreground">{avg.toFixed(1)} ({reviews.length} review{reviews.length !== 1 ? "s" : ""})</span>
          </div>
        )}
      </div>

      {user && (
        <div className="rounded-xl border border-border bg-card p-5 mb-6">
          <p className="text-sm font-semibold mb-2">Leave a review</p>
          <div className="flex gap-1 mb-3">
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={n} type="button" onClick={() => setMyRating(n)}>
                <Star className={`h-6 w-6 ${n <= myRating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"}`} />
              </button>
            ))}
          </div>
          <textarea rows={2} value={myComment} onChange={(e) => setMyComment(e.target.value)}
            placeholder="Share your thoughts (optional)"
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none resize-none focus:border-secondary mb-3" />
          <button onClick={submit} disabled={submitting}
            className="rounded-lg bg-secondary px-5 py-2 text-sm font-semibold text-secondary-foreground disabled:opacity-50">
            {submitting ? "Saving..." : "Submit Review"}
          </button>
        </div>
      )}

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading reviews...</p>
      ) : reviews.length === 0 ? (
        <p className="text-sm text-muted-foreground">No reviews yet. Be the first!</p>
      ) : (
        <div className="space-y-4">
          {reviews.map((r) => (
            <div key={r.id} className="rounded-lg border border-border p-4">
              <div className="flex items-center justify-between mb-1">
                <StarRow rating={r.rating} />
                <span className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</span>
              </div>
              {r.comment && <p className="text-sm text-muted-foreground">{r.comment}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ProductReviews;
