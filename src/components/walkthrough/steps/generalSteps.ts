export type WalkthroughStep = {
  id: string;
  page: string;
  title: string;
  message: string;
  position: "top" | "bottom" | "left" | "right";
};

export const generalSteps: WalkthroughStep[] = [
  {
    id: "general-1",
    page: "/",
    title: "Para Ti",
    message: "Aquí encontrarás eventos personalizados basados en tus intereses y ubicación",
    position: "bottom",
  },
  {
    id: "general-2",
    page: "/",
    title: "Explora Eventos",
    message: "Toca un evento para ver detalles, unirte a la lista de invitados o comprar tickets",
    position: "top",
  },
  {
    id: "general-3",
    page: "/",
    title: "¡Eso es todo!",
    message: "Usa la barra inferior para descubrir eventos en el mapa, crear tus propios eventos y ver tu perfil. ¡Disfruta Zentro!",
    position: "top",
  },
];
