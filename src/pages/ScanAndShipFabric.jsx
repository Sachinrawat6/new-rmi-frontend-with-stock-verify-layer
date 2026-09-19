import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import fetchOrderFromNocoDbWithOrderId from '../service/fetchNocoDbRecordsWithOrderId';
import { useOrderStore } from '../store/ordersStore';
import { useGlobalContext } from '../components/context/StockContextProvider';
import axios from 'axios';
import { BASE_URL } from '../constant';

// ---------- Tiny inline toast system ----------
const ToastStack = ({ toasts, onDismiss }) => (
  <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 w-[min(92vw,360px)]">
    {toasts.map((t) => {
      const palette = {
        success: 'bg-emerald-600 text-white',
        error: 'bg-red-600 text-white',
        warning: 'bg-amber-500 text-white',
        info: 'bg-slate-800 text-white',
      };
      return (
        <div
          key={t.id}
          role="status"
          aria-live="polite"
          className={`${palette[t.type] || palette.info} shadow-lg rounded-xl px-4 py-3 text-sm flex items-start gap-2 animate-[slideIn_.2s_ease-out]`}
        >
          <span className="mt-0.5">
            {t.type === 'success' && '✓'}
            {t.type === 'error' && '✕'}
            {t.type === 'warning' && '!'}
            {t.type === 'info' && 'ℹ'}
          </span>
          <span className="flex-1 leading-snug">{t.text}</span>
          <button
            onClick={() => onDismiss(t.id)}
            className="opacity-70 hover:opacity-100 text-xs"
            aria-label="Dismiss"
          >
            ✕
          </button>
        </div>
      );
    })}
    <style>{`@keyframes slideIn{from{opacity:0;transform:translateX(12px)}to{opacity:1;transform:translateX(0)}}`}</style>
  </div>
);

// ---------- Beep helper ----------
const playBeep = (kind = 'success') => {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = kind === 'success' ? 880 : 220;
    gain.gain.setValueAtTime(0.05, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.18);
    osc.start();
    osc.stop(ctx.currentTime + 0.2);
  } catch {
    /* silent */
  }
};

