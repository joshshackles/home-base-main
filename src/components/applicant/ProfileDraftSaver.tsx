"use client";

import { useEffect } from "react";

type DraftValue = string | boolean;
type DraftState = Record<string, DraftValue>;

function shouldTrack(element: Element): element is HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement {
  if (!(element instanceof HTMLInputElement || element instanceof HTMLSelectElement || element instanceof HTMLTextAreaElement)) return false;
  if (!element.name || element.type === "hidden" || element.type === "file" || element.type === "submit") return false;
  return true;
}

function readForm(form: HTMLFormElement) {
  const draft: DraftState = {};
  for (const element of Array.from(form.elements)) {
    if (!shouldTrack(element)) continue;
    draft[element.name] = element instanceof HTMLInputElement && element.type === "checkbox" ? element.checked : element.value;
  }
  return draft;
}

function restoreForm(form: HTMLFormElement, draft: DraftState) {
  for (const element of Array.from(form.elements)) {
    if (!shouldTrack(element) || !(element.name in draft)) continue;
    const value = draft[element.name];
    if (element instanceof HTMLInputElement && element.type === "checkbox") {
      element.checked = Boolean(value);
      continue;
    }
    if (typeof value === "string" && !element.value) element.value = value;
  }
}

export function ProfileDraftSaver({ storageKey }: { storageKey: string }) {
  useEffect(() => {
    const form = document.querySelector<HTMLFormElement>("[data-profile-draft-form]");
    if (!form) return;

    try {
      const raw = window.localStorage.getItem(storageKey);
      if (raw) restoreForm(form, JSON.parse(raw) as DraftState);
    } catch {
      window.localStorage.removeItem(storageKey);
    }

    const persist = () => {
      window.localStorage.setItem(storageKey, JSON.stringify(readForm(form)));
    };

    form.addEventListener("input", persist);
    form.addEventListener("change", persist);
    return () => {
      form.removeEventListener("input", persist);
      form.removeEventListener("change", persist);
    };
  }, [storageKey]);

  return null;
}
