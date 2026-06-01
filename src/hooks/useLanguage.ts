import { useSearch, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { translations, Language } from "../lib/translations";

export function useLanguage() {
  const search = useSearch({ strict: false }) as { lang?: string };
  const navigate = useNavigate();

  const urlLang = search.lang as Language | undefined;

  // Safe SSR initial state
  const [activeLang, setActiveLang] = useState<Language>(() => {
    if (urlLang === "en" || urlLang === "fr" || urlLang === "es") {
      return urlLang;
    }
    return "en";
  });

  useEffect(() => {
    if (typeof window === "undefined") return;

    let detectedLang: Language = "en";

    if (urlLang === "en" || urlLang === "fr" || urlLang === "es") {
      detectedLang = urlLang;
    } else {
      const stored = localStorage.getItem("tlf_lang") as Language | null;
      if (stored === "en" || stored === "fr" || stored === "es") {
        detectedLang = stored;
      } else {
        const browser = navigator.language.slice(0, 2);
        if (browser === "fr") {
          detectedLang = "fr";
        } else if (browser === "es") {
          detectedLang = "es";
        }
      }
    }

    if (detectedLang !== activeLang) {
      setActiveLang(detectedLang);
    }

    // Keep localStorage in sync
    localStorage.setItem("tlf_lang", detectedLang);
  }, [urlLang]);

  const changeLanguage = (newLang: Language) => {
    if (typeof window !== "undefined") {
      localStorage.setItem("tlf_lang", newLang);
    }
    setActiveLang(newLang);
    navigate({
      search: (prev: Record<string, unknown>) => ({ ...prev, lang: newLang }),
      replace: true,
    });
  };

  const t = (key: keyof typeof translations.en): string => {
    const dict = translations[activeLang] || translations.en;
    return dict[key] || translations.en[key] || "";
  };

  return {
    lang: activeLang,
    t,
    changeLanguage,
  };
}
export type { Language };
