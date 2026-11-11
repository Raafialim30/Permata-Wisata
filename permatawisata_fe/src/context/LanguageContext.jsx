import React, { createContext, useContext, useState } from "react";
import { translations } from "./translations";

const LanguageContext = createContext();

export const LanguageProvider = ({ children }) => {
  const [language, setLanguage] = useState(() => {
    return localStorage.getItem("app_lang") || "id";
  });

  const changeLanguage = (lang) => {
    setLanguage(lang);
    localStorage.setItem("app_lang", lang);
  };

  // Fungsi toggle untuk beralih antara 'id' dan 'en'
  const toggleLang = () => {
    const nextLang = language === "id" ? "en" : "id";
    changeLanguage(nextLang);
  };

  const t = (key) => {
    return translations[language]?.[key] || translations["id"]?.[key] || key;
  };

  return (
    <LanguageContext.Provider
      value={{
        language,
        lang: language,
        setLanguage: changeLanguage,
        setLang: changeLanguage,
        changeLanguage,
        toggleLang,
        t,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);
export const useLang = useLanguage;