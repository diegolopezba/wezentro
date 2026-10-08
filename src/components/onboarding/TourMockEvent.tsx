import { CalendarDays, MapPin, Clock } from "lucide-react";
import poster from "@/assets/soundsunset-tour.jpg.asset.json";

/** Static demo event shown only inside the user tour — never stored or listed anywhere. */
const FRIENDS = [11, 32, 47, 5, 68];

export const TourMockEvent = () => (
  <div className="absolute inset-0 overflow-y-auto bg-background text-foreground">
    <div className="mx-auto max-w-lg pb-32">
      <img src={poster.url} alt="SOUNDSUNSET" className="w-full max-h-[55vh] object-cover" />
      <div className="space-y-5 px-5 pt-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-red font-semibold">S</div>
          <p className="font-semibold">soundssunset</p>
        </div>
        <h1 className="font-brand text-2xl font-semibold">SOUNDSUNSET</h1>
        <div className="space-y-2 text-sm text-muted-foreground">
          <p className="flex items-center gap-2"><CalendarDays className="h-4 w-4" /> Sábado 6 de junio</p>
          <p className="flex items-center gap-2"><Clock className="h-4 w-4" /> 3:00 PM → 5:00 AM</p>
          <p className="flex items-center gap-2"><MapPin className="h-4 w-4" /> Santa Cruz de la Sierra, Bolivia</p>
        </div>
        <div data-tour="event-friends" className="rounded-2xl bg-secondary p-4">
          <p className="mb-3 text-sm font-semibold">Personas que van</p>
          <div className="flex items-center">
            {FRIENDS.map((n, i) => (
              <img key={n} src={`https://i.pravatar.cc/80?img=${n}`} alt="" className="h-9 w-9 rounded-full border-2 border-background object-cover" style={{ marginLeft: i ? -10 : 0 }} />
            ))}
            <span className="ml-3 text-sm text-muted-foreground">+48 van</span>
          </div>
        </div>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Despedí el sol con la mejor música: sunset house, disco y crossover desde la tarde hasta el amanecer.
          Line-up local e invitados, barra completa, food trucks y una terraza con la mejor vista de la ciudad. +18 con CI.
        </p>
        <div className="flex flex-wrap gap-2">
          {["Sunset House", "Disco", "Crossover"].map((g) => (
            <span key={g} className="rounded-full bg-secondary px-3 py-1 text-xs">{g}</span>
          ))}
        </div>
      </div>
    </div>
    <div className="fixed inset-x-0 bottom-0 border-t border-border bg-background px-5 pb-[max(env(safe-area-inset-bottom),16px)] pt-3">
      <div data-tour="event-cta" className="mx-auto flex max-w-lg items-center justify-between gap-4">
        <div><p className="text-xs text-muted-foreground">Desde</p><p className="font-semibold">Bs. 80</p></div>
        <div className="rounded-full bg-primary px-8 py-3 font-semibold text-primary-foreground">Comprar</div>
      </div>
    </div>
  </div>
);
