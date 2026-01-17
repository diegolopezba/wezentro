interface MiniEventMarkerProps {
  imageUrl: string;
  isTonight: boolean;
  zoom: number;
}

// Calculate marker width based on zoom level
const getMarkerWidth = (zoom: number): number => {
  // Scale from 28px at zoom 1 to 64px at zoom 18
  const minSize = 28;
  const maxSize = 64;
  const minZoom = 1;
  const maxZoom = 18;
  
  const ratio = Math.min(Math.max((zoom - minZoom) / (maxZoom - minZoom), 0), 1);
  return Math.round(minSize + ratio * (maxSize - minSize));
};

export const createMiniEventMarkerElement = ({
  imageUrl,
  isTonight,
  zoom,
}: MiniEventMarkerProps): HTMLDivElement => {
  const container = document.createElement("div");
  container.className = "mini-event-marker";
  
  const width = getMarkerWidth(zoom);
  
  // Create card with dynamic height based on image aspect ratio
  container.innerHTML = `
    <div class="mini-event-card ${isTonight ? 'tonight' : ''}" style="width: ${width}px;">
      <img src="${imageUrl || '/placeholder.svg'}" alt="Event" />
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
      transform: translate(-50%, -50%);
    }
    
    .mini-event-card {
      position: relative;
      border-radius: 6px;
      overflow: hidden;
      box-shadow: 0 2px 12px rgba(0, 0, 0, 0.4);
      border: 2px solid hsl(240 5% 25%);
      transition: transform 0.15s ease, box-shadow 0.15s ease;
      background: hsl(240 5% 15%);
      line-height: 0;
    }
    
    .mini-event-card:hover {
      transform: scale(1.1);
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.5);
      z-index: 10;
    }
    
    .mini-event-card.tonight {
      border-color: hsl(351 100% 50%);
      box-shadow: 0 2px 12px rgba(227, 6, 64, 0.4);
    }
    
    .mini-event-card.tonight::before {
      content: '';
      position: absolute;
      inset: -3px;
      border-radius: 10px;
      background: hsl(351 100% 45% / 0.3);
      animation: pulse-glow 2s ease-in-out infinite;
      z-index: -1;
    }
    
    @keyframes pulse-glow {
      0%, 100% { opacity: 0.3; }
      50% { opacity: 0.7; }
    }
    
    .mini-event-card img {
      width: 100%;
      height: auto;
      display: block;
    }
  `;
  document.head.appendChild(style);
};
