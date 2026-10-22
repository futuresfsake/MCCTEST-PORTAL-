type PaginationProps = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onLimitChange: (limit: number) => void;
};

const PAGE_SIZES = [10, 20, 50];

export function Pagination({
  page,
  limit,
  total,
  totalPages,
  onPageChange,
  onLimitChange,
}: PaginationProps) {
  const start = total === 0 ? 0 : (page - 1) * limit + 1;
  const end = Math.min(page * limit, total);

  const pageNumbers: (number | 'ellipsis')[] = [];
  if (totalPages <= 5) {
    for (let i = 1; i <= totalPages; i++) pageNumbers.push(i);
  } else {
    pageNumbers.push(1);
    if (page > 3) pageNumbers.push('ellipsis');
    for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) {
      pageNumbers.push(i);
    }
    if (page < totalPages - 2) pageNumbers.push('ellipsis');
    pageNumbers.push(totalPages);
  }

  return (
    <div className="flex flex-col gap-4 border border-slate-200 bg-white px-5 py-3.5 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3 text-sm text-slate-500">
        <span>
          Showing <span className="font-semibold text-slate-900">{start}</span>–<span className="font-semibold text-slate-900">{end}</span> of <span className="font-semibold text-slate-900">{total}</span>
        </span>
        <span className="hidden h-4 w-px bg-slate-200 sm:block" />
        <span className="hidden items-center gap-1.5 sm:flex">
          <label htmlFor="page-size" className="text-xs text-slate-400">Rows</label>
          <select
            id="page-size"
            aria-label="Rows per page"
            value={limit}
            onChange={(event) => onLimitChange(Number(event.target.value))}
            className="border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-semibold text-slate-700 outline-none transition focus:border-blue-900"
          >
            {PAGE_SIZES.map((size) => <option key={size} value={size}>{size}</option>)}
          </select>
        </span>
      </div>

      <div className="flex items-center gap-1">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => onPageChange(1)}
          className="flex h-8 w-8 items-center justify-center border border-slate-200 bg-white text-xs text-slate-500 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-30"
          aria-label="First page"
        >
          <i className="fa-solid fa-angles-left text-[10px]" />
        </button>
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          className="flex h-8 w-8 items-center justify-center border border-slate-200 bg-white text-xs text-slate-500 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-30"
          aria-label="Previous page"
        >
          <i className="fa-solid fa-chevron-left text-[10px]" />
        </button>

        {pageNumbers.map((item, idx) =>
          item === 'ellipsis' ? (
            <span key={`e${idx}`} className="flex h-8 w-6 items-center justify-center text-xs text-slate-300">...</span>
          ) : (
            <button
              key={item}
              type="button"
              onClick={() => onPageChange(item)}
              className={`flex h-8 min-w-[2rem] items-center justify-center border px-2 text-xs font-semibold transition ${
                item === page
                  ? 'border-blue-900 bg-blue-900 text-white'
                  : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
              }`}
            >
              {item}
            </button>
          )
        )}

        <button
          type="button"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          className="flex h-8 w-8 items-center justify-center border border-slate-200 bg-white text-xs text-slate-500 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-30"
          aria-label="Next page"
        >
          <i className="fa-solid fa-chevron-right text-[10px]" />
        </button>
        <button
          type="button"
          disabled={page >= totalPages}
          onClick={() => onPageChange(totalPages)}
          className="flex h-8 w-8 items-center justify-center border border-slate-200 bg-white text-xs text-slate-500 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-30"
          aria-label="Last page"
        >
          <i className="fa-solid fa-angles-right text-[10px]" />
        </button>
      </div>
    </div>
  );
}
