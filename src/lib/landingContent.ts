/**
 * Copy for the browser-only commercial landing (/landing).
 * Bilingual: every string exists in Spanish and English so sales agents can
 * present in either language. Prices come from subscriptionTiers, never from here.
 */

export type LandingLang = "es" | "en";

export const WHATSAPP_NUMBER = "59177622635";
export const WHATSAPP_DISPLAY = "+591 77622635";
export const INSTAGRAM_URL = "https://instagram.com/wearezentro";
export const TIKTOK_URL = "https://tiktok.com/@wearezentro";
export const SOCIAL_HANDLE = "@wearezentro";

export const whatsappLink = (text: string) =>
  `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`;

interface Bullet {
  title: string;
  desc: string;
}

export interface LandingCopy {
  nav: {
    home: string;
    events: string;
    restaurants: string;
    experiences: string;
    present: string;
    exitPresent: string;
    cta: string;
    demo: string;
    slide: string;
  };
  hero: {
    kicker: string;
    title: string;
    subtitle: string;
    primary: string;
    secondary: string;
    stat: string;
    statDesc: string;
  };
  problem: {
    kicker: string;
    title: string;
    subtitle: string;
    items: string[];
    lossTitle: string;
    loss: string[];
  };
  what: {
    kicker: string;
    title: string;
    subtitle: string;
    items: string[];
  };
  unique: {
    kicker: string;
    title: string;
    equation: string[];
    result: string;
    body: string;
    bullets: Bullet[];
  };
  channels: {
    kicker: string;
    title: string;
    subtitle: string;
    items: Bullet[];
  };
  paths: {
    kicker: string;
    title: string;
    subtitle: string;
    events: { title: string; desc: string; price: string };
    restaurants: { title: string; desc: string; price: string };
    experiences: { title: string; desc: string; price: string };
    open: string;
  };
  flow: {
    kicker: string;
    title: string;
    subtitle: string;
    steps: string[];
  };
  lead: {
    kicker: string;
    title: string;
    subtitle: string;
    name: string;
    business: string;
    kind: string;
    kinds: { events: string; restaurant: string; experiences: string; other: string };
    phone: string;
    email: string;
    message: string;
    submit: string;
    sending: string;
    successTitle: string;
    successBody: string;
    error: string;
    whatsapp: string;
    required: string;
    invalidEmail: string;
  };
  closing: {
    title: string;
    subtitle: string;
    cta: string;
    demo: string;
  };
  events: {
    hero: { kicker: string; title: string; subtitle: string };
    features: Bullet[];
    pricing: { kicker: string; title: string; big: string; body: string; bullets: string[] };
    proof: { title: string; items: Bullet[] };
  };
  restaurants: {
    hero: { kicker: string; title: string; subtitle: string };
    features: Bullet[];
    plansTitle: string;
    plansSubtitle: string;
    plansNote: string;
    perDay: (bs: number) => string;
    faqTitle: string;
    faq: { q: string; a: string }[];
  };
  experiences: {
    hero: { kicker: string; title: string; subtitle: string };
    features: Bullet[];
    pricing: { kicker: string; title: string; big: string; body: string; bullets: string[] };
  };
  seo: {
    title: string;
    description: string;
  };
}

