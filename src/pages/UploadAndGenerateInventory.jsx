import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import Papa from 'papaparse';

import { fetchCoordsStyleFromGoogleSheet } from '../service/GoogleSheet.services';

/* ─────────────────────────────────────────────────────────────────────────────
   Utility: find SKU column in OMS CSV
───────────────────────────────────────────────────────────────────────────── */
const findSkuColumn = (headers) => {
  const candidates = ['item skucode', 'item sku code', 'sku code', 'skucode', 'sku'];
  return headers.find((h) => candidates.includes(h.toLowerCase().trim())) ?? null;
};

/* ─────────────────────────────────────────────────────────────────────────────
   Utility: find style number column in uploaded Style Numbers CSV
───────────────────────────────────────────────────────────────────────────── */
const findStyleColumn = (headers) => {
  const candidates = [
    'style number',
    'style no',
    'style no.',
    'style_number',
    'style_no',
    'stylenumber',
    'styleno',
    'style',
    'article',
    'article no',
    'article number',
    'code',
    'product code',
    'item code',
  ];
  return headers.find((h) => candidates.includes(h.toLowerCase().trim())) ?? null;
};

/* ─────────────────────────────────────────────────────────────────────────────
   Build Map<styleNumber, SKU[]> from OMS SKU set
   e.g. "24048" → ["24048-Red-XXS", "24048-Red-XS", ...]
───────────────────────────────────────────────────────────────────────────── */
const buildOmsStyleMap = (skuSet) => {
  const map = new Map();
  for (const sku of skuSet) {
    const styleNum = sku.split('-')[0].trim();
    if (!styleNum) continue;
    if (!map.has(styleNum)) map.set(styleNum, []);
    map.get(styleNum).push(sku);
  }
  return map;
};

