import Link from "next/link";
import { Compass } from "lucide-react";

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-ink-100 bg-white">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-8 sm:flex-row sm:items-start sm:justify-between">
          <div className="max-w-sm">
            <div className="flex items-center gap-2 text-ink-900">
              <span className="flex size-8 items-center justify-center rounded-lg bg-ink-900 text-white">
                <Compass className="size-4" />
              </span>
              <span className="font-semibold tracking-tight">VOYAGE</span>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-ink-400">
              Conseiller de voyage intelligent : nous comparons météo, transport,
              hébergement et budget pour vous dire où partir.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-8 text-sm sm:gap-14">
            <div className="flex flex-col gap-2">
              <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-300">
                Explorer
              </p>
              <Link href="/search" className="text-ink-500 hover:text-ink-900">
                Rechercher
              </Link>
              <Link href="/favorites" className="text-ink-500 hover:text-ink-900">
                Mes favoris
              </Link>
              <Link href="/compare" className="text-ink-500 hover:text-ink-900">
                Comparateur
              </Link>
            </div>
            <div className="flex flex-col gap-2">
              <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-300">
                À propos
              </p>
              <span className="text-ink-500">Données de démonstration</span>
              <span className="text-ink-500">Version MVP</span>
            </div>
          </div>
        </div>

        <p className="mt-10 border-t border-ink-100 pt-6 text-xs leading-relaxed text-ink-300">
          Les prix, disponibilités et notes affichés sont simulés à des fins de
          démonstration. Les tendances climatiques s&apos;appuient sur des normales
          mensuelles : au-delà de 14 jours, aucune prévision météo n&apos;est fiable et
          l&apos;application l&apos;indique explicitement.
        </p>
      </div>
    </footer>
  );
}