const es: LandingCopy = {
  nav: {
    home: "Zentro",
    events: "Eventos",
    restaurants: "Restaurantes",
    experiences: "Experiencias",
    present: "Modo presentación",
    exitPresent: "Salir",
    cta: "Crear mi cuenta Business",
    demo: "Agendar una demo",
    slide: "Diapositiva",
  },
  hero: {
    kicker: "Zentro para negocios",
    title: "El Pinterest de la vida social",
    subtitle:
      "Descubrimiento, ventas y datos en un solo lugar. Entradas, reservas, lounges y experiencias, con el algoritmo social que llena tu local.",
    primary: "Crear mi cuenta Business",
    secondary: "Agendar una demo",
    stat: "35%",
    statDesc:
      "de las ventas potenciales se pierden cada semana en boliches, restaurantes y eventos en LatAm, por falta de información en el momento correcto.",
  },
  problem: {
    kicker: "El problema",
    title: "Cada semana se te escapan ventas que ya estaban decididas",
    subtitle: "Y casi nunca te enterás de por qué.",
    items: [
      "Reservas de mesas manuales y llamadas que interrumpen el servicio",
      "Listas de invitados por WhatsApp",
      "Configuración lenta por cada evento",
      "Entradas, QRs y scanners de terceros",
      "Cero interacción en tiempo real con tu público",
      "Cero data de tus clientes",
    ],
    lossTitle: "Lo que se pierde",
    loss: ["Tiempo", "Dinero", "Información"],
  },
  what: {
    kicker: "Qué es Zentro",
    title: "Todo tu negocio social, en un solo lugar",
    subtitle:
      "La combinación perfecta entre una red social y un marketplace de experiencias. Zentro centraliza el descubrimiento, el ticketing y las reservas con un algoritmo social personalizado.",
    items: [
      "Analíticas y comportamiento de usuarios",
      "Ticketing y management de eventos",
      "Descubrimiento personalizado",
      "Reservas de mesas y lounges",
      "Management de RRPP",
      "Gestión de lista de invitados",
      "Pago inmediato por QR o tarjeta",
      "Interacción en tiempo real (push)",
      "Publicidad hiper-segmentada",
      "Cross-data y benchmarking de industria",
    ],
  },
  unique: {
    kicker: "Lo que nos hace únicos",
    title: "No somos una ticketera ni una página de reservas",
    equation: ["Red social", "Marketplace de experiencias"],
    result: "Ecosistema completo donde vive tu audiencia",
    body:
      "Cada interacción y cada compra alimentan el algoritmo: aprendemos gustos, hábitos y patrones de tu audiencia. Eso permite hiper-segmentación, y vender hasta un 35% más que en cualquier otra plataforma.",
    bullets: [
      {
        title: "Algoritmo propio",
        desc: "Tu publicación llega a la gente que realmente sale a lugares como el tuyo.",
      },
      {
        title: "Base de datos de clientes",
        desc: "Aprendé quiénes son, qué les gusta y a dónde más van.",
      },
      {
        title: "Cross-benchmarking",
        desc: "Compará tu rendimiento con el promedio y el top de tu ciudad.",
      },
      {
        title: "La capa social",
        desc: "Ver quién más va es parte de la decisión de compra. Eso vende.",
      },
    ],
  },
  channels: {
    kicker: "Dónde encaja Zentro",
    title: "TikTok, Instagram y Zentro no compiten: se complementan",
    subtitle: "Cada uno cumple un rol distinto en el camino de tu cliente hasta tu local.",
    items: [
      { title: "TikTok · Comunicación", desc: "Alcance masivo. Tu marca llega a gente que todavía no te conoce." },
      { title: "Instagram · Comunidad", desc: "Relación con tu público. Refuerza quién sos y por qué confiar en vos." },
      { title: "Zentro · Discovery, ventas y data", desc: "Donde esa atención se convierte en reserva, venta y datos reales." },
    ],
  },
  paths: {
    kicker: "Elegí tu caso",
    title: "¿Qué vendés vos?",
    subtitle: "Cada negocio usa Zentro distinto. Entrá al que sea tuyo.",
    events: {
      title: "Eventos y discotecas",
      desc: "Entradas con QR, lounges, guestlists, RRPP y notificaciones push.",
      price: "6% por entrada vendida",
    },
    restaurants: {
      title: "Restaurantes, cafés y bares",
      desc: "Reservas automáticas, menú digital, turnos y analíticas de sala.",
      price: "Desde Bs. 250/mes",
    },
    experiences: {
      title: "Experiencias",
      desc: "Tours, clases, catas y actividades con cupos, horarios y cobro anticipado.",
      price: "6% por cupo vendido",
    },
    open: "Ver detalle",
  },
  flow: {
    kicker: "La conversión",
    title: "De la foto a la venta, sin salir de la app",
    subtitle: "Tu cliente no pierde tiempo y vos no perdés la venta.",
    steps: ["Ve tu publicación", "Elige fecha y hora", "Personas y datos", "Paga por QR o tarjeta", "¡Listo!"],
  },
  lead: {
    kicker: "Hablemos",
    title: "Agendemos una demo",
    subtitle: "Dejanos tus datos y te escribimos por WhatsApp el mismo día.",
    name: "Tu nombre",
    business: "Nombre del negocio",
    kind: "Tipo de negocio",
    kinds: {
      events: "Eventos / discoteca",
      restaurant: "Restaurante, café o bar",
      experiences: "Experiencias",
      other: "Otro",
    },
    phone: "Teléfono / WhatsApp",
    email: "Email (opcional)",
    message: "Contanos qué necesitás (opcional)",
    submit: "Quiero una demo",
    sending: "Enviando…",
    successTitle: "¡Recibido!",
    successBody: "Te contactamos por WhatsApp en las próximas horas.",
    error: "No pudimos enviar tus datos. Escribinos por WhatsApp.",
    whatsapp: "Escribir por WhatsApp",
    required: "Completá nombre, negocio y teléfono.",
    invalidEmail: "Revisá el email.",
  },
  closing: {
    title: "¿Querés ser parte del primer ecosistema para la vida social de LatAm?",
    subtitle: "Creá tu cuenta Business en menos de un minuto, o hablemos primero.",
    cta: "Crear mi cuenta Business",
    demo: "Agendar una demo",
  },
  events: {
    hero: {
      kicker: "Zentro Events",
      title: "Vendé más entradas y manejá el evento completo",
      subtitle:
        "Ticketing, lounges, invitados y control de puerta en la misma app donde tu público ya descubre a dónde salir.",
    },
    features: [
      { title: "Entradas con QR", desc: "Tiers con precio, cupo y fecha límite de venta. El dinero llega a tu cuenta." },
      { title: "Control de ingreso", desc: "Escaneá y validá entradas en la puerta, sin scanners externos." },
      { title: "Lounges y mesas", desc: "Vendé áreas y mesas sobre el plano visual de tu local, con entradas incluidas." },
      { title: "Guestlists", desc: "Invitados y accesos especiales sin planillas ni grupos de WhatsApp." },
      { title: "Invitaciones masivas", desc: "Hasta 2000 invitaciones automáticas por categoría, con su propio QR." },
      { title: "RRPP y promotores", desc: "Links por promotor y ventas atribuidas a cada uno, en tiempo real." },
      { title: "Waiting list", desc: "Sumá gente antes de que salgan los precios y notificalos primero." },
      { title: "Notificaciones push", desc: "Hablale a todo tu público antes, durante y después del evento." },
      { title: "Analíticas y embudo", desc: "Impresiones, vistas, taps, checkouts y compras. Ritmo de venta por día." },
      { title: "Pagos QR y tarjeta", desc: "Cobro inmediato, sin plataformas de pago aparte." },
    ],
    pricing: {
      kicker: "Precio",
      title: "Un solo precio, por comisión de entradas vendidas",
      big: "6%",
      body: "de comisión de servicio sobre el total de entradas vendidas.",
      bullets: [
        "Sin costos de configuración ni cuotas mensuales",
        "Sin cargos escondidos: lo que ves es lo que pagás",
        "Tarifa preferencial para socios de alto volumen",
        "Pagos claros y puntuales por cada evento",
      ],
    },
    proof: {
      title: "Lo que cambia en la operación",
      items: [
        { title: "Configurás una vez", desc: "Tu plano, tus tiers y tus reglas quedan guardados para el próximo evento." },
        { title: "Todo en tiempo real", desc: "Ventas, lounges vendidos y check-in se actualizan solos en Gestión." },
        { title: "Sabés a quién le vendiste", desc: "Cada comprador queda en tu base, con su historial." },
      ],
    },
  },
  restaurants: {
    hero: {
      kicker: "Zentro para restaurantes",
      title: "Llená más mesas y entendé a tus clientes",
      subtitle:
        "Cada llamada perdida es una mesa vacía. Tu cliente reserva solo, en segundos, sin llamar y sin esperar confirmación.",
    },
    features: [
      { title: "Disponibilidad en tiempo real", desc: "Tus mesas, tus turnos y tu capacidad real, siempre al día." },
      { title: "Reservas en segundos", desc: "Confirmación automática, 24/7, también fuera de horario." },
      { title: "Recordatorios automáticos", desc: "Menos no-shows, sin que tu equipo tenga que perseguir a nadie." },
      { title: "Menú interactivo", desc: "Tu carta organizada y, según el plan, con foto de cada plato." },
      { title: "Contenido que vende", desc: "Publicaciones estilo Pinterest: de la foto a la reserva, sin salir de la app." },
      { title: "Analíticas de sala", desc: "Ocupación, horarios que más se llenan, cancelaciones, no-shows y clientes que vuelven." },
    ],
    plansTitle: "Elegí el plan que más te convenga",
    plansSubtitle: "Sin permanencia, sin comisión por reserva. Cambiás de plan cuando quieras.",
    plansNote:
      "Todos los eventos y experiencias con ticketing tienen 6% de comisión por entrada vendida.",
    perDay: (bs) => `unos Bs. ${Math.round(bs / 30)} por día`,
    faqTitle: "Preguntas frecuentes",
    faq: [
      { q: "¿Me cobran comisión por reserva?", a: "No. La mensualidad es lo único que pagás por las reservas." },
      { q: "¿Cómo se paga el plan?", a: "Con QR desde la app, mes a mes o 12 meses por adelantado con 5% de descuento." },
      { q: "¿Puedo cancelar cuando quiera?", a: "Sí. No hay permanencia ni penalidad: si no renovás, el plan simplemente termina." },
      { q: "¿Cuándo recibo el dinero de mis entradas?", a: "El cobro va directo a la cuenta bancaria que registrás, por cada venta." },
      { q: "¿Necesito comprar hardware?", a: "No. Todo funciona desde el celular de tu equipo: reservas, menú y escaneo de entradas." },
      { q: "¿Puedo probar sin publicar nada?", a: "Sí. Creás tu cuenta Business gratis, configurás todo y publicás cuando quieras." },
    ],
  },
  experiences: {
    hero: {
      kicker: "Zentro Experiencias",
      title: "Vendé experiencias con cupos, horarios y cobro anticipado",
      subtitle:
        "Tours, catas, clases, after office o cualquier actividad con lugares limitados: publicá una vez y vendé siempre.",
    },
    features: [
      { title: "Cupos y horarios", desc: "Definí días, turnos y capacidad. La disponibilidad se calcula sola." },
      { title: "Cobro anticipado", desc: "Cobrás al reservar, por QR o tarjeta, y bajás los no-shows a cero." },
      { title: "Preguntas al comprador", desc: "Pedí lo que necesites: alergias, talles, nivel, transporte." },
      { title: "Check-in con QR", desc: "Validá a cada asistente el día de la experiencia." },
      { title: "Fechas bloqueadas", desc: "Cerrá días sueltos sin desarmar tu configuración." },
      { title: "Data del público", desc: "Quién vino, quién repite y qué otras cosas le gustan." },
    ],
    pricing: {
      kicker: "Precio",
      title: "Solo pagás cuando vendés",
      big: "6%",
      body: "de comisión de servicio por cupo vendido.",
      bullets: [
        "Sin mensualidad ni costos de configuración",
        "Cobro directo a tu cuenta bancaria",
        "Sin cargos escondidos",
      ],
    },
  },
  seo: {
    title: "Zentro para negocios | Entradas, reservas y experiencias",
    description:
      "Zentro es el Pinterest de la vida social: descubrimiento, ticketing, reservas de mesas y lounges, y datos reales de tus clientes. 6% por entrada vendida o planes desde Bs. 250/mes.",
  },
};

