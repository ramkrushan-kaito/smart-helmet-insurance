export type PageMeta = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export function pageArgs(page = 1, limit = 10) {
  const safePage = page < 1 ? 1 : page;
  const safeLimit = limit < 1 ? 10 : Math.min(limit, 100);
  return { page: safePage, limit: safeLimit, skip: (safePage - 1) * safeLimit, take: safeLimit };
}

export function pageResult<T>(data: T[], total: number, page: number, limit: number) {
  return {
    data,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    } satisfies PageMeta,
  };
}

export function sortField(requested: string | undefined, allowed: string[], fallback: string) {
  if (requested && allowed.includes(requested)) return requested;
  return fallback;
}
