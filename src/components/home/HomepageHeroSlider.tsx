"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, Pause, Play } from "lucide-react";

export type HomepageHeroSlideView = {
  id: string;
  title: string;
  subtitle: string | null;
  ctaLabel: string;
  ctaHref: string;
  secondaryLabel: string | null;
  secondaryHref: string | null;
  imageAlt: string;
  imageUrl: string;
};

export function HomepageHeroSlider({ slides }: { slides: HomepageHeroSlideView[] }) {
  const safeSlides = useMemo(() => slides.length > 0 ? slides : [], [slides]);
  const [active, setActive] = useState(0);
  const [playing, setPlaying] = useState(true);
  const slide = safeSlides[active] ?? safeSlides[0];

  useEffect(() => {
    if (!playing || safeSlides.length <= 1) return;
    const timer = window.setInterval(() => setActive((value) => (value + 1) % safeSlides.length), 6500);
    return () => window.clearInterval(timer);
  }, [playing, safeSlides.length]);

  if (!slide) return null;

  return (
    <section className="relative min-h-[520px] overflow-hidden bg-slate-950 text-white lg:min-h-[590px]">
      {safeSlides.map((item, index) => (
        <div
          key={item.id}
          aria-hidden={index !== active}
          className={`absolute inset-0 transition-opacity duration-700 ${index === active ? "opacity-100" : "opacity-0"}`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={item.imageUrl} alt="" className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/82 to-slate-950/10" />
          <div className="absolute inset-x-0 bottom-0 h-36 bg-gradient-to-t from-white to-transparent" />
        </div>
      ))}

      <div className="relative mx-auto flex min-h-[520px] max-w-7xl flex-col justify-center px-4 py-14 sm:px-6 lg:min-h-[590px] lg:px-8">
        <div className="max-w-2xl">
          <h1 className="text-5xl font-black leading-[1.05] tracking-tight text-white drop-shadow-sm sm:text-6xl lg:text-7xl">
            {slide.title}
          </h1>
          {slide.subtitle ? <p className="mt-6 max-w-xl text-xl leading-8 text-white/90">{slide.subtitle}</p> : null}
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link href={slide.ctaHref} className="inline-flex items-center justify-center rounded-md bg-white px-7 py-4 text-sm font-black text-slate-950 shadow-xl shadow-slate-950/20 transition hover:bg-slate-100">
              {slide.ctaLabel}
            </Link>
            {slide.secondaryLabel && slide.secondaryHref ? (
              <Link href={slide.secondaryHref} className="inline-flex items-center justify-center gap-2 rounded-md border border-white/70 bg-white/5 px-7 py-4 text-sm font-black text-white transition hover:bg-white/15">
                {slide.secondaryLabel} <ArrowRight size={16} />
              </Link>
            ) : null}
          </div>
        </div>

        <div className="absolute bottom-16 left-4 flex items-center gap-3 sm:left-6 lg:left-8">
          <div className="flex rounded-full bg-white/15 p-1 backdrop-blur">
            {safeSlides.map((item, index) => (
              <button
                key={item.id}
                type="button"
                aria-label={`Show slide ${index + 1}: ${item.imageAlt}`}
                onClick={() => setActive(index)}
                className={`h-2.5 rounded-full transition-all ${index === active ? "w-8 bg-white" : "w-2.5 bg-white/50 hover:bg-white/80"}`}
              />
            ))}
          </div>
          {safeSlides.length > 1 ? (
            <button
              type="button"
              onClick={() => setPlaying((value) => !value)}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur hover:bg-white/25"
              aria-label={playing ? "Pause homepage image slider" : "Play homepage image slider"}
            >
              {playing ? <Pause size={15} /> : <Play size={15} />}
            </button>
          ) : null}
        </div>
      </div>
    </section>
  );
}
