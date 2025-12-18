import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { CheckCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const CheckoutSuccess = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get("session_id");

  useEffect(() => {
    const verifySubscription = async () => {
      if (!sessionId) return;

      try {
        // Call check-subscription to sync the subscription status
        const { error } = await supabase.functions.invoke("check-subscription");
        if (error) {
          console.error("Error checking subscription:", error);
        }
      } catch (err) {
        console.error("Error verifying subscription:", err);
      }
    };

    verifySubscription();
    toast.success("Welcome to Premium!", {
      description: "Your subscription is now active.",
    });
  }, [sessionId]);

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
          <h1 className="text-2xl font-bold">Payment Successful!</h1>
          <p className="text-muted-foreground">
            Thank you for subscribing. Your premium features are now active.
          </p>
        </div>

        <div className="space-y-3">
          <Button onClick={() => navigate("/")} className="w-full">
            Start Exploring
          </Button>
          <Button
            variant="outline"
            onClick={() => navigate("/settings/subscription")}
            className="w-full"
          >
            View Subscription
          </Button>
        </div>
      </motion.div>
    </div>
  );
};

export default CheckoutSuccess;
