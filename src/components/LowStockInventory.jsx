import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { useGlobalContext } from './context/StockContextProvider';
import Papa from 'papaparse';
import { OVERWRITE_BASE_URL } from '../constant/index.js';

const PAGE_SIZE = 50;
const FETCH_BATCH_SIZE = 200; // Fetch 200 style numbers at a time

/* ── API Service ── */
const apiService = {
  async request(path, options = {}) {
    const res = await fetch(`${OVERWRITE_BASE_URL}${path}`, {
      headers: { 'Content-Type': 'application/json' },
      ...options,
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || json.success === false) {
      throw new Error(json.message || `Request failed (${res.status})`);
    }
    return json.data || json;
  },

  getStylesByNumbers(styleNumbers) {
    return this.request('/bulk-get', {
      method: 'POST',
      body: JSON.stringify({ style_numbers: styleNumbers }),
    });
  },
};

/* ── Normalise OMS CSV column names ────────────────────────
   OMS exports: "Item SkuCode" / "Item SKU Code" / "skucode"
─────────────────────────────────────────────────────────── */
const findSkuColumn = (headers) => {
  const candidates = ['item skucode', 'item sku code', 'sku code', 'skucode', 'sku'];
  return headers.find((h) => candidates.includes(h.toLowerCase().trim())) ?? null;
};

/* ── Build Map<styleNum, SKU[]> from the OMS SKU set ───────
   e.g. "24048" → ["24048-Red-XXS", "24048-Red-XS", …]
   Style number = everything before the first '-'
─────────────────────────────────────────────────────────── */
const buildOmsStyleMap = (skuSet) => {
  const map = new Map();
  for (const sku of skuSet) {
    const styleNum = sku.split('-')[0];
    if (!styleNum) continue;
    if (!map.has(styleNum)) map.set(styleNum, []);
    map.get(styleNum).push(sku);
  }
  return map;
};

/* ── Status badge helpers ───────────────────────────────── */
const getStockStatus = (stock) => {
  if (stock > 3)
    return {
      label: 'Low',
      color: 'bg-orange-100 text-orange-700 border-orange-200',
      dot: 'bg-orange-500',
    };
  if (stock > 1)
    return {
      label: 'Very Low',
      color: 'bg-red-100 text-red-700 border-red-200',
      dot: 'bg-red-500',
    };
  return { label: 'Critical', color: 'bg-red-200 text-red-900 border-red-300', dot: 'bg-red-700' };
};

/* ── CSV download helper ────────────────────────────────── */
const downloadCSV = (rows, filename) => {
  const csv = Papa.unparse(rows, { quotes: true, delimiter: ',', header: true });
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

/* ── Pagination ─────────────────────────────────────────── */
const Pagination = ({ currentPage, totalPages, onPageChange, totalItems, pageSize }) => {
  const start = (currentPage - 1) * pageSize + 1;
  const end = Math.min(currentPage * pageSize, totalItems);

  const pages = useMemo(() => {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
    const result = [];
    if (currentPage <= 4) {
      result.push(1, 2, 3, 4, 5, '…', totalPages);
    } else if (currentPage >= totalPages - 3) {
      result.push(
        1,
        '…',
        totalPages - 4,
        totalPages - 3,
        totalPages - 2,
        totalPages - 1,
        totalPages
      );
    } else {
      result.push(1, '…', currentPage - 1, currentPage, currentPage + 1, '…', totalPages);
    }
    return result;
  }, [currentPage, totalPages]);

  if (totalPages <= 1) return null;

  return (
    <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex flex-col sm:flex-row items-center justify-between gap-3">
      <p className="text-xs text-slate-500">
        Showing{' '}
        <span className="font-semibold text-slate-700">
          {start}–{end}
        </span>{' '}
        of <span className="font-semibold text-slate-700">{totalItems}</span> items
      </p>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="p-2 rounded-lg text-slate-500 hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
        </button>
        {pages.map((p, i) =>
          p === '…' ? (
            <span key={`ellipsis-${i}`} className="px-2 text-slate-400 text-sm">
              …
            </span>
          ) : (
            <button
              key={p}
              onClick={() => onPageChange(p)}
              className={`w-8 h-8 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                currentPage === p
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-200'
              }`}
            >
              {p}
            </button>
          )
        )}
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="p-2 rounded-lg text-slate-500 hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </div>
  );
};

/* ── Filter card ────────────────────────────────────────── */
const FilterCard = ({ label, count, sublabel, active, onClick, colorScheme }) => {
  const schemes = {
    red: {
      border: active
        ? 'border-red-500 ring-2 ring-red-400 ring-offset-2'
        : 'border-slate-200 hover:border-red-300',
      count: active ? 'text-red-600' : 'text-red-500',
      icon: active ? 'bg-red-600 text-white' : 'bg-red-100 text-red-600',
      check: 'text-red-600',
    },
    emerald: {
      border: active
        ? 'border-emerald-500 ring-2 ring-emerald-400 ring-offset-2'
        : 'border-slate-200 hover:border-emerald-300',
      count: active ? 'text-emerald-600' : 'text-emerald-500',
      icon: active ? 'bg-emerald-600 text-white' : 'bg-emerald-100 text-emerald-600',
      check: 'text-emerald-600',
    },
  };
  const s = schemes[colorScheme];

  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative w-full bg-white rounded-2xl border-2 p-5 text-left transition-all duration-200 shadow-sm cursor-pointer ${s.border}`}
    >
      {active && (
        <span className={`absolute top-3 right-3 ${s.check}`}>
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
              clipRule="evenodd"
            />
          </svg>
        </span>
      )}
      <div className="flex items-center gap-3">
        <div className={`p-2.5 rounded-xl flex-shrink-0 transition-colors ${s.icon}`}>
          {colorScheme === 'red' ? (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.35 16.5c-.77.833.192 2.5 1.732 2.5z"
              />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
              />
            </svg>
          )}
        </div>
        <div>
          <p
            className={`text-xs font-semibold uppercase tracking-wide ${active ? s.count : 'text-slate-400'}`}
          >
            {label}
          </p>
          <p className={`text-3xl font-bold mt-0.5 ${s.count}`}>{count}</p>
          <p className="text-xs text-slate-400 mt-0.5">{sublabel}</p>
        </div>
      </div>
    </button>
  );
};

/* ── Table row ──────────────────────────────────────────── */
const StockRow = ({ item, mode }) => {
  const status = getStockStatus(item.availableStock);
  const maxStock = mode === 'low' ? 5 : Math.max(item.availableStock, 100);
  const barPct = Math.min((item.availableStock / maxStock) * 100, 100);

  return (
    <tr className="hover:bg-slate-50 transition-colors">
      {mode === 'low' && (
        <td className="px-5 py-4 whitespace-nowrap">
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${status.color}`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
            {status.label}
          </span>
        </td>
      )}
      <td className="px-5 py-4 whitespace-nowrap">
        <p className="text-sm font-bold text-slate-800">#{item.fabricNumber}</p>
        <p className="text-xs text-slate-400 mt-0.5">{item.fabricName || '—'}</p>
      </td>
      <td className="px-5 py-4 whitespace-nowrap">
        <div className="flex items-center gap-2">
          <div className="w-20 h-1.5 bg-slate-200 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full ${mode === 'low' ? status.dot : 'bg-emerald-500'}`}
              style={{ width: `${barPct}%` }}
            />
          </div>
          <span className="text-sm font-bold text-slate-800">
            {Number(item.availableStock).toFixed(2)}
          </span>
          <span className="text-xs text-slate-400">MTR</span>
        </div>
      </td>
      <td className="px-5 py-4 whitespace-nowrap text-sm text-slate-600">
        {item.location || 'Main Warehouse'}
      </td>
      <td className="px-5 py-4">
        <div className="flex flex-wrap gap-1 max-w-xs">
          {item.styleNumbers?.length > 0 ? (
            <>
              {item.styleNumbers.slice(0, 3).map((s, idx) => (
                <span
                  key={idx}
                  className="bg-indigo-50 text-indigo-700 border border-indigo-100 px-2 py-0.5 rounded-lg text-xs font-medium"
                >
                  {s}
                </span>
              ))}
              {item.styleNumbers.length > 3 && (
                <span className="bg-slate-100 text-slate-500 px-2 py-0.5 rounded-lg text-xs">
                  +{item.styleNumbers.length - 3}
                </span>
              )}
            </>
          ) : (
            <span className="text-xs text-slate-400">No styles</span>
          )}
        </div>
      </td>
    </tr>
  );
};

