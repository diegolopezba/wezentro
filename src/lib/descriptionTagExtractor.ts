/**
 * Keyword-based description tag extraction for the recommendation engine.
 * Extracts semantic tags from event descriptions using a predefined dictionary.
 * No AI required — pure string matching with synonym/keyword groups.
 */

// Each tag maps to keywords that indicate that tag (Spanish + English)
const TAG_DICTIONARY: Record<string, string[]> = {
  // Vibe / Atmosphere
  "outdoor": ["outdoor", "aire libre", "terraza", "rooftop", "jardín", "jardin", "patio", "playa", "beach", "parque", "park"],
  "indoor": ["indoor", "interior", "salón", "salon", "cerrado", "venue"],
  "intimate": ["intimate", "íntimo", "intimo", "exclusivo", "exclusive", "privado", "private", "small", "pequeño"],
  "massive": ["massive", "masivo", "grande", "huge", "miles", "thousands", "multitud", "crowd", "festival"],
  "chill": ["chill", "relax", "tranquilo", "calm", "lounge", "casual", "laid back", "laid-back"],
  "high-energy": ["high energy", "energía", "energia", "wild", "loco", "intense", "intenso", "rager", "crazy"],
  
  // Music
  "electronic": ["electronic", "electrónica", "electronica", "techno", "house", "edm", "trance", "bass", "dubstep", "drum and bass"],
  "live-music": ["live music", "música en vivo", "musica en vivo", "live band", "banda en vivo", "acústico", "acustico", "acoustic"],
  "dj": ["dj", "disc jockey", "set", "mezcla", "mix", "spinning"],
  "hip-hop": ["hip hop", "hip-hop", "rap", "trap", "reggaeton", "reggaetón", "urbano", "urban"],
  "rock": ["rock", "indie", "alternative", "alternativo", "punk", "metal", "grunge"],
  "latin": ["latin", "latino", "latina", "salsa", "cumbia", "bachata", "merengue", "reggaeton", "reggaetón", "norteño", "banda"],
  "jazz": ["jazz", "blues", "swing", "soul", "funk"],
  
  // Food & Drink
  "cocktails": ["cocktail", "cóctel", "coctel", "mixología", "mixologia", "drinks", "bebidas", "spirits"],
  "wine": ["wine", "vino", "vineyard", "viñedo", "cata", "tasting", "sommelier"],
  "beer": ["beer", "cerveza", "craft", "artesanal", "brewery", "cervecería"],
  "brunch": ["brunch", "desayuno", "breakfast", "morning", "mañana"],
  "dinner": ["dinner", "cena", "gourmet", "fine dining", "degustación", "tasting menu"],
  "street-food": ["street food", "comida callejera", "food truck", "antojitos", "taco", "tacos"],
  
  // Activity
  "dancing": ["dance", "dancing", "bailar", "baile", "pista", "dance floor"],
  "networking": ["networking", "connect", "profesional", "professional", "business", "entrepreneur", "emprendedor"],
  "art": ["art", "arte", "gallery", "galería", "exposición", "exhibition", "museum", "museo", "pintura", "escultura"],
  "sports": ["sports", "deporte", "game", "partido", "match", "tournament", "torneo", "fitness", "gym"],
  "wellness": ["wellness", "bienestar", "yoga", "meditation", "meditación", "spa", "mindfulness", "health", "salud"],
  "comedy": ["comedy", "comedia", "stand up", "stand-up", "humor", "risa", "laugh"],
  "film": ["film", "cine", "movie", "película", "pelicula", "screening", "documental", "documentary"],
  "fashion": ["fashion", "moda", "runway", "pasarela", "designer", "diseñador", "style", "estilo"],
  "karaoke": ["karaoke", "sing", "cantar", "mic", "micrófono"],
  
  // Time / Context
  "after-hours": ["after hours", "after-hours", "afterhours", "madrugada", "late night", "hasta tarde", "all night", "toda la noche"],
  "sunset": ["sunset", "atardecer", "puesta de sol", "golden hour"],
  "daytime": ["daytime", "día", "dia", "afternoon", "tarde", "mediodía", "noon"],
  
  // Audience
  "21+": ["21+", "21 and over", "mayores de 21", "adults only", "solo adultos"],
  "all-ages": ["all ages", "todas las edades", "familiar", "family", "familia", "niños", "kids"],
  "lgbtq": ["lgbtq", "lgbt", "pride", "orgullo", "queer", "inclusive", "inclusivo", "drag"],
  
  // Special
  "free": ["free", "gratis", "gratuito", "sin costo", "no cover", "free entry", "entrada libre"],
  "vip": ["vip", "premium", "luxury", "lujo", "exclusivo", "bottle service", "reservado"],
  "charity": ["charity", "beneficencia", "causa", "fundraiser", "solidario", "donación", "donation"],
  "opening": ["opening", "inauguración", "inauguracion", "grand opening", "apertura", "launch", "lanzamiento"],
  "themed": ["themed", "temático", "tematico", "costume", "disfraz", "halloween", "navidad", "christmas", "new year", "año nuevo"],
};

/**
 * Extract tags from an event description using keyword matching.
 * Returns an array of matched tag identifiers.
 */
export const extractDescriptionTags = (
  description: string | null | undefined,
  title: string | null | undefined,
  category: string | null | undefined
): string[] => {
  if (!description && !title) return [];

  // Combine title + description for broader matching
  const text = [title, description].filter(Boolean).join(" ").toLowerCase();
  const matchedTags: string[] = [];

  for (const [tag, keywords] of Object.entries(TAG_DICTIONARY)) {
    for (const keyword of keywords) {
      if (text.includes(keyword)) {
        matchedTags.push(tag);
        break; // One match per tag is enough
      }
    }
  }

  // Also include the category itself as a tag if present
  if (category && !matchedTags.includes(category.toLowerCase())) {
    matchedTags.push(category.toLowerCase());
  }

  return matchedTags;
};
