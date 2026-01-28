interface DotMarkerProps {
  isTonight: boolean;
  zoom: number;
}

// Calculate marker size based on zoom level (8px to 14px)
const getMarkerSize = (zoom: number): number => {
  const minSize = 8;
  const maxSize = 14;
  const minZoom = 1;
  const maxZoom = 18;

  const ratio = Math.min(Math.max((zoom - minZoom) / (maxZoom - minZoom), 0), 1);
  return Math.round(minSize + ratio * (maxSize - minSize));
};

export const createDotMarkerElement = ({
  isTonight,
  zoom,
}: DotMarkerProps): HTMLDivElement => {
  const container = document.createElement("div");
  container.className = "event-dot-marker";

  const size = getMarkerSize(zoom);

  container.innerHTML = `
    <div class="event-dot ${isTonight ? "tonight" : ""}" 
         style="width: ${size}px; height: ${size}px;"></div>
  `;

  return container;
};

// Inject styles once
let stylesInjected = false;

export const injectDotMarkerStyles = () => {
  if (stylesInjected) return;
  stylesInjected = true;

  const style = document.createElement("style");
  style.textContent = `
    .event-dot-marker {
      cursor: pointer;
      transform: translate(-50%, -50%);
    }
    
    .event-dot {
      background-color: hsl(351, 100%, 50%);
      border-radius: 50%;
      box-shadow: 0 2px 8px rgba(230, 0, 35, 0.4);
      border: 2px solid rgba(255, 255, 255, 0.3);
      transition: transform 0.15s ease, box-shadow 0.15s ease;
    }
    
    .event-dot:hover {
      transform: scale(1.3);
      box-shadow: 0 3px 12px rgba(230, 0, 35, 0.6);
      z-index: 10;
    }
    
    .event-dot.tonight {
      box-shadow: 0 0 12px rgba(230, 0, 35, 0.6);
      animation: pulse-dot 2s ease-in-out infinite;
    }
    
    @keyframes pulse-dot {
      0%, 100% { 
        box-shadow: 0 0 8px rgba(230, 0, 35, 0.4);
        transform: scale(1);
      }
      50% { 
        box-shadow: 0 0 16px rgba(230, 0, 35, 0.8);
        transform: scale(1.15);
      }
    }
  `;
  document.head.appendChild(style);
};

// Keep legacy exports for backwards compatibility (if needed elsewhere)
export const createMiniEventMarkerElement = createDotMarkerElement;
export const injectMiniMarkerStyles = injectDotMarkerStyles;
