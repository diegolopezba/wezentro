import { useState, useRef, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { DEFAULT_AVATAR } from "@/lib/defaultAvatar";

interface MentionUser {
  id: string;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
}

interface MentionTextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
}

const MENTION_SPLIT_REGEX = /(@[a-zA-Z0-9_]+)/g;

/** Render the highlight HTML — @mentions in blue, rest as escaped text */
function buildHighlightHTML(text: string): string {
  const parts = text.split(MENTION_SPLIT_REGEX);
  return parts
    .map((part) => {
      if (/^@[a-zA-Z0-9_]+$/.test(part)) {
        return `<mark style="background:transparent;color:hsl(204,100%,47%);font-weight:500;">${escapeHtml(part)}</mark>`;
      }
      // whitespace: pre-wrap preserves newlines, so no <br/> injection here
      return escapeHtml(part);
    })
    .join("");
}


function escapeHtml(str: string) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export const MentionTextarea = ({
  value,
  onChange,
  className,
  style,
  ...props
}: MentionTextareaProps) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const mirrorRef = useRef<HTMLDivElement>(null);
  const [suggestions, setSuggestions] = useState<MentionUser[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [activeQuery, setActiveQuery] = useState<string | null>(null);
  const [activeMentionStart, setActiveMentionStart] = useState<number>(-1);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Keep mirror scroll in sync with textarea scroll
  const syncScroll = useCallback(() => {
    if (textareaRef.current && mirrorRef.current) {
      mirrorRef.current.scrollTop = textareaRef.current.scrollTop;
    }
  }, []);

  const detectMention = useCallback((text: string, cursorPos: number) => {
    const textBeforeCursor = text.slice(0, cursorPos);
    const match = textBeforeCursor.match(/@(\w+)$/);
    if (match) {
      return { query: match[1], start: cursorPos - match[0].length };
    }
    return null;
  }, []);

  const fetchSuggestions = useCallback(async (query: string) => {
    if (query.length < 1) {
      setSuggestions([]);
      setShowDropdown(false);
      return;
    }
    const { data } = await supabase
      .from("profiles")
      .select("id, username, full_name, avatar_url")
      .ilike("username", `${query}%`)
      .limit(5);
    if (data && data.length > 0) {
      setSuggestions(data as MentionUser[]);
      setShowDropdown(true);
    } else {
      setSuggestions([]);
      setShowDropdown(false);
    }
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e);
    const cursorPos = e.target.selectionStart ?? 0;
    const mention = detectMention(e.target.value, cursorPos);
    if (mention) {
      setActiveQuery(mention.query);
      setActiveMentionStart(mention.start);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        fetchSuggestions(mention.query);
      }, 200);
    } else {
      setShowDropdown(false);
      setActiveQuery(null);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Escape") setShowDropdown(false);
    props.onKeyDown?.(e);
  };

  const selectSuggestion = (user: MentionUser) => {
    if (!textareaRef.current) return;
    const cursorPos = textareaRef.current.selectionStart ?? 0;
    const before = value.slice(0, activeMentionStart);
    const after = value.slice(cursorPos);
    const newValue = `${before}@${user.username} ${after}`;

    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
      window.HTMLTextAreaElement.prototype, "value" )?.set;
    nativeInputValueSetter?.call(textareaRef.current, newValue);
    textareaRef.current.dispatchEvent(new Event("input", { bubbles: true }));

    const syntheticEvent = {
      target: { ...textareaRef.current, value: newValue },
      currentTarget: { ...textareaRef.current, value: newValue },
    } as React.ChangeEvent<HTMLTextAreaElement>;
    onChange(syntheticEvent);

    setShowDropdown(false);
    setActiveQuery(null);

    const newCursorPos = activeMentionStart + user.username.length + 2;
    requestAnimationFrame(() => {
      textareaRef.current?.setSelectionRange(newCursorPos, newCursorPos);
      textareaRef.current?.focus();
    });
  };

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (textareaRef.current && !textareaRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div className="relative">
      {/* Mirror div — renders colored highlights behind the transparent textarea */}
      <div
        ref={mirrorRef}
        aria-hidden="true" className={cn( "absolute inset-0 flex min-h-[80px] w-full rounded-md border border-transparent px-3 py-2 text-sm pointer-events-none overflow-hidden whitespace-pre-wrap break-words",
          className
        )}
        style={{
          fontFamily: "inherit",
          fontSize: "inherit",
          lineHeight: "inherit",
          letterSpacing: "inherit",
          wordSpacing: "inherit",
          color: "hsl(var(--foreground))",
          background: "transparent",
          zIndex: 0,
          ...style,
        }}
        dangerouslySetInnerHTML={{ __html: buildHighlightHTML(value) + "&nbsp;" }}
      />
      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onScroll={syncScroll}
        className={cn( "relative flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none",
          className
        )}
        style={{ ...style, position: "relative", zIndex: 1, background: "transparent", color: "transparent", caretColor: "hsl(var(--foreground))" }}
        {...props}
      />
      {showDropdown && suggestions.length > 0 && (
        <div className="absolute left-0 right-0 top-full mt-1 z-50 bg-popover border border-border rounded-xl shadow-lg overflow-hidden">
          {suggestions.map((user) => (
            <button
              key={user.id}
              type="button" className="w-full flex items-center gap-3 px-3 py-2.5 transition-colors text-left" onMouseDown={(e) => {
                e.preventDefault();
                selectSuggestion(user);
              }}
            >
              <Avatar className="h-8 w-8 shrink-0">
                <AvatarImage src={user.avatar_url || DEFAULT_AVATAR} />
                <AvatarFallback />
              </Avatar>
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  {user.full_name || user.username}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  @{user.username}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