const en: LandingCopy = {
  nav: {
    home: "Zentro",
    events: "Events",
    restaurants: "Restaurants",
    experiences: "Experiences",
    present: "Presentation mode",
    exitPresent: "Exit",
    cta: "Create my Business account",
    demo: "Book a demo",
    slide: "Slide",
  },
  hero: {
    kicker: "Zentro for business",
    title: "The Pinterest of social life",
    subtitle:
      "Discovery, sales and data in one place. Tickets, reservations, lounges and experiences, powered by the social algorithm that fills your venue.",
    primary: "Create my Business account",
    secondary: "Book a demo",
    stat: "35%",
    statDesc:
      "of potential sales are lost every week in clubs, restaurants and events across LatAm, because the right information never reaches people at the right time.",
  },
  problem: {
    kicker: "The problem",
    title: "Every week you lose sales that were already decided",
    subtitle: "And you rarely find out why.",
    items: [
      "Manual table bookings and calls that interrupt service",
      "Guest lists over WhatsApp",
      "Slow setup for every single event",
      "Third-party tickets, QRs and scanners",
      "Zero real-time interaction with your audience",
      "Zero data about your customers",
    ],
    lossTitle: "What you lose",
    loss: ["Time", "Money", "Information"],
  },
  what: {
    kicker: "What Zentro is",
    title: "Your whole social business, in one place",
    subtitle:
      "The perfect mix of a social network and an experience marketplace. Zentro centralises discovery, ticketing and reservations with a personalised social algorithm.",
    items: [
      "Analytics and user behaviour",
      "Event ticketing and management",
      "Personalised discovery",
      "Table and lounge reservations",
      "Promoter management",
      "Guest list management",
      "Instant payment by QR or card",
      "Real-time interaction (push)",
      "Hyper-segmented advertising",
      "Cross-data and industry benchmarking",
    ],
  },
  unique: {
    kicker: "What makes us different",
    title: "We're not a ticketing site or a booking page",
    equation: ["Social network", "Experience marketplace"],
    result: "A complete ecosystem where your audience already lives",
    body:
      "Every interaction and every purchase feeds the algorithm: we learn tastes, habits and patterns. That's what enables hyper-segmentation, and selling up to 35% more than on any other platform.",
    bullets: [
      { title: "Our own algorithm", desc: "Your post reaches people who actually go to places like yours." },
      { title: "Customer database", desc: "Learn who they are, what they like and where else they go." },
      { title: "Cross-benchmarking", desc: "Compare your performance with your city's average and top venues." },
      { title: "The social layer", desc: "Seeing who else is going is part of the decision. That sells." },
    ],
  },
  channels: {
    kicker: "Where Zentro fits",
    title: "TikTok, Instagram and Zentro don't compete: they complement each other",
    subtitle: "Each one plays a different role on your customer's way to your venue.",
    items: [
      { title: "TikTok · Reach", desc: "Massive reach. Your brand meets people who don't know you yet." },
      { title: "Instagram · Community", desc: "Relationship with your audience. It reinforces who you are." },
      { title: "Zentro · Discovery, sales and data", desc: "Where attention becomes a booking, a sale and real data." },
    ],
  },
  paths: {
    kicker: "Pick your case",
    title: "What do you sell?",
    subtitle: "Every business uses Zentro differently. Jump into yours.",
    events: {
      title: "Events and clubs",
      desc: "QR tickets, lounges, guest lists, promoters and push notifications.",
      price: "6% per ticket sold",
    },
    restaurants: {
      title: "Restaurants, cafés and bars",
      desc: "Automatic reservations, digital menu, shifts and floor analytics.",
      price: "From Bs. 250/month",
    },
    experiences: {
      title: "Experiences",
      desc: "Tours, classes, tastings and activities with slots, schedules and prepayment.",
      price: "6% per slot sold",
    },
    open: "See details",
  },
  flow: {
    kicker: "The conversion",
    title: "From the photo to the sale, without leaving the app",
    subtitle: "Your customer saves time and you don't lose the sale.",
    steps: ["Sees your post", "Picks date and time", "Party size and details", "Pays by QR or card", "Done!"],
  },
  lead: {
    kicker: "Let's talk",
    title: "Book a demo",
    subtitle: "Leave your details and we'll message you on WhatsApp the same day.",
    name: "Your name",
    business: "Business name",
    kind: "Business type",
    kinds: {
      events: "Events / club",
      restaurant: "Restaurant, café or bar",
      experiences: "Experiences",
      other: "Other",
    },
    phone: "Phone / WhatsApp",
    email: "Email (optional)",
    message: "Tell us what you need (optional)",
    submit: "I want a demo",
    sending: "Sending…",
    successTitle: "Got it!",
    successBody: "We'll contact you on WhatsApp within a few hours.",
    error: "We couldn't send your details. Message us on WhatsApp.",
    whatsapp: "Message us on WhatsApp",
    required: "Please fill in name, business and phone.",
    invalidEmail: "Please check the email.",
  },
  closing: {
    title: "Want to be part of the first ecosystem for LatAm social life?",
    subtitle: "Create your Business account in under a minute, or talk to us first.",
    cta: "Create my Business account",
    demo: "Book a demo",
  },
  events: {
    hero: {
      kicker: "Zentro Events",
      title: "Sell more tickets and run the whole event",
      subtitle:
        "Ticketing, lounges, guests and door control inside the same app where your audience already decides where to go out.",
    },
    features: [
      { title: "QR tickets", desc: "Tiers with price, capacity and sales deadline. Money lands in your account." },
      { title: "Door control", desc: "Scan and validate tickets at the door, no external scanners." },
      { title: "Lounges and tables", desc: "Sell areas and tables on your visual floor plan, with tickets included." },
      { title: "Guest lists", desc: "Guests and special access without spreadsheets or WhatsApp groups." },
      { title: "Bulk invitations", desc: "Up to 2000 automatic invitations by category, each with its own QR." },
      { title: "Promoters", desc: "Per-promoter links and attributed sales, in real time." },
      { title: "Waiting list", desc: "Collect demand before tickets go live and notify them first." },
      { title: "Push notifications", desc: "Talk to your whole audience before, during and after the event." },
      { title: "Analytics and funnel", desc: "Impressions, views, taps, checkouts and purchases. Daily sales pace." },
      { title: "QR and card payments", desc: "Instant collection, no separate payment platform." },
    ],
    pricing: {
      kicker: "Pricing",
      title: "One single price, a commission on tickets sold",
      big: "6%",
      body: "service commission on total tickets sold.",
      bullets: [
        "No setup costs, no monthly fees",
        "No hidden charges: what you see is what you pay",
        "Preferential rate for high-volume partners",
        "Clear, on-time payouts for every event",
      ],
    },
    proof: {
      title: "What changes in your operation",
      items: [
        { title: "Set it up once", desc: "Your floor plan, tiers and rules are saved for the next event." },
        { title: "Everything live", desc: "Sales, lounges sold and check-ins update themselves." },
        { title: "You know your buyers", desc: "Every buyer stays in your database, with their history." },
      ],
    },
  },
  restaurants: {
    hero: {
      kicker: "Zentro for restaurants",
      title: "Fill more tables and understand your guests",
      subtitle:
        "Every missed call is an empty table. Your guest books alone, in seconds, with no call and no waiting for confirmation.",
    },
    features: [
      { title: "Real-time availability", desc: "Your tables, shifts and real capacity, always up to date." },
      { title: "Bookings in seconds", desc: "Automatic confirmation, 24/7, even outside opening hours." },
      { title: "Automatic reminders", desc: "Fewer no-shows, without your team chasing anyone." },
      { title: "Interactive menu", desc: "Your menu organised and, depending on the plan, with a photo per dish." },
      { title: "Content that sells", desc: "Pinterest-style posts: from the photo to the booking, in-app." },
      { title: "Floor analytics", desc: "Occupancy, peak hours, cancellations, no-shows and returning guests." },
    ],
    plansTitle: "Choose the plan that fits you",
    plansSubtitle: "No lock-in, no commission per booking. Change plan whenever you want.",
    plansNote: "All ticketed events and experiences carry a 6% commission per ticket sold.",
    perDay: (bs) => `about Bs. ${Math.round(bs / 30)} per day`,
    faqTitle: "Frequently asked questions",
    faq: [
      { q: "Do you charge a commission per booking?", a: "No. The monthly plan is all you pay for reservations." },
      { q: "How do I pay for the plan?", a: "By QR in the app, monthly or 12 months upfront with a 5% discount." },
      { q: "Can I cancel anytime?", a: "Yes. No lock-in and no penalty: if you don't renew, the plan simply ends." },
      { q: "When do I get my ticket money?", a: "Payouts go straight to the bank account you register, per sale." },
      { q: "Do I need to buy hardware?", a: "No. Everything runs on your team's phones: bookings, menu and ticket scanning." },
      { q: "Can I try it without publishing?", a: "Yes. Create your Business account for free, set everything up and publish when ready." },
    ],
  },
  experiences: {
    hero: {
      kicker: "Zentro Experiences",
      title: "Sell experiences with slots, schedules and prepayment",
      subtitle:
        "Tours, tastings, classes, after office or any activity with limited spots: publish once and sell always.",
    },
    features: [
      { title: "Slots and schedules", desc: "Set days, shifts and capacity. Availability is calculated for you." },
      { title: "Prepayment", desc: "Charge at booking, by QR or card, and cut no-shows to zero." },
      { title: "Buyer questions", desc: "Ask for whatever you need: allergies, sizes, level, transport." },
      { title: "QR check-in", desc: "Validate every attendee on the day." },
      { title: "Blackout dates", desc: "Close single days without breaking your setup." },
      { title: "Audience data", desc: "Who came, who repeats and what else they like." },
    ],
    pricing: {
      kicker: "Pricing",
      title: "You only pay when you sell",
      big: "6%",
      body: "service commission per slot sold.",
      bullets: [
        "No monthly fee, no setup costs",
        "Payouts straight to your bank account",
        "No hidden charges",
      ],
    },
  },
  seo: {
    title: "Zentro for business | Tickets, reservations and experiences",
    description:
      "Zentro is the Pinterest of social life: discovery, ticketing, table and lounge reservations, and real customer data. 6% per ticket sold or plans from Bs. 250/month.",
  },
};

export const LANDING_COPY: Record<LandingLang, LandingCopy> = { es, en };
