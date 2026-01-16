import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { MapPin, Users, Sparkles, ArrowRight, ChevronLeft } from "lucide-react";

interface OnboardingSlide {
  icon: React.ReactNode;
  title: string;
  description: string;
  gradient: string;
}

const slides: OnboardingSlide[] = [
  {
    icon: <MapPin className="w-16 h-16" />,
    title: "Discover Events",
    description: "Find amazing events happening around you. Explore the map to see what's nearby and never miss out on the action.",
    gradient: "from-violet-500 to-purple-600",
  },
  {
    icon: <Users className="w-16 h-16" />,
    title: "Join Guestlists",
    description: "Get on the list for exclusive events. Connect with friends and see who's going before you commit.",
    gradient: "from-pink-500 to-rose-600",
  },
  {
    icon: <Sparkles className="w-16 h-16" />,
    title: "Create & Share",
    description: "Host your own events and invite your community. Share moments and build connections that last.",
    gradient: "from-amber-500 to-orange-600",
  },
];

const Welcome = () => {
  const navigate = useNavigate();
  const [currentSlide, setCurrentSlide] = useState(0);

  const handleNext = () => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide(currentSlide + 1);
    } else {
      localStorage.setItem("zentro_has_seen_welcome", "true");
      navigate("/auth");
    }
  };

  const handleBack = () => {
    if (currentSlide > 0) {
      setCurrentSlide(currentSlide - 1);
    }
  };

  const handleSkip = () => {
    localStorage.setItem("zentro_has_seen_welcome", "true");
    navigate("/auth");
  };

  return (
    <div className="min-h-screen bg-background flex flex-col relative overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-background to-background/80" />
      
      {/* Animated background circles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className={`absolute -top-32 -right-32 w-96 h-96 rounded-full bg-gradient-to-br ${slides[currentSlide].gradient} opacity-20 blur-3xl`}
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.15, 0.25, 0.15],
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
        <motion.div
          className={`absolute -bottom-32 -left-32 w-96 h-96 rounded-full bg-gradient-to-tr ${slides[currentSlide].gradient} opacity-15 blur-3xl`}
          animate={{
            scale: [1.2, 1, 1.2],
            opacity: [0.1, 0.2, 0.1],
          }}
          transition={{
            duration: 5,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      </div>

      {/* Header */}
      <div className="relative z-10 pt-6 px-6 flex items-center justify-between">
        {currentSlide > 0 ? (
          <button
            onClick={handleBack}
            className="p-2 -ml-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
        ) : (
          <div className="w-10" />
        )}
        
        <button
          onClick={handleSkip}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          Skip
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col justify-center px-8 relative z-10">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentSlide}
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="flex flex-col items-center text-center"
          >
            {/* Icon with gradient background */}
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.1, duration: 0.3 }}
              className={`w-32 h-32 rounded-3xl bg-gradient-to-br ${slides[currentSlide].gradient} flex items-center justify-center mb-10 shadow-xl`}
            >
              <div className="text-white">
                {slides[currentSlide].icon}
              </div>
            </motion.div>

            {/* Title */}
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.3 }}
              className="text-3xl font-bold text-foreground mb-4"
            >
              {slides[currentSlide].title}
            </motion.h1>

            {/* Description */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.3 }}
              className="text-muted-foreground text-lg max-w-xs leading-relaxed"
            >
              {slides[currentSlide].description}
            </motion.p>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Bottom section */}
      <div className="relative z-10 px-6 pb-12 space-y-8">
        {/* Dots indicator */}
        <div className="flex justify-center gap-2">
          {slides.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentSlide(index)}
              className={`transition-all duration-300 rounded-full ${
                index === currentSlide
                  ? `w-8 h-2 bg-gradient-to-r ${slides[currentSlide].gradient}`
                  : "w-2 h-2 bg-muted-foreground/30 hover:bg-muted-foreground/50"
              }`}
            />
          ))}
        </div>

        {/* Action button */}
        <Button
          variant="hero"
          className="w-full py-6 text-lg"
          onClick={handleNext}
        >
          {currentSlide === slides.length - 1 ? (
            <>
              Get Started
              <ArrowRight className="w-5 h-5 ml-2" />
            </>
          ) : (
            <>
              Continue
              <ArrowRight className="w-5 h-5 ml-2" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
};

export default Welcome;
