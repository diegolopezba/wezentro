import { useEffect } from "react";
import { getEventUrl } from "@/lib/shareLinks";

const ISO_BOB = "BOB";
const SCHEMA_CONTEXT = "https://schema.org";

export interface EventOfferInput {
  name?: string | null;
  price: number;
  url?: string;
  availability?: "InStock" | "SoldOut" | "PreOrder";
  validFrom?: string | null;
}

export interface EventSchemaInput {
  id: string;
  title?: string | null;
  description?: string | null;
  image_url?: string | null;
  start_datetime?: string | null;
  end_datetime?: string | null;
  location_name?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  is_public?: boolean | null;
  creator?: {
    id?: string | null;
    username?: string | null;
    full_name?: string | null;
  } | null;
  offers?: EventOfferInput[];
}

function buildPlace(event: EventSchemaInput) {
  if (!event.location_name) return undefined;

  const place: Record<string, unknown> = {
    "@type": "Place",
    name: event.location_name,
    address: {
      "@type": "PostalAddress",
      streetAddress: event.location_name,
      addressLocality: event.location_name,
      addressCountry: "BO",
    },
  };

  if (event.latitude != null && event.longitude != null) {
    place.geo = {
      "@type": "GeoCoordinates",
      latitude: event.latitude,
      longitude: event.longitude,
    };
  }

  return place;
}

function buildOffers(event: EventSchemaInput): Record<string, unknown>[] | undefined {
  const baseUrl = getEventUrl(event.id);
  const offers = event.offers?.length ? event.offers : [];

  if (offers.length === 0) return undefined;

  return offers.map((offer) => {
    const availability =
      offer.availability === "SoldOut"
        ? "https://schema.org/SoldOut"
        : offer.availability === "PreOrder"
        ? "https://schema.org/PreOrder"
        : event.is_public
        ? "https://schema.org/InStock"
        : "https://schema.org/SoldOut";

    return {
      "@type": "Offer",
      name: offer.name || undefined,
      price: offer.price.toFixed(2),
      priceCurrency: ISO_BOB,
      availability,
      url: offer.url || baseUrl,
      validFrom: offer.validFrom || event.start_datetime || undefined,
    };
  });
}

function buildEventSchema(event: EventSchemaInput) {
  const organizer = event.creator
    ? {
        "@type": "Organization",
        name: event.creator.full_name || event.creator.username || "Organizador",
        url: event.creator.id ? `https://zentro.today/user/${event.creator.id}` : undefined,
      }
    : undefined;

  const schema: Record<string, unknown> = {
    "@context": SCHEMA_CONTEXT,
    "@type": "Event",
    name: event.title || "Evento",
    description: event.description || undefined,
    startDate: event.start_datetime || undefined,
    endDate: event.end_datetime || undefined,
    eventStatus: "https://schema.org/EventScheduled",
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    url: getEventUrl(event.id),
    image: event.image_url || undefined,
    location: buildPlace(event),
    organizer,
    offers: buildOffers(event),
  };

  return schema;
}

/**
 * Injects JSON-LD Event schema into the document <head>.
 * Cleans up the previous script when the event id changes or the component unmounts.
 */
export const useEventStructuredData = (event: EventSchemaInput | null | undefined) => {
  useEffect(() => {
    if (!event?.id) return;

    const scriptId = `event-structured-data-${event.id}`;
    let script = document.getElementById(scriptId) as HTMLScriptElement | null;
    if (!script) {
      script = document.createElement("script");
      script.id = scriptId;
      script.type = "application/ld+json";
      document.head.appendChild(script);
    }

    script.textContent = JSON.stringify(buildEventSchema(event), null, 2);

    return () => {
      const el = document.getElementById(scriptId);
      if (el) el.remove();
    };
  }, [event]);
};
