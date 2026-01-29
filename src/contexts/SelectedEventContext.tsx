import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from "react";

interface SelectedEventContextType {
  selectedEventId: string | null;
  openEvent: (id: string) => void;
  closeEvent: () => void;
}

export const SelectedEventContext = createContext<SelectedEventContextType | null>(null);

export const useSelectedEvent = () => {
  const context = useContext(SelectedEventContext);
  if (!context) {
    throw new Error("useSelectedEvent must be used within a SelectedEventProvider");
  }
  return context;
};

interface SelectedEventProviderProps {
  children: ReactNode;
}

export const SelectedEventProvider = ({ children }: SelectedEventProviderProps) => {
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);

  const openEvent = useCallback((id: string) => {
    setSelectedEventId(id);
    // Update URL without navigation
    window.history.pushState({ eventId: id }, "", `/event/${id}`);
    // Lock body scroll
    document.body.style.overflow = "hidden";
  }, []);

  const closeEvent = useCallback(() => {
    setSelectedEventId(null);
    // Restore scroll
    document.body.style.overflow = "";
    // Go back in history
    if (window.history.state?.eventId) {
      window.history.back();
    }
  }, []);

  // Handle browser back button
  useEffect(() => {
    const handlePopState = () => {
      if (selectedEventId) {
        setSelectedEventId(null);
        document.body.style.overflow = "";
      }
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [selectedEventId]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  return (
    <SelectedEventContext.Provider value={{ selectedEventId, openEvent, closeEvent }}>
      {children}
    </SelectedEventContext.Provider>
  );
};
