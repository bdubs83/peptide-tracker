import { createContext, useContext } from "react";
import type { EffectiveLayoutMode } from "../hooks/useLayoutMode";

const LayoutModeContext = createContext<EffectiveLayoutMode>("mobile");

export const LayoutModeProvider = LayoutModeContext.Provider;

export const useEffectiveLayoutMode = () => useContext(LayoutModeContext);
