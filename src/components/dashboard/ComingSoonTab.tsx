import { m } from "framer-motion";
import { Building2 } from "lucide-react";

export const ComingSoonTab = () => (
  <m.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    className="rounded-2xl bg-card border border-border p-8 text-center"
  >
    <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-primary/10 flex items-center justify-center">
      <Building2 className="w-7 h-7 text-primary" />
    </div>
    <h2 className="font-brand text-lg font-semibold text-foreground mb-2">
      Insights de la ciudad — próximamente
    </h2>
    <p className="text-sm text-muted-foreground max-w-xs mx-auto">
      Pronto vas a poder comparar el rendimiento de tu negocio con otros lugares de tu ciudad.
    </p>
    <p className="text-sm text-muted-foreground max-w-xs mx-auto mt-1.5">
      Benchmarks de asistencia, precios y ritmo de venta, sin exponer datos de nadie.
    </p>
  </m.div>
);
