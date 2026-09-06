import { useState } from "react";
import { z } from "zod";
import { MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useLanding } from "@/components/landing/LandingContext";
import { Reveal } from "@/components/landing/LandingShell";
import { SectionHead } from "@/components/landing/LandingBlocks";
import { WHATSAPP_DISPLAY, whatsappLink } from "@/lib/landingContent";

type Kind = "events" | "restaurant" | "experiences" | "other";

const schema = z.object({
  full_name: z.string().trim().min(1).max(120),
  business_name: z.string().trim().min(1).max(120),
  phone: z.string().trim().min(5).max(40),
  email: z.union([z.string().trim().email().max(255), z.literal("")]),
  message: z.string().trim().max(1000),
});

export const LeadForm = ({ defaultKind = "events" }: { defaultKind?: Kind }) => {
  const { t, lang } = useLanding();
  const c = t.lead;

  const [fullName, setFullName] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [kind, setKind] = useState<Kind>(defaultKind);
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "done">("idle");
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const parsed = schema.safeParse({
      full_name: fullName,
      business_name: businessName,
      phone,
      email,
      message,
    });
    if (!parsed.success) {
      const flat = parsed.error.flatten().fieldErrors;
      setError(flat.email ? c.invalidEmail : c.required);
      return;
    }

    setStatus("sending");
    const payload = {
      full_name: parsed.data.full_name,
      business_name: parsed.data.business_name,
      business_kind: kind,
      phone: parsed.data.phone,
      email: parsed.data.email || null,
      message: parsed.data.message || null,
      source: "landing",
      locale: lang,
    };

    const { error: insertError } = await supabase.from("business_leads").insert(payload);
    if (insertError) {
      setStatus("idle");
      setError(c.error);
      return;
    }

    // Notification email is best-effort: the lead is already stored.
    supabase.functions
      .invoke("notify-business-lead", {
        body: {
          fullName: payload.full_name,
          businessName: payload.business_name,
          businessKind: kind,
          phone: payload.phone,
          email: payload.email ?? "",
          message: payload.message ?? "",
          locale: lang,
        },
      })
      .catch(() => undefined);

    setStatus("done");
  };

  return (
    <div id="demo" className="grid gap-10 lg:grid-cols-2 lg:items-start">
      <SectionHead kicker={c.kicker} title={c.title} subtitle={c.subtitle} />

      <Reveal delay={80}>
        {status === "done" ? (
          <div className="rounded-3xl border border-border bg-card p-8">
            <p className="font-brand text-2xl font-semibold">{c.successTitle}</p>
            <p className="mt-2 text-sm text-muted-foreground">{c.successBody}</p>
            <Button asChild variant="outline" className="mt-6 h-11 rounded-full px-6">
              <a
                href={whatsappLink(`Hola Zentro, soy ${fullName} de ${businessName}.`)}
                target="_blank"
                rel="noreferrer"
              >
                <MessageCircle className="mr-2 h-4 w-4" />
                {WHATSAPP_DISPLAY}
              </a>
            </Button>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-3 rounded-3xl border border-border bg-card p-6">
            <Input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder={c.name}
              maxLength={120}
              autoComplete="name"
              className="h-12 rounded-2xl"
            />
            <Input
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              placeholder={c.business}
              maxLength={120}
              className="h-12 rounded-2xl"
            />
            <Select value={kind} onValueChange={(v) => setKind(v as Kind)}>
              <SelectTrigger className="h-12 rounded-2xl" aria-label={c.kind}>
                <SelectValue placeholder={c.kind} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="events">{c.kinds.events}</SelectItem>
                <SelectItem value="restaurant">{c.kinds.restaurant}</SelectItem>
                <SelectItem value="experiences">{c.kinds.experiences}</SelectItem>
                <SelectItem value="other">{c.kinds.other}</SelectItem>
              </SelectContent>
            </Select>
            <Input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder={c.phone}
              maxLength={40}
              inputMode="tel"
              autoComplete="tel"
              className="h-12 rounded-2xl"
            />
            <Input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={c.email}
              maxLength={255}
              inputMode="email"
              autoComplete="email"
              className="h-12 rounded-2xl"
            />
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={c.message}
              maxLength={1000}
              rows={3}
              className="rounded-2xl"
            />

            {error ? <p className="text-sm text-destructive">{error}</p> : null}

            <Button
              type="submit"
              variant="sheet-action"
              disabled={status === "sending"}
              className="h-12 w-full rounded-full text-base font-semibold"
            >
              {status === "sending" ? c.sending : c.submit}
            </Button>

            <Button asChild variant="ghost" className="h-11 w-full rounded-full">
              <a
                href={whatsappLink("Hola Zentro, quiero una demo para mi negocio.")}
                target="_blank"
                rel="noreferrer"
              >
                <MessageCircle className="mr-2 h-4 w-4" />
                {c.whatsapp}
              </a>
            </Button>
          </form>
        )}
      </Reveal>
    </div>
  );
};
