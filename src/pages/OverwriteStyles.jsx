import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Search,
  RefreshCw,
  CheckSquare,
  Square,
  Zap,
  ZapOff,
  Circle,
  CircleDot,
  Upload,
  Download,
  ChevronLeft,
  ChevronRight,
  X,
  Loader2,
  AlertCircle,
  FileSpreadsheet,
  TrendingUp,
  Clock,
  Filter,
  User,
  Edit3,
  Check,
  AlertTriangle,
  ChevronDown,
} from 'lucide-react';

import { OVERWRITE_BASE_URL } from '../constant/index.js';

/* ------------------------------------------------------------------
   CONFIG
------------------------------------------------------------------ */
const BATCH_SIZE = 50;
const MAX_RECORDS = 4000;
const TOAST_DURATION = 3500;
const EXPORT_FETCH_LIMIT = 10000; // large enough to grab all live/zero rows in one shot

/* ------------------------------------------------------------------
   API Service
------------------------------------------------------------------ */
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

  getStyles(params) {
    const queryString = new URLSearchParams(params).toString();
    return this.request(`?${queryString}`);
  },

  getStyleByNumber(styleNumber) {
    return this.request(`/by-number/${styleNumber}`);
  },

  getStylesByNumbers(styleNumbers) {
    return this.request('/bulk-get', {
      method: 'POST',
      body: JSON.stringify({ style_numbers: styleNumbers }),
    });
  },

  bulkUpsert(styles) {
    return this.request('/bulk-upsert', {
      method: 'POST',
      body: JSON.stringify({ styles }),
    });
  },

  bulkUpdate(styleNumbers, updates) {
    return this.request('/bulk-update', {
      method: 'PATCH',
      body: JSON.stringify({ style_numbers: styleNumbers, ...updates }),
    });
  },

  updateStyleByNumber(styleNumber, updates) {
    return this.request(`/by-number/${styleNumber}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
  },

  deleteStyleByNumber(styleNumber) {
    return this.request(`/by-number/${styleNumber}`, {
      method: 'DELETE',
    });
  },

  bulkDelete(styleNumbers) {
    return this.request('/bulk-delete', {
      method: 'DELETE',
      body: JSON.stringify({ style_numbers: styleNumbers }),
    });
  },
};

/* ------------------------------------------------------------------
   UI Components
------------------------------------------------------------------ */
const FONT_IMPORT = `@import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,600;9..144,700&family=Inter:wght@400;500;600;700&display=swap');`;

const Toast = ({ toast, onClose }) => {
  if (!toast) return null;
  const isError = toast.type === 'error';
  const isInfo = toast.type === 'info';

  const bgColor = isError
    ? 'border-[#F0BFC7] bg-[#FAE1E4] text-[#D1495B]'
    : isInfo
      ? 'border-[#F0D6A8] bg-[#FBEBD4] text-[#D98E31]'
      : 'border-[#B7E1D3] bg-[#DCF1EA] text-[#1F8A70]';

  const Icon = isError ? AlertCircle : isInfo ? AlertCircle : CheckSquare;

  return (
    <div
      className={`fixed top-6 right-6 z-50 flex max-w-md items-center gap-3 rounded-xl border px-5 py-3.5 text-sm font-semibold shadow-2xl animate-in slide-in-from-top-2 ${bgColor}`}
    >
      <Icon size={18} className="flex-shrink-0" />
      <span className="flex-1">{toast.message}</span>
      <button
        onClick={onClose}
        className="ml-2 text-inherit opacity-60 transition-opacity hover:opacity-100"
      >
        <X size={16} />
      </button>
    </div>
  );
};

const StatusBadge = ({ isLive, isZero, size = 'md' }) => {
  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-xs',
    lg: 'px-3 py-1.5 text-sm',
  };

  const iconSize = size === 'sm' ? 12 : size === 'lg' ? 16 : 14;

  if (isLive) {
    return (
      <span
        className={`inline-flex items-center gap-1.5 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200 font-semibold ${sizeClasses[size]}`}
      >
        <Zap size={iconSize} className="text-emerald-600" />
        Live
      </span>
    );
  }
  if (isZero) {
    return (
      <span
        className={`inline-flex items-center gap-1.5 rounded-full bg-red-100 text-red-700 border border-red-200 font-semibold ${sizeClasses[size]}`}
      >
        <CircleDot size={iconSize} className="text-red-600" />
        Zero
      </span>
    );
  }
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200 font-semibold ${sizeClasses[size]}`}
    >
      <Circle size={iconSize} className="text-slate-400" />
      Default
    </span>
  );
};

/* ── Status Update Modal ─────────────────────────────────── */
const StatusUpdateModal = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  styleNumber,
  currentStatus,
  selectedCount,
  presetField,
  presetValue,
  loading,
}) => {
  const [selectedName, setSelectedName] = useState('');
  // Just 2 toggles now instead of 4 separate status buttons.
  // isLiveOn / isZeroOn are mutually exclusive — turning one on turns the other off.
  const [isLiveOn, setIsLiveOn] = useState(false);
  const [isZeroOn, setIsZeroOn] = useState(false);

  // User list with specified names
  const userList = [
    { id: 'user1', name: 'Kajal' },
    { id: 'user2', name: 'Parul' },
    { id: 'user3', name: 'Sachin' },
    { id: 'user4', name: 'Mam' },
  ];

  // Reset / prefill state whenever the modal opens
  useEffect(() => {
    if (!isOpen) return;

    setSelectedName('');

    if (presetField === 'isLive') {
      setIsLiveOn(!!presetValue);
      setIsZeroOn(false);
    } else if (presetField === 'isZero') {
      setIsZeroOn(!!presetValue);
      setIsLiveOn(false);
    } else if (currentStatus === 'Live') {
      setIsLiveOn(true);
      setIsZeroOn(false);
    } else if (currentStatus === 'Zero') {
      setIsZeroOn(true);
      setIsLiveOn(false);
    } else {
      setIsLiveOn(false);
      setIsZeroOn(false);
    }
  }, [isOpen, presetField, presetValue, currentStatus]);

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (!selectedName) return;
    onConfirm(selectedName, { isLive: isLiveOn, isZero: isZeroOn });
  };

  const isBulk = selectedCount > 1;

  // Get status color for highlighting
  const getStatusColor = (status) => {
    switch (status) {
      case 'Live':
        return 'bg-emerald-50 border-emerald-200 text-emerald-700';
      case 'Not Live':
        return 'bg-slate-50 border-slate-200 text-slate-600';
      case 'Zero':
        return 'bg-red-50 border-red-200 text-red-700';
      case 'Not Zero':
        return 'bg-slate-50 border-slate-200 text-slate-600';
      default:
        return 'bg-slate-50 border-slate-200 text-slate-600';
    }
  };

  const toggleLive = () => {
    setIsLiveOn((prev) => {
      const next = !prev;
      if (next) setIsZeroOn(false);
      return next;
    });
  };

  const toggleZero = () => {
    setIsZeroOn((prev) => {
      const next = !prev;
      if (next) setIsLiveOn(false);
      return next;
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 p-6 animate-in slide-in-from-bottom-4 duration-300">
        {/* Header */}
        <div className="flex items-start justify-between mb-5">
          <div>
            <h3 className="text-xl font-bold text-[#1A2233]">{title}</h3>
            <p className="text-sm text-[#5B6478] mt-1">
              {isBulk ? `Updating ${selectedCount} styles` : `Style #${styleNumber}`}
            </p>
            {!isBulk && currentStatus && (
              <div className="mt-2">
                <span className="text-xs text-[#5B6478]">Current Status: </span>
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${getStatusColor(currentStatus)}`}
                >
                  {currentStatus === 'Live' && <Zap size={12} className="text-emerald-600" />}
                  {currentStatus === 'Zero' && <CircleDot size={12} className="text-red-600" />}
                  {currentStatus === 'Not Live' && <ZapOff size={12} className="text-slate-400" />}
                  {currentStatus === 'Not Zero' && <Circle size={12} className="text-slate-400" />}
                  {currentStatus}
                </span>
              </div>
            )}
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-[#5B6478] hover:bg-[#EEF0F4] transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="space-y-5">
          {/* Status Toggles (2 buttons instead of 4) */}
          <div>
            <label className="block text-sm font-semibold text-[#1A2233] mb-2">Set Status</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={toggleLive}
                className={`px-3 py-2.5 rounded-lg border-2 text-sm font-semibold transition-all duration-200 flex items-center justify-center gap-1.5 ${
                  isLiveOn
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-700 ring-2 ring-emerald-400 ring-offset-1'
                    : 'border-[#DDE1EA] text-[#5B6478] hover:border-emerald-300 hover:bg-emerald-50/50'
                }`}
              >
                {isLiveOn ? <Zap size={16} /> : <ZapOff size={16} />}
                {isLiveOn ? 'Live' : 'Not Live'}
                {isLiveOn && <Check size={14} className="ml-1" />}
              </button>
              <button
                onClick={toggleZero}
                className={`px-3 py-2.5 rounded-lg border-2 text-sm font-semibold transition-all duration-200 flex items-center justify-center gap-1.5 ${
                  isZeroOn
                    ? 'border-red-500 bg-red-50 text-red-700 ring-2 ring-red-400 ring-offset-1'
                    : 'border-[#DDE1EA] text-[#5B6478] hover:border-red-300 hover:bg-red-50/50'
                }`}
              >
                {isZeroOn ? <CircleDot size={16} /> : <Circle size={16} />}
                {isZeroOn ? 'Zero' : 'Not Zero'}
                {isZeroOn && <Check size={14} className="ml-1" />}
              </button>
            </div>
            <p className="text-xs text-[#5B6478] mt-1.5">
              Tap to toggle — turning one on turns the other off.
            </p>
          </div>

          {/* User Selection - Dropdown */}
          <div>
            <label className="block text-sm font-semibold text-[#1A2233] mb-2">
              <User size={14} className="inline mr-1.5" />
              Updated By
            </label>
            <div className="relative">
              <select
                value={selectedName}
                onChange={(e) => setSelectedName(e.target.value)}
                className="w-full rounded-lg border border-[#DDE1EA] bg-white px-4 py-2.5 text-sm text-[#1A2233] appearance-none focus:outline-none focus:ring-2 focus:ring-[#D98E31]/40 focus:border-[#D98E31] transition-all"
              >
                <option value="">Select your name...</option>
                {userList.map((user) => (
                  <option key={user.id} value={user.name}>
                    {user.name}
                  </option>
                ))}
              </select>
              <ChevronDown
                size={18}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#5B6478] pointer-events-none"
              />
            </div>
            <p className="text-xs text-[#5B6478] mt-1.5">
              {selectedName ? `Selected: ${selectedName}` : 'Please select your name'}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-2">
            <button
              onClick={onClose}
              className="flex-1 rounded-lg border border-[#DDE1EA] bg-white px-4 py-2.5 text-sm font-semibold text-[#5B6478] transition-all hover:bg-[#F5F6F9]"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={!selectedName || loading}
              className="flex-1 rounded-lg bg-gradient-to-r from-[#D98E31] to-[#E8A84A] px-4 py-2.5 text-sm font-bold text-white transition-all hover:shadow-lg hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="inline animate-spin mr-2" />
                  Updating...
                </>
              ) : (
                'Confirm Update'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ------------------------------------------------------------------
   Main Component
------------------------------------------------------------------ */
const OverwriteStylesManager = () => {
  // State
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState(null);

  const [search, setSearch] = useState('');
  const [liveFilter, setLiveFilter] = useState('all');
  const [zeroFilter, setZeroFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, pages: 1 });

  const [selected, setSelected] = useState(new Set());
  const [rowBusy, setRowBusy] = useState(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);

  const [showUpsert, setShowUpsert] = useState(false);
  const [upsertText, setUpsertText] = useState('');
  const [upsertLive, setUpsertLive] = useState(false);
  const [upsertZero, setUpsertZero] = useState(false);
  const [upsertBusy, setUpsertBusy] = useState(false);
  const [upsertProgress, setUpsertProgress] = useState({ current: 0, total: 0 });

  const [showCsvUpload, setShowCsvUpload] = useState(false);
  const [csvFile, setCsvFile] = useState(null);
  const [csvData, setCsvData] = useState([]);
  const [csvBusy, setCsvBusy] = useState(false);
  const [csvPreview, setCsvPreview] = useState([]);
  const [csvProgress, setCsvProgress] = useState({ current: 0, total: 0 });

  // Export state (exports styles that were manually set Live or Zero)
  const [exportBusy, setExportBusy] = useState(false);

  // Status Update Modal State
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [modalConfig, setModalConfig] = useState({
    title: '',
    styleNumber: null,
    currentStatus: '',
    selectedCount: 1,
    field: '',
    value: null,
    row: null,
  });
  const [modalLoading, setModalLoading] = useState(false);

  // Computed values
  const parsedUpsertNumbers = useMemo(() => {
    return upsertText
      .split(/[\s,]+/)
      .map((s) => s.trim())
      .filter(Boolean)
      .map(Number)
      .filter((n) => !Number.isNaN(n));
  }, [upsertText]);

  // Notifications
  const notify = useCallback((type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), TOAST_DURATION);
  }, []);

  // Fetch styles
  const fetchStyles = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = {
        page: String(page),
        limit: '20',
      };
      if (search.trim()) params.search = search.trim();
      if (liveFilter !== 'all') params.isLive = liveFilter;
      if (zeroFilter !== 'all') params.isZero = zeroFilter;

      const result = await apiService.getStyles(params);

      if (result.data && Array.isArray(result.data)) {
        setRows(result.data);
        setPagination(result.pagination || { page: 1, limit: 20, total: 0, pages: 1 });
      } else {
        setRows([]);
        setPagination({ page: 1, limit: 20, total: 0, pages: 1 });
      }
    } catch (e) {
      setError(e.message);
      notify('error', `Failed to fetch styles: ${e.message}`);
    } finally {
      setLoading(false);
    }
  }, [page, search, liveFilter, zeroFilter, notify]);

  // Debounced fetch
  useEffect(() => {
    const timer = setTimeout(fetchStyles, 300);
    return () => clearTimeout(timer);
  }, [fetchStyles]);

  useEffect(() => {
    setPage(1);
  }, [search, liveFilter, zeroFilter]);

  // Selection
  const allSelected = rows.length > 0 && rows.every((r) => selected.has(r._id));
  const toggleSelectAll = () => {
    setSelected((prev) => {
      if (allSelected) return new Set();
      const next = new Set(prev);
      rows.forEach((r) => next.add(r._id));
      return next;
    });
  };
  const toggleSelectRow = (id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  // Open status update modal for single row
  const openSingleUpdateModal = (row) => {
    const currentStatus = row.isLive ? 'Live' : row.isZero ? 'Zero' : 'Default';

    setModalConfig({
      title: `Update Style #${row.style_number}`,
      styleNumber: row.style_number,
      currentStatus: currentStatus,
      selectedCount: 1,
      field: '',
      value: null,
      row: row,
    });
    setShowStatusModal(true);
  };

  // Open status update modal for bulk
  const openBulkUpdateModal = (field, value) => {
    const action = value ? 'Set' : 'Set Not';
    const label = field === 'isLive' ? 'Live' : 'Zero';

    setModalConfig({
      title: `Bulk Update - ${action} ${label}`,
      styleNumber: null,
      currentStatus: '',
      selectedCount: selected.size,
      field: field,
      value: value,
      row: null,
    });
    setShowStatusModal(true);
  };

  // Handle status update confirmation — statusValues is { isLive, isZero } from the 2 toggles
  const handleStatusConfirm = async (updatedBy, statusValues) => {
    setModalLoading(true);

    try {
      const { row, selectedCount } = modalConfig;

      const updates = {
        isLive: statusValues.isLive,
        isZero: statusValues.isZero,
        updated_by: updatedBy,
      };

      if (selectedCount === 1 && row) {
        const result = await apiService.updateStyleByNumber(row.style_number, updates);
        setRows((prev) => prev.map((r) => (r._id === row._id ? result : r)));
        notify('success', `Style ${row.style_number} updated successfully by ${updatedBy}`);
      } else {
        const styleNumbers = rows.filter((r) => selected.has(r._id)).map((r) => r.style_number);
        await apiService.bulkUpdate(styleNumbers, updates);
        notify('success', `${styleNumbers.length} styles updated successfully by ${updatedBy}`);
        setSelected(new Set());
        await fetchStyles();
      }

      setShowStatusModal(false);
    } catch (e) {
      notify('error', e.message);
    } finally {
      setModalLoading(false);
    }
  };

  // Bulk update (opens modal)
  const bulkUpdate = useCallback(
    (field, value) => {
      if (selected.size === 0) {
        notify('info', 'Please select at least one style');
        return;
      }
      openBulkUpdateModal(field, value);
    },
    [selected.size, notify]
  );

  // Process batches helper
  const processBatches = useCallback(async (items, batchSize, processFn, progressCallback) => {
    const batches = [];
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }

    let totalAdded = 0;
    let totalModified = 0;
    const errors = [];

    for (let i = 0; i < batches.length; i++) {
      try {
        const result = await processFn(batches[i]);
        totalAdded += result.added || 0;
        totalModified += result.modified || 0;
        if (progressCallback) progressCallback(i + 1, batches.length);
      } catch (error) {
        errors.push(`Batch ${i + 1}: ${error.message}`);
      }
    }

    return { totalAdded, totalModified, errors };
  }, []);

  // Submit upsert
  const submitUpsert = useCallback(async () => {
    const numbers = parsedUpsertNumbers;

    if (numbers.length === 0) {
      notify('error', 'Please enter at least one valid style number');
      return;
    }

    if (numbers.length > MAX_RECORDS) {
      notify('error', `Maximum ${MAX_RECORDS} style numbers allowed per upload`);
      return;
    }

    setUpsertBusy(true);
    setUpsertProgress({ current: 0, total: Math.ceil(numbers.length / BATCH_SIZE) });

    try {
      let isLive = upsertLive;
      let isZero = upsertZero;
      if (isLive && isZero) {
        isZero = false;
        notify('info', 'Both Live and Zero cannot be true. Setting Zero to false.');
      }

      const allStyles = numbers.map((style_number) => ({
        style_number,
        isLive,
        isZero,
      }));

      const result = await processBatches(
        allStyles,
        BATCH_SIZE,
        async (batch) => {
          const response = await apiService.bulkUpsert(batch);
          return {
            added: response.summary?.upserted || 0,
            modified: response.summary?.modified || 0,
          };
        },
        (current, total) => setUpsertProgress({ current, total })
      );

      let message = `Upsert complete — ${result.totalAdded} added, ${result.totalModified} updated`;
      if (result.errors.length) {
        message += `. ${result.errors.length} batch(es) failed`;
        notify('error', message);
      } else {
        notify('success', message);
      }

      setUpsertText('');
      setShowUpsert(false);
      setUpsertProgress({ current: 0, total: 0 });
      await fetchStyles();
    } catch (e) {
      notify('error', e.message);
    } finally {
      setUpsertBusy(false);
    }
  }, [parsedUpsertNumbers, upsertLive, upsertZero, processBatches, fetchStyles, notify]);

  // CSV upload handlers
  const handleCSVUpload = useCallback(
    (event) => {
      const file = event.target.files[0];
      if (!file) return;

      setCsvFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const text = e.target.result;
          const lines = text.split('\n').filter((line) => line.trim());
          const headers = lines[0].split(',').map((h) => h.trim());

          const requiredHeaders = ['style_number', 'isLive', 'isZero'];
          if (!requiredHeaders.every((h) => headers.includes(h))) {
            notify('error', 'CSV must have columns: style_number, isLive, isZero');
            return;
          }

          const parsed = lines
            .slice(1)
            .map((line) => {
              const values = line.split(',').map((v) => v.trim());
              const row = {};
              headers.forEach((h, idx) => {
                if (h === 'style_number') row[h] = parseInt(values[idx]);
                else if (h === 'isLive' || h === 'isZero') {
                  row[h] = values[idx]?.toLowerCase() === 'true' || values[idx] === '1';
                } else {
                  row[h] = values[idx];
                }
              });
              return row;
            })
            .filter((row) => !isNaN(row.style_number));

          if (parsed.length > MAX_RECORDS) {
            notify(
              'error',
              `CSV has more than ${MAX_RECORDS} rows. Please split into smaller files.`
            );
            return;
          }

          const validatedData = parsed.map((row) => {
            if (row.isLive && row.isZero) return { ...row, isZero: false };
            return row;
          });

          setCsvData(validatedData);
          setCsvPreview(validatedData.slice(0, 5));
          setCsvProgress({ current: 0, total: Math.ceil(validatedData.length / BATCH_SIZE) });
          notify('success', `Parsed ${validatedData.length} rows from CSV`);
        } catch (err) {
          notify('error', `Failed to parse CSV: ${err.message}`);
        }
      };
      reader.readAsText(file);
    },
    [notify]
  );

  const submitCSVUpload = useCallback(async () => {
    if (csvData.length === 0) {
      notify('error', 'No valid data to upload');
      return;
    }

    setCsvBusy(true);
    setCsvProgress({ current: 0, total: Math.ceil(csvData.length / BATCH_SIZE) });

    try {
      const allStyles = csvData.map((row) => ({
        style_number: row.style_number,
        isLive: row.isLive,
        isZero: row.isZero,
      }));

      const result = await processBatches(
        allStyles,
        BATCH_SIZE,
        async (batch) => {
          const response = await apiService.bulkUpsert(batch);
          return {
            added: response.summary?.upserted || 0,
            modified: response.summary?.modified || 0,
          };
        },
        (current, total) => setCsvProgress({ current, total })
      );

      let message = `CSV upload complete — ${result.totalAdded} added, ${result.totalModified} updated`;
      if (result.errors.length) {
        message += `. ${result.errors.length} batch(es) failed`;
        notify('error', message);
      } else {
        notify('success', message);
      }

      setShowCsvUpload(false);
      setCsvFile(null);
      setCsvData([]);
      setCsvPreview([]);
      setCsvProgress({ current: 0, total: 0 });
      await fetchStyles();
    } catch (e) {
      notify('error', e.message);
    } finally {
      setCsvBusy(false);
    }
  }, [csvData, processBatches, fetchStyles, notify]);

  // Export styles that were manually marked Live or Zero, as a CSV download.
  // Fetches isLive=true and isZero=true separately (they're mutually exclusive
  // in the data model, so a simple union covers every "manually touched" style)
  // and merges by _id in case the backend ever overlaps them.
  const exportStyles = useCallback(async () => {
    setExportBusy(true);
    try {
      const [liveRes, zeroRes] = await Promise.all([
        apiService.getStyles({ isLive: 'true', page: '1', limit: String(EXPORT_FETCH_LIMIT) }),
        apiService.getStyles({ isZero: 'true', page: '1', limit: String(EXPORT_FETCH_LIMIT) }),
      ]);

      const liveRows = Array.isArray(liveRes.data) ? liveRes.data : [];
      const zeroRows = Array.isArray(zeroRes.data) ? zeroRes.data : [];

      const merged = new Map();
      [...liveRows, ...zeroRows].forEach((r) => merged.set(r._id, r));
      const exportRows = Array.from(merged.values()).sort(
        (a, b) => a.style_number - b.style_number
      );

      if (exportRows.length === 0) {
        notify('info', 'No manually Live or Zero styles to export');
        return;
      }

      const escapeCsv = (val) => {
        const str = String(val ?? '');
        return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
      };

      const header = ['style_number', 'status', 'updated_by', 'updatedAt'];
      const lines = exportRows.map((r) => {
        const status = r.isLive ? 'Live' : r.isZero ? 'Zero' : '';
        return [
          r.style_number,
          status,
          r.updated_by || '',
          r.updatedAt ? new Date(r.updatedAt).toISOString() : '',
        ]
          .map(escapeCsv)
          .join(',');
      });

      const csvContent = [header.join(','), ...lines].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute(
        'download',
        `live-zero-styles_${new Date().toISOString().slice(0, 10)}.csv`
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      notify('success', `Exported ${exportRows.length} manually Live/Zero styles`);
    } catch (e) {
      notify('error', `Export failed: ${e.message}`);
    } finally {
      setExportBusy(false);
    }
  }, [notify]);

  // Get row background color based on status
  const getRowBackground = (isLive, isZero) => {
    if (isLive) return 'bg-emerald-50/50 hover:bg-emerald-50';
    if (isZero) return 'bg-red-50/50 hover:bg-red-50';
    return 'hover:bg-slate-50';
  };

  // Render component
  return (
    <div className="min-h-screen bg-[#F7F8FA] px-6 py-8 font-[Inter,sans-serif] text-[#1A2233]">
      <style>{`
        ${FONT_IMPORT}
        .disp { font-family: 'Fraunces', serif; }
        .spin { animation: spin 0.8s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>

      <Toast toast={toast} onClose={() => setToast(null)} />

      {/* Status Update Modal */}
      <StatusUpdateModal
        isOpen={showStatusModal}
        onClose={() => setShowStatusModal(false)}
        onConfirm={handleStatusConfirm}
        title={modalConfig.title}
        styleNumber={modalConfig.styleNumber}
        currentStatus={modalConfig.currentStatus}
        selectedCount={modalConfig.selectedCount}
        presetField={modalConfig.field}
        presetValue={modalConfig.value}
        loading={modalLoading}
      />

      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#D98E31]">
              <TrendingUp size={14} />
              Overwrite Styles
            </div>
            <h1 className="disp text-4xl font-semibold tracking-tight">Style Status Manager</h1>
            <p className="mt-1 text-sm text-[#5B6478]">
              Manage live and zero inventory status for style numbers
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={fetchStyles}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-lg border border-[#DDE1EA] bg-white px-4 py-2.5 text-sm font-semibold text-[#5B6478] transition-all hover:bg-[#F5F6F9] hover:border-[#C8CDD8] disabled:opacity-50"
            >
              <RefreshCw size={16} className={loading ? 'spin' : ''} />
              Refresh
            </button>
            <button
              onClick={exportStyles}
              disabled={exportBusy}
              className="inline-flex items-center gap-2 rounded-lg border border-[#DDE1EA] bg-white px-4 py-2.5 text-sm font-semibold text-[#5B6478] transition-all hover:bg-[#F5F6F9] hover:border-[#C8CDD8] disabled:opacity-50"
              title="Export styles manually set Live or Zero"
            >
              {exportBusy ? <Loader2 size={16} className="spin" /> : <Download size={16} />}
              Export
            </button>
            <button
              onClick={() => setShowCsvUpload(true)}
              className="inline-flex items-center gap-2 rounded-lg border border-[#DDE1EA] bg-white px-4 py-2.5 text-sm font-semibold text-[#5B6478] transition-all hover:bg-[#F5F6F9] hover:border-[#C8CDD8]"
            >
              <FileSpreadsheet size={16} />
              CSV Upload
            </button>
            <button
              onClick={() => setShowUpsert((s) => !s)}
              className="inline-flex items-center gap-2 rounded-lg bg-[#1A2233] px-5 py-2.5 text-sm font-semibold text-white transition-all hover:bg-[#111726] hover:shadow-lg"
            >
              <Upload size={16} />
              Bulk Upsert
            </button>
          </div>
        </div>

        {/* CSV Upload Panel */}
        {showCsvUpload && (
          <div className="mb-6 rounded-2xl border border-[#DDE1EA] bg-white p-6 shadow-sm animate-in slide-in-from-top-4">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold">Upload CSV</h3>
                <p className="text-sm text-[#5B6478] mt-0.5">
                  Upload a CSV file with style statuses
                </p>
              </div>
              <button
                onClick={() => setShowCsvUpload(false)}
                className="rounded-lg p-1 text-[#5B6478] hover:bg-[#EEF0F4]"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <div className="rounded-lg border-2 border-dashed border-[#DDE1EA] bg-[#FAFAFB] p-8 text-center">
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleCSVUpload}
                  className="w-full cursor-pointer text-sm text-[#5B6478] file:mr-4 file:rounded-lg file:border-0 file:bg-[#DCF1EA] file:px-4 file:py-2.5 file:text-sm file:font-semibold file:text-[#1F8A70] hover:file:bg-[#B7E1D3]"
                />
                <p className="mt-2 text-xs text-[#8890A3]">
                  Required columns: style_number, isLive, isZero (true/false or 1/0)
                </p>
              </div>

              {csvProgress.total > 0 && csvBusy && (
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs text-[#5B6478]">
                    <span className="flex items-center gap-2">
                      <Loader2 size={14} className="spin" />
                      Processing batch {csvProgress.current} of {csvProgress.total}
                    </span>
                    <span>{Math.round((csvProgress.current / csvProgress.total) * 100)}%</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-[#EEF0F4]">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-[#D98E31] to-[#E8A84A] transition-all duration-500"
                      style={{ width: `${(csvProgress.current / csvProgress.total) * 100}%` }}
                    />
                  </div>
                </div>
              )}

              {csvPreview.length > 0 && (
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-sm font-semibold text-[#1A2233]">
                      Preview ({csvData.length} rows)
                    </span>
                    <span className="text-xs text-[#5B6478]">Showing first 5 rows</span>
                  </div>
                  <div className="overflow-x-auto rounded-lg border border-[#DDE1EA]">
                    <table className="w-full border-collapse text-sm">
                      <thead>
                        <tr className="bg-[#FAFAFB] border-b border-[#DDE1EA]">
                          <th className="px-4 py-2.5 text-left font-semibold text-[#5B6478]">
                            Style #
                          </th>
                          <th className="px-4 py-2.5 text-left font-semibold text-[#5B6478]">
                            isLive
                          </th>
                          <th className="px-4 py-2.5 text-left font-semibold text-[#5B6478]">
                            isZero
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {csvPreview.map((row, idx) => (
                          <tr key={idx} className="border-b border-[#DDE1EA] last:border-0">
                            <td className="px-4 py-2.5 font-medium">{row.style_number}</td>
                            <td className="px-4 py-2.5">
                              <StatusBadge isLive={row.isLive} isZero={false} size="sm" />
                            </td>
                            <td className="px-4 py-2.5">
                              <StatusBadge isLive={false} isZero={row.isZero} size="sm" />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between gap-4 pt-2">
                <span className="text-sm text-[#5B6478]">
                  {csvData.length} row{csvData.length === 1 ? '' : 's'} ready to upload
                </span>
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setShowCsvUpload(false);
                      setCsvFile(null);
                      setCsvData([]);
                      setCsvPreview([]);
                      setCsvProgress({ current: 0, total: 0 });
                    }}
                    className="rounded-lg border border-[#DDE1EA] bg-white px-5 py-2 text-sm font-semibold text-[#5B6478] transition-all hover:bg-[#F5F6F9]"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={submitCSVUpload}
                    disabled={csvBusy || csvData.length === 0}
                    className="inline-flex items-center gap-2 rounded-lg bg-[#D98E31] px-6 py-2 text-sm font-bold text-white transition-all hover:bg-[#C47D2A] hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {csvBusy && <Loader2 size={16} className="spin" />}
                    Upload {csvData.length || ''}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Bulk Upsert Panel */}
        {showUpsert && (
          <div className="mb-6 rounded-2xl border border-[#DDE1EA] bg-white p-6 shadow-sm animate-in slide-in-from-top-4">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold">Bulk Upsert</h3>
                <p className="text-sm text-[#5B6478] mt-0.5">
                  Paste style numbers to create or update
                </p>
              </div>
              <button
                onClick={() => {
                  setShowUpsert(false);
                  setUpsertProgress({ current: 0, total: 0 });
                }}
                className="rounded-lg p-1 text-[#5B6478] hover:bg-[#EEF0F4]"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <textarea
                  value={upsertText}
                  onChange={(e) => setUpsertText(e.target.value)}
                  placeholder="Enter style numbers separated by commas, spaces, or new lines&#10;e.g. 1024, 1025, 1026&#10;1030"
                  rows={4}
                  className={`w-full resize-y font-mono rounded-lg border border-[#DDE1EA] bg-white px-3 py-2 text-sm text-[#1A2233] placeholder:text-[#8890A3] focus:outline-none focus:ring-2 focus:ring-[#D98E31]/40`}
                />
                <div className="mt-1.5 flex items-center justify-between text-xs text-[#5B6478]">
                  <span>
                    {parsedUpsertNumbers.length} style number
                    {parsedUpsertNumbers.length === 1 ? '' : 's'} detected
                    {parsedUpsertNumbers.length > MAX_RECORDS && (
                      <span className="ml-2 text-[#D1495B] font-semibold">
                        (Max {MAX_RECORDS} allowed)
                      </span>
                    )}
                  </span>
                  <span>Max {MAX_RECORDS} records</span>
                </div>
              </div>

              {upsertProgress.total > 0 && upsertBusy && (
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs text-[#5B6478]">
                    <span className="flex items-center gap-2">
                      <Loader2 size={14} className="spin" />
                      Processing batch {upsertProgress.current} of {upsertProgress.total}
                    </span>
                    <span>
                      {Math.round((upsertProgress.current / upsertProgress.total) * 100)}%
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-[#EEF0F4]">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-[#D98E31] to-[#E8A84A] transition-all duration-500"
                      style={{ width: `${(upsertProgress.current / upsertProgress.total) * 100}%` }}
                    />
                  </div>
                </div>
              )}

              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="text-sm font-medium">Default status:</span>
                  <button
                    onClick={() => {
                      setUpsertLive(!upsertLive);
                      if (!upsertLive && upsertZero) {
                        setUpsertZero(false);
                        notify('info', 'Zero disabled because Live is true');
                      }
                    }}
                    className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold transition-all duration-200 ${
                      upsertLive
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                        : 'border-[#DDE1EA] bg-white text-[#5B6478]'
                    }`}
                  >
                    {upsertLive ? <Zap size={12} /> : <ZapOff size={12} />}
                    {upsertLive ? 'Live' : 'Not Live'}
                  </button>
                  <button
                    onClick={() => {
                      setUpsertZero(!upsertZero);
                      if (!upsertZero && upsertLive) {
                        setUpsertLive(false);
                        notify('info', 'Live disabled because Zero is true');
                      }
                    }}
                    className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold transition-all duration-200 ${
                      upsertZero
                        ? 'border-red-500 bg-red-50 text-red-700'
                        : 'border-[#DDE1EA] bg-white text-[#5B6478]'
                    }`}
                  >
                    {upsertZero ? <CircleDot size={12} /> : <Circle size={12} />}
                    {upsertZero ? 'Zero' : 'Not Zero'}
                  </button>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setShowUpsert(false);
                      setUpsertProgress({ current: 0, total: 0 });
                    }}
                    className="rounded-lg border border-[#DDE1EA] bg-white px-5 py-2 text-sm font-semibold text-[#5B6478] transition-all hover:bg-[#F5F6F9]"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={submitUpsert}
                    disabled={
                      upsertBusy ||
                      parsedUpsertNumbers.length === 0 ||
                      parsedUpsertNumbers.length > MAX_RECORDS
                    }
                    className="inline-flex items-center gap-2 rounded-lg bg-[#D98E31] px-6 py-2 text-sm font-bold text-white transition-all hover:bg-[#C47D2A] hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {upsertBusy && <Loader2 size={16} className="spin" />}
                    Upsert {parsedUpsertNumbers.length || ''}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="mb-5 flex flex-wrap items-center gap-3 rounded-xl bg-white p-4 shadow-sm border border-[#DDE1EA]">
          <div className="relative flex-1 min-w-[200px]">
            <Search
              size={16}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#5B6478]"
            />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search style number..."
              className={`w-full pl-9 rounded-lg border border-[#DDE1EA] bg-white px-3 py-2 text-sm text-[#1A2233] placeholder:text-[#8890A3] focus:outline-none focus:ring-2 focus:ring-[#D98E31]/40`}
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter size={16} className="text-[#5B6478]" />
            <select
              value={liveFilter}
              onChange={(e) => setLiveFilter(e.target.value)}
              className={`min-w-[130px] rounded-lg border border-[#DDE1EA] bg-white px-3 py-2 text-sm text-[#1A2233] focus:outline-none focus:ring-2 focus:ring-[#D98E31]/40`}
            >
              <option value="all">Live: All</option>
              <option value="true">Live: Yes</option>
              <option value="false">Live: No</option>
            </select>
            <select
              value={zeroFilter}
              onChange={(e) => setZeroFilter(e.target.value)}
              className={`min-w-[130px] rounded-lg border border-[#DDE1EA] bg-white px-3 py-2 text-sm text-[#1A2233] focus:outline-none focus:ring-2 focus:ring-[#D98E31]/40`}
            >
              <option value="all">Zero: All</option>
              <option value="true">Zero: Yes</option>
              <option value="false">Zero: No</option>
            </select>
          </div>
          <div className="ml-auto flex items-center gap-2 text-sm text-[#5B6478]">
            <Clock size={14} />
            <span>
              {pagination.total} style{pagination.total === 1 ? '' : 's'}
            </span>
          </div>
        </div>

        {/* Bulk Action Bar */}
        {selected.size > 0 && (
          <div className="mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-[#F0D6A8] bg-[#FBEBD4] px-4 py-3 animate-in slide-in-from-top-2">
            <span className="text-sm font-bold">
              <span className="text-[#D98E31]">{selected.size}</span> selected
            </span>
            <div className="h-4 w-px bg-[#F0D6A8]" />
            <div className="flex flex-wrap gap-1.5">
              <button
                disabled={bulkBusy}
                onClick={() => bulkUpdate('isLive', true)}
                className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700 disabled:opacity-50 hover:bg-emerald-100 transition-colors"
              >
                <Zap size={12} /> Set Live
              </button>
              <button
                disabled={bulkBusy}
                onClick={() => bulkUpdate('isLive', false)}
                className="inline-flex items-center gap-1 rounded-full border border-[#DDE1EA] bg-white px-3 py-1.5 text-xs font-bold text-[#5B6478] disabled:opacity-50 hover:bg-slate-50 transition-colors"
              >
                <ZapOff size={12} /> Set Not Live
              </button>
              <button
                disabled={bulkBusy}
                onClick={() => bulkUpdate('isZero', true)}
                className="inline-flex items-center gap-1 rounded-full border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-bold text-red-700 disabled:opacity-50 hover:bg-red-100 transition-colors"
              >
                <CircleDot size={12} /> Set Zero
              </button>
              <button
                disabled={bulkBusy}
                onClick={() => bulkUpdate('isZero', false)}
                className="inline-flex items-center gap-1 rounded-full border border-[#DDE1EA] bg-white px-3 py-1.5 text-xs font-bold text-[#5B6478] disabled:opacity-50 hover:bg-slate-50 transition-colors"
              >
                <Circle size={12} /> Set Not Zero
              </button>
            </div>
            <button
              onClick={() => setSelected(new Set())}
              className="ml-auto text-xs font-semibold text-[#5B6478] transition-colors hover:text-[#1A2233]"
            >
              Clear
            </button>
          </div>
        )}

        {/* Table */}
        <div className="overflow-hidden rounded-2xl border border-[#DDE1EA] bg-white shadow-sm">
          {error && (
            <div className="bg-[#FAE1E4] px-4 py-3 text-sm text-[#D1495B] flex items-center gap-2">
              <AlertCircle size={16} />
              {error}
            </div>
          )}
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-[#DDE1EA] bg-[#FAFAFB]">
                  <th className="w-10 px-4 py-3">
                    <button
                      onClick={toggleSelectAll}
                      className="flex text-[#5B6478] transition-colors hover:text-[#1A2233]"
                    >
                      {allSelected ? (
                        <CheckSquare size={18} className="text-[#D98E31]" />
                      ) : (
                        <Square size={18} />
                      )}
                    </button>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[#5B6478]">
                    Style Number
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[#5B6478]">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[#5B6478]">
                    Updated By
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[#5B6478]">
                    Last Updated
                  </th>
                  <th className="w-12 px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-[#5B6478]">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody>
                {loading && rows.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-[#5B6478]">
                      <Loader2 size={32} className="mx-auto spin text-[#D98E31]" />
                      <p className="mt-2 text-sm">Loading styles...</p>
                    </td>
                  </tr>
                )}
                {!loading && rows.length === 0 && !error && (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-[#5B6478]">
                      <div className="flex flex-col items-center">
                        <Search size={32} className="text-[#DDE1EA]" />
                        <p className="mt-2 text-sm">No styles found</p>
                        <p className="text-xs">Try adjusting your search or filters</p>
                      </div>
                    </td>
                  </tr>
                )}
                {rows.map((row) => {
                  const busy = rowBusy.has(row._id);
                  return (
                    <tr
                      key={row._id}
                      className={`border-b border-[#DDE1EA] transition-colors ${getRowBackground(row.isLive, row.isZero)} ${
                        selected.has(row._id) ? 'ring-1 ring-[#D98E31]/30' : ''
                      }`}
                    >
                      <td className="px-4 py-3">
                        <button
                          onClick={() => toggleSelectRow(row._id)}
                          className="flex text-[#5B6478] transition-colors hover:text-[#1A2233]"
                        >
                          {selected.has(row._id) ? (
                            <CheckSquare size={18} className="text-[#D98E31]" />
                          ) : (
                            <Square size={18} />
                          )}
                        </button>
                      </td>
                      <td className="px-4 py-3 font-bold text-[#1A2233]">{row.style_number}</td>
                      <td className="px-4 py-3">
                        <StatusBadge isLive={row.isLive} isZero={row.isZero} size="md" />
                      </td>
                      <td className="px-4 py-3 text-xs text-[#5B6478]">
                        <span className="flex items-center gap-1.5">
                          <div className="w-6 h-6 rounded-full bg-[#EEF0F4] flex items-center justify-center text-[#5B6478] text-xs font-semibold">
                            {(row.updated_by || 'S')[0].toUpperCase()}
                          </div>
                          {row.updated_by || 'System'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-[#5B6478]">
                        {row.updatedAt
                          ? new Date(row.updatedAt).toLocaleString('en-IN', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : '-'}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => openSingleUpdateModal(row)}
                          disabled={busy}
                          className="p-1.5 rounded-lg text-[#5B6478] hover:bg-[#EEF0F4] hover:text-[#D98E31] transition-all disabled:opacity-50 disabled:cursor-not-allowed group"
                          title="Edit Status"
                        >
                          <Edit3 size={16} className="group-hover:scale-110 transition-transform" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className="mt-6 flex items-center justify-center gap-3">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#DDE1EA] bg-white px-4 py-2 text-sm font-semibold text-[#5B6478] transition-all hover:bg-[#F5F6F9] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft size={16} /> Prev
            </button>
            <span className="text-sm text-[#5B6478]">
              Page <span className="font-semibold text-[#1A2233]">{pagination.page}</span> of{' '}
              <span className="font-semibold text-[#1A2233]">{pagination.pages}</span>
            </span>
            <button
              onClick={() => setPage((p) => Math.min(pagination.pages, p + 1))}
              disabled={page >= pagination.pages}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#DDE1EA] bg-white px-4 py-2 text-sm font-semibold text-[#5B6478] transition-all hover:bg-[#F5F6F9] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next <ChevronRight size={16} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default OverwriteStylesManager;
