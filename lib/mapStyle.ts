/**
 * Style de fond de carte.
 *
 * Sans clé, on utilise les tuiles OpenStreetMap : la carte fonctionne
 * immédiatement en local, sans compte ni token. Si `NEXT_PUBLIC_MAPBOX_TOKEN`
 * est défini, on bascule sur les tuiles Mapbox (rendu haut de gamme).
 */
export interface MapStyleConfig {
  style: Record<string, unknown>;
  attribution: string;
  provider: "mapbox" | "osm";
}

export function getMapStyle(): MapStyleConfig {
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

  if (token) {
    return {
      provider: "mapbox",
      attribution: "© Mapbox © OpenStreetMap",
      style: {
        version: 8,
        sources: {
          mapbox: {
            type: "raster",
            tiles: [
              `https://api.mapbox.com/styles/v1/mapbox/light-v11/tiles/512/{z}/{x}/{y}@2x?access_token=${token}`,
            ],
            tileSize: 512,
            attribution: "© Mapbox © OpenStreetMap",
          },
        },
        layers: [{ id: "mapbox", type: "raster", source: "mapbox" }],
      },
    };
  }

  return {
    provider: "osm",
    attribution: "© OpenStreetMap",
    style: {
      version: 8,
      sources: {
        osm: {
          type: "raster",
          tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
          tileSize: 256,
          maxzoom: 19,
          attribution: "© OpenStreetMap",
        },
      },
      layers: [{ id: "osm", type: "raster", source: "osm" }],
    },
  };
}
