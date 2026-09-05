"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Building2,
  Hotel,
  Layers,
  MapPin,
  Plane,
  UtensilsCrossed,
  Waves,
  Ticket,
} from "lucide-react";
import type { Destination, PointOfInterest } from "@/types";
import { haversine } from "@/lib/geo";
import { getMapStyle } from "@/lib/mapStyle";
import { cn, formatDistance } from "@/lib/utils";
import "maplibre-gl/dist/maplibre-gl.css";

type Category = PointOfInterest["category"];

const CATEGORY_META: Record<
  Category,
  { label: string; color: string; icon: React.ComponentType<{ className?: string }> }
> = {
  hotel: { label: "Hôtels", color: "#2f6f9e", icon: Hotel },
  beach: { label: "Plages", color: "#0f9b8e", icon: Waves },
  center: { label: "Centre-ville", color: "#1e2536", icon: Building2 },
  restaurant: { label: "Restaurants", color: "#d2691e", icon: UtensilsCrossed },
  activity: { label: "Activités", color: "#7c5cbf", icon: Ticket },
  airport: { label: "Aéroport", color: "#4a5568", icon: Plane },
};

/** Filtres de proximité demandés dans le brief. */
const PROXIMITY_FILTERS = [
  { id: "beach500", label: "< 500 m de la plage" },
  { id: "center2000", label: "< 2 km du centre" },
  { id: "airport30", label: "< 30 min de l'aéroport" },
] as const;

type ProximityId = (typeof PROXIMITY_FILTERS)[number]["id"];

interface DestinationMapProps {
  destination: Destination;
  className?: string;
}

