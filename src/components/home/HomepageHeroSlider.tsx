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
  imagePosition?: string;
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
    <section className="relative min-h-[400px] overflow-hidden bg-slate-950 text-white lg:min-h-[410px]">
      {safeSlides.map((item, index) => (
        <div
          key={item.id}
          aria-hidden={index !== active}
          className={`absolute inset-0 transition-opacity duration-700 ${index === active ? "opacity-100" : "opacity-0"}`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={item.imageUrl} alt="" className="h-full w-full object-cover" style={{ objectPosition: item.imagePosition ?? "center" }} />
          <div className="absolute inset-0 bg-gradient-to-r from-[#061c3f] via-[#061c3f]/92 to-[#061c3f]/5" />
          <div className="absolute inset-y-0 right-0 w-1/4 bg-gradient-to-l from-[#061c3f]/10 to-transparent" />
        </div>
      ))}

      <div className="relative mx-auto flex min-h-[400px] max-w-[1380px] flex-col justify-center px-5 pb-20 pt-10 sm:px-8 lg:min-h-[410px] lg:px-12">
        <div className="max-w-2xl">
          <h1 className="max-w-[560px] text-[44px] font-black leading-[1.08] tracking-tight text-white drop-shadow-sm sm:text-[56px] lg:text-[58px]">
            {slide.title}
          </h1>
          {slide.subtitle ? <p className="mt-5 max-w-[520px] text-[20px] leading-8 text-white/92">{slide.subtitle}</p> : null}
          <div className="mt-7 flex flex-col gap-4 sm:flex-row">
            <Link href={slide.ctaHref} className="inline-flex h-12 items-center justify-center rounded-md bg-white px-8 text-[15px] font-black text-slate-950 shadow-xl shadow-slate-950/20 transition hover:bg-slate-100">
              {slide.ctaLabel}
            </Link>
            {slide.secondaryLabel && slide.secondaryHref ? (
              <Link href={slide.secondaryHref} className="inline-flex h-12 items-center justify-center gap-2 rounded-md border border-white/70 bg-white/5 px-8 text-[15px] font-black text-white transition hover:bg-white/15">
                {slide.secondaryLabel} <ArrowRight size={16} />
              </Link>
            ) : null}
          </div>
        </div>

        <div className="absolute bottom-6 left-5 flex items-center gap-3 sm:left-8 lg:left-12">
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
