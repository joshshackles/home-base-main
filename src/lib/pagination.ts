export const DEFAULT_PAGE_SIZE = 25;
export const LARGE_PAGE_SIZE = 50;

export type SearchParams = Record<string, string | string[] | undefined>;

export function getParam(searchParams: SearchParams | undefined, key: string) {
  const value = searchParams?.[key];
  return Array.isArray(value) ? value[0] : value;
}

export function getSearchQuery(searchParams: SearchParams | undefined) {
  return (getParam(searchParams, "q") ?? "").trim();
}

export function getFilter(searchParams: SearchParams | undefined, key: string) {
  const value = (getParam(searchParams, key) ?? "").trim();
  return value.length > 0 ? value : undefined;
}

export function getPagination(searchParams: SearchParams | undefined, pageSize = DEFAULT_PAGE_SIZE) {
  const rawPage = Number(getParam(searchParams, "page") ?? "1");
  const page = Number.isFinite(rawPage) && rawPage > 0 ? Math.floor(rawPage) : 1;
  const take = pageSize;
  const skip = (page - 1) * take;
  return { page, take, skip };
}

export function getPageCount(total: number, pageSize = DEFAULT_PAGE_SIZE) {
  return Math.max(1, Math.ceil(total / pageSize));
}

export function buildPageHref(pathname: string, searchParams: SearchParams | undefined, page: number) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(searchParams ?? {})) {
    if (key === "page") continue;
    if (Array.isArray(value)) {
      for (const item of value) if (item) params.append(key, item);
    } else if (value) {
      params.set(key, value);
    }
  }
  if (page > 1) params.set("page", String(page));
  const query = params.toString();
  return query ? `${pathname}?${query}` : pathname;
}
