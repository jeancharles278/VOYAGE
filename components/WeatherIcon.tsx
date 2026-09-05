import {
  Cloud,
  CloudDrizzle,
  CloudLightning,
  CloudSun,
  Snowflake,
  Sun,
} from "lucide-react";
import type { WeatherCondition } from "@/types";
import { cn } from "@/lib/utils";

const ICONS: Record<
  WeatherCondition,
  { icon: React.ComponentType<{ className?: string }>; color: string }
> = {
  sunny: { icon: Sun, color: "text-amber-500" },
  "partly-cloudy": { icon: CloudSun, color: "text-amber-400" },
  cloudy: { icon: Cloud, color: "text-ink-300" },
  rain: { icon: CloudDrizzle, color: "text-lagoon-500" },
  storm: { icon: CloudLightning, color: "text-lagoon-700" },
  snow: { icon: Snowflake, color: "text-lagoon-300" },
};

export function WeatherIcon({
  condition,
  className,
}: {
  condition: WeatherCondition;
  className?: string;
}) {
  const { icon: Icon, color } = ICONS[condition];
  return <Icon className={cn("size-4", color, className)} />;
}
