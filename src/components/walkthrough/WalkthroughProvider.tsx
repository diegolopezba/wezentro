import { useWalkthrough } from "@/hooks/useWalkthrough";
import { WalkthroughOverlay } from "./WalkthroughOverlay";

export const WalkthroughProvider = ({ children }: { children: React.ReactNode }) => {
  const { showWalkthrough, completeWalkthrough } = useWalkthrough();

  return (
    <>
      {children}
      {showWalkthrough && (
        <WalkthroughOverlay onComplete={completeWalkthrough} />
      )}
    </>
  );
};
