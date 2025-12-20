import { motion } from "framer-motion";
import { formatDistanceToNow } from "date-fns";
import { Loader2, Mail, CheckCircle, XCircle, Clock } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useEventInvitations } from "@/hooks/useGuestlistInvitations";
import { useNavigate } from "react-router-dom";

interface InvitationsSentSectionProps {
  eventId: string;
}

export function InvitationsSentSection({ eventId }: InvitationsSentSectionProps) {
  const navigate = useNavigate();
  const { data: invitations = [], isLoading } = useEventInvitations(eventId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-6">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (invitations.length === 0) {
    return null;
  }

  const pendingCount = invitations.filter(i => i.status === "pending").length;
  const acceptedCount = invitations.filter(i => i.status === "accepted").length;
  const declinedCount = invitations.filter(i => i.status === "declined").length;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return (
          <Badge variant="secondary" className="gap-1">
            <Clock className="w-3 h-3" />
            Pending
          </Badge>
        );
      case "accepted":
        return (
          <Badge className="gap-1 bg-emerald-500/20 text-emerald-600 hover:bg-emerald-500/30">
            <CheckCircle className="w-3 h-3" />
            Accepted
          </Badge>
        );
      case "declined":
        return (
          <Badge variant="destructive" className="gap-1">
            <XCircle className="w-3 h-3" />
            Declined
          </Badge>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Mail className="w-5 h-5 text-primary" />
          <h2 className="font-brand text-lg font-semibold text-foreground">
            Invitations Sent
          </h2>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {pendingCount > 0 && <span>{pendingCount} pending</span>}
          {acceptedCount > 0 && <span className="text-emerald-600">{acceptedCount} accepted</span>}
          {declinedCount > 0 && <span className="text-destructive">{declinedCount} declined</span>}
        </div>
      </div>

      <div className="space-y-2">
        {invitations.map((invitation, index) => (
          <motion.div
            key={invitation.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className="flex items-center gap-3 p-3 rounded-xl bg-secondary/30 hover:bg-secondary/50 cursor-pointer transition-colors"
            onClick={() => navigate(`/user/${invitation.invited_user_id}`)}
          >
            <Avatar className="w-10 h-10">
              <AvatarImage src={invitation.invited_user?.avatar_url || undefined} />
              <AvatarFallback>
                {invitation.invited_user?.username?.charAt(0).toUpperCase() || "?"}
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1 min-w-0">
              <p className="font-medium text-foreground text-sm truncate">
                @{invitation.invited_user?.username || "user"}
              </p>
              <p className="text-xs text-muted-foreground">
                Invited {formatDistanceToNow(new Date(invitation.created_at), { addSuffix: true })}
              </p>
            </div>
            
            {getStatusBadge(invitation.status)}
          </motion.div>
        ))}
      </div>
    </div>
  );
}
