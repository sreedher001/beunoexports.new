import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Tables } from "@/integrations/supabase/types";

const AdminMessages = () => {
  const [tab, setTab] = useState<"contact" | "newsletter">("contact");
  const [messages, setMessages] = useState<Tables<"contact_messages">[]>([]);
  const [subscribers, setSubscribers] = useState<Tables<"newsletter_subscribers">[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = async () => {
    const [{ data: msgs }, { data: subs }] = await Promise.all([
      supabase.from("contact_messages").select("*").order("created_at", { ascending: false }),
      supabase.from("newsletter_subscribers").select("*").order("created_at", { ascending: false }),
    ]);
    setMessages(msgs || []);
    setSubscribers(subs || []);
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, []);

  const markRead = async (id: string) => {
    await supabase.from("contact_messages").update({ status: "read" }).eq("id", id);
    setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, status: "read" } : m)));
  };

  const unreadCount = messages.filter((m) => m.status === "new").length;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Messages</h1>

      <div className="flex gap-2 mb-6">
        <button onClick={() => setTab("contact")}
          className={`rounded-lg px-4 py-2 text-sm font-semibold ${tab === "contact" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
          Contact Messages {unreadCount > 0 && `(${unreadCount})`}
        </button>
        <button onClick={() => setTab("newsletter")}
          className={`rounded-lg px-4 py-2 text-sm font-semibold ${tab === "newsletter" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
          Newsletter Subscribers ({subscribers.length})
        </button>
      </div>

      {loading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : tab === "contact" ? (
        <div className="space-y-3">
          {messages.length === 0 && <p className="text-muted-foreground text-sm">No messages yet.</p>}
          {messages.map((m) => (
            <div key={m.id} className={`rounded-xl border p-4 shadow-sm ${m.status === "new" ? "border-secondary bg-secondary/5" : "border-border bg-card"}`}>
              <div className="flex items-start justify-between gap-3 mb-2">
                <div>
                  <p className="font-semibold text-sm">{m.name}</p>
                  <p className="text-xs text-muted-foreground">
                    <a href={`mailto:${m.email}`} className="hover:underline">{m.email}</a>
                    {m.phone && ` · ${m.phone}`}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs text-muted-foreground">{new Date(m.created_at).toLocaleDateString("en-IN")}</span>
                  {m.status === "new" && (
                    <button onClick={() => markRead(m.id)} className="text-xs font-semibold text-secondary hover:underline">
                      Mark read
                    </button>
                  )}
                </div>
              </div>
              <p className="text-sm whitespace-pre-wrap">{m.message}</p>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
          <div className="divide-y divide-border">
            {subscribers.length === 0 && <p className="p-4 text-muted-foreground text-sm">No subscribers yet.</p>}
            {subscribers.map((s) => (
              <div key={s.id} className="flex items-center justify-between px-4 py-3 text-sm">
                <span>{s.email}</span>
                <span className="text-xs text-muted-foreground">{new Date(s.created_at).toLocaleDateString("en-IN")}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminMessages;
