import {
  BarChart3,
  Bell,
  CalendarCheck,
  CalendarDays,
  Clock,
  Compass,
  CreditCard,
  DollarSign,
  Filter,
  Heart,
  Home,
  Image,
  Landmark,
  LayoutDashboard,
  ListOrdered,
  Lock,
  Map,
  MapPin,
  Megaphone,
  MessageCircle,
  PartyPopper,
  Percent,
  QrCode,
  Search,
  Shield,
  Sparkles,
  Tag,
  Ticket,
  Timer,
  TrendingUp,
  Unlock,
  UserCheck,
  UserPlus,
  Users,
  UtensilsCrossed,
  Wallet,
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

export const HOME_FEED_INTRO: FeatureIntroStep[] = [
  {
    title: "Tu feed personalizado",
    subtitle: "Zentro aprende de lo que te interesa y te muestra lo más relevante primero.",
    items: [
      { icon: Home, label: "Para Ti", desc: "Eventos ordenados por lo que más te pueden gustar, según tus interacciones." },
      { icon: Filter, label: "Categorías", desc: "Filtrá por fiesta, restaurante, bar, aventura y más." },
      { icon: Search, label: "Buscar", desc: "Encontrá eventos, lugares o personas por nombre." },
      { icon: UserPlus, label: "Seguir gente", desc: "Seguí a creadores para ver más de su contenido en tu feed." },
    ],
  },
];

export const EVENT_ACTIONS_INTRO: FeatureIntroStep[] = [
  {
    title: "¿Cómo participar de este evento?",
    subtitle: "El botón de abajo cambia según el tipo de evento.",
    items: [
      { icon: Users, label: "Guestlist", desc: "Unirte a la lista de invitados. El organizer te aprueba si hay cupo." },
      { icon: Ticket, label: "Entrada", desc: "Comprá una o varias entradas. Recibís un QR en tus tickets y por email." },
      { icon: CalendarCheck, label: "Reserva", desc: "Reservá mesa en restaurantes o un horario en experiencias." },
      { icon: MapPin, label: "Ubicación secreta", desc: "Algunas direcciones solo se revelan si estás aprobado o compraste entrada." },
    ],
  },
  {
    title: "Tu QR de acceso",
    items: [
      { icon: QrCode, label: "Mostralo en la entrada", desc: "Va a Mis Entradas y se envía por email. No lo compartas públicamente." },
      { icon: Unlock, label: "Invitación especial", desc: "Si recibiste un link de invitación, tocá Aceptar invitación especial." },
    ],
  },
];

export const TICKETS_INTRO: FeatureIntroStep[] = [
  {
    title: "Tus entradas y reservas",
    subtitle: "Todo lo que compraste o reservaste en un solo lugar.",
    items: [
      { icon: Ticket, label: "Entradas", desc: "Eventos con pago confirmado o guestlist aprobada." },
      { icon: CalendarCheck, label: "Reservas", desc: "Mesas en restaurantes, bares y cafés confirmadas." },
      { icon: QrCode, label: "QR de acceso", desc: "Mostralo en la puerta. También te lo enviamos por email." },
      { icon: Clock, label: "Pasadas", desc: "Eventos y reservas anteriores quedan en tu historial." },
    ],
  },
];

export const NOTIFICATIONS_INTRO: FeatureIntroStep[] = [
  {
    title: "Centro de notificaciones",
    subtitle: "Todo lo que pasa con tu cuenta, tus eventos y tus amigos.",
    items: [
      { icon: Bell, label: "Punto rojo = sin leer", desc: "Las notificaciones se marcan automáticamente como leídas al verlas." },
      { icon: Heart, label: "Interacciones", desc: "Me gusta, reposts y comentarios en tus publicaciones." },
      { icon: Users, label: "Seguidores", desc: "Alguien comenzó a seguirte o aceptó tu solicitud." },
      { icon: CalendarCheck, label: "Eventos y reservas", desc: "Invitaciones, confirmaciones, cambios de ubicación y más." },
    ],
  },
];

export const DISCOVER_INTRO: FeatureIntroStep[] = [
  {
    title: "Descubrir cerca de vos",
    subtitle: "El mapa muestra eventos y lugares según tu ubicación.",
    items: [
      { icon: Map, label: "Eventos en el mapa", desc: "Cada pin es un evento. Tocá un pin para ver la tarjeta abajo." },
      { icon: Compass, label: "Categorías", desc: "Filtrá por restaurantes, bares, fiestas, cultura y más." },
      { icon: Search, label: "Buscar", desc: "Buscá eventos o personas desde la barra superior." },
      { icon: Navigation, label: "Cerca de ti", desc: "Activá tu ubicación para ver primero lo que está más cerca." },
    ],
  },
];

export const BUSINESS_DASHBOARD_INTRO: FeatureIntroStep[] = [
  {
    title: "Tu Business Dashboard",
    subtitle: "Métricas de todo lo que pasa con tu cuenta de negocio.",
    items: [
      { icon: LayoutDashboard, label: "Overview", desc: "Resumen de ingresos, visitas, conversiones y embudo." },
      { icon: TrendingUp, label: "Ventas", desc: "Entradas vendidas, reservas e ingresos por evento." },
      { icon: Users, label: "Audiencia", desc: "Quién te sigue, cuántos repiten y datos demográficos." },
      { icon: Megaphone, label: "Acciones", desc: "Promocioná contenido o creá invitaciones especiales." },
    ],
  },
  {
    title: "De dónde vienen los ingresos",
    items: [
      { icon: Wallet, label: "Tickets vendidos", desc: "5% de comisión por venta de entradas. El resto es tuyo." },
      { icon: CalendarCheck, label: "Reservas", desc: "Con un plan activo, no pagás comisión por reserva." },
      { icon: BarChart3, label: "Embudo", desc: "Vistas → clic → compra. Identificá dónde mejorar." },
    ],
  },
];

export const SALES_PAYOUTS_INTRO: FeatureIntroStep[] = [
  {
    title: "Ventas y cobros",
    subtitle: "Cómo se calculan tus ingresos y cuándo llegan a tu cuenta.",
    items: [
      { icon: DollarSign, label: "Ingresos", desc: "Suma de entradas vendidas y reservas confirmadas." },
      { icon: Percent, label: "Comisión", desc: "5% por ticket vendido. Las reservas no tienen comisión con plan activo." },
      { icon: Clock, label: "Depósito", desc: "Qhantuy deposita el dinero en tu cuenta al día hábil siguiente." },
      { icon: Landmark, label: "Beneficiario", desc: "Sin datos bancarios no podés publicar eventos ni cobrar." },
    ],
  },
];

export const PRIVACY_INTRO: FeatureIntroStep[] = [
  {
    title: "Controlá quién te escribe",
    subtitle: "Elegí quién puede iniciar conversaciones contigo.",
    items: [
      { icon: MessageCircle, label: "Mensajes directos", desc: "Esta opción controla solo quién puede empezar un chat nuevo." },
      { icon: Users, label: "Todos", desc: "Cualquier usuario registrado puede enviarte un mensaje." },
      { icon: UserCheck, label: "Seguidores", desc: "Solo quienes te siguen pueden escribirte. Ideal para hosts públicos." },
      { icon: Heart, label: "Mutuos", desc: "Solo si ambos se siguen. La opción más privada." },
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
