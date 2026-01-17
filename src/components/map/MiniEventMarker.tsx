import { format } from "date-fns";
import { es } from "date-fns/locale";

interface MiniEventMarkerProps {
  title: string;
  imageUrl: string;
  startDatetime: string;
  isTonight: boolean;
}

export const createMiniEventMarkerElement = ({
  title,
  imageUrl,
  startDatetime,
  isTonight,
}: MiniEventMarkerProps): HTMLDivElement => {
  const container = document.createElement("div");
  container.className = "mini-event-marker";
  
  const formattedTime = format(new Date(startDatetime), "HH:mm", { locale: es });
  
  container.innerHTML = `
    <div class="mini-event-card ${isTonight ? 'tonight' : ''}">
      <div class="mini-event-image">
        <img src="${imageUrl || '/placeholder.svg'}" alt="${title}" />
      </div>
      <div class="mini-event-content">
        <p class="mini-event-title">${title || 'Evento'}</p>
        <span class="mini-event-time">${formattedTime}</span>
      </div>
    </div>
  `;
  
  return container;
};

// Inject styles once
let stylesInjected = false;

export const injectMiniMarkerStyles = () => {
  if (stylesInjected) return;
  stylesInjected = true;
  
  const style = document.createElement("style");
  style.textContent = `
    .mini-event-marker {
      cursor: pointer;
      transform: translate(-50%, -100%);
    }
    
    .mini-event-card {
      display: flex;
      align-items: center;
      gap: 8px;
      background: hsl(240 5% 12% / 0.95);
      backdrop-filter: blur(8px);
      border-radius: 12px;
      padding: 6px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
      border: 1px solid hsl(240 5% 20%);
      max-width: 160px;
      transition: transform 0.2s ease, box-shadow 0.2s ease;
    }
    
    .mini-event-card:hover {
      transform: scale(1.05);
      box-shadow: 0 6px 24px rgba(0, 0, 0, 0.5);
    }
    
    .mini-event-card.tonight {
      border-color: hsl(351 100% 45% / 0.6);
      box-shadow: 0 4px 20px rgba(227, 6, 64, 0.3);
    }
    
    .mini-event-card.tonight::before {
      content: '';
      position: absolute;
      inset: -2px;
      border-radius: 14px;
      background: hsl(351 100% 45% / 0.2);
      animation: pulse-glow 2s ease-in-out infinite;
      z-index: -1;
    }
    
    @keyframes pulse-glow {
      0%, 100% { opacity: 0.4; }
      50% { opacity: 0.8; }
    }
    
    .mini-event-image {
      width: 36px;
      height: 36px;
      border-radius: 8px;
      overflow: hidden;
      flex-shrink: 0;
      background: hsl(240 5% 20%);
    }
    
    .mini-event-image img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    
    .mini-event-content {
      flex: 1;
      min-width: 0;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    
    .mini-event-title {
      font-size: 11px;
      font-weight: 600;
      color: hsl(0 0% 95%);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      margin: 0;
      line-height: 1.2;
    }
    
    .mini-event-time {
      font-size: 10px;
      color: hsl(351 100% 55%);
      font-weight: 500;
    }
    
    /* Pointer/arrow at bottom */
    .mini-event-card::after {
      content: '';
      position: absolute;
      bottom: -6px;
      left: 50%;
      transform: translateX(-50%);
      width: 0;
      height: 0;
      border-left: 6px solid transparent;
      border-right: 6px solid transparent;
      border-top: 6px solid hsl(240 5% 12% / 0.95);
    }
  `;
  document.head.appendChild(style);
};