const ScanAndShipFabric = () => {
  const { setData, orders, deleteAll } = useOrderStore();

  const [orderId, setOrderId] = useState('');
  const [loading, setLoading] = useState(false);
  const orderInputRef = useRef(null);

  const [mode, setMode] = useState('order');
  const [manualStyle, setManualStyle] = useState('');
  const [manualQty, setManualQty] = useState('');
  const [manualLoading, setManualLoading] = useState(false);
  const styleInputRef = useRef(null);

  const [statusMsg, setStatusMsg] = useState(null);
  const [shipSummary, setShipSummary] = useState([]);
  const [toasts, setToasts] = useState([]);
  const [history, setHistory] = useState([]); // [{ fabric_no, style_no, qty, stock, at }]
  const hideTimerRef = useRef(null);

  const { stockLoading, styleNumber, styleLoading, stock } = useGlobalContext();

  const pushToast = useCallback((type, text, ttl = 4000) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, type, text }]);
    if (ttl) setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), ttl);
  }, []);
  const dismissToast = (id) => setToasts((prev) => prev.filter((t) => t.id !== id));

  // Auto-hide banner
  useEffect(() => {
    if (!statusMsg) return;
    if (statusMsg.type === 'error') return;
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    hideTimerRef.current = setTimeout(() => {
      setStatusMsg(null);
      setShipSummary([]);
    }, 5000);
    return () => clearTimeout(hideTimerRef.current);
  }, [statusMsg]);

  // Autofocus on tab change
  useEffect(() => {
    if (stockLoading || styleLoading) return;
    if (mode === 'order') orderInputRef.current?.focus();
    else styleInputRef.current?.focus();
  }, [mode, stockLoading, styleLoading]);

  // Esc clears inputs
  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== 'Escape') return;
      if (mode === 'order') setOrderId('');
      else {
        setManualStyle('');
        setManualQty('');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [mode]);

  const sessionTotalDeducted = useMemo(
    () => history.reduce((sum, h) => sum + (Number(h.qty) || 0), 0),
    [history]
  );

  // ---------- Helper ----------
  const sizeHelper = (size) => {
    const sizeInLowerCase = size?.toLowerCase();
    const sizes = {
      xxs: 'average_xxs_xs',
      xs: 'average_xxs_xs',
      s: 'average_s_m',
      m: 'average_s_m',
      l: 'average_l_xl',
      xl: 'average_l_xl',
      '2xl': 'average_2xl_3xl',
      '3xl': 'average_2xl_3xl',
      '4xl': 'average_4xl_5xl',
      '5xl': 'average_4xl_5xl',
    };
    return sizes[sizeInLowerCase];
  };

  const getAverageByStyleNumberAndSize = (style_number, size) => {
    if (!style_number || !size) return null;
    const numericStyleNumber = Number(style_number);
    const averageDetails = styleNumber.find((s) => s.styleNumber === numericStyleNumber);
    if (!averageDetails) return null;
    const sizeAverage = sizeHelper(size);
    if (!sizeAverage) return null;
    const fabricAvgDetails = averageDetails.fabricAvgDetails?.[0];
    if (!fabricAvgDetails?.fabrics) return null;
    const fabricNo = averageDetails.fabrics.map((f) => f.fabric_no);
    const average = fabricAvgDetails.fabrics.map((a) => a[sizeAverage]);
    return { fabricNo, average };
  };

  const buildFabricAverageGroups = (avg) => {
    if (!avg) return [];
    const { fabricNo, average } = avg;
    return fabricNo
      .map((fabric_no, i) => ({ fabric_no, fabric_avg: average[i] }))
      .filter((g) => Number.isFinite(g.fabric_avg) && g.fabric_avg > 0);
  };

  const shipOneFabric = async ({ fabric_no, fabric_avg }) => {
    try {
      const res = await axios.post(`${BASE_URL}/stock/ship`, {
        fabric_number: fabric_no,
        quantity: fabric_avg,
      });
      const updatedStock =
        res?.data?.data?.updatedStock ?? res?.data?.data?.stock?.availableStock ?? null;
      return { ok: true, fabric_no, fabric_avg, updatedStock, error: null };
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Unknown shipping error';
      return { ok: false, fabric_no, fabric_avg, updatedStock: null, error: msg };
    }
  };

  // Log to history — now includes style_no
  const logHistory = (results, styleNo = null) => {
    const now = new Date();
    const entries = results
      .filter((r) => r.ok)
      .map((r) => ({
        fabric_no: r.fabric_no,
        style_no: styleNo ?? r.style_no ?? null,
        qty: r.fabric_avg,
        stock: r.updatedStock,
        at: now,
      }));
    if (entries.length === 0) return;
    setHistory((prev) => [...entries, ...prev].slice(0, 10));
  };

  // ---------- Order-ID handler ----------
  const updateStock = async () => {
    if (loading) return;
    if (!orderId.trim()) {
      setStatusMsg({ type: 'error', text: 'Please scan or enter an order id' });
      return;
    }
    const numericId = Number(orderId);
    if (!Number.isFinite(numericId)) {
      setStatusMsg({ type: 'error', text: 'Invalid order id' });
      return;
    }
    const alreadyScanned = orders.find((o) => o.order_id === numericId);
    if (alreadyScanned) {
      setStatusMsg({ type: 'error', text: 'This order id is already scanned' });
      playBeep('error');
      return;
    }

    setLoading(true);
    setStatusMsg(null);
    setShipSummary([]);

    try {
      const data = await fetchOrderFromNocoDbWithOrderId(numericId);
      if (!data) {
        setStatusMsg({ type: 'error', text: `Order ${numericId} not found` });
        playBeep('error');
        return;
      }

      const avg = getAverageByStyleNumberAndSize(data.style_number, data.size);
      if (!avg) {
        setStatusMsg({
          type: 'error',
          text: `No average data found for style ${data.style_number} / size ${data.size}`,
        });
        playBeep('error');
        return;
      }

      const grouped = buildFabricAverageGroups(avg);
      if (grouped.length === 0) {
        setStatusMsg({ type: 'error', text: 'No valid fabric quantities to ship' });
        playBeep('error');
        return;
      }

      const results = await Promise.all(grouped.map(shipOneFabric));
      setShipSummary(results);
      logHistory(results, data.style_number);

      const succeeded = results.filter((r) => r.ok);
      const failed = results.filter((r) => !r.ok);

      if (failed.length === 0) {
        // Save order with fabric numbers attached
        setData({
          ...data,
          fabric_numbers: succeeded.map((r) => r.fabric_no),
        });
        setOrderId('');
        setStatusMsg({
          type: 'success',
          text: `Shipped ${succeeded.length} fabric(s) for order ${numericId}`,
        });
        pushToast('success', `Order ${numericId} shipped successfully`);
        playBeep('success');
        orderInputRef.current?.focus();
      } else if (succeeded.length === 0) {
        setStatusMsg({ type: 'error', text: `Shipment failed. ${failed[0].error}` });
        pushToast('error', `Order ${numericId} failed: ${failed[0].error}`, 6000);
        playBeep('error');
      } else {
        setStatusMsg({
          type: 'warning',
          text: `Partial: ${succeeded.length} shipped, ${failed.length} failed. Order not saved — rescan to retry.`,
        });
        pushToast(
          'warning',
          `Partial shipment: ${succeeded.length} ok, ${failed.length} failed`,
          6000
        );
        playBeep('error');
      }
    } catch (err) {
      console.error(err);
      const msg = err.response?.data?.message || err.message || 'Failed to process order';
      setStatusMsg({ type: 'error', text: msg });
      pushToast('error', msg);
      playBeep('error');
    } finally {
      setLoading(false);
    }
  };

  // ---------- Style handler ----------
  const updateStockByStyleNumber = async () => {
    if (manualLoading) return;

    if (!manualStyle.trim() || !manualQty) {
      setStatusMsg({ type: 'error', text: 'Style number and quantity required' });
      return;
    }

    const numericStyle = Number(manualStyle);
    const numericQty = Number(manualQty);

    if (!Number.isFinite(numericStyle)) {
      setStatusMsg({ type: 'error', text: 'Invalid style number' });
      return;
    }
    if (!Number.isFinite(numericQty) || numericQty <= 0) {
      setStatusMsg({ type: 'error', text: 'Quantity must be a positive number' });
      return;
    }

    const matchingStock = stock.find((s) => s.styleNumbers?.includes(numericStyle));
    if (!matchingStock?.fabricNumber) {
      setStatusMsg({
        type: 'error',
        text: `No fabric mapped to style ${numericStyle}`,
      });
      playBeep('error');
      return;
    }

    setManualLoading(true);
    setStatusMsg(null);
    setShipSummary([]);

    const fabricNo = matchingStock.fabricNumber;
    const result = await shipOneFabric({ fabric_no: fabricNo, fabric_avg: numericQty });

    setShipSummary([result]);
    logHistory([result], numericStyle);

    if (result.ok) {
      setStatusMsg({
        type: 'success',
        text: `Shipped ${numericQty} m for style ${numericStyle} (fabric ${fabricNo})`,
      });
      pushToast('success', `Deducted ${numericQty} m from fabric ${fabricNo}`);
      playBeep('success');
      setManualStyle('');
      setManualQty('');
      styleInputRef.current?.focus();
    } else {
      setStatusMsg({ type: 'error', text: result.error });
      pushToast('error', result.error, 6000);
      playBeep('error');
    }

    setManualLoading(false);
  };

  // ---------- Helper: fabric numbers for a scanned order ----------
  const getFabricNumbersForOrder = useCallback(
    (order) => {
      if (Array.isArray(order.fabric_numbers) && order.fabric_numbers.length) {
        return order.fabric_numbers;
      }
      // Fallback: derive from styleNumber mapping
      const numericStyle = Number(order.style_number);
      const avg = getAverageByStyleNumberAndSize(order.style_number, order.size);
      if (!avg) return [];
      return avg.fabricNo;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [styleNumber]
  );

  if (stockLoading || styleLoading) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-7 w-52 bg-gray-200 rounded-lg" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="h-96 bg-gray-100 rounded-2xl lg:col-span-1" />
            <div className="h-96 bg-gray-100 rounded-2xl" />
            <div className="h-96 bg-gray-100 rounded-2xl" />
          </div>
        </div>
      </div>
    );
  }

  const bannerStyles = {
    success: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    error: 'bg-red-50 text-red-800 border-red-200',
    warning: 'bg-amber-50 text-amber-800 border-amber-200',
    info: 'bg-blue-50 text-blue-800 border-blue-200',
  };

  const isBusy = loading || manualLoading;

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6">
      <ToastStack toasts={toasts} onDismiss={dismissToast} />

      {/* ---------- Header ---------- */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Scan &amp; Ship Fabric</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Scan orders or deduct fabric manually by style number
          </p>
        </div>
        <div className="flex items-center gap-2">
          {sessionTotalDeducted > 0 && (
            <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-rose-50 text-rose-600">
              Session: −{sessionTotalDeducted.toFixed(2)} m
            </span>
          )}
          <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-gray-100 text-gray-600">
            {orders.length} in queue
          </span>
        </div>
      </div>

      {/* ---------- 3-Column Grid ---------- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* ===================== COLUMN 1: Scan & Ship ===================== */}
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-5 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-gray-900">Scan &amp; Ship</h2>
            <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-rose-50 text-rose-600">
              Shipping
            </span>
          </div>

          {/* Tabs */}
          <div
            role="tablist"
            aria-label="Scan mode"
            className="inline-flex p-1 bg-gray-100 rounded-xl self-start"
          >
            <button
              role="tab"
              aria-selected={mode === 'order'}
              type="button"
              onClick={() => {
                setMode('order');
                setStatusMsg(null);
              }}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition ${
                mode === 'order'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Order ID
            </button>
            <button
              role="tab"
              aria-selected={mode === 'style'}
              type="button"
              onClick={() => {
                setMode('style');
                setStatusMsg(null);
              }}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition ${
                mode === 'style'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Style Number
            </button>
          </div>

          {statusMsg && (
            <div
              role="status"
              aria-live="polite"
              className={`flex items-start gap-2 px-3 py-2.5 rounded-xl border text-xs ${
                bannerStyles[statusMsg.type] || bannerStyles.info
              }`}
            >
              <span className="mt-0.5">
                {statusMsg.type === 'success' && '✓'}
                {statusMsg.type === 'error' && '✕'}
                {statusMsg.type === 'warning' && '!'}
              </span>
              <span className="flex-1">{statusMsg.text}</span>
            </div>
          )}

          {/* Order ID form */}
          {mode === 'order' && (
            <form
              className="flex flex-col gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                updateStock();
              }}
            >
              <div className="relative">
                <input
                  ref={orderInputRef}
                  type="text"
                  inputMode="numeric"
                  autoComplete="off"
                  aria-label="Order id"
                  onChange={(e) => setOrderId(e.target.value)}
                  value={orderId}
                  disabled={loading}
                  placeholder="Scan order id..."
                  className="w-full border border-gray-300 py-2.5 pl-3.5 pr-9 rounded-xl text-sm outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100 disabled:bg-gray-50 disabled:opacity-60 transition"
                />
                {orderId && !loading && (
                  <button
                    type="button"
                    aria-label="Clear"
                    onClick={() => {
                      setOrderId('');
                      orderInputRef.current?.focus();
                    }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100"
                  >
                    ✕
                  </button>
                )}
              </div>
              <button
                type="submit"
                disabled={loading || !orderId.trim()}
                className="py-2.5 px-4 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-sm font-medium cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed transition shadow-sm"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    Shipping
                  </span>
                ) : (
                  'Scan'
                )}
              </button>
            </form>
          )}

          {/* Style form */}
          {mode === 'style' && (
            <form
              className="flex flex-col gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                updateStockByStyleNumber();
              }}
            >
              <div className="relative">
                <input
                  ref={styleInputRef}
                  type="text"
                  inputMode="numeric"
                  autoComplete="off"
                  aria-label="Style number"
                  onChange={(e) => setManualStyle(e.target.value)}
                  value={manualStyle}
                  disabled={manualLoading}
                  placeholder="Style number (e.g. 1042)"
                  className="w-full border border-gray-300 py-2.5 pl-3.5 pr-9 rounded-xl text-sm outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100 disabled:bg-gray-50 disabled:opacity-60 transition"
                />
                {manualStyle && !manualLoading && (
                  <button
                    type="button"
                    aria-label="Clear style number"
                    onClick={() => {
                      setManualStyle('');
                      styleInputRef.current?.focus();
                    }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100"
                  >
                    ✕
                  </button>
                )}
              </div>

              <input
                type="number"
                min="0"
                step="0.01"
                inputMode="decimal"
                aria-label="Quantity in meters"
                onChange={(e) => setManualQty(e.target.value)}
                value={manualQty}
                disabled={manualLoading}
                placeholder="Qty (m)"
                className="border border-gray-300 py-2.5 px-3.5 rounded-xl text-sm outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100 disabled:bg-gray-50 disabled:opacity-60 transition"
              />
              <button
                type="submit"
                disabled={manualLoading || !manualStyle.trim() || !manualQty}
                className="py-2.5 px-4 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-sm font-medium cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed transition shadow-sm"
              >
                {manualLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    Shipping
                  </span>
                ) : (
                  'Ship'
                )}
              </button>
              <p className="text-[11px] text-gray-500 leading-relaxed">
                Manual deduction — the fabric mapped to this style will be reduced. Press{' '}
                <kbd className="px-1 py-0.5 bg-gray-100 border border-gray-200 rounded text-[10px]">
                  Enter
                </kbd>{' '}
                to ship,{' '}
                <kbd className="px-1 py-0.5 bg-gray-100 border border-gray-200 rounded text-[10px]">
                  Esc
                </kbd>{' '}
                to clear.
              </p>
            </form>
          )}

          {/* Inline deduction summary */}
          {shipSummary.length > 0 && (
            <div className="mt-1 border-t border-gray-100 pt-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
                  Deduction
                </h3>
                <span className="text-[11px] text-gray-500">
                  {shipSummary.filter((s) => s.ok).length}/{shipSummary.length} shipped
                </span>
              </div>

              <div className="overflow-hidden rounded-lg border border-gray-100">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50 text-gray-600">
                    <tr>
                      <th className="py-2 px-2.5 text-left font-medium">Fabric</th>
                      <th className="py-2 px-2.5 text-right font-medium">− Qty</th>
                      <th className="py-2 px-2.5 text-right font-medium">Stock</th>
                      <th className="py-2 px-2.5 text-center font-medium">✓</th>
                    </tr>
                  </thead>
                  <tbody>
                    {shipSummary.map((s, i) => (
                      <tr key={i} className="border-t border-gray-100">
                        <td className="py-1.5 px-2.5 font-mono text-gray-800">{s.fabric_no}</td>
                        <td className="py-1.5 px-2.5 text-right text-rose-600 font-medium">
                          {s.ok ? `−${Number(s.fabric_avg).toFixed(2)}` : '—'}
                        </td>
                        <td className="py-1.5 px-2.5 text-right text-gray-800">
                          {s.ok && s.updatedStock !== null
                            ? Number(s.updatedStock).toFixed(2)
                            : '—'}
                        </td>
                        <td className="py-1.5 px-2.5 text-center">
                          {s.ok ? (
                            <span className="text-emerald-600">✓</span>
                          ) : (
                            <span className="text-red-500" title={s.error}>
                              ✕
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {shipSummary.some((s) => !s.ok) && (
                <ul className="mt-2 text-[11px] text-red-600 space-y-0.5">
                  {shipSummary
                    .filter((s) => !s.ok)
                    .map((s, i) => (
                      <li key={i}>
                        <span className="font-mono">{s.fabric_no}</span>: {s.error}
                      </li>
                    ))}
                </ul>
              )}
            </div>
          )}
        </div>

        {/* ===================== COLUMN 2: Recent Activity ===================== */}
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-5 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-semibold text-gray-900">Recent Activity</h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Last {history.length} successful deduction{history.length !== 1 ? 's' : ''}
              </p>
            </div>
            {history.length > 0 && (
              <button
                onClick={() => setHistory([])}
                className="text-xs text-gray-500 hover:text-gray-800"
              >
                Clear
              </button>
            )}
          </div>

          {history.length === 0 ? (
            <div className="text-center py-12 text-sm text-gray-400">No activity yet</div>
          ) : (
            <ul className="divide-y divide-gray-100 max-h-[520px] overflow-y-auto -mx-1">
              {history.map((h, i) => (
                <li key={i} className="py-3 px-1 flex flex-col gap-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0" />
                      <span className="font-mono text-sm text-gray-800 truncate">
                        Fabric {h.fabric_no}
                      </span>
                    </div>
                    <span className="text-sm font-semibold text-rose-600">
                      −{Number(h.qty).toFixed(2)} m
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-gray-500 pl-4">
                    <div className="flex items-center gap-2">
                      {h.style_no != null && (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-gray-100 text-gray-700 font-medium">
                          Style {h.style_no}
                        </span>
                      )}
                      {h.stock !== null && h.stock !== undefined && (
                        <span>stock: {Number(h.stock).toFixed(2)}</span>
                      )}
                    </div>
                    <span>
                      {h.at.toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      })}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* ===================== COLUMN 3: Scanned Orders ===================== */}
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-5 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-semibold text-gray-900">Scanned Orders</h2>
              <p className="text-xs text-gray-500 mt-0.5">
                {orders.length} order{orders.length !== 1 ? 's' : ''} in queue
              </p>
            </div>
            <button
              onClick={() => {
                if (orders.length === 0) return;
                if (window.confirm(`Delete all ${orders.length} scanned orders?`)) {
                  deleteAll();
                  pushToast('info', 'All scanned orders cleared');
                }
              }}
              disabled={isBusy || orders.length === 0}
              className="text-xs font-medium px-3 py-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              Delete All
            </button>
          </div>

          {orders.length === 0 ? (
            <div className="text-center py-12 text-sm text-gray-400">No orders scanned yet</div>
          ) : (
            <div className="overflow-y-auto max-h-[520px] -mx-2">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-white">
                  <tr className="border-b border-gray-100">
                    <th className="py-2 px-2 text-left font-medium text-gray-500 uppercase tracking-wide">
                      Order
                    </th>
                    <th className="py-2 px-2 text-left font-medium text-gray-500 uppercase tracking-wide">
                      Style
                    </th>
                    <th className="py-2 px-2 text-left font-medium text-gray-500 uppercase tracking-wide">
                      Size
                    </th>
                    <th className="py-2 px-2 text-left font-medium text-gray-500 uppercase tracking-wide">
                      Fabrics
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order) => {
                    const fabrics = getFabricNumbersForOrder(order);
                    return (
                      <tr
                        key={order.order_id}
                        className="border-b border-gray-50 last:border-0 hover:bg-gray-50/60 transition align-top"
                      >
                        <td className="py-2.5 px-2 font-mono text-gray-800">{order.order_id}</td>
                        <td className="py-2.5 px-2 text-gray-700">{order.style_number}</td>
                        <td className="py-2.5 px-2">
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-gray-100 text-gray-700">
                            {order.size}
                          </span>
                        </td>
                        <td className="py-2.5 px-2">
                          {fabrics.length === 0 ? (
                            <span className="text-gray-400">—</span>
                          ) : (
                            <div className="flex flex-wrap gap-1">
                              {fabrics.map((fn, i) => (
                                <span
                                  key={i}
                                  className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-medium bg-rose-50 text-rose-700"
                                >
                                  {fn}
                                </span>
                              ))}
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ScanAndShipFabric;
