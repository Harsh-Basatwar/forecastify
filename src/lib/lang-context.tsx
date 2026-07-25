"use client";

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";
import { LangCode, getTranslation, LANGUAGES, enDictionary } from "./translations";
import { useDomTranslator } from "./useDomTranslator";

interface LangContextType {
  lang: LangCode;
  setLang: (lang: LangCode) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
  isTranslating: boolean;
}

const LangContext = createContext<LangContextType>({
  lang: "en",
  setLang: () => {},
  t: (key) => key,
  isTranslating: false,
});

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<LangCode>("en");
  const [dict, setDict] = useState<Record<string, string>>(enDictionary);
  const [isTranslating, setIsTranslating] = useState(false);

  // Invoke DOM translator to catch all untranslated text
  useDomTranslator(lang);

  useEffect(() => {
    const saved = localStorage.getItem("forecastify-lang") as LangCode;
    if (saved && LANGUAGES.some(l => l.code === saved)) {
      setLangState(saved);
    }
  }, []);

  useEffect(() => {
    if (lang === "en") {
      setDict(enDictionary);
      return;
    }

    const cached = localStorage.getItem(`forecastify-dict-${lang}`);
    if (cached) {
      try {
        setDict(JSON.parse(cached));
        return;
      } catch (e) {
        console.error("Failed to parse cached translation", e);
      }
    }

    const translateDict = async () => {
      setIsTranslating(true);
      try {
        const res = await fetch("/api/translate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            from: "en",
            to: lang,
            json: enDictionary
          })
        });
        if (res.ok) {
          const data = await res.json();
          // RapidAPI Google Translate JSON endpoint might return it in `trans` or directly
          const translatedDict = data.trans || data.json || data;
          setDict(translatedDict);
          localStorage.setItem(`forecastify-dict-${lang}`, JSON.stringify(translatedDict));
        } else {
          console.error("Failed to translate dictionary", await res.text());
          setDict(enDictionary); // Fallback
        }
      } catch (err) {
        console.error("Translation request failed", err);
        setDict(enDictionary); // Fallback
      } finally {
        setIsTranslating(false);
      }
    };

    translateDict();
  }, [lang]);

  const setLang = useCallback((newLang: LangCode) => {
    setLangState(newLang);
    localStorage.setItem("forecastify-lang", newLang);
  }, []);

  const t = useCallback((key: string, vars?: Record<string, string | number>) => {
    return getTranslation(dict, key, vars);
  }, [dict]);

  return (
    <LangContext.Provider value={{ lang, setLang, t, isTranslating }}>
      {children}
    </LangContext.Provider>
  );
}

export function useLang() {
  return useContext(LangContext);
}