export function DestinationMap({ destination, className }: DestinationMapProps) {
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<{ remove: () => void } | null>(null);
  const markersRef = useRef<Array<{ remove: () => void }>>([]);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [categories, setCategories] = useState<Category[]>([
    "hotel",
    "beach",
    "center",
    "restaurant",
    "activity",
    "airport",
  ]);
  const [proximity, setProximity] = useState<ProximityId[]>([]);

  const config = useMemo(() => getMapStyle(), []);

  /** Références utilisées pour les filtres de proximité. */
  const anchors = useMemo(() => {
    const center = destination.poi.find((p) => p.category === "center") ?? {
      position: destination.position,
    };
    const airport = destination.poi.find((p) => p.category === "airport");
    const beaches = destination.poi.filter((p) => p.category === "beach");
    return { center, airport, beaches };
  }, [destination]);

  const visiblePoi = useMemo(() => {
    return destination.poi.filter((poi) => {
      if (!categories.includes(poi.category)) return false;
      // Les filtres de proximité ne s'appliquent qu'aux hébergements.
      if (poi.category !== "hotel" || proximity.length === 0) return true;

      return proximity.every((filter) => {
        if (filter === "beach500") {
          if (anchors.beaches.length === 0) return false;
          const nearest = Math.min(
            ...anchors.beaches.map((beach) => haversine(poi.position, beach.position)),
          );
          return nearest * 1000 <= 500;
        }
        if (filter === "center2000") {
          return haversine(poi.position, anchors.center.position) * 1000 <= 2000;
        }
        if (!anchors.airport) return false;
        // 30 min de route ≈ 25 km en périphérie urbaine.
        return haversine(poi.position, anchors.airport.position) <= 25;
      });
    });
  }, [destination.poi, categories, proximity, anchors]);

  /* ------------------------- Initialisation carte ------------------------ */
  useEffect(() => {
    let cancelled = false;
    if (!container.current) return;

    (async () => {
      try {
        const maplibre = await import("maplibre-gl");
        if (cancelled || !container.current) return;

        const map = new maplibre.Map({
          container: container.current,
          style: config.style as never,
          center: [destination.position.lng, destination.position.lat],
          zoom: 10.5,
          attributionControl: { compact: true },
        });
        map.addControl(new maplibre.NavigationControl({ showCompass: false }), "top-right");
        map.on("load", () => !cancelled && setReady(true));
        mapRef.current = map as unknown as { remove: () => void };
      } catch {
        // WebGL indisponible ou tuiles inaccessibles : on affiche le plan de repli.
        if (!cancelled) setFailed(true);
      }
    })();

    return () => {
      cancelled = true;
      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current = [];
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [destination.position.lat, destination.position.lng, config.style]);

  /* ---------------------------- Marqueurs -------------------------------- */
  useEffect(() => {
    if (!ready || !mapRef.current) return;
    let cancelled = false;

    (async () => {
      const maplibre = await import("maplibre-gl");
      if (cancelled || !mapRef.current) return;

      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current = visiblePoi.map((poi) => {
        const meta = CATEGORY_META[poi.category];
        const element = document.createElement("div");
        element.className = "voyage-marker";
        element.style.cssText = `width:26px;height:26px;border-radius:9999px;background:${meta.color};border:2.5px solid white;box-shadow:0 2px 8px rgba(15,23,42,.28);cursor:pointer;`;
        element.setAttribute("aria-label", poi.name);

        const popup = new maplibre.Popup({ offset: 18, closeButton: false }).setHTML(
          `<div style="font-family:inherit;max-width:200px">
             <strong style="display:block;font-size:13px;color:#111827">${escapeHtml(poi.name)}</strong>
             <span style="font-size:12px;color:#6b7280">${escapeHtml(poi.description ?? meta.label)}</span>
           </div>`,
        );

        return new maplibre.Marker({ element })
          .setLngLat([poi.position.lng, poi.position.lat])
          .setPopup(popup)
          .addTo(mapRef.current as never);
      });
    })();

    return () => {
      cancelled = true;
    };
  }, [ready, visiblePoi]);

  function toggleCategory(category: Category) {
    setCategories((current) =>
      current.includes(category)
        ? current.filter((c) => c !== category)
        : [...current, category],
    );
  }

  function toggleProximity(id: ProximityId) {
    setProximity((current) =>
      current.includes(id) ? current.filter((p) => p !== id) : [...current, id],
    );
  }

  return (
    <section
      className={cn(
        "overflow-hidden rounded-3xl border border-ink-100/70 bg-white shadow-soft",
        className,
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink-100 px-6 py-4">
        <h3 className="flex items-center gap-2 font-semibold tracking-tight text-ink-900">
          <Layers className="size-4 text-ink-400" />
          Carte de {destination.name}
        </h3>
        <span className="text-xs text-ink-400">
          {visiblePoi.length} point{visiblePoi.length > 1 ? "s" : ""} affiché
          {visiblePoi.length > 1 ? "s" : ""} · {config.attribution}
        </span>
      </div>

      {/* ------------------------------ Filtres ---------------------------- */}
      <div className="flex flex-col gap-3 border-b border-ink-100 px-6 py-4">
        <div className="flex flex-wrap gap-1.5">
          {(Object.keys(CATEGORY_META) as Category[]).map((category) => {
            const meta = CATEGORY_META[category];
            const active = categories.includes(category);
            const Icon = meta.icon;
            return (
              <button
                key={category}
                type="button"
                onClick={() => toggleCategory(category)}
                aria-pressed={active}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[13px] font-medium transition-all",
                  active
                    ? "border-transparent text-white shadow-soft"
                    : "border-ink-100 bg-white text-ink-500 hover:bg-sand-50",
                )}
                style={active ? { backgroundColor: meta.color } : undefined}
              >
                <Icon className="size-3.5" />
                {meta.label}
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap gap-1.5">
          {PROXIMITY_FILTERS.map(({ id, label }) => {
            const active = proximity.includes(id);
            return (
              <button
                key={id}
                type="button"
                onClick={() => toggleProximity(id)}
                aria-pressed={active}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[13px] font-medium transition-all",
                  active
                    ? "border-ink-900 bg-ink-900 text-white"
                    : "border-ink-100 bg-white text-ink-500 hover:bg-sand-50",
                )}
              >
                <MapPin className="size-3.5" />
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ------------------------------- Carte ----------------------------- */}
      <div className="relative">
        {failed ? (
          <StaticMapFallback destination={destination} poi={visiblePoi} />
        ) : (
          <>
            <div ref={container} className="h-[420px] w-full sm:h-[520px]" />
            {!ready && (
              <div className="absolute inset-0 flex items-center justify-center bg-sand-50">
                <div className="skeleton size-full" />
              </div>
            )}
          </>
        )}
      </div>

      {/* ------------------------------- Liste ----------------------------- */}
      <ul className="grid gap-px bg-ink-100 sm:grid-cols-2">
        {visiblePoi.slice(0, 8).map((poi) => {
          const meta = CATEGORY_META[poi.category];
          const distance = haversine(poi.position, destination.position) * 1000;
          return (
            <li key={poi.id} className="flex items-start gap-3 bg-white px-6 py-3.5">
              <span
                className="mt-1 size-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: meta.color }}
              />
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-ink-900">{poi.name}</p>
                <p className="truncate text-xs text-ink-400">
                  {meta.label} · à {formatDistance(distance)} du centre
                </p>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Plan schématique de repli, affiché si WebGL ou les tuiles ne sont pas
 * disponibles. Les positions réelles sont projetées dans le cadre.
 */
function StaticMapFallback({
  destination,
  poi,
}: {
  destination: Destination;
  poi: PointOfInterest[];
}) {
  const lats = poi.map((p) => p.position.lat).concat(destination.position.lat);
  const lngs = poi.map((p) => p.position.lng).concat(destination.position.lng);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  const spanLat = Math.max(0.01, maxLat - minLat);
  const spanLng = Math.max(0.01, maxLng - minLng);

  return (
    <div className="relative h-[420px] w-full bg-lagoon-50 sm:h-[520px]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,.9),transparent_55%)]" />
      {poi.map((point) => {
        const meta = CATEGORY_META[point.category];
        const left = ((point.position.lng - minLng) / spanLng) * 84 + 8;
        const top = (1 - (point.position.lat - minLat) / spanLat) * 84 + 8;
        return (
          <span
            key={point.id}
            title={point.name}
            className="absolute size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-soft"
            style={{ left: `${left}%`, top: `${top}%`, backgroundColor: meta.color }}
          />
        );
      })}
      <p className="absolute inset-x-0 bottom-4 text-center text-xs text-ink-400">
        Carte interactive indisponible — plan schématique des points d&apos;intérêt.
      </p>
    </div>
  );
}
