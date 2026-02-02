import { WalkthroughStep } from "./generalSteps";

export const businessSteps: WalkthroughStep[] = [
  {
    id: "business-1",
    page: "/dashboard",
    title: "Dashboard de Negocios",
    message: "Tu Dashboard de Negocios: ve estadísticas de eventos, asistencia y conversión",
    position: "bottom",
  },
  {
    id: "business-2",
    page: "/dashboard",
    title: "Rendimiento",
    message: "Analiza el rendimiento de cada evento: solicitudes, aprobaciones y check-ins",
    position: "top",
  },
  {
    id: "business-3",
    page: "/event",
    title: "QR de Pago",
    message: "En tus eventos, puedes subir un QR de pago para vender tickets directamente",
    position: "top",
  },
  {
    id: "business-4",
    page: "/event",
    title: "Gestionar Lista",
    message: "Gestiona tu lista: aprueba solicitudes y confirma pagos de asistentes",
    position: "top",
  },
];
