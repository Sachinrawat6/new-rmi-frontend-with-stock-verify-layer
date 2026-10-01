import React, { useEffect, useMemo, useState } from 'react';
import { useGlobalContext } from './context/StockContextProvider';
import { Link } from 'react-router-dom';
import {
  fetchFabricNoFromFabricAverageSheet,
  fetchFabricNoFromStylwise,
} from '../service/GoogleSheet.services';
import axios from 'axios';

import { BASE_URL } from '../constant/index.js';

const RESULT_VISIBLE_MS = 5000;

/* ---------- small presentational helpers ---------- */

const Spinner = ({ className = 'h-10 w-10' }) => (
  <div
    className={`animate-spin rounded-full border-2 border-slate-200 border-t-teal-700 ${className}`}
  />
);

const StatBox = ({ label, value, tone = 'slate' }) => {
  const tones = {
    slate: 'border-slate-200 bg-white text-slate-900',
    teal: 'border-teal-200 bg-teal-50 text-teal-900',
    amber: 'border-amber-200 bg-amber-50 text-amber-900',
  };
  return (
    <div className={`rounded-lg border px-4 py-3 ${tones[tone]}`}>
      <div className="text-2xl font-semibold tabular-nums">{value ?? 0}</div>
      <div className="text-xs text-slate-600 mt-0.5">{label}</div>
    </div>
  );
};

const EyeIcon = ({ className = 'w-4 h-4' }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
    />
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
    />
  </svg>
);

/* ---------- custom confirm modal (no shadow) ---------- */

const ConfirmModal = ({ open, recordCount, loading, onCancel, onConfirm }) => {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === 'Escape' && !loading) onCancel();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, loading, onCancel]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50"
      onClick={() => !loading && onCancel()}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="upsert-title"
        className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
              />
            </svg>
          </div>
          <div>
            <h2 id="upsert-title" className="text-lg font-semibold text-slate-900">
              Upsert fabric numbers?
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              {recordCount} style record{recordCount === 1 ? '' : 's'} from the Google Sheet will be
              sent to the database. Existing data for matching styles will be overwritten.
            </p>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onCancel}
            disabled={loading}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-lg bg-teal-700 px-4 py-2 text-sm font-medium text-white hover:bg-teal-800 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {loading && (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
            )}
            {loading ? 'Upserting…' : 'Upsert records'}
          </button>
        </div>
      </div>
    </div>
  );
};

/* ---------- result banner (auto hides after 5 seconds) ---------- */

