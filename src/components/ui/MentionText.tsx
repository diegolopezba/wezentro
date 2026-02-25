import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface MentionTextProps {
  text: string;
  className?: string;
}

const MENTION_SPLIT_REGEX = /(@[a-zA-Z0-9_]+)/g;
const MENTION_TEST_REGEX = /^@[a-zA-Z0-9_]+$/;

export const MentionText = ({ text, className }: MentionTextProps) => {
  const navigate = useNavigate();

  const handleMentionClick = async (
    e: React.MouseEvent,
    username: string
  ) => {
    e.stopPropagation();
    const { data } = await supabase
      .from("profiles")
      .select("id")
      .eq("username", username)
      .maybeSingle();
    if (data?.id) {
      navigate(`/user/${data.id}`);
    }
  };

  const parts = text.split(MENTION_SPLIT_REGEX);

  return (
    <span className={className}>
      {parts.map((part, i) => {
        if (MENTION_TEST_REGEX.test(part)) {
          const username = part.slice(1); // Remove @
          return (
            <span
              key={i}
              className="text-[hsl(204,100%,47%)] cursor-pointer hover:underline font-medium"
              onClick={(e) => handleMentionClick(e, username)}
            >
              {part}
            </span>
          );
        }
        return part;
      })}
    </span>
  );
};