/* ─────────────────────────────────────────────────────────────────────────────
   CSV download helper
───────────────────────────────────────────────────────────────────────────── */
const downloadCSV = (rows, filename) => {
  const csv = Papa.unparse(rows, { quotes: true, delimiter: ',', header: true });
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.setAttribute('download', filename);
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

/* ─────────────────────────────────────────────────────────────────────────────
   UploadCard — reusable drag-and-drop / click upload area
───────────────────────────────────────────────────────────────────────────── */
const UploadCard = ({
  stepNum,
  title,
  subtitle,
  onUpload,
  accept = '.csv',
  accentColor = 'violet',
}) => {
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

  const accent = {
    violet: {
      iconBg: 'bg-violet-100',
      iconText: 'text-violet-600',
      hoverBorder: 'hover:border-violet-400 hover:bg-violet-50/40',
      activeBorder: 'border-violet-500 bg-violet-50',
      stepBg: 'bg-violet-600',
    },
    sky: {
      iconBg: 'bg-sky-100',
      iconText: 'text-sky-600',
      hoverBorder: 'hover:border-sky-400 hover:bg-sky-50/40',
      activeBorder: 'border-sky-500 bg-sky-50',
      stepBg: 'bg-sky-600',
    },
  }[accentColor];

  return (
    <div className="bg-white rounded-2xl border-2 border-dashed border-slate-300 shadow-sm overflow-hidden">
      <div className="px-5 pt-4 pb-2 flex items-center gap-3">
        <div
          className={`${accent.stepBg} text-white text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0`}
        >
          {stepNum}
        </div>
        <div>
          <p className="text-sm font-bold text-slate-800">{title}</p>
          <p className="text-xs text-slate-400">{subtitle}</p>
        </div>
      </div>
      <div
        onDrop={handleDrop}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onClick={() => inputRef.current?.click()}
        className={`mx-5 mb-5 mt-1 rounded-xl border-2 border-dashed p-6 flex flex-col items-center justify-center gap-2 cursor-pointer transition-all ${
          dragging ? accent.activeBorder + ' border-2' : `border-slate-200 ${accent.hoverBorder}`
        }`}
      >
        <div
          className={`p-3 rounded-full transition-colors ${dragging ? accent.iconBg : 'bg-slate-100'}`}
        >
          <svg
            className={`w-6 h-6 ${dragging ? accent.iconText : 'text-slate-400'}`}
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
          {dragging ? 'Drop file here' : 'Drag & drop or click to browse'}
        </p>
        <p className="text-xs text-slate-400">Accepts .csv files only</p>
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onUpload(f);
            e.target.value = '';
          }}
        />
      </div>
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────────────────────
   LoadedBadge — shown after a file is parsed successfully
───────────────────────────────────────────────────────────────────────────── */
const LoadedBadge = ({
  title,
  filename,
  meta,
  onClear,
  borderColor = 'border-violet-200',
  iconBg = 'bg-violet-100',
  iconText = 'text-violet-600',
}) => (
  <div className={`bg-white rounded-2xl border-2 ${borderColor} shadow-sm p-5`}>
    <div className="flex items-start justify-between gap-3">
      <div className="flex items-center gap-3">
        <div className={`${iconBg} p-2.5 rounded-xl flex-shrink-0`}>
          <svg
            className={`w-5 h-5 ${iconText}`}
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
          <p className="text-sm font-bold text-slate-800">{title}</p>
          <p className="text-xs text-slate-500 mt-0.5 truncate max-w-xs">{filename}</p>
          <div className="flex flex-wrap items-center gap-2 mt-1.5">
            {meta.map((m) => (
              <span
                key={m.label}
                className={`${m.bg ?? 'bg-violet-100'} ${m.text ?? 'text-violet-700'} ${m.border ?? 'border-violet-200'} border text-xs font-semibold px-2 py-0.5 rounded-full`}
              >
                {m.label}
              </span>
            ))}
          </div>
        </div>
      </div>
      <button
        onClick={onClear}
        className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer flex-shrink-0"
        title="Remove file"
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

/* ─────────────────────────────────────────────────────────────────────────────
   ErrorAlert
───────────────────────────────────────────────────────────────────────────── */
const ErrorAlert = ({ message }) => (
  <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl p-3">
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
    <p className="text-xs text-red-700 font-medium">{message}</p>
  </div>
);

/* ─────────────────────────────────────────────────────────────────────────────
   ParseSpinner
───────────────────────────────────────────────────────────────────────────── */
const ParseSpinner = ({ label }) => (
  <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex items-center gap-3">
    <div className="w-5 h-5 border-2 border-violet-600 border-t-transparent rounded-full animate-spin" />
    <p className="text-sm text-slate-600 font-medium">{label}</p>
  </div>
);

/* ─────────────────────────────────────────────────────────────────────────────
   MatchPreviewTable — shows matched / unmatched styles
   matchedStyles: Array<RegularMatch | CoordMatch>
     RegularMatch: { type: 'regular', styleNum: string, skus: string[] }
     CoordMatch:   { type: 'coord', styleNum: string, style1: string, style2: string, skus1: string[], skus2: string[] }
   unmatchedStyles: string[]
───────────────────────────────────────────────────────────────────────────── */
const SkuSampleCells = ({ skus }) => (
  <div className="flex flex-wrap gap-1 max-w-sm">
    {skus.slice(0, 3).map((s) => (
      <span key={s} className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-xs font-mono">
        {s}
      </span>
    ))}
    {skus.length > 3 && (
      <span className="bg-slate-100 text-slate-400 px-2 py-0.5 rounded text-xs">
        +{skus.length - 3} more
      </span>
    )}
  </div>
);

const MatchPreviewTable = ({ matchedStyles, unmatchedStyles }) => {
  const [showAll, setShowAll] = useState(false);
  const [tab, setTab] = useState('matched');

  const displayedItems =
    tab === 'matched'
      ? showAll
        ? matchedStyles
        : matchedStyles.slice(0, 10)
      : showAll
        ? unmatchedStyles
        : unmatchedStyles.slice(0, 10);

  const hasMore = tab === 'matched' ? matchedStyles.length > 10 : unmatchedStyles.length > 10;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Tabs */}
      <div className="flex border-b border-slate-100">
        <button
          onClick={() => {
            setTab('matched');
            setShowAll(false);
          }}
          className={`flex-1 px-4 py-3 text-xs font-semibold transition-colors ${
            tab === 'matched'
              ? 'text-emerald-700 border-b-2 border-emerald-500 bg-emerald-50'
              : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
          }`}
        >
          Matched Styles ({matchedStyles.length})
        </button>
        <button
          onClick={() => {
            setTab('unmatched');
            setShowAll(false);
          }}
          className={`flex-1 px-4 py-3 text-xs font-semibold transition-colors ${
            tab === 'unmatched'
              ? 'text-red-700 border-b-2 border-red-500 bg-red-50'
              : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
          }`}
        >
          Not in OMS ({unmatchedStyles.length})
        </button>
      </div>

      {displayedItems.length === 0 ? (
        <div className="py-10 text-center">
          <p className="text-sm text-slate-400">
            {tab === 'matched' ? 'No styles matched in OMS file.' : 'All styles found in OMS file.'}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-100">
            <thead>
              <tr className="bg-slate-50">
                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Style Number
                </th>
                {tab === 'matched' && (
                  <>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      SKU Count
                    </th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Sample SKUs
                    </th>
                  </>
                )}
                {tab === 'unmatched' && (
                  <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Status
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {tab === 'matched'
                ? displayedItems.map((item) => {
                    if (item.type === 'coord') {
                      // ── Coord style: parent row + 2 child rows ──────────────
                      const totalSkus = item.skus1.length + item.skus2.length;
                      return (
                        <React.Fragment key={item.styleNum}>
                          {/* Parent coord row */}
                          <tr className="bg-amber-50/60 hover:bg-amber-50 transition-colors">
                            <td className="px-5 py-3 whitespace-nowrap">
                              <div className="flex items-center gap-2">
                                <span className="bg-amber-100 text-amber-800 border border-amber-300 px-2.5 py-1 rounded-lg text-xs font-bold">
                                  {item.styleNum}
                                </span>
                                <span className="bg-amber-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
                                  COORD
                                </span>
                              </div>
                            </td>
                            <td className="px-5 py-3 whitespace-nowrap">
                              <span className="bg-amber-100 text-amber-700 text-xs font-semibold px-2 py-0.5 rounded-full border border-amber-200">
                                {totalSkus} SKUs total
                              </span>
                            </td>
                            <td className="px-5 py-3">
                              <span className="text-xs text-amber-700 font-medium">
                                Style1: {item.style1} · Style2: {item.style2}
                              </span>
                            </td>
                          </tr>
                          {/* Style1 child row */}
                          <tr className="bg-sky-50/40 hover:bg-sky-50 transition-colors">
                            <td className="px-5 py-3 whitespace-nowrap">
                              <div className="flex items-center gap-2 pl-4">
                                <span className="text-slate-400 text-sm">↳</span>
                                <span className="bg-sky-100 text-sky-700 border border-sky-200 px-2.5 py-1 rounded-lg text-xs font-bold">
                                  {item.style1}
                                </span>
                                <span className="bg-sky-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
                                  S1
                                </span>
                              </div>
                            </td>
                            <td className="px-5 py-3 whitespace-nowrap">
                              <span className="bg-sky-50 text-sky-700 text-xs font-semibold px-2 py-0.5 rounded-full border border-sky-200">
                                {item.skus1.length} SKUs
                              </span>
                            </td>
                            <td className="px-5 py-3">
                              <SkuSampleCells skus={item.skus1} />
                            </td>
                          </tr>
                          {/* Style2 child row */}
                          <tr className="bg-indigo-50/40 hover:bg-indigo-50 transition-colors">
                            <td className="px-5 py-3 whitespace-nowrap">
                              <div className="flex items-center gap-2 pl-4">
                                <span className="text-slate-400 text-sm">↳</span>
                                <span className="bg-indigo-100 text-indigo-700 border border-indigo-200 px-2.5 py-1 rounded-lg text-xs font-bold">
                                  {item.style2}
                                </span>
                                <span className="bg-indigo-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
                                  S2
                                </span>
                              </div>
                            </td>
                            <td className="px-5 py-3 whitespace-nowrap">
                              <span className="bg-indigo-50 text-indigo-700 text-xs font-semibold px-2 py-0.5 rounded-full border border-indigo-200">
                                {item.skus2.length} SKUs
                              </span>
                            </td>
                            <td className="px-5 py-3">
                              <SkuSampleCells skus={item.skus2} />
                            </td>
                          </tr>
                        </React.Fragment>
                      );
                    }

                    // ── Regular style row ────────────────────────────────────
                    return (
                      <tr key={item.styleNum} className="hover:bg-slate-50 transition-colors">
                        <td className="px-5 py-3 whitespace-nowrap">
                          <span className="bg-indigo-50 text-indigo-700 border border-indigo-100 px-2.5 py-1 rounded-lg text-xs font-bold">
                            {item.styleNum}
                          </span>
                        </td>
                        <td className="px-5 py-3 whitespace-nowrap">
                          <span className="bg-emerald-50 text-emerald-700 text-xs font-semibold px-2 py-0.5 rounded-full border border-emerald-200">
                            {item.skus.length} SKUs
                          </span>
                        </td>
                        <td className="px-5 py-3">
                          <SkuSampleCells skus={item.skus} />
                        </td>
                      </tr>
                    );
                  })
                : displayedItems.map((styleNum) => (
                    <tr key={styleNum} className="hover:bg-slate-50 transition-colors">
                      <td className="px-5 py-3 whitespace-nowrap">
                        <span className="bg-indigo-50 text-indigo-700 border border-indigo-100 px-2.5 py-1 rounded-lg text-xs font-bold">
                          {styleNum}
                        </span>
                      </td>
                      <td className="px-5 py-3 whitespace-nowrap">
                        <span className="bg-red-50 text-red-600 text-xs font-semibold px-2 py-0.5 rounded-full border border-red-200">
                          Not found in OMS
                        </span>
                      </td>
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>
      )}

      {hasMore && (
        <div className="px-5 py-3 border-t border-slate-100 bg-slate-50 text-center">
          <button
            onClick={() => setShowAll(!showAll)}
            className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors cursor-pointer"
          >
            {showAll
              ? 'Show less'
              : `Show all ${tab === 'matched' ? matchedStyles.length : unmatchedStyles.length} styles`}
          </button>
        </div>
      )}
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────────────────────
   Main Component — UploadAndGenerateInventory
───────────────────────────────────────────────────────────────────────────── */
const UploadAndGenerateInventory = () => {
  // ── OMS state ──────────────────────────────────────────────────────────────
  const [omsSkuSet, setOmsSkuSet] = useState(new Set());
  const [omsStyleMap, setOmsStyleMap] = useState(new Map());
  const [omsFileName, setOmsFileName] = useState('');
  const [omsError, setOmsError] = useState('');
  const [omsParsing, setOmsParsing] = useState(false);

  // ── Coords (Google Sheet) state ────────────────────────────────────────────
  const [coords, setCoords] = useState([]);

  // ── Style Numbers CSV state ────────────────────────────────────────────────
  const [styleNumbers, setStyleNumbers] = useState([]);
  const [styleFileName, setStyleFileName] = useState('');
  const [styleError, setStyleError] = useState('');
  const [styleParsing, setStyleParsing] = useState(false);
  const [detectedStyleColumn, setDetectedStyleColumn] = useState('');

  // ── Export state ───────────────────────────────────────────────────────────
  const [exportingZero, setExportingZero] = useState(false);
  const [exportingLive, setExportingLive] = useState(false);

  useEffect(() => {
    fetchCoordsStyleFromGoogleSheet()
      .then(setCoords)
      .catch(() => {});
  }, []);

  /* ── Build Map<coordStyle, {style1, style2}> from Google Sheet data ──── */
  const coordsMap = useMemo(() => {
    const map = new Map();
    for (const c of coords) {
      map.set(String(c.coordStyle).trim(), {
        style1: String(c.style1).trim(),
        style2: String(c.style2).trim(),
      });
    }
    return map;
  }, [coords]);

  const omsLoaded = omsSkuSet.size > 0;
  const stylesLoaded = styleNumbers.length > 0;
  const readyToExport = omsLoaded && stylesLoaded;

  /* ── Derived match data ──────────────────────────────────────────────────
     matchedStyles: Array<RegularMatch | CoordMatch>
       RegularMatch: { type: 'regular', styleNum: string, skus: string[] }
       CoordMatch:   { type: 'coord', styleNum: string, style1: string,
                       style2: string, skus1: string[], skus2: string[] }
     unmatchedStyles: string[]  (style numbers not found in OMS)
  ────────────────────────────────────────────────────────────────────────── */
  const { matchedStyles, unmatchedStyles, totalSkuRows } = useMemo(() => {
    if (!readyToExport) return { matchedStyles: [], unmatchedStyles: [], totalSkuRows: 0 };

    const matched = [];
    const unmatched = [];
    let skuCount = 0;

    for (const styleNum of styleNumbers) {
      const key = String(styleNum).trim();
      const coordEntry = coordsMap.get(key);

      if (coordEntry) {
        // ── Coord style: resolve to style1 + style2 ──────────────────────
        const skus1 = omsStyleMap.get(coordEntry.style1) ?? [];
        const skus2 = omsStyleMap.get(coordEntry.style2) ?? [];

        if (skus1.length > 0 || skus2.length > 0) {
          matched.push({
            type: 'coord',
            styleNum: key,
            style1: coordEntry.style1,
            style2: coordEntry.style2,
            skus1,
            skus2,
          });
          skuCount += skus1.length + skus2.length;
        } else {
          unmatched.push(key);
        }
      } else {
        // ── Regular style ─────────────────────────────────────────────────
        const skus = omsStyleMap.get(key);
        if (skus && skus.length > 0) {
          matched.push({ type: 'regular', styleNum: key, skus });
          skuCount += skus.length;
        } else {
          unmatched.push(key);
        }
      }
    }

    return { matchedStyles: matched, unmatchedStyles: unmatched, totalSkuRows: skuCount };
  }, [styleNumbers, omsStyleMap, readyToExport, coordsMap]);

  /* ── OMS upload handler ──────────────────────────────────────────────── */
  const handleOMSUpload = useCallback((file) => {
    if (!file) return;
    setOmsError('');
    setOmsParsing(true);
    setOmsFileName(file.name);
    setOmsSkuSet(new Set());
    setOmsStyleMap(new Map());

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const headers = results.meta.fields ?? [];
        const skuColumn = findSkuColumn(headers);

        if (!skuColumn) {
          setOmsError(`SKU column not found. Detected columns: ${headers.slice(0, 6).join(', ')}…`);
          setOmsParsing(false);
          return;
        }

        const skuSet = new Set(
          results.data.map((row) => String(row[skuColumn] ?? '').trim()).filter(Boolean)
        );

        if (skuSet.size === 0) {
          setOmsError('SKU column found but no values detected. Check your CSV file.');
          setOmsParsing(false);
          return;
        }

        const styleMap = buildOmsStyleMap(skuSet);
        setOmsSkuSet(skuSet);
        setOmsStyleMap(styleMap);
        setOmsParsing(false);
        console.log(
          `[OMS] ${skuSet.size} SKUs · ${styleMap.size} styles loaded from "${skuColumn}"`
        );
      },
      error: (err) => {
        setOmsError(`Parse error: ${err.message}`);
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

  /* ── Style Numbers CSV upload handler ────────────────────────────────── */
  const handleStyleUpload = useCallback((file) => {
    if (!file) return;
    setStyleError('');
    setStyleParsing(true);
    setStyleFileName(file.name);
    setStyleNumbers([]);
    setDetectedStyleColumn('');

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const headers = results.meta.fields ?? [];
        let styleColumn = findStyleColumn(headers);

        if (!styleColumn && headers.length === 1) styleColumn = headers[0];

        if (!styleColumn) {
          setStyleError(
            `Style number column not found. Detected columns: ${headers.slice(0, 6).join(', ')}. ` +
              `Expected: "Style Number", "Style No", "Style", "Article", "Code", etc.`
          );
          setStyleParsing(false);
          return;
        }

        const styles = [
          ...new Set(
            results.data.map((row) => String(row[styleColumn] ?? '').trim()).filter(Boolean)
          ),
        ];

        if (styles.length === 0) {
          setStyleError(`Column "${styleColumn}" found but contains no values.`);
          setStyleParsing(false);
          return;
        }

        setStyleNumbers(styles);
        setDetectedStyleColumn(styleColumn);
        setStyleParsing(false);
        console.log(`[Styles] ${styles.length} unique styles loaded from "${styleColumn}"`);
      },
      error: (err) => {
        setStyleError(`Parse error: ${err.message}`);
        setStyleParsing(false);
      },
    });
  }, []);

  const handleStyleClear = useCallback(() => {
    setStyleNumbers([]);
    setStyleFileName('');
    setStyleError('');
    setDetectedStyleColumn('');
  }, []);

  /* ── Build CSV rows from matched styles ──────────────────────────────────
     Coord styles: include SKUs from both style1 and style2 children
     Regular styles: include SKUs directly
  ────────────────────────────────────────────────────────────────────────── */
  const buildExportRows = useCallback(
    (virtualStock) => {
      const rows = [];
      for (const item of matchedStyles) {
        const skuList = item.type === 'coord' ? [...item.skus1, ...item.skus2] : item.skus;

        for (const sku of skuList) {
          rows.push({
            'DropshipWarehouseId*': 22784,
            'Item SkuCode': sku,
            VirtualStock: virtualStock,
          });
        }
      }
      return rows;
    },
    [matchedStyles]
  );

  /* ── Export handlers ─────────────────────────────────────────────────── */
  const handleExportZero = useCallback(async () => {
    if (!readyToExport || matchedStyles.length === 0) return;
    setExportingZero(true);
    try {
      const rows = buildExportRows(0);
      if (rows.length === 0) {
        alert('No matching OMS SKUs found.');
        return;
      }
      downloadCSV(rows, 'BulkUpdateVirtualStock.csv');
    } finally {
      setTimeout(() => setExportingZero(false), 800);
    }
  }, [readyToExport, matchedStyles, buildExportRows]);

  const handleExportLive = useCallback(async () => {
    if (!readyToExport || matchedStyles.length === 0) return;
    setExportingLive(true);
    try {
      const rows = buildExportRows(100);
      if (rows.length === 0) {
        alert('No matching OMS SKUs found.');
        return;
      }
      downloadCSV(rows, 'BulkUpdateVirtualStock.csv');
    } finally {
      setTimeout(() => setExportingLive(false), 800);
    }
  }, [readyToExport, matchedStyles, buildExportRows]);

  // Count coord styles for display
  const coordMatchCount = matchedStyles.filter((m) => m.type === 'coord').length;

  /* ── Render ──────────────────────────────────────────────────────────── */
  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* ── Header ────────────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-600 text-white p-2.5 rounded-xl">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-800">Upload and Generate Inventory</h1>
              <p className="text-sm text-slate-500">
                Upload style numbers and OMS data → generate inventory reports
              </p>
            </div>
          </div>

          {/* Export buttons */}
          <div className="flex flex-wrap gap-2">
            <a
              href="./zero_live_sample.csv"
              className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 rounded-xl shadow-sm shadow-blue-200 transition-all cursor-pointer"
            >
              Download Template
            </a>
            {!readyToExport && (
              <div className="flex items-center gap-1.5 bg-amber-50 border border-amber-200 text-amber-700 text-xs font-semibold px-3 py-2 rounded-xl">
                <svg
                  className="w-3.5 h-3.5 flex-shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                {!omsLoaded ? 'Upload OMS file first' : 'Upload style numbers file'}
              </div>
            )}
            <button
              onClick={handleExportZero}
              disabled={exportingZero || !readyToExport || matchedStyles.length === 0}
              className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 rounded-xl shadow-sm shadow-red-200 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
            >
              {exportingZero ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Exporting…
                </>
              ) : (
                <>
                  <DownloadIcon />
                  Zero Inventory{readyToExport && <CountBadge>{totalSkuRows}</CountBadge>}
                </>
              )}
            </button>
            <button
              onClick={handleExportLive}
              disabled={exportingLive || !readyToExport || matchedStyles.length === 0}
              className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 rounded-xl shadow-sm shadow-emerald-200 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
            >
              {exportingLive ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Exporting…
                </>
              ) : (
                <>
                  <DownloadIcon />
                  Live Inventory{readyToExport && <CountBadge>{totalSkuRows}</CountBadge>}
                </>
              )}
            </button>
          </div>
        </div>

        {/* ── Progress steps ─────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
          <div className="flex items-center gap-2">
            {[
              { num: 1, label: 'Upload OMS CSV', done: omsLoaded },
              { num: 2, label: 'Upload Style Numbers', done: stylesLoaded },
              { num: 3, label: 'Review Matches', done: readyToExport && matchedStyles.length > 0 },
              { num: 4, label: 'Export', done: false },
            ].map((step, idx, arr) => (
              <React.Fragment key={step.num}>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                      step.done
                        ? 'bg-emerald-500 text-white'
                        : (idx === 0 && !omsLoaded) ||
                            (idx === 1 && !stylesLoaded) ||
                            (idx >= 2 && !readyToExport)
                          ? 'bg-slate-100 text-slate-400 border-2 border-slate-200'
                          : 'bg-indigo-600 text-white'
                    }`}
                  >
                    {step.done ? (
                      <svg
                        className="w-3.5 h-3.5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={3}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    ) : (
                      step.num
                    )}
                  </div>
                  <span
                    className={`text-xs font-medium hidden sm:block ${step.done ? 'text-emerald-600' : 'text-slate-500'}`}
                  >
                    {step.label}
                  </span>
                </div>
                {idx < arr.length - 1 && (
                  <div
                    className={`flex-1 h-0.5 rounded-full transition-all ${step.done ? 'bg-emerald-400' : 'bg-slate-200'}`}
                  />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* ── Step 1: OMS Upload ─────────────────────────────────────────── */}
        {omsParsing ? (
          <ParseSpinner label="Parsing OMS CSV — extracting Item SKU Codes…" />
        ) : omsLoaded ? (
          <LoadedBadge
            title="OMS Simple Products — Loaded"
            filename={omsFileName}
            meta={[
              {
                label: `${omsSkuSet.size.toLocaleString()} SKUs`,
                bg: 'bg-violet-100',
                text: 'text-violet-700',
                border: 'border-violet-200',
              },
              {
                label: `${omsStyleMap.size} unique styles`,
                bg: 'bg-indigo-100',
                text: 'text-indigo-700',
                border: 'border-indigo-200',
              },
              {
                label: 'Source of truth active ✓',
                bg: 'bg-emerald-100',
                text: 'text-emerald-700',
                border: 'border-emerald-200',
              },
            ]}
            onClear={handleOMSClear}
            borderColor="border-violet-200"
            iconBg="bg-violet-100"
            iconText="text-violet-600"
          />
        ) : (
          <>
            <UploadCard
              stepNum={1}
              title="Upload OMS Simple Products CSV"
              subtitle="Download from OMS Guru → Simple Products. Contains all registered SKUs."
              onUpload={handleOMSUpload}
              accentColor="violet"
            />
            {omsError && <ErrorAlert message={omsError} />}
          </>
        )}

        {/* ── Step 2: Style Numbers CSV Upload ──────────────────────────── */}
        {styleParsing ? (
          <ParseSpinner label="Parsing style numbers CSV…" />
        ) : stylesLoaded ? (
          <LoadedBadge
            title="Style Numbers — Loaded"
            filename={styleFileName}
            meta={[
              {
                label: `${styleNumbers.length} unique styles`,
                bg: 'bg-sky-100',
                text: 'text-sky-700',
                border: 'border-sky-200',
              },
              {
                label: `Column: "${detectedStyleColumn}"`,
                bg: 'bg-slate-100',
                text: 'text-slate-600',
                border: 'border-slate-200',
              },
              ...(coordsMap.size > 0
                ? [
                    {
                      label: `${coordsMap.size} coord mappings loaded`,
                      bg: 'bg-amber-100',
                      text: 'text-amber-700',
                      border: 'border-amber-200',
                    },
                  ]
                : []),
            ]}
            onClear={handleStyleClear}
            borderColor="border-sky-200"
            iconBg="bg-sky-100"
            iconText="text-sky-600"
          />
        ) : (
          <>
            <UploadCard
              stepNum={2}
              title="Upload Style Numbers CSV"
              subtitle='CSV with a column named "Style Number", "Style No", "Style", "Article", or "Code".'
              onUpload={handleStyleUpload}
              accentColor="sky"
            />
            {styleError && <ErrorAlert message={styleError} />}
          </>
        )}

        {/* ── Step 3: Match summary + preview ───────────────────────────── */}
        {readyToExport && (
          <>
            {/* Summary cards */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {[
                {
                  label: 'Styles Requested',
                  value: styleNumbers.length,
                  bg: 'bg-indigo-50',
                  text: 'text-indigo-600',
                  border: 'border-indigo-200',
                },
                {
                  label: 'Matched in OMS',
                  value: matchedStyles.length,
                  bg: 'bg-emerald-50',
                  text: 'text-emerald-600',
                  border: 'border-emerald-200',
                },
                {
                  label: 'Coord Styles',
                  value: coordMatchCount,
                  bg: 'bg-amber-50',
                  text: 'text-amber-600',
                  border: 'border-amber-200',
                },
                {
                  label: 'Not in OMS',
                  value: unmatchedStyles.length,
                  bg: 'bg-red-50',
                  text: 'text-red-600',
                  border: 'border-red-200',
                },
                {
                  label: 'Total SKU Rows',
                  value: totalSkuRows,
                  bg: 'bg-violet-50',
                  text: 'text-violet-600',
                  border: 'border-violet-200',
                },
              ].map(({ label, value, bg, text, border }) => (
                <div key={label} className={`${bg} border ${border} rounded-2xl p-4 text-center`}>
                  <p className={`text-2xl font-bold ${text}`}>{value}</p>
                  <p className="text-xs text-slate-500 mt-1 font-medium">{label}</p>
                </div>
              ))}
            </div>

            {/* Export info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                {
                  label: 'Zero Inventory (VirtualStock = 0)',
                  rows: totalSkuRows,
                  bg: 'bg-red-50',
                  border: 'border-red-200',
                  text: 'text-red-700',
                  valueBg: 'bg-red-100',
                },
                {
                  label: 'Live Inventory (VirtualStock = 100)',
                  rows: totalSkuRows,
                  bg: 'bg-emerald-50',
                  border: 'border-emerald-200',
                  text: 'text-emerald-700',
                  valueBg: 'bg-emerald-100',
                },
              ].map(({ label, rows, bg, border, text, valueBg }) => (
                <div
                  key={label}
                  className={`${bg} border ${border} rounded-xl px-4 py-3 flex items-center justify-between`}
                >
                  <p className={`text-xs font-semibold ${text}`}>{label}</p>
                  <span
                    className={`${valueBg} ${text} border ${border} text-xs font-bold px-2.5 py-0.5 rounded-full`}
                  >
                    {rows} rows
                  </span>
                </div>
              ))}
            </div>

            {/* Match preview table */}
            {(matchedStyles.length > 0 || unmatchedStyles.length > 0) && (
              <MatchPreviewTable matchedStyles={matchedStyles} unmatchedStyles={unmatchedStyles} />
            )}

            {/* No matches warning */}
            {matchedStyles.length === 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 flex items-start gap-3">
                <svg
                  className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <div>
                  <p className="text-sm font-bold text-amber-800">No styles matched in OMS file</p>
                  <p className="text-xs text-amber-700 mt-1">
                    None of the {styleNumbers.length} style numbers were found in the OMS file.
                    Check that style numbers match exactly (e.g. "24048" not "024048").
                  </p>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

/* ── Tiny inline helpers ─────────────────────────────────────────────────── */
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
  <span className="bg-white/20 text-xs px-1.5 py-0.5 rounded-md font-bold">{children}</span>
);

export default UploadAndGenerateInventory;