const UpsertResultBanner = ({ result, onClose }) => {
  if (!result) return null;
  const isError = result.type === 'error';

  return (
    <div
      role="status"
      className={`relative mb-6 overflow-hidden rounded-xl border p-5 ${
        isError ? 'border-red-200 bg-red-50' : 'border-teal-200 bg-teal-50'
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h3 className={`font-semibold ${isError ? 'text-red-900' : 'text-teal-900'}`}>
            {isError ? 'Upsert failed' : 'Upsert completed'}
          </h3>
          <p className={`mt-0.5 text-sm ${isError ? 'text-red-700' : 'text-teal-800'}`}>
            {isError
              ? result.message
              : result.message || 'Fabric numbers were saved to the database.'}
          </p>
        </div>
        <button
          onClick={onClose}
          aria-label="Dismiss"
          className="rounded-md p-1 text-slate-500 hover:bg-white/70 hover:text-slate-800"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>

      {!isError && (
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatBox label="Records sent" value={result.sent} />
          <StatBox label="Matched" value={result.matchedCount} tone="teal" />
          <StatBox label="Modified" value={result.modifiedCount} tone="teal" />
          <StatBox label="Newly added" value={result.upsertedCount} tone="amber" />
        </div>
      )}

      {/* countdown bar */}
      <div className="absolute bottom-0 left-0 h-1 w-full bg-transparent">
        <div
          className={`h-full origin-left ${isError ? 'bg-red-400' : 'bg-teal-600'}`}
          style={{ animation: `shrinkBar ${RESULT_VISIBLE_MS}ms linear forwards` }}
        />
      </div>
      <style>{`@keyframes shrinkBar { from { width: 100%; } to { width: 0%; } }`}</style>
    </div>
  );
};

/* ---------- main page ---------- */

const StyleNumber = () => {
  const { styleNumber, styleLoading } = useGlobalContext();
  const [fabricAvgSheetFabricNo, setFabricAvgSheetFabricNo] = useState([]);
  const [stylewiseSheetFabricNo, setStylewiseSheetFabricNo] = useState([]);
  const [upsertNewRecord, setUpsertNewRecord] = useState(false);
  const [googleSheetLoading, setGoogleSheetLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [inputValue, setInputValue] = useState('');
  const [expandedFabrics, setExpandedFabrics] = useState({});
  const [itemsPerPage, setItemsPerPage] = useState(50); // Default to 50 records per page
  const [showConfirm, setShowConfirm] = useState(false);
  const [upsertResult, setUpsertResult] = useState(null);
  const API_URL = `${BASE_URL}`;

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [currentPage]);

  // auto-hide upsert result after 5 seconds
  useEffect(() => {
    if (!upsertResult) return;
    const t = setTimeout(() => setUpsertResult(null), RESULT_VISIBLE_MS);
    return () => clearTimeout(t);
  }, [upsertResult]);

  // fetch google sheet data
  const fetchDataFromGoogleSheet = async () => {
    setGoogleSheetLoading(true);
    try {
      const [fabricAvgFabricNo, stylewiseFabricNo] = await Promise.all([
        fetchFabricNoFromFabricAverageSheet(),
        fetchFabricNoFromStylwise(),
      ]);

      const withFabricNoStyles = stylewiseFabricNo.filter(
        (style) => style.fabric_1_no && style.fabric_1_no !== ''
      );
      setStylewiseSheetFabricNo(withFabricNoStyles);
      setFabricAvgSheetFabricNo(fabricAvgFabricNo);
    } catch (error) {
      console.error('Failed to fetch google sheet data error::', error);
    } finally {
      setGoogleSheetLoading(false);
    }
  };

  useEffect(() => {
    fetchDataFromGoogleSheet();
  }, []);

  // search filter
  const filteredData = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return styleNumber.filter(
      (p) =>
        p.styleNumber?.toString().toLowerCase().includes(term) ||
        p.patternNumber?.toString().toLowerCase().includes(term) ||
        p.fabrics?.some((f) => f.fabric_no?.toString().toLowerCase().includes(term))
    );
  }, [styleNumber, searchTerm]);

  // active list (filtered or full) drives pagination
  const activeList = searchTerm ? filteredData : styleNumber;

  // pagination logic
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const totalPages = Math.ceil(activeList.length / itemsPerPage);
  const displayItems = activeList.slice(startIndex, endIndex);

  const handleClearFilter = () => {
    setInputValue('');
    setSearchTerm('');
    setCurrentPage(1);
  };

  const toggleFabricDetails = (styleNo) => {
    setExpandedFabrics((prev) => ({ ...prev, [styleNo]: !prev[styleNo] }));
  };

  const handleItemsPerPageChange = (e) => {
    setItemsPerPage(Number(e.target.value));
    setCurrentPage(1);
  };

  const missingFabricNumbers = () => {
    return styleNumber.filter((fab) => fab?.fabrics?.length === 0);
  };

  // GENERATE MISSING FABRIC NUMBERS
  const downloadMissingFabricNumbers = () => {
    const data = missingFabricNumbers();
    if (data.length === 0) return;

    const csvHeader =
      'Style Number,Pattern Number,Article Type,Style Image,Fabric 1,Fabric 1 Name,Fabric 1 Image,Fabric 2,Fabric 2 Name,Fabric 2 Image,Fabric 3,Fabric 3 Name,Fabric 3 Image\n';

    const csvRows = data.map((item) => {
      return [
        item.styleNumber || '',
        item.patternNumber || '',
        '', // Article Type
        '', // Style Image
        '',
        '',
        '', // Fabric 1
        '',
        '',
        '', // Fabric 2
        '',
        '',
        '', // Fabric 3
      ].join(',');
    });

    const csvContent = csvHeader + csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'missing_fabrics.csv');

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // upsert data to database
  const transformData = () => {
    return fabricAvgSheetFabricNo.map((style) => {
      const fabrics = [];
      // collect up to 3 fabrics
      for (let i = 1; i < 4; i++) {
        if (style[`fabric_${i}_no`]) {
          fabrics.push({
            fabric_no: Number(style[`fabric_${i}_no`]) || null,
            fabric_name: style[`fabric_${i}_name`] || '',
            fabric_image: style[`fabric_${i}_image`] || '',
          });
        }
      }
      return {
        styleNumber: Number(style?.style_number),
        patternNumber: style?.pattern_number,
        articleType: style?.article_type || 'Na',
        fabrics,
      };
    });
  };

  const recordsToUpsert = useMemo(
    () =>
      transformData().filter(
        (rec) => rec.fabrics && rec.fabrics.length > 0 && rec.fabrics[0]?.fabric_no
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [fabricAvgSheetFabricNo]
  );

  // finds { matchedCount, modifiedCount, upsertedCount } wherever the API puts it
  const extractCounts = (data) => {
    const candidates = [
      data?.message, // backend sends counts inside `message`
      data,
      data?.result,
      data?.data,
      data?.bulkResult,
      data?.counts,
    ];
    return candidates.find((c) => c && typeof c === 'object' && 'matchedCount' in c) || {};
  };

  const upsert = async () => {
    try {
      setUpsertNewRecord(true);
      const res = await axios.post(`${API_URL}/style-details/`, {
        styles: recordsToUpsert,
      });

      const counts = extractCounts(res.data);
      setUpsertResult({
        type: 'success',
        message: typeof res.data?.message === 'string' ? res.data.message : '',
        sent: recordsToUpsert.length,
        matchedCount: counts.matchedCount ?? 0,
        modifiedCount: counts.modifiedCount ?? 0,
        upsertedCount: counts.upsertedCount ?? 0,
      });
    } catch (error) {
      console.error('Failed to upsert new Fabric no :: ', error);
      setUpsertResult({
        type: 'error',
        message:
          (typeof error?.response?.data?.message === 'string' && error.response.data.message) ||
          error?.message ||
          'Something went wrong while upserting. Try again.',
      });
    } finally {
      setUpsertNewRecord(false);
      setShowConfirm(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  if (styleLoading || googleSheetLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner className="h-12 w-12" />
      </div>
    );
  }

  const headCell = 'px-6 py-3 text-left text-sm font-semibold text-slate-600';

  return (
    <div className="mx-auto min-h-screen max-w-screen-2xl bg-slate-50 p-6">
      <ConfirmModal
        open={showConfirm}
        recordCount={recordsToUpsert.length}
        loading={upsertNewRecord}
        onCancel={() => setShowConfirm(false)}
        onConfirm={upsert}
      />

      {/* Header */}
      <div className="mb-6 rounded-xl border border-slate-200 bg-white px-6 py-5">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Style numbers</h1>
            <p className="mt-1 text-sm text-slate-500">
              Search styles by style number, pattern number or fabric number.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    setSearchTerm(inputValue.trim());
                    setCurrentPage(1);
                  }
                }}
                placeholder="Search style, pattern or fabric no. and press Enter"
                className="w-full rounded-lg border border-slate-300 py-2.5 pl-10 pr-4 text-sm outline-none transition focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20 md:w-96"
              />
              <svg
                className="absolute left-3 top-3 h-5 w-5 text-slate-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
            {searchTerm && (
              <button
                onClick={handleClearFilter}
                className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50"
              >
                <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
                Clear search
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Upsert result (auto hides in 5s) */}
      <UpsertResultBanner result={upsertResult} onClose={() => setUpsertResult(null)} />

      {/* Toolbar */}
      <div className="mb-4 flex flex-col gap-3 rounded-xl border border-slate-200 bg-white px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="text-sm text-slate-700">
          Showing <span className="font-semibold">{displayItems.length}</span> of{' '}
          <span className="font-semibold">{activeList.length}</span> records
          {searchTerm && (
            <span className="text-slate-500">
              {' '}
              for "<span className="font-medium text-slate-800">{searchTerm}</span>"
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center">
            <label htmlFor="itemsPerPage" className="mr-2 text-sm text-slate-600">
              Records per page
            </label>
            <select
              id="itemsPerPage"
              value={itemsPerPage}
              onChange={handleItemsPerPageChange}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20"
            >
              <option value="10">10</option>
              <option value="20">20</option>
              <option value="50">50</option>
              <option value="100">100</option>
              <option value="200">200</option>
            </select>
          </div>

          <button
            onClick={downloadMissingFabricNumbers}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Export missing fabric no.
          </button>

          <button
            onClick={() => setShowConfirm(true)}
            className="rounded-lg bg-teal-700 px-4 py-2 text-sm font-medium text-white hover:bg-teal-800"
          >
            Upsert new fabric no.
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className={headCell}>Style no.</th>
              <th className={headCell}>Pattern no.</th>
              <th className={headCell}>Style image</th>
              <th className={headCell}>Fabrics</th>
              <th className={headCell}>Actions</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-200 bg-white">
            {displayItems.length > 0 ? (
              displayItems.map((curStyle) => {
                const isOpen = !!expandedFabrics[curStyle.styleNumber];
                return (
                  <React.Fragment key={curStyle.styleNumber}>
                    <tr className="hover:bg-slate-50">
                      <td className="whitespace-nowrap px-6 py-4 text-sm font-semibold text-slate-900">
                        {curStyle.styleNumber}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-700">
                        {curStyle.patternNumber || <span className="text-slate-400">N/A</span>}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm">
                        {curStyle.styleImage ? (
                          <Link
                            to={curStyle.styleImage}
                            target="_blank"
                            className="inline-flex items-center rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                          >
                            <EyeIcon className="mr-1.5 h-4 w-4" />
                            View image
                          </Link>
                        ) : (
                          <span className="text-slate-400">No image</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-700">
                        {curStyle.fabrics?.length > 0 ? (
                          <span className="inline-flex items-center rounded-full bg-teal-50 px-2.5 py-1 text-xs font-medium text-teal-800">
                            {curStyle.fabrics.length} fabric{curStyle.fabrics.length > 1 ? 's' : ''}
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-800">
                            No fabric information
                          </span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm">
                        {curStyle.fabrics?.length > 0 && (
                          <button
                            onClick={() => toggleFabricDetails(curStyle.styleNumber)}
                            aria-expanded={isOpen}
                            className="inline-flex items-center rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                          >
                            <svg
                              className={`mr-1.5 h-4 w-4 transform transition-transform ${
                                isOpen ? 'rotate-180' : ''
                              }`}
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M19 9l-7 7-7-7"
                              />
                            </svg>
                            {isOpen ? 'Hide' : 'Show'} details
                          </button>
                        )}
                      </td>
                    </tr>

                    {/* Expanded fabric details row */}
                    {isOpen && curStyle.fabrics?.length > 0 && (
                      <tr>
                        <td colSpan="5" className="bg-slate-50 px-6 py-5">
                          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                            {curStyle.fabrics.map((fab, idx) => {
                              const avg = curStyle.fabricAvgDetails?.[0]?.fabrics?.[idx];
                              const rows = [
                                ['Avg (XXS-XS)', avg?.average_xxs_xs || 'NA'],
                                ['Avg (S-M)', avg?.average_s_m || 'NA'],
                                ['Avg (L-XL)', avg?.average_l_xl || 'NA'],
                                ['Avg (2XL-3XL)', avg?.average_2xl_3xl || 'NA'],
                                ['Avg (4XL-5XL)', avg?.average_4xl_5xl || 'NA'],
                                ['Width', avg?.width],
                              ];
                              return (
                                <div
                                  key={idx}
                                  className="rounded-lg border border-slate-200 bg-white p-4"
                                >
                                  <div className="mb-3 flex items-center justify-between border-b border-slate-200 pb-2">
                                    <h4 className="font-semibold text-slate-900">
                                      Fabric {idx + 1}
                                    </h4>
                                    {fab.fabric_image && (
                                      <Link
                                        to={fab.fabric_image}
                                        target="_blank"
                                        className="inline-flex items-center text-xs font-medium text-teal-700 hover:text-teal-900"
                                      >
                                        <EyeIcon className="mr-1 h-4 w-4" />
                                        View image
                                      </Link>
                                    )}
                                  </div>

                                  <dl className="text-sm">
                                    <div className="flex justify-between gap-3 border-b border-slate-200 py-2">
                                      <dt className="text-slate-500">Fabric no.</dt>
                                      <dd className="font-medium text-slate-900">
                                        {fab.fabric_no}
                                      </dd>
                                    </div>
                                    <div className="flex justify-between gap-3 border-b border-slate-200 py-2">
                                      <dt className="text-slate-500">Name</dt>
                                      <dd className="text-right text-slate-900">
                                        {fab.fabric_name}
                                      </dd>
                                    </div>
                                    {rows.map(([label, value]) => (
                                      <div
                                        key={label}
                                        className="flex justify-between gap-3 border-b border-slate-200 py-2"
                                      >
                                        <dt className="text-slate-500">{label}</dt>
                                        <dd className="text-slate-900">{value}</dd>
                                      </div>
                                    ))}
                                  </dl>
                                </div>
                              );
                            })}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })
            ) : (
              <tr>
                <td colSpan="5" className="px-6 py-14 text-center text-slate-500">
                  <svg
                    className="mx-auto mb-3 h-12 w-12 text-slate-300"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <p className="text-lg font-medium text-slate-700">No results found</p>
                  <p className="mt-1 text-sm">Try a different style, pattern or fabric number.</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-6 flex flex-col items-center justify-between px-1 sm:flex-row">
          <div className="mb-4 text-sm text-slate-600 sm:mb-0">
            Showing {startIndex + 1} to {Math.min(endIndex, activeList.length)} of{' '}
            {activeList.length} entries
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="flex items-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <svg className="mr-1 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
              Previous
            </button>

            <div className="hidden md:flex">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }

                return (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`border px-3 py-2 text-sm font-medium ${
                      currentPage === pageNum
                        ? 'z-10 border-teal-700 bg-teal-700 text-white'
                        : 'border-slate-300 bg-white text-slate-600 hover:bg-slate-50'
                    } ${i === 0 ? 'rounded-l-lg' : ''} ${
                      i === Math.min(5, totalPages) - 1 ? 'rounded-r-lg' : ''
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>

            <button
              onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="flex items-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Next
              <svg className="ml-1 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default StyleNumber;
