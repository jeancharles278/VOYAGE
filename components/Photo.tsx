"use client";

import Image from "next/image";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface PhotoProps {
  src: string;
  alt: string;
  className?: string;
  imageClassName?: string;
  sizes?: string;
  priority?: boolean;
  /** Contenu superposé (badges, titre...). */
  children?: React.ReactNode;
}

/**
 * Photo avec dégradé de repli. Le dégradé reste visible pendant le
 * chargement et sert d'illustration si l'image est indisponible : la
 * page ne présente donc jamais de bloc gris cassé.
 */
export function Photo({
  src,
  alt,
  className,
  imageClassName,
  sizes = "(max-width: 768px) 100vw, 33vw",
  priority,
  children,
}: PhotoProps) {
  const [status, setStatus] = useState<"loading" | "loaded" | "error">("loading");

  return (
    <div className={cn("photo-fallback relative overflow-hidden", className)}>
      {status !== "error" && (
        <Image
          src={src}
          alt={alt}
          fill
          sizes={sizes}
          priority={priority}
          unoptimized
          className={cn(
            "object-cover transition-all duration-700",
            status === "loaded" ? "scale-100 opacity-100" : "scale-105 opacity-0",
            imageClassName,
          )}
          onLoad={() => setStatus("loaded")}
          onError={() => setStatus("error")}
        />
      )}
      {children}
    </div>
  );
}
