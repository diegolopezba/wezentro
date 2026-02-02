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
    title: "Lista de Invitados",
    message: "Toca un evento para ver detalles. Si eres Zentro Premium, puedes ver quién va en la lista de invitados",
    position: "top",
  },
  {
    id: "general-3",
    page: "/event",
    title: "Únete",
    message: "Aquí puedes unirte a la lista de invitados o comprar tickets. Necesitas Zentro Premium para acceder",
    position: "top",
  },
  {
    id: "general-4",
    page: "/discover",
    title: "Mapa",
    message: "Explora eventos cerca de ti en el mapa interactivo",
    position: "bottom",
  },
  {
    id: "general-5",
    page: "/discover",
    title: "Filtros",
    message: "Filtra eventos por categoría: clubs, bares, restaurantes, cafés y más",
    position: "bottom",
  },
  {
    id: "general-6",
    page: "/create",
    title: "Crear",
    message: "Crea un **Evento** con fecha, ubicación y opción de lista de invitados, o un **Post** simple sin esos detalles",
    position: "bottom",
  },
];
