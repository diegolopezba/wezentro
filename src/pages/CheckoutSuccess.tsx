import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { CheckCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useWalkthroughSafe } from "@/contexts/WalkthroughContext";

const CheckoutSuccess = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const returnTo = searchParams.get("returnTo");
  const [isVerifying, setIsVerifying] = useState(true);
  const walkthrough = useWalkthroughSafe();

  useEffect(() => {
    const verifySubscription = async () => {
      if (!sessionId) {
        setIsVerifying(false);
        return;
      }

      try {
        // Call check-subscription to sync the subscription status
        const { error } = await supabase.functions.invoke("check-subscription");
        if (error) {
          console.error("Error checking subscription:", error);
        }
        
        toast.success("¡Bienvenido a Premium!", {
          description: "Tu suscripción ya está activa.",
        });

        // If we have a returnTo URL, redirect after a brief moment
        if (returnTo) {
          setTimeout(() => {
            navigate(returnTo);
          }, 1500);
        } else {
          setIsVerifying(false);
        }
      } catch (err) {
        console.error("Error verifying subscription:", err);
        setIsVerifying(false);
      }
    };

    verifySubscription();
  }, [sessionId, returnTo, navigate]);

  // If redirecting back to an event, show a simpler loading state
  if (returnTo && isVerifying) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center space-y-6 max-w-md"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
            className="mx-auto w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center"
          >
            <CheckCircle className="h-10 w-10 text-green-500" />
          </motion.div>

          <div className="space-y-2">
            <h1 className="text-2xl font-bold">¡Pago Exitoso!</h1>
            <p className="text-muted-foreground">
              Redirigiendo para completar tu compra...
            </p>
          </div>

          <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" />
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center space-y-6 max-w-md"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
          className="mx-auto w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center"
        >
          <CheckCircle className="h-10 w-10 text-green-500" />
        </motion.div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold">¡Pago Exitoso!</h1>
          <p className="text-muted-foreground">
            Gracias por suscribirte. Tus funciones premium ya están activas.
          </p>
        </div>

        <div className="space-y-3">
          <Button onClick={() => navigate("/")} className="w-full">
            Comenzar a Explorar
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              // Navigate to relevant page for tier walkthrough
              // The walkthrough trigger hook will detect the plan change
              navigate("/profile");
            }}
            className="w-full"
          >
            Ver Suscripción
          </Button>
        </div>
      </motion.div>
    </div>
  );
};

export default CheckoutSuccess;
