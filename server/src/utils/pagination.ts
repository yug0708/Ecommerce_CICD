export type PaginationMeta = {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

export type PaginatedResult<T> = {
  items: T[];
  pagination: PaginationMeta;
};

export function buildPagination(page: number, limit: number, total: number): PaginationMeta {
  return {
    total,
    page,
    limit,
    totalPages: total === 0 ? 0 : Math.ceil(total / limit),
  };
}

export function paginated<T>(items: T[], page: number, limit: number, total: number): PaginatedResult<T> {
  return {
    items,
    pagination: buildPagination(page, limit, total),
  };
}
