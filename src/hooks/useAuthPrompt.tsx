import { createContext, useContext, useState, ReactNode, useCallback } from "react";
import { useLocation } from "react-router-dom";

interface AuthPromptOptions {
  action: string;
  returnTo?: string;
}

interface AuthPromptContextType {
  isOpen: boolean;
  action: string;
  returnTo: string;
  promptAuth: (options: AuthPromptOptions) => void;
  closePrompt: () => void;
}

const AuthPromptContext = createContext<AuthPromptContextType | undefined>(undefined);

export const useAuthPrompt = () => {
  const context = useContext(AuthPromptContext);
  if (!context) {
    throw new Error("useAuthPrompt must be used within an AuthPromptProvider");
  }
  return context;
};

// Safe version that doesn't throw if used outside provider
export const useAuthPromptSafe = () => {
  return useContext(AuthPromptContext);
};

export const AuthPromptProvider = ({ children }: { children: ReactNode }) => {
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [action, setAction] = useState("");
  const [returnTo, setReturnTo] = useState("/");

  const promptAuth = useCallback((options: AuthPromptOptions) => {
    setAction(options.action);
    setReturnTo(options.returnTo || location.pathname);
    setIsOpen(true);
  }, [location.pathname]);

  const closePrompt = useCallback(() => {
    setIsOpen(false);
    setAction("");
  }, []);

  return (
    <AuthPromptContext.Provider
      value={{
        isOpen,
        action,
        returnTo,
        promptAuth,
        closePrompt,
      }}
    >
      {children}
    </AuthPromptContext.Provider>
  );
};
