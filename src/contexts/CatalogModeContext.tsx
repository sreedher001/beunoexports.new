import { createContext, useContext, useState, ReactNode } from "react";

export type CatalogMode = "retail" | "wholesale";

type CatalogModeContextType = {
  mode: CatalogMode;
  setMode: (mode: CatalogMode) => void;
};

const STORAGE_KEY = "catalog_mode";

const CatalogModeContext = createContext<CatalogModeContextType>({
  mode: "retail",
  setMode: () => {},
});

export const useCatalogMode = () => useContext(CatalogModeContext);

const readStoredMode = (): CatalogMode => {
  if (typeof window === "undefined") return "retail";
  return localStorage.getItem(STORAGE_KEY) === "wholesale" ? "wholesale" : "retail";
};

export const CatalogModeProvider = ({ children }: { children: ReactNode }) => {
  const [mode, setModeState] = useState<CatalogMode>(readStoredMode);

  const setMode = (next: CatalogMode) => {
    setModeState(next);
    localStorage.setItem(STORAGE_KEY, next);
  };

  return (
    <CatalogModeContext.Provider value={{ mode, setMode }}>
      {children}
    </CatalogModeContext.Provider>
  );
};
