import { useEffect } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Copy, Share2, Gift, Users, Check, Crown, Clock, CreditCard } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { toast } from "sonner";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useUserSubscription } from "@/hooks/useSubscription";
import { 
  useReferralStats, 
  useReferredUsers, 
  useGenerateReferralCode,
  useClaimReferralReward 
} from "@/hooks/useReferrals";
import { DEFAULT_AVATAR } from "@/lib/defaultAvatar";

const BASE_URL = "https://zentro.today";

const Referrals = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: subscription } = useUserSubscription();
  const isPlacesPremium = subscription?.plan_type === "food_premium";
  const isBusinessPremium = subscription?.plan_type === "business_premium";
  const { data: stats, isLoading: statsLoading } = useReferralStats();
  const { data: referredUsers, isLoading: usersLoading } = useReferredUsers();
  const generateCode = useGenerateReferralCode();
  const claimReward = useClaimReferralReward();

  const referralCode = stats?.referral_code;
  const referralCount = stats?.referral_count || 0;
  const pendingRewards = stats?.pending_rewards || 0;
  const isBusinessAccount = isPlacesPremium || isBusinessPremium;

  // Count paid referrals
  const paidReferrals = referredUsers?.filter(r => r.payment_completed).length || 0;

  // Generate code if user doesn't have one
  useEffect(() => {
    if (user && stats && !referralCode && !generateCode.isPending) {
      generateCode.mutate();
    }
  }, [user, stats, referralCode, generateCode]);

  const referralLink = referralCode ? `${BASE_URL}/auth?ref=${referralCode}` : "";

  const handleCopyLink = async () => {
    if (!referralLink) return;
    
    try {
      await navigator.clipboard.writeText(referralLink);
      toast.success("¡Enlace copiado!");
    } catch {
      toast.error("No se pudo copiar el enlace");
    }
  };

  const handleShare = async () => {
    if (!referralLink) return;

    if (navigator.share) {
      try {
        await navigator.share({
          title: "Únete a Zentro",
          text: "¡Descubre los mejores eventos cerca de ti! Únete usando mi enlace:",
          url: referralLink,
        });
      } catch (error) {
        if ((error as Error).name !== "AbortError") {
          handleCopyLink();
        }
      }
    } else {
      handleCopyLink();
    }
  };

  const handleClaimReward = () => {
    claimReward.mutate();
  };

  const isLoading = statsLoading || usersLoading || generateCode.isPending;

  return (
    <AppLayout>
      {/* Header */}
      <header className="sticky top-0 z-40 safe-top">
        <div className="flex items-center gap-3 px-4 py-4">
          <button 
            onClick={() => navigate(-1)}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-secondary/50 text-foreground"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="font-brand text-xl font-bold text-foreground">Invitar Amigos</h1>
        </div>
      </header>

      <div className="px-4 py-2 space-y-6">
        {/* Hero Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/20 via-primary/10 to-background border border-primary/20 p-6"
        >
          <div className="absolute top-4 right-4">
            <Gift className="w-12 h-12 text-primary/30" />
          </div>
          
          <div className="space-y-4">
            {isBusinessAccount ? (
              <>
                <div>
                  <h2 className="text-xl font-bold text-foreground">
                    ¡Gana meses gratis!
                  </h2>
                  <p className="text-muted-foreground text-sm mt-1">
                    Por cada cuenta de negocio que se suscriba con tu enlace, recibes 1 mes gratis
                  </p>
                </div>

                {/* Stats for business accounts */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-background/50 rounded-xl p-3 text-center">
                    <p className="text-2xl font-bold text-foreground">{referralCount}</p>
                    <p className="text-xs text-muted-foreground">Total referidos</p>
                  </div>
                  <div className="bg-background/50 rounded-xl p-3 text-center">
                    <p className="text-2xl font-bold text-primary">{pendingRewards}</p>
                    <p className="text-xs text-muted-foreground">Meses por reclamar</p>
                  </div>
                </div>

                {/* Claim button */}
                {pendingRewards > 0 && (
                  <Button
                    onClick={handleClaimReward}
                    disabled={claimReward.isPending}
                    className="w-full gradient-red text-white"
                  >
                    {claimReward.isPending ? (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        <Crown className="w-4 h-4 mr-2" />
                        Reclamar 1 mes gratis
                      </>
                    )}
                  </Button>
                )}
              </>
            ) : (
              <>
                <div>
                  <h2 className="text-xl font-bold text-foreground">
                    Invita amigos a Zentro
                  </h2>
                  <p className="text-muted-foreground text-sm mt-1">
                    Comparte tu enlace y ayuda a que más personas descubran Zentro
                  </p>
                </div>

                <div className="bg-background/50 rounded-xl p-4 text-center">
                  <p className="text-3xl font-bold text-foreground">{referralCount}</p>
                  <p className="text-sm text-muted-foreground">amigos invitados</p>
                </div>
              </>
            )}
          </div>
        </motion.div>

        {/* Share Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="space-y-3"
        >
          <h3 className="font-semibold text-foreground">Tu enlace de invitación</h3>
          
          <div className="flex gap-2">
            <div className="flex-1 bg-secondary/50 rounded-xl px-4 py-3 text-sm text-muted-foreground truncate border border-border">
              {isLoading ? "Generando..." : referralLink || "No disponible"}
            </div>
            <Button
              variant="secondary"
              size="icon"
              onClick={handleCopyLink}
              disabled={!referralLink}
              className="shrink-0"
            >
              <Copy className="w-4 h-4" />
            </Button>
          </div>

          <Button
            onClick={handleShare}
            disabled={!referralLink}
            className="w-full"
            variant="outline"
          >
            <Share2 className="w-4 h-4 mr-2" />
            Compartir enlace
          </Button>
        </motion.div>

        {/* Referred Users */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="space-y-3"
        >
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-muted-foreground" />
            <h3 className="font-semibold text-foreground">Tus referidos</h3>
          </div>

          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-3 animate-pulse">
                  <div className="w-10 h-10 rounded-full bg-secondary" />
                  <div className="flex-1 h-4 bg-secondary rounded" />
                </div>
              ))}
            </div>
          ) : referredUsers && referredUsers.length > 0 ? (
            <div className="space-y-2">
              {referredUsers.map((referredUser, index) => (
                <motion.div
                  key={referredUser.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 * index }}
                  className="flex items-center gap-3 p-3 rounded-xl bg-secondary/30"
                >
                  <Avatar className="w-10 h-10">
                    <AvatarImage src={referredUser.avatar_url || DEFAULT_AVATAR} />
                    <AvatarFallback>{referredUser.username[0]?.toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground truncate">
                      @{referredUser.username}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Se unió el {new Date(referredUser.created_at).toLocaleDateString("es-ES")}
                    </p>
                  </div>
                  {isBusinessAccount ? (
                    referredUser.payment_completed ? (
                      <div className="flex items-center gap-1 text-primary">
                        <CreditCard className="w-4 h-4" />
                        <span className="text-xs">Pagó</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Clock className="w-4 h-4" />
                        <span className="text-xs">Pendiente</span>
                      </div>
                    )
                  ) : (
                    <Check className="w-5 h-5 text-primary shrink-0" />
                  )}
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p className="text-sm">Aún no tienes referidos</p>
              <p className="text-xs mt-1">¡Comparte tu enlace para empezar!</p>
            </div>
          )}
        </motion.div>

        {/* Info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-secondary/30 rounded-xl p-4 space-y-2"
        >
          <h4 className="font-medium text-foreground text-sm">¿Cómo funciona?</h4>
          {isBusinessAccount ? (
            <ul className="text-xs text-muted-foreground space-y-1.5">
              <li className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs shrink-0">1</span>
                Comparte tu enlace con otros negocios
              </li>
              <li className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs shrink-0">2</span>
                Cuando se suscriban a Zentro Places o Business, contará como referido
              </li>
              <li className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs shrink-0">3</span>
                Por cada referido que pague su primera suscripción, recibes 1 mes gratis
              </li>
            </ul>
          ) : (
            <ul className="text-xs text-muted-foreground space-y-1.5">
              <li className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs shrink-0">1</span>
                Comparte tu enlace único con amigos
              </li>
              <li className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs shrink-0">2</span>
                Cuando se registren usando tu enlace, contará como referido
              </li>
              <li className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs shrink-0">3</span>
                Ayuda a que más personas descubran los mejores eventos cerca de ellos
              </li>
            </ul>
          )}
        </motion.div>
      </div>
    </AppLayout>
  );
};

export default Referrals;
