import Link from "next/link";
import { Compass, MapPinOff } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-xl flex-col items-center px-4 py-24 text-center">
      <span className="flex size-14 items-center justify-center rounded-2xl bg-sand-100">
        <MapPinOff className="size-6 text-ink-400" />
      </span>
      <h1 className="mt-6 text-3xl font-semibold tracking-tight text-ink-900">
        Cette page n&apos;existe pas
      </h1>
      <p className="mt-3 leading-relaxed text-ink-500">
        La destination que vous cherchez n&apos;est pas (encore) dans notre catalogue.
      </p>
      <Button variant="primary" className="mt-8" asChild>
        <Link href="/">
          <Compass />
          Revenir à l&apos;accueil
        </Link>
      </Button>
    </div>
  );
}
