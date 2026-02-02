import { WalkthroughStep } from "./generalSteps";

export const foodSteps: WalkthroughStep[] = [
  {
    id: "food-1",
    page: "/profile",
    title: "¡Bienvenido a Zentro Food!",
    message: "Toca aquí para gestionar tu menú y mostrarlo a tus clientes",
    position: "bottom",
  },
  {
    id: "food-2",
    page: "/profile",
    title: "Agregar Items",
    message: "Agrega items a tu menú con nombre, descripción y precio. Puedes reordenarlos después",
    position: "top",
  },
];
