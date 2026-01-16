import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronRight, ChevronLeft, MapPin, Users, PlusCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

interface WalkthroughStep {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  targetRoute?: string;
  position: "center" | "bottom" | "top";
}

const walkthroughSteps: WalkthroughStep[] = [
  {
    id: "welcome",
    title: "Welcome to Zentro! 🎉",
    description: "Let's take a quick tour to show you how to discover events, join guestlists, and create your own experiences.",
    icon: <span className="text-4xl">👋</span>,
    position: "center",
  },
  {
    id: "discover",
    title: "Discover Events Near You",
    description: "Use the map to explore events happening around you. Tap on any pin to see event details, or swipe through the cards at the bottom.",
    icon: <MapPin className="w-8 h-8 text-primary" />,
    targetRoute: "/discover",
    position: "bottom",
  },
  {
    id: "guestlist",
    title: "Join Guestlists",
    description: "Found an event you love? Tap 'Join' to request a spot on the guestlist. You'll connect with other attendees and get exclusive updates.",
    icon: <Users className="w-8 h-8 text-primary" />,
    position: "center",
  },
  {
    id: "create",
    title: "Create Your Own Events",
    description: "Hosting something? Tap the '+' button to create your own event. Add photos, set the location, and invite your community.",
    icon: <PlusCircle className="w-8 h-8 text-primary" />,
    targetRoute: "/create",
    position: "bottom",
  },
  {
    id: "complete",
    title: "You're All Set! 🚀",
    description: "Start exploring and connecting with people at amazing events. Have fun!",
    icon: <span className="text-4xl">✨</span>,
    position: "center",
  },
];

interface WalkthroughOverlayProps {
  onComplete: () => void;
}

export const WalkthroughOverlay = ({ onComplete }: WalkthroughOverlayProps) => {
  const [currentStep, setCurrentStep] = useState(0);
  const navigate = useNavigate();
  const step = walkthroughSteps[currentStep];
  const isLastStep = currentStep === walkthroughSteps.length - 1;
  const isFirstStep = currentStep === 0;

  useEffect(() => {
    // Navigate to target route if specified
    if (step.targetRoute) {
      navigate(step.targetRoute);
    }
  }, [currentStep, step.targetRoute, navigate]);

  const handleNext = () => {
    if (isLastStep) {
      onComplete();
    } else {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handlePrev = () => {
    if (!isFirstStep) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const handleSkip = () => {
    onComplete();
  };

  const getPositionClasses = () => {
    switch (step.position) {
      case "top":
        return "items-start pt-24";
      case "bottom":
        return "items-end pb-32";
      default:
        return "items-center";
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className={`fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex justify-center px-4 ${getPositionClasses()}`}
      >
        {/* Skip button */}
        <button
          onClick={handleSkip}
          className="absolute top-4 right-4 safe-top text-white/70 hover:text-white p-2 transition-colors"
        >
          <X className="w-6 h-6" />
        </button>

        {/* Step indicator */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 safe-top flex gap-1.5">
          {walkthroughSteps.map((_, index) => (
            <div
              key={index}
              className={`h-1.5 rounded-full transition-all ${
                index === currentStep
                  ? "w-6 bg-primary"
                  : index < currentStep
                  ? "w-1.5 bg-primary/60"
                  : "w-1.5 bg-white/30"
              }`}
            />
          ))}
        </div>

        {/* Content card */}
        <motion.div
          key={step.id}
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.95 }}
          transition={{ duration: 0.3 }}
          className="bg-card border border-border rounded-3xl p-6 max-w-sm w-full shadow-2xl"
        >
          {/* Icon */}
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
            {step.icon}
          </div>

          {/* Text */}
          <h2 className="font-brand text-xl font-bold text-foreground text-center mb-2">
            {step.title}
          </h2>
          <p className="text-muted-foreground text-center text-sm leading-relaxed mb-6">
            {step.description}
          </p>

          {/* Navigation buttons */}
          <div className="flex items-center gap-3">
            {!isFirstStep && (
              <Button
                variant="ghost"
                size="icon"
                onClick={handlePrev}
                className="shrink-0"
              >
                <ChevronLeft className="w-5 h-5" />
              </Button>
            )}
            <Button
              variant="hero"
              className="flex-1"
              onClick={handleNext}
            >
              {isLastStep ? "Get Started" : "Next"}
              {!isLastStep && <ChevronRight className="w-4 h-4 ml-1" />}
            </Button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
