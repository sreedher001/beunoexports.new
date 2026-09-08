import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

const RunnerBar = () => {
  const [text, setText] = useState<string | null>(null);

  useEffect(() => {
    supabase.from("site_settings").select("runner_enabled,runner_text").eq("id", true).single()
      .then(({ data }) => {
        if (data?.runner_enabled && data.runner_text?.trim()) setText(data.runner_text.trim());
      });
  }, []);

  if (!text) return null;

  // Repeat the text a few times so the marquee loops seamlessly regardless of message length
  const repeated = Array.from({ length: 6 }, () => text).join("   •   ");

  return (
    <div className="overflow-hidden whitespace-nowrap bg-primary text-primary-foreground py-2 text-sm font-medium">
      <div className="inline-block animate-[runner-scroll_22s_linear_infinite]">
        <span className="mx-4">{repeated}</span>
        <span className="mx-4">{repeated}</span>
      </div>
      <style>{`
        @keyframes runner-scroll {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
      `}</style>
    </div>
  );
};

export default RunnerBar;
