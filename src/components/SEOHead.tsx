import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

type SiteSettings = {
  ga_measurement_id: string | null;
  meta_pixel_id: string | null;
  search_console_verification: string | null;
  default_meta_title: string | null;
  default_meta_description: string | null;
  default_og_image: string | null;
};

function setMeta(attr: "name" | "property", key: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

function setCanonical(href: string) {
  let el = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!el) {
    el = document.createElement("link");
    el.setAttribute("rel", "canonical");
    document.head.appendChild(el);
  }
  el.setAttribute("href", href);
}

function loadScriptOnce(id: string, create: () => HTMLScriptElement) {
  if (document.getElementById(id)) return;
  const script = create();
  script.id = id;
  document.head.appendChild(script);
}

// Mounted once near the router root. Reads admin-configured settings from
// `site_settings` and applies them to <head> on every route change —
// no react-helmet dependency needed for this small a set of tags.
const SEOHead = ({ title, description }: { title?: string; description?: string } = {}) => {
  const location = useLocation();
  const [settings, setSettings] = useState<SiteSettings | null>(null);

  useEffect(() => {
    supabase.from("site_settings").select("ga_measurement_id,meta_pixel_id,search_console_verification,default_meta_title,default_meta_description,default_og_image")
      .eq("id", true).single().then(({ data }) => setSettings(data));
  }, []);

  useEffect(() => {
    if (!settings) return;

    const finalTitle = title || settings.default_meta_title;
    const finalDescription = description || settings.default_meta_description;
    if (finalTitle) document.title = finalTitle;
    if (finalDescription) {
      setMeta("name", "description", finalDescription);
      setMeta("property", "og:description", finalDescription);
      setMeta("name", "twitter:description", finalDescription);
    }
    if (finalTitle) {
      setMeta("property", "og:title", finalTitle);
      setMeta("name", "twitter:title", finalTitle);
    }
    if (settings.default_og_image) {
      setMeta("property", "og:image", settings.default_og_image);
      setMeta("name", "twitter:image", settings.default_og_image);
    }
    setMeta("property", "og:url", window.location.href);
    setCanonical(window.location.origin + location.pathname);

    if (settings.search_console_verification) {
      setMeta("name", "google-site-verification", settings.search_console_verification);
    }

    if (settings.ga_measurement_id) {
      loadScriptOnce("ga4-lib", () => {
        const s = document.createElement("script");
        s.async = true;
        s.src = `https://www.googletagmanager.com/gtag/js?id=${settings.ga_measurement_id}`;
        return s;
      });
      loadScriptOnce("ga4-init", () => {
        const s = document.createElement("script");
        s.text = `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${settings.ga_measurement_id}');`;
        return s;
      });
    }

    if (settings.meta_pixel_id) {
      const alreadyLoaded = !!document.getElementById("meta-pixel-init");
      loadScriptOnce("meta-pixel-init", () => {
        const s = document.createElement("script");
        s.text = `!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${settings.meta_pixel_id}');fbq('track','PageView');`;
        return s;
      });
      // On subsequent route changes the init script above won't re-run, so fire PageView manually.
      if (alreadyLoaded && typeof (window as unknown as { fbq?: (...a: unknown[]) => void }).fbq === "function") {
        (window as unknown as { fbq: (...a: unknown[]) => void }).fbq("track", "PageView");
      }
    }

    if (settings.ga_measurement_id && typeof (window as unknown as { gtag?: (...a: unknown[]) => void }).gtag === "function") {
      (window as unknown as { gtag: (...a: unknown[]) => void }).gtag("event", "page_view", { page_path: location.pathname });
    }
  }, [settings, title, description, location.pathname]);

  return null;
};

export default SEOHead;