/* ── OMS Upload Panel ───────────────────────────────────────
   Drag & drop or click-to-browse the OMS Simple Products CSV.
   Parses "Item SkuCode" column → builds omsStyleMap.
─────────────────────────────────────────────────────────── */
const OmsUploadPanel = ({ omsSkuSet, omsFileName, omsError, omsParsing, onUpload, onClear }) => {
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);

  const handleDrop = useCallback(
    (e) => {
      e.preventDefault();
      setDragging(false);
      const file = e.dataTransfer.files?.[0];
      if (file) onUpload(file);
    },
    [onUpload]
  );

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragging(true);
  };
  const handleDragLeave = () => setDragging(false);
  const handleFileChange = (e) => {
    const f = e.target.files?.[0];
    if (f) onUpload(f);
  };

  /* ── Loaded state ── */
  if (omsSkuSet.size > 0) {
    return (
      <div className="bg-white rounded-2xl border-2 border-violet-200 shadow-sm p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="bg-violet-100 p-2.5 rounded-xl flex-shrink-0">
              <svg
                className="w-5 h-5 text-violet-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <div>
              <p className="text-sm font-bold text-slate-800">OMS File Loaded</p>
              <p className="text-xs text-slate-500 mt-0.5 truncate max-w-xs">{omsFileName}</p>
              <div className="flex items-center gap-2 mt-1.5">
                <span className="bg-violet-100 text-violet-700 border border-violet-200 text-xs font-semibold px-2 py-0.5 rounded-full">
                  {omsSkuSet.size.toLocaleString()} SKUs loaded
                </span>
                <span className="text-xs text-slate-400">Source of truth active ✓</span>
              </div>
            </div>
          </div>
          <button
            onClick={onClear}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer flex-shrink-0"
            title="Remove OMS file"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
      </div>
    );
  }

  /* ── Parsing state ── */
  if (omsParsing) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex items-center gap-3">
        <div className="w-5 h-5 border-2 border-violet-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-slate-600 font-medium">
          Parsing OMS CSV — extracting Item SkuCodes…
        </p>
      </div>
    );
  }

  /* ── Upload state ── */
  return (
    <div className="bg-white rounded-2xl border-2 border-dashed border-slate-300 shadow-sm overflow-hidden">
      <div className="px-5 pt-4 pb-2 flex items-center gap-2">
        <div className="bg-violet-100 p-2 rounded-xl">
          <svg
            className="w-4 h-4 text-violet-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
            />
          </svg>
        </div>
        <div>
          <p className="text-sm font-bold text-slate-800">Upload OMS Simple Products CSV</p>
          <p className="text-xs text-slate-400">
            Required before export · SKUs pulled directly from this file
          </p>
        </div>
      </div>

      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => inputRef.current?.click()}
        className={`mx-5 mb-4 mt-1 rounded-xl border-2 border-dashed p-6 flex flex-col items-center justify-center gap-2 cursor-pointer transition-all ${
          dragging
            ? 'border-violet-500 bg-violet-50'
            : 'border-slate-200 hover:border-violet-400 hover:bg-violet-50/40'
        }`}
      >
        <div
          className={`p-3 rounded-full transition-colors ${dragging ? 'bg-violet-100' : 'bg-slate-100'}`}
        >
          <svg
            className={`w-6 h-6 ${dragging ? 'text-violet-600' : 'text-slate-400'}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
            />
          </svg>
        </div>
        <p className="text-sm font-semibold text-slate-700">
          {dragging ? 'Drop the CSV file here' : 'Drag & drop or click to browse'}
        </p>
        <p className="text-xs text-slate-400">Accepts .csv · must contain "Item SkuCode" column</p>
        <input
          ref={inputRef}
          type="file"
          accept=".csv"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>

      {omsError && (
        <div className="mx-5 mb-4 flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl p-3">
          <svg
            className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <p className="text-xs text-red-700 font-medium">{omsError}</p>
        </div>
      )}

      <div className="px-5 pb-4 flex flex-wrap gap-2">
        {[
          'Item SkuCode column required',
          'OMS Guru → Simple Products export',
          'All colors & sizes included',
        ].map((t) => (
          <span key={t} className="bg-slate-100 text-slate-500 text-xs px-2.5 py-1 rounded-full">
            {t}
          </span>
        ))}
      </div>
    </div>
  );
};

/* ── Main component ─────────────────────────────────────── */
const LowStockInventory = () => {
  const { stockLoading, stock } = useGlobalContext();

  /* ── OMS state ── */
  const [omsSkuSet, setOmsSkuSet] = useState(new Set());
  const [omsStyleMap, setOmsStyleMap] = useState(new Map());
  const [omsFileName, setOmsFileName] = useState('');
  const [omsError, setOmsError] = useState('');
  const [omsParsing, setOmsParsing] = useState(false);

  /* ── Overwrite styles state ── */
  const [overwriteStylesMap, setOverwriteStylesMap] = useState(new Map());
  const [overwriteLoading, setOverwriteLoading] = useState(false);
  const [overwriteError, setOverwriteError] = useState(null);
  const [overwriteLoaded, setOverwriteLoaded] = useState(false);

  /* ── UI state ── */
  const [exporting, setExporting] = useState(false);
  const [activeFilter, setActiveFilter] = useState('low');
  const [currentPage, setCurrentPage] = useState(1);

  /* ── Derived stock groups ── */
  const lowStockItems = useMemo(() => stock.filter((p) => p.availableStock < 5), [stock]);
  const safeStockItems = useMemo(() => stock.filter((p) => p.availableStock >= 5), [stock]);
  const criticalCount = useMemo(
    () => lowStockItems.filter((i) => i.availableStock <= 1).length,
    [lowStockItems]
  );

  const displayItems = activeFilter === 'low' ? lowStockItems : safeStockItems;
  const totalPages = Math.ceil(displayItems.length / PAGE_SIZE);
  const pagedItems = useMemo(
    () => displayItems.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE),
    [displayItems, currentPage]
  );

  const handleFilterChange = useCallback((filter) => {
    setActiveFilter(filter);
    setCurrentPage(1);
  }, []);

  /* ── Style → fabrics map ────────────────────────────────
     Tells us which fabrics are linked to each style number.
  ─────────────────────────────────────────────────────────*/
  const styleToFabricsMap = useMemo(() => {
    const map = new Map();
    for (const fabric of stock) {
      for (const styleNum of fabric.styleNumbers ?? []) {
        if (!map.has(styleNum)) map.set(styleNum, []);
        map.get(styleNum).push(fabric);
      }
    }
    return map;
  }, [stock]);

  /* ── Fetch overwrite styles for all unique style numbers ── */
  useEffect(() => {
    const fetchOverwriteStyles = async () => {
      const styleNumbers = Array.from(styleToFabricsMap.keys());

      if (styleNumbers.length === 0) {
        setOverwriteStylesMap(new Map());
        setOverwriteLoaded(true);
        return;
      }

      setOverwriteLoading(true);
      setOverwriteError(null);
      setOverwriteLoaded(false);

      try {
        // Process in batches of 200
        const batches = [];
        for (let i = 0; i < styleNumbers.length; i += FETCH_BATCH_SIZE) {
          batches.push(styleNumbers.slice(i, i + FETCH_BATCH_SIZE));
        }

        const allResults = [];
        for (const batch of batches) {
          try {
            const result = await apiService.getStylesByNumbers(batch);
            if (result.data && Array.isArray(result.data)) {
              allResults.push(...result.data);
            }
          } catch (err) {
            console.warn(`Failed to fetch styles for batch: ${batch}`, err);
          }
        }

        // Build map of style_number -> { isLive, isZero }
        const map = new Map();
        allResults.forEach((style) => {
          map.set(String(style.style_number), {
            isLive: style.isLive,
            isZero: style.isZero,
          });
        });

        setOverwriteStylesMap(map);
        setOverwriteLoaded(true);
      } catch (err) {
        setOverwriteError(err.message);
        setOverwriteLoaded(true);
        console.error('Error fetching overwrite styles:', err);
      } finally {
        setOverwriteLoading(false);
      }
    };

    fetchOverwriteStyles();
  }, [styleToFabricsMap]);

  /* ── OMS upload handler ─────────────────────────────────
     Parses the uploaded CSV, finds "Item SkuCode" column,
     extracts all SKUs into a Set, then groups by style number.
  ─────────────────────────────────────────────────────────*/
  const handleOMSUpload = useCallback((file) => {
    if (!file) return;
    setOmsError('');
    setOmsParsing(true);
    setOmsFileName(file.name);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const headers = results.meta.fields ?? [];
        const skuColumn = findSkuColumn(headers);

        if (!skuColumn) {
          setOmsError(`Could not find SKU column. Detected: ${headers.slice(0, 5).join(', ')}…`);
          setOmsParsing(false);
          return;
        }

        const skuSet = new Set(
          results.data.map((row) => String(row[skuColumn] ?? '').trim()).filter(Boolean)
        );

        if (skuSet.size === 0) {
          setOmsError('SKU column found but contains no values. Check the CSV file.');
          setOmsParsing(false);
          return;
        }

        const styleMap = buildOmsStyleMap(skuSet);
        setOmsSkuSet(skuSet);
        setOmsStyleMap(styleMap);
        setOmsParsing(false);
        console.log(`[OMS] ${skuSet.size} SKUs across ${styleMap.size} styles from "${skuColumn}"`);
      },
      error: (err) => {
        setOmsError(`CSV parse error: ${err.message}`);
        setOmsParsing(false);
      },
    });
  }, []);

  const handleOMSClear = useCallback(() => {
    setOmsSkuSet(new Set());
    setOmsStyleMap(new Map());
    setOmsFileName('');
    setOmsError('');
  }, []);

  /* ── Build combined CSV ─────────────────────────────────
     For every style number present in styleToFabricsMap:
       - Look up all SKUs from omsStyleMap (source of truth)
       - Check overwriteStylesMap for isLive/isZero status
       - VirtualStock = 100 if isLive === true (regardless of stock)
       - VirtualStock = 0   if isZero === true (regardless of stock)
       - If no overwrite status, use stock-based logic:
         * VirtualStock = 100 if ALL linked fabrics ≥ 5 MTR
         * VirtualStock = 0   if ANY linked fabric  < 5 MTR
     Styles not found in OMS file are skipped (with a warning).
  ─────────────────────────────────────────────────────────*/
  const buildCombinedCSVRows = useCallback(() => {
    if (omsStyleMap.size === 0) return [];
    const rows = [];

    for (const [styleNum, fabrics] of styleToFabricsMap) {
      const omsSkus = omsStyleMap.get(String(styleNum));
      if (!omsSkus || omsSkus.length === 0) {
        console.warn(`[SKU] Style "${styleNum}" not in OMS file — skipped`);
        continue;
      }

      // Check if we have overwrite status for this style
      const overwriteStatus = overwriteStylesMap.get(String(styleNum));
      let virtualStock;

      if (overwriteStatus) {
        // If isLive is true, VirtualStock = 100
        if (overwriteStatus.isLive === true) {
          virtualStock = 100;
        }
        // If isZero is true, VirtualStock = 0
        else if (overwriteStatus.isZero === true) {
          virtualStock = 0;
        }
        // If both are false or undefined, use stock-based logic
        else {
          virtualStock = fabrics.every((f) => f.availableStock >= 5) ? 100 : 0;
        }
      } else {
        // No overwrite status found, use stock-based logic
        virtualStock = fabrics.every((f) => f.availableStock >= 5) ? 100 : 0;
      }

      for (const sku of omsSkus) {
        rows.push({
          'DropshipWarehouseId*': 22784,
          'Item SkuCode': sku,
          VirtualStock: virtualStock,
        });
      }
    }
    return rows;
  }, [styleToFabricsMap, omsStyleMap, overwriteStylesMap]);

  /* ── Pre-compute row count for badge ── */
  const totalExportRows = useMemo(() => buildCombinedCSVRows().length, [buildCombinedCSVRows]);

  const omsLoaded = omsSkuSet.size > 0;

  const handleExport = useCallback(async () => {
    setExporting(true);
    try {
      const rows = buildCombinedCSVRows();
      if (rows.length === 0) {
        alert(
          'No matching OMS SKUs found. Check that style numbers in stock match those in the OMS file.'
        );
        return;
      }
      downloadCSV(rows, 'BulkUpdateVirtualStock.csv');
    } catch {
      /* silent */
    } finally {
      setTimeout(() => setExporting(false), 800);
    }
  }, [buildCombinedCSVRows]);

  /* ── Compute live/zero style counts from overwriteStylesMap ── */
  const liveStyleCount = useMemo(() => {
    let count = 0;
    for (const [, status] of overwriteStylesMap) {
      if (status.isLive === true) count++;
    }
    return count;
  }, [overwriteStylesMap]);

  const zeroStyleCount = useMemo(() => {
    let count = 0;
    for (const [, status] of overwriteStylesMap) {
      if (status.isZero === true) count++;
    }
    return count;
  }, [overwriteStylesMap]);

  /* ── Loading screen ── */
  if (stockLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-500 text-sm font-medium">Loading stock data…</p>
        </div>
      </div>
    );
  }

  const tableHeaders =
    activeFilter === 'low'
      ? ['Status', 'Fabric', 'Stock Level', 'Location', 'Style Numbers']
      : ['Fabric', 'Stock Level', 'Location', 'Style Numbers'];

  // Check if export should be disabled
  const isExportDisabled =
    exporting || !omsLoaded || stock.length === 0 || !overwriteLoaded || overwriteLoading;

  /* ── Render ── */
  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* ── Page header ── */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-600 text-white p-2.5 rounded-xl">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                />
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-800">Stock Inventory Management</h1>
              <p className="text-sm text-slate-500">Monitor and export fabric inventory levels</p>
            </div>
          </div>

          {/* Export button */}
          <div className="flex flex-wrap items-center gap-2">
            {!omsLoaded && (
              <div className="flex items-center gap-1.5 bg-amber-50 border border-amber-200 text-amber-700 text-xs font-semibold px-3 py-2 rounded-xl">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                Upload OMS file to enable export
              </div>
            )}
            {omsLoaded && !overwriteLoaded && (
              <div className="flex items-center gap-1.5 bg-blue-50 border border-blue-200 text-blue-700 text-xs font-semibold px-3 py-2 rounded-xl">
                <div className="w-3 h-3 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                Loading style statuses...
              </div>
            )}
            <button
              onClick={handleExport}
              disabled={isExportDisabled}
              title={
                !omsLoaded
                  ? 'Upload OMS Simple Products CSV first'
                  : !overwriteLoaded
                    ? 'Loading style statuses...'
                    : undefined
              }
              className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 rounded-xl shadow-sm shadow-indigo-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer"
            >
              {exporting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Exporting…
                </>
              ) : (
                <>
                  <DownloadIcon />
                  Export Bulk Update CSV
                  {omsLoaded && overwriteLoaded && <CountBadge>{totalExportRows} rows</CountBadge>}
                </>
              )}
            </button>
          </div>
        </div>

        {/* ── OMS Upload Panel ── */}
        <OmsUploadPanel
          omsSkuSet={omsSkuSet}
          omsFileName={omsFileName}
          omsError={omsError}
          omsParsing={omsParsing}
          onUpload={handleOMSUpload}
          onClear={handleOMSClear}
        />

        {/* ── Export summary (shown after OMS loaded) ── */}
        {omsLoaded && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
            <div className="flex items-start gap-3">
              <div className="bg-indigo-100 p-2 rounded-xl flex-shrink-0">
                <svg
                  className="w-4 h-4 text-indigo-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                  />
                </svg>
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-slate-800">Export Preview</p>
                {overwriteLoading ? (
                  <p className="text-xs text-slate-500 mt-1 flex items-center gap-2">
                    <div className="w-3 h-3 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                    Loading overwrite styles…
                  </p>
                ) : (
                  <>
                    <p className="text-xs text-slate-500 mt-0.5">
                      <span className="font-bold text-emerald-600">isLive</span> → VirtualStock 100
                      &nbsp;·&nbsp;
                      <span className="font-bold text-red-600">isZero</span> → VirtualStock 0
                      &nbsp;·&nbsp;
                      <span className="font-bold text-indigo-600">Default</span> → Stock-based (≥5
                      MTR = 100, &lt;5 MTR = 0)
                    </p>
                    <div className="flex flex-wrap gap-3 mt-2">
                      <span className="text-xs text-indigo-600 font-medium">
                        <span className="font-bold">{totalExportRows}</span> total rows in export
                      </span>
                      {!overwriteLoading && overwriteLoaded && (
                        <>
                          <span className="text-xs text-emerald-600 font-semibold">
                            {liveStyleCount} styles → VS=100 (isLive)
                          </span>
                          <span className="text-xs text-red-600 font-semibold">
                            {zeroStyleCount} styles → VS=0 (isZero)
                          </span>
                        </>
                      )}
                    </div>
                  </>
                )}
                {overwriteError && (
                  <p className="text-xs text-red-600 mt-1">
                    ⚠️ Error fetching overwrite styles: {overwriteError}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── Overview stats ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            {
              label: 'Total Fabrics',
              value: stock.length,
              border: 'border-indigo-500',
              text: 'text-indigo-600',
              d: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4',
            },
            {
              label: 'Low Stock',
              value: lowStockItems.length,
              border: 'border-red-500',
              text: 'text-red-600',
              d: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.35 16.5c-.77.833.192 2.5 1.732 2.5z',
            },
            {
              label: 'Critical ≤1 MTR',
              value: criticalCount,
              border: 'border-orange-500',
              text: 'text-orange-600',
              d: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z',
            },
            {
              label: 'Safe Stock',
              value: safeStockItems.length,
              border: 'border-emerald-500',
              text: 'text-emerald-600',
              d: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z',
            },
          ].map(({ label, value, border, text, d }) => (
            <div key={label} className={`bg-white rounded-2xl p-5 border-l-4 ${border} shadow-sm`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    {label}
                  </p>
                  <p className={`text-3xl font-bold mt-1 ${text}`}>{value}</p>
                </div>
                <div
                  className={`p-3 rounded-xl ${text.replace('text-', 'bg-').replace('-600', '-100')}`}
                >
                  <svg
                    className={`w-5 h-5 ${text}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={d} />
                  </svg>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* ── Filter cards ── */}
        <div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">
            Filter by Stock Type
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FilterCard
              label="Low Stock"
              count={lowStockItems.length}
              sublabel={`${criticalCount} critical · stock < 5 MTR`}
              active={activeFilter === 'low'}
              onClick={() => handleFilterChange('low')}
              colorScheme="red"
            />
            <FilterCard
              label="Safe Stock"
              count={safeStockItems.length}
              sublabel="Stock ≥ 5 MTR — healthy inventory"
              active={activeFilter === 'safe'}
              onClick={() => handleFilterChange('safe')}
              colorScheme="emerald"
            />
          </div>
        </div>

        {/* ── Table ── */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span
                className={`w-2.5 h-2.5 rounded-full animate-pulse ${activeFilter === 'low' ? 'bg-red-500' : 'bg-emerald-500'}`}
              />
              <h2 className="text-sm font-bold text-slate-800">
                {activeFilter === 'low' ? 'Low Stock Items' : 'Safe Stock Items'}
              </h2>
              <span
                className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${
                  activeFilter === 'low'
                    ? 'bg-red-50 text-red-700 border-red-200'
                    : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                }`}
              >
                {displayItems.length} items
              </span>
            </div>
            {activeFilter === 'low' && criticalCount > 0 && (
              <span className="text-xs font-semibold text-red-700 bg-red-50 border border-red-200 px-2 py-1 rounded-full">
                {criticalCount} critical
              </span>
            )}
          </div>

          {pagedItems.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-100">
                <thead>
                  <tr className="bg-slate-50">
                    {tableHeaders.map((h) => (
                      <th
                        key={h}
                        className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {pagedItems.map((item, i) => (
                    <StockRow key={`${item.fabricNumber}-${i}`} item={item} mode={activeFilter} />
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-center px-6">
              <div
                className={`p-5 rounded-2xl mb-4 ${activeFilter === 'low' ? 'bg-emerald-100' : 'bg-slate-100'}`}
              >
                <svg
                  className={`w-10 h-10 ${activeFilter === 'low' ? 'text-emerald-600' : 'text-slate-400'}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                  />
                </svg>
              </div>
              <p className="text-base font-bold text-slate-700">
                {activeFilter === 'low' ? 'All stock levels healthy' : 'No safe stock items'}
              </p>
              <p className="text-sm text-slate-400 mt-1">
                {activeFilter === 'low'
                  ? 'No fabrics below the 5 MTR threshold'
                  : 'No fabrics above the 5 MTR threshold'}
              </p>
            </div>
          )}

          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            totalItems={displayItems.length}
            pageSize={PAGE_SIZE}
          />
        </div>
      </div>
    </div>
  );
};

/* ── Tiny inline helpers ── */
const DownloadIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z"
    />
  </svg>
);
const CountBadge = ({ children }) => (
  <span className="bg-white/20 text-xs px-1.5 py-0.5 rounded-md ml-1">{children}</span>
);

export default LowStockInventory;
