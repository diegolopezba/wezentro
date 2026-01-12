import { ReactNode } from "react";
import { BottomNav } from "./BottomNav";

interface AppLayoutProps {
  children: ReactNode;
  hideNav?: boolean;
}

export const AppLayout = ({ children, hideNav = false }: AppLayoutProps) => {
  return (
    <div className="min-h-screen bg-background">
      
      {/* Main content */}
      <main className={hideNav ? "" : "pb-24"}>
        {children}
      </main>
      
      {/* Bottom navigation */}
      {!hideNav && <BottomNav />}
    </div>
  );
};
