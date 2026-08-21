import {
  CalendarCheck,
  CalendarDays,
  Clock,
  CreditCard,
  Image,
  Landmark,
  ListOrdered,
  Megaphone,
  PartyPopper,
  Sparkles,
  Tag,
  Timer,
  UtensilsCrossed,
  Users,
} from "lucide-react";
import type { FeatureIntroStep } from "./FeatureIntroSheet";

export const CREATE_INTRO: FeatureIntroStep[] = [
  {
    title: "¿Qué querés publicar?",
    subtitle: "Elegí entre tres formatos según lo que querés compartir o vender.",
    items: [
      { icon: Sparkles, label: "Post", desc: "Un momento, aventura o contenido. Podés activar botón de menú o reservas si tenés un negocio." },
      { icon: PartyPopper, label: "Evento", desc: "Fecha, lugar y gente. Con lista de invitados, entradas o layout del lugar." },
      { icon: CalendarCheck, label: "Experiencia", desc: "Evento vinculado a una experiencia con horarios, opciones y pago por QR." },
    ],
  },
];


export const EXPERIENCES_INTRO: FeatureIntroStep[] = [
  {
    title: "¿Qué es una experiencia?",
    subtitle: "Todo lo que la gente reserva por horario y paga por adelantado.",
    items: [
      { icon: Sparkles, label: "Tours, clases, buceo, catas", desc: "Vos definís qué es, cuánto dura y cuánto cuesta." },
      { icon: Tag, label: "Opciones y precios", desc: "Creá opciones como Adulto, Niño o Grupo, cada una con su precio." },
    ],
  },
  {
    title: "Definí días, horarios y cupos",
    subtitle: "El sistema arma los horarios disponibles automáticamente.",
    items: [
      { icon: CalendarDays, label: "Días de la semana", desc: "Elegí qué días operás y en qué rango horario." },
      { icon: Clock, label: "Intervalo entre horarios", desc: "Cada cuánto sale un grupo: 30, 60 o 90 minutos." },
      { icon: Users, label: "Cupos por horario", desc: "Cuántas personas entran en cada salida. Al llenarse, se cierra sola." },
      { icon: Timer, label: "Antelación mínima", desc: "Evitá reservas de último minuto." },
    ],
  },
  {
    title: "Cobrá y publicá",
    subtitle: "Dos pasos y tu experiencia queda lista para recibir reservas.",
    items: [
      { icon: Landmark, label: "1. Datos de cobro", desc: "Sin cuenta bancaria registrada no podés publicar la experiencia." },
      { icon: Megaphone, label: "2. Publicala", desc: "Creá una publicación y vinculala a la experiencia: ahí aparece el botón Reservar." },
      { icon: CreditCard, label: "El pago es por QR", desc: "El invitado paga al reservar y el dinero llega a tu cuenta al día siguiente." },
    ],
  },
];

export const MENU_INTRO: FeatureIntroStep[] = [
  {
    title: "Tu carta, siempre actualizada",
    subtitle: "Sin PDFs ni fotos borrosas: tu menú vive en tu perfil.",
    items: [
      { icon: ListOrdered, label: "1. Creá categorías", desc: "Entradas, platos, bebidas, postres… el orden que uses en tu local." },
      { icon: UtensilsCrossed, label: "2. Agregá platos", desc: "Nombre, descripción y precio en bolivianos." },
      { icon: Image, label: "3. Sumá fotos", desc: "Los platos con foto se piden mucho más." },
    ],
  },
  {
    title: "Dónde lo ve tu cliente",
    items: [
      { icon: UtensilsCrossed, label: "Desde tu perfil", desc: "El botón Menú aparece en tu perfil de negocio." },
      { icon: Megaphone, label: "En tus publicaciones", desc: "Al crear un post podés activar el botón de menú." },
    ],
  },
];

export const RESERVATIONS_INTRO: FeatureIntroStep[] = [
  {
    title: "Reservas sin llamadas",
    subtitle: "Configurá una vez y las reservas entran solas, ya confirmadas.",
    items: [
      { icon: ListOrdered, label: "1. Cargá tus mesas", desc: "Cantidad de mesas y capacidad de cada una: es tu inventario real." },
      { icon: CalendarDays, label: "2. Definí tus horarios", desc: "Qué días y en qué franjas recibís gente." },
      { icon: Timer, label: "3. Ajustá las reglas", desc: "Antelación mínima, duración de la mesa y máximo de personas." },
    ],
  },
  {
    title: "Cómo llegan las reservas",
    items: [
      { icon: CalendarCheck, label: "Confirmación automática", desc: "Si hay mesa disponible, la reserva se confirma al instante." },
      { icon: Users, label: "Control de cupo", desc: "Nunca vas a recibir más reservas que mesas disponibles." },
      { icon: Megaphone, label: "Desde tu perfil y tus posts", desc: "El botón Reservar aparece en tu perfil y en las publicaciones que elijas." },
    ],
  },
];
