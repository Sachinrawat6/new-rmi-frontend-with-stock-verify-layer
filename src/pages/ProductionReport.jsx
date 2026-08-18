import axios from 'axios';
import { PulseLoader } from 'react-spinners';
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import fetchOrdersFromNocoDbWithSyncId from '../service/fetchNocoDbRecords';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useGlobalContext } from '../components/context/StockContextProvider';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { BASE_URL } from '../constant/index.js';

const CHANNELS = ['Myntra', 'Nykaa', 'Ajio', 'Tatacliq', 'Shopify'];

/* ─────────────────────────── Helpers ─────────────────────────── */

// Sort by shortfall (descending - highest first)
const sortByShortfallDesc = (entries) =>
  [...entries].sort(([, a], [, b]) => {
    return (b.shortfall || 0) - (a.shortfall || 0);
  });

// Sort by total used fabric (descending - highest first)
const sortByUsedFabricDesc = (entries) =>
  [...entries].sort(([, a], [, b]) => {
    return (b.totalMeter || 0) - (a.totalMeter || 0);
  });

/* ─────────────────────────── Sub-components ──────────────────── */

const StatChip = ({ label, value, color = 'slate' }) => {
  const map = {
    slate: 'bg-slate-50   border-slate-200   text-slate-700',
    blue: 'bg-blue-50    border-blue-200    text-blue-700',
    red: 'bg-red-50     border-red-200     text-red-700',
    emerald: 'bg-emerald-50 border-emerald-200 text-emerald-700',
    amber: 'bg-amber-50   border-amber-200   text-amber-700',
  };
  return (
    <div className={`rounded-2xl border p-4 ${map[color]}`}>
      <p className="text-xs font-semibold uppercase tracking-wide opacity-60 mb-1">{label}</p>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  );
};

const Btn = ({
  onClick,
  disabled,
  variant = 'indigo',
  size = 'md',
  icon,
  children,
  className = '',
}) => {
  const sizes = { sm: 'px-3 py-1.5 text-xs', md: 'px-4 py-2.5 text-sm' };
  const vars = {
    indigo:
      'bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white shadow-indigo-100',
    emerald:
      'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-emerald-100',
    violet:
      'bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white shadow-violet-100',
    orange:
      'bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white shadow-orange-100',
    red: 'bg-gradient-to-r from-red-600   to-rose-600   hover:from-red-700   hover:to-rose-700   text-white shadow-red-100',
    cyan: 'bg-gradient-to-r from-cyan-500  to-teal-500   hover:from-cyan-600  hover:to-teal-600   text-white shadow-cyan-100',
    slate: 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 shadow-slate-100',
  };
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center gap-2 font-semibold rounded-xl transition-all shadow-sm
        disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer
        ${sizes[size]} ${vars[variant]} ${className}`}
    >
      {icon && <span className="shrink-0">{icon}</span>}
      {children}
    </button>
  );
};

/* ─────────────────────────── Main ────────────────────────────── */
const ProductionReport = () => {
  const { stock, stockLoading, fetchMeterAndKgRelationShip, meterAndKG, styleLoading } =
    useGlobalContext();

  /* state */
  const [filteredData, setFilteredData] = useState([]);
  const [syncLogData, setSyncLogData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [channelFilter, setChannelFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [productionStyles, setProductionStyles] = useState([]);
  const [averageData, setAverageData] = useState([]);
  const [groupedData, setGroupedData] = useState(null);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [fabricUsageData, setFabricUsageData] = useState(null);
  const [activeTab, setActiveTab] = useState('sync-log');
  const [daysFilter, setDaysFilter] = useState('30');
  const [vendorFilter, setVendorFilter] = useState('');
  const [sortBy, setSortBy] = useState('used');

  const exportMenuRef = useRef(null);

  /* close export dropdown on outside click */
  useEffect(() => {
    const h = (e) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target))
        setShowExportMenu(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  /* initial fetches */
  useEffect(() => {
    fetchMeterAndKgRelationShip();
  }, []);

  console.log('stock ', stock);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [syncRes, avgRes] = await Promise.all([
          axios.get('https://picklist-backend.onrender.com/api/v1/picklist-history'),
          axios.get(`${BASE_URL}/average`),
        ]);
        setSyncLogData(syncRes.data.data);
        setAverageData(avgRes.data.data || []);
      } catch {
        toast.error('Failed to load initial data.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  /* filter sync log */
  useEffect(() => {
    let r = syncLogData;
    if (channelFilter)
      r = r.filter((x) => x.channel?.toLowerCase().includes(channelFilter.toLowerCase()));
    if (dateFrom) r = r.filter((x) => new Date(x.createdAt) >= new Date(dateFrom));
    if (dateTo) r = r.filter((x) => new Date(x.createdAt) <= new Date(dateTo));
    setFilteredData(r);
  }, [syncLogData, channelFilter, dateFrom, dateTo]);

  /* fetch NocoDB records */
  const fetchNocoDbRecords = useCallback(async () => {
    if (!filteredData.length) return;
    setLoading(true);
    try {
      const ids = filteredData.map((r) => r.sync_id);
      const all = await Promise.all(ids.map((id) => fetchOrdersFromNocoDbWithSyncId(id)));
      setProductionStyles(all.flat());
    } catch {
      toast.error('Failed to fetch NocoDB records.');
    } finally {
      setLoading(false);
    }
  }, [filteredData]);

  /* group records / missing averages */
  const getGroupedRecords = useCallback(() => {
    if (!productionStyles.length) return;
    const channelMap = {};
    const missingAverages = [];
    for (const r of productionStyles) {
      if (r.channel) channelMap[r.channel] = (channelMap[r.channel] || 0) + 1;
    }
    const styleMap = new Map();
    averageData.forEach((item) => styleMap.set(Number(item.style_number), item));
    const sizeFieldMap = {
      XXS: 'average_xxs_xs',
      XS: 'average_xxs_xs',
      S: 'average_s_m',
      M: 'average_s_m',
      L: 'average_l_xl',
      XL: 'average_l_xl',
      '2XL': 'average_2xl_3xl',
      '3XL': 'average_2xl_3xl',
      '4XL': 'average_4xl_5xl',
      '5XL': 'average_4xl_5xl',
    };
    for (const order of productionStyles) {
      const ms = styleMap.get(Number(order.style_number));
      if (!ms) {
        missingAverages.push({
          order_id: order.order_id || 'N/A',
          style_number: order.style_number || 'N/A',
          channel: order.channel || 'N/A',
          patternNumber: 'N/A',
          size: order.size || 'N/A',
          reason: 'Style not found',
          missing_field: 'N/A',
        });
        continue;
      }
      if (!ms.fabrics?.length) {
        missingAverages.push({
          order_id: order.order_id || 'N/A',
          style_number: order.style_number || 'N/A',
          channel: order.channel || 'N/A',
          patternNumber: ms.patternNumber || 'N/A',
          size: order.size || 'N/A',
          reason: 'No fabrics found',
          missing_field: 'N/A',
        });
        continue;
      }
      const size = order.size?.toUpperCase().trim();
      const field = sizeFieldMap[size];
      if (!field) {
        missingAverages.push({
          order_id: order.order_id || 'N/A',
          channel: order.channel || 'N/A',
          style_number: order.style_number || 'N/A',
          patternNumber: ms.patternNumber || 'N/A',
          size: size || 'N/A',
          reason: 'Invalid size',
          missing_field: 'N/A',
        });
        continue;
      }
      ms.fabrics.forEach((fab) => {
        if (fab[field] === undefined || fab[field] === null)
          missingAverages.push({
            order_id: order.order_id || 'N/A',
            style_number: order.style_number || 'N/A',
            channel: order.channel || 'N/A',
            patternNumber: ms.patternNumber || 'N/A',
            size: size || 'N/A',
            reason: 'Missing average',
            missing_field: field,
            fabric_id: fab._id || 'N/A',
          });
      });
    }
    setGroupedData({
      channelMap,
      missingAverages,
      totalOrders: productionStyles.length,
      generatedAt: new Date().toLocaleString(),
    });
    setShowExportMenu(true);
  }, [productionStyles, averageData]);

  /* shared fabric-usage builder with blocked_stock_days support */
  const buildFabricUsage = useCallback(() => {
    if (!productionStyles?.length || !averageData?.length || !stock?.length) return null;

    const getAvg = (size, fab) => {
      if (!fab) return 0;
      const s = String(size).toUpperCase();
      if (['XXS', 'XS'].includes(s)) return fab.average_xxs_xs || 0;
      if (['S', 'M'].includes(s)) return fab.average_s_m || 0;
      if (['L', 'XL'].includes(s)) return fab.average_l_xl || 0;
      if (['2XL', '3XL'].includes(s)) return fab.average_2xl_3xl || 0;
      if (['4XL', '5XL'].includes(s)) return fab.average_4xl_5xl || 0;
      return 0;
    };

    let numberOfDays = 7;
    if (dateFrom && dateTo) {
      numberOfDays = Math.max(1, (new Date(dateTo) - new Date(dateFrom)) / 86400000);
    } else if (filteredData.length > 0) {
      const ts = filteredData.map((r) => new Date(r.createdAt).getTime()).filter(Boolean);
      if (ts.length > 1) numberOfDays = Math.max(1, (Math.max(...ts) - Math.min(...ts)) / 86400000);
    }

    const combined = [];
    productionStyles.forEach((ps) => {
      stock.forEach((st) => {
        const styleNum = String(ps.style_number);
        const matches =
          Array.isArray(st.styleNumbers) && st.styleNumbers.some((sn) => String(sn) === styleNum);
        if (matches) {
          combined.push({
            ...ps,
            fabricNumber: st.fabricNumber,
            fabricName: st.fabricName,
            remainingStock: st.availableStock || 0,
            status: st.status,
            vendor_source: st.vendor_source || 'Unknown',
            blocked_stock_days: st.blocked_stock_days || 0,
          });
        }
      });
    });

    const withAvg = [];
    combined.forEach((ac) => {
      averageData.forEach((avg) => {
        if (String(avg.style_number) === String(ac.style_number))
          withAvg.push({ ...ac, fabrics: avg.fabrics || [] });
      });
    });

    const fu = {};
    withAvg.forEach((item) => {
      item.fabrics.forEach((fab) => {
        const fn = String(item.fabricNumber);
        const m = getAvg(item.size, fab);
        if (!fu[fn]) {
          fu[fn] = {
            fabricName: item.fabricName || 'Unknown',
            reStock: Number(item.remainingStock) || 0,
            totalMeter: 0,
            totalPieces: 0,
            status: item.status,
            vendor_source: item.vendor_source || 'Unknown',
            blocked_stock_days: Number(item.blocked_stock_days) || 0,
            styleNumbers: [],
            dailyUsage: 0,
            daysOfStock: null,
            shortfall: 0,
          };
        } else {
          fu[fn].reStock = Number(item.remainingStock) || 0;
          fu[fn].vendor_source = item.vendor_source || 'Unknown';
          fu[fn].blocked_stock_days = Number(item.blocked_stock_days) || 0;
        }
        fu[fn].totalMeter += m;
        fu[fn].totalPieces += 1;
        if (!fu[fn].styleNumbers.includes(String(item.style_number))) {
          fu[fn].styleNumbers.push(String(item.style_number));
        }
      });
    });

    Object.values(fu).forEach((d) => {
      const daily = d.totalMeter / numberOfDays;
      const reStock = Number(d.reStock) || 0;

      d.dailyUsage = daily;

      // Calculate days of stock
      if (daily > 0) {
        d.daysOfStock = Math.round(reStock / daily);
      } else {
        d.daysOfStock = null;
      }
    });

    return { fabricUsage: fu, numberOfDays };
  }, [productionStyles, averageData, stock, filteredData, dateFrom, dateTo]);

  /* auto-compute fabric usage */
  useEffect(() => {
    if (!productionStyles.length) {
      setFabricUsageData(null);
      return;
    }
    setFabricUsageData(buildFabricUsage());
  }, [productionStyles, buildFabricUsage]);

  /* Get only fabrics with shortfall > 0 */
  const shortfallFabrics = useMemo(() => {
    if (!fabricUsageData) return [];
    const threshold = daysFilter !== '' ? Number(daysFilter) : 30;

    let entries = Object.entries(fabricUsageData.fabricUsage).filter(([, d]) => {
      if (vendorFilter && d.vendor_source !== vendorFilter) return false;
      if (d.status === false) return false;
      return true;
    });

    // Calculate shortfall and filter only those with shortfall > 0
    entries = entries
      .map(([fn, d]) => {
        const dailyUsage = d.dailyUsage || 0;
        const availableStock = Number(d.reStock) || 0;
        const blockedDays = Number(d.blocked_stock_days) || 0;

        // A fabric only needs to survive until fresh stock can actually land.
        // If this fabric's blocked (lead-time) period is shorter than the
        // selected forecast window, cap the projection at the blocked days -
        // projecting usage past that point overstates the shortfall, since
        // new stock arrives once the blocked period ends.
        const effectiveDays = blockedDays > 0 ? Math.min(threshold, blockedDays) : threshold;

        // Fabric needed for the effective period
        const usageInThreshold = dailyUsage * effectiveDays;

        // Shortfall = Needed - Available Stock
        const shortfall = Math.max(0, usageInThreshold - availableStock);

        // Days of stock based on available stock and daily usage
        const daysOfStock = dailyUsage > 0 ? Math.round(availableStock / dailyUsage) : null;

        return [
          fn,
          {
            ...d,
            shortfall,
            daysOfStock,
            usageInThreshold,
            effectiveDays,
            blockedDays: blockedDays, // Each fabric's actual blocked days
          },
        ];
      })
      // Only keep fabrics with shortfall > 0
      .filter(([, d]) => d.shortfall > 0);

    // Apply sorting
    if (sortBy === 'used') {
      entries = sortByUsedFabricDesc(entries);
    } else {
      entries = sortByShortfallDesc(entries);
    }

    return entries;
  }, [fabricUsageData, daysFilter, vendorFilter, sortBy]);

  /* vendor-wise shortfall rows - only fabrics with shortfall > 0 */
  const vendorShortfallRows = useMemo(() => {
    if (!fabricUsageData) return {};
    const threshold = daysFilter !== '' ? Number(daysFilter) : 30;
    const useMostUsedSort = sortBy === 'used';

    const vendorMap = {};
    Object.entries(fabricUsageData.fabricUsage).forEach(([fn, d]) => {
      if (d.status === false) return;
      if (vendorFilter && d.vendor_source !== vendorFilter) return;

      const blockedDays = Number(d.blocked_stock_days) || 0;
      const dailyUsage = d.dailyUsage || 0;
      const availableStock = Number(d.reStock) || 0;

      // Same fix as shortfallFabrics: cap the projection window at this
      // fabric's blocked/lead-time days when that's shorter than the
      // selected forecast threshold, so we don't over-project usage past
      // the point new stock actually becomes available.
      const effectiveDays = blockedDays > 0 ? Math.min(threshold, blockedDays) : threshold;

      // Fabric needed for the effective period
      const usageInThreshold = dailyUsage * effectiveDays;

      // Shortfall = Needed - Available Stock
      const shortfallMeters = Math.max(0, usageInThreshold - availableStock);

      // Only include if shortfall > 0
      if (shortfallMeters <= 0) return;

      const vendor = d.vendor_source || 'Unknown';
      if (!vendorMap[vendor]) {
        vendorMap[vendor] = [];
      }

      // Days of stock
      const daysOfStock = dailyUsage > 0 ? Math.round(availableStock / dailyUsage) : null;

      vendorMap[vendor].push({
        fabricNumber: fn,
        fabricName: d.fabricName || '—',
        currentStock: availableStock,
        dailyUsage: dailyUsage,
        daysOfStock: daysOfStock,
        blockedStockDays: blockedDays, // Each fabric's actual blocked days
        totalMeter: d.totalMeter || 0,
        shortfallMeters: shortfallMeters,
        usageInThreshold: usageInThreshold,
        styleNumbers: d.styleNumbers || [],
        status: d.status,
      });
    });

    Object.keys(vendorMap).forEach((vendor) => {
      // Sort by most-used fabric (highest total meter used) or by shortfall
      if (useMostUsedSort) {
        vendorMap[vendor].sort((a, b) => (b.totalMeter || 0) - (a.totalMeter || 0));
      } else {
        vendorMap[vendor].sort((a, b) => b.shortfallMeters - a.shortfallMeters);
      }
    });

    return vendorMap;
  }, [fabricUsageData, daysFilter, vendorFilter, sortBy]);

  /* Get unique vendors */
  const uniqueVendors = useMemo(() => {
    if (!fabricUsageData) return [];
    const vendors = new Set();
    Object.values(fabricUsageData.fabricUsage).forEach((d) => {
      if (d.vendor_source) vendors.add(d.vendor_source);
    });
    return Array.from(vendors).sort();
  }, [fabricUsageData]);

  /* ── PDF Exports ──────────────────────────────────────────────── */

  /* 1. Channel Summary PDF */
  const exportChannelSummaryPDF = useCallback(() => {
    if (!groupedData) return;
    try {
      const { channelMap, totalOrders } = groupedData;
      const doc = new jsPDF(),
        pw = doc.internal.pageSize.getWidth();
      doc.setFontSize(18);
      doc.setTextColor(41, 128, 185);
      doc.text('CHANNEL SUMMARY REPORT', pw / 2, 20, { align: 'center' });
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text(`Generated: ${new Date().toLocaleString()}`, pw / 2, 30, { align: 'center' });
      doc.text(`Total Orders: ${totalOrders || 0}`, 14, 45);
      const total = Object.values(channelMap).reduce((a, b) => a + b, 0);
      autoTable(doc, {
        head: [['Channel', 'Order Count', 'Percentage']],
        body: Object.entries(channelMap).map(([ch, cnt]) => [
          ch,
          cnt.toString(),
          total ? ((cnt / total) * 100).toFixed(2) + '%' : '0%',
        ]),
        startY: 55,
        theme: 'striped',
        headStyles: { fillColor: [41, 128, 185], textColor: 255 },
        styles: { fontSize: 11 },
      });
      doc.save(`channel_summary_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch {
      toast.error('Error generating PDF.');
    }
  }, [groupedData]);

  /* 2. Missing Averages PDF */
  const exportMissingAveragesPDF = useCallback(() => {
    if (!groupedData) return;
    try {
      const { missingAverages } = groupedData;
      const doc = new jsPDF('landscape');
      doc.setFontSize(20);
      doc.setTextColor(231, 76, 60);
      doc.text('MISSING AVERAGES REPORT', 148, 20, { align: 'center' });
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text(`Generated: ${new Date().toLocaleString()}`, 148, 28, { align: 'center' });
      doc.text(
        `Unique Patterns: ${new Set(missingAverages.map((i) => i.patternNumber)).size}`,
        148,
        35,
        { align: 'center' }
      );
      const pm = new Map();
      missingAverages.forEach((item) => {
        if (!pm.has(item.patternNumber))
          pm.set(item.patternNumber, {
            style_number: item.style_number || 'N/A',
            patternNumber: item.patternNumber || 'N/A',
          });
      });
      const ud = Array.from(pm.values());
      if (ud.length) {
        autoTable(doc, {
          head: [
            [
              'S.No',
              'Style Number',
              'Pattern Number',
              'XXS_XS',
              'S_M',
              'L_XL',
              '2XL_3XL',
              '4XL_5XL',
            ],
          ],
          body: ud
            .sort((a, b) => b.style_number - a.style_number)
            .map((item, i) => [
              (i + 1).toString(),
              item.style_number,
              item.patternNumber,
              '',
              '',
              '',
              '',
              '',
            ]),
          startY: 45,
          theme: 'grid',
          headStyles: {
            fillColor: [231, 76, 60],
            textColor: 255,
            fontStyle: 'bold',
            fontSize: 14,
            halign: 'center',
            valign: 'middle',
          },
          styles: {
            fontSize: 18,
            cellPadding: 4,
            lineColor: [0, 0, 0],
            lineWidth: 0.2,
            halign: 'center',
            valign: 'middle',
          },
          columnStyles: {
            0: { cellWidth: 20 },
            1: { cellWidth: 45 },
            2: { cellWidth: 50 },
            3: { cellWidth: 30, fillColor: [255, 240, 240] },
            4: { cellWidth: 30, fillColor: [255, 240, 240] },
            5: { cellWidth: 30, fillColor: [255, 240, 240] },
            6: { cellWidth: 30, fillColor: [255, 240, 240] },
            7: { cellWidth: 30, fillColor: [255, 240, 240] },
          },
          margin: { left: 10, right: 10 },
        });
      } else {
        doc.setFontSize(18);
        doc.text('No missing averages found!', 148, 60, { align: 'center' });
      }
      const pc = doc.internal.getNumberOfPages();
      for (let i = 1; i <= pc; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text(
          `Page ${i} of ${pc}`,
          doc.internal.pageSize.getWidth() / 2,
          doc.internal.pageSize.getHeight() - 10,
          { align: 'center' }
        );
      }
      doc.save(`missing_averages_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (err) {
      toast.error('Error: ' + err.message);
    }
  }, [groupedData]);

  /* 3. Unmapped Relationship PDF */
  const generateUnmappedRelationshipData = useCallback(() => {
    if (!filteredData.length) {
      toast.error('No data.');
      return;
    }
    const sns = productionStyles.map((r) => String(r.style_number));
    const set = new Set();
    stock.forEach((s) => {
      if (s.styleNumbers.some((sn) => sns.includes(String(sn)))) set.add(s.fabricNumber);
    });
    const unmapped = [...set].filter((un) =>
      meterAndKG.some(
        (m) =>
          String(m.fabric_number) === String(un) &&
          (m.fabric_in_meter === null || m.fabric_in_meter === 0)
      )
    );
    if (!unmapped.length) {
      toast.success('No unmapped fabric numbers found!');
      return;
    }
    const doc = new jsPDF(),
      today = new Date();
    doc.setFontSize(18);
    doc.setTextColor(40, 40, 40);
    doc.text('Unmapped Fabric KG & MTR Report', 14, 22);
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(`Generated: ${today.toLocaleDateString('en-IN')}`, 14, 30);
    doc.setFontSize(11);
    doc.setTextColor(60, 60, 60);
    doc.text(`Total: ${unmapped.length}`, 14, 38);
    autoTable(doc, {
      head: [['S.No', 'Fabric Number', 'Status']],
      body: unmapped.map((fn, i) => {
        const fd = meterAndKG.find((m) => String(m.fabric_number) === String(fn));
        return [(i + 1).toString(), fn, fd?.fabric_in_meter === null ? 'Null' : 'Zero'];
      }),
      startY: 45,
      theme: 'striped',
      headStyles: { fillColor: [79, 70, 229], textColor: [255, 255, 255], fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [245, 245, 250] },
    });
    doc.save(`unmapped-fabrics-${today.toISOString().split('T')[0]}.pdf`);
  }, [filteredData, productionStyles, stock, meterAndKG]);

  /* 4. Shortfall Report PDF - Only fabrics with shortfall > 0 */
  const downloadShortfallReport = useCallback(() => {
    if (!fabricUsageData || shortfallFabrics.length === 0) {
      toast.error('No shortfall data available.');
      return;
    }

    const { numberOfDays } = fabricUsageData;
    const threshold = daysFilter !== '' ? Number(daysFilter) : 30;

    // Get only fabrics with shortfall > 0
    let entries = shortfallFabrics;
    if (vendorFilter) {
      entries = entries.filter(([, d]) => d.vendor_source === vendorFilter);
    }

    if (entries.length === 0) {
      toast.error('No fabrics with shortfall match the filter.');
      return;
    }

    const doc = new jsPDF('landscape'),
      today = new Date(),
      pw = doc.internal.pageSize.getWidth();

    // Header
    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, pw, 38, 'F');

    doc.setFontSize(16);
    doc.setTextColor(255, 255, 255);
    doc.text(`SHORTFALL REPORT — NEXT ${threshold} DAYS`, pw / 2, 14, { align: 'center' });

    doc.setFontSize(9);
    doc.setTextColor(148, 163, 184);
    doc.text(
      `Generated: ${today.toLocaleString()}  |  Period: ${Math.round(numberOfDays)} day(s)${vendorFilter ? `  |  Vendor: ${vendorFilter}` : ''}  |  Total Fabrics: ${entries.length}`,
      pw / 2,
      23,
      { align: 'center' }
    );

    // Table with all required columns
    autoTable(doc, {
      startY: 44,
      head: [
        [
          'S.No',
          'Fabric No.',
          'Fabric Name',
          'Total Used (MTR)',
          'Daily Used (MTR/d)',
          'Available Stock (MTR)',
          'Days Left',
          'Blocked Days',
          'Shortfall (MTR)',
        ],
      ],
      body: entries.map(([fn, d], i) => {
        return [
          i + 1,
          fn,
          d.fabricName || '—',
          Number(d.totalMeter || 0).toFixed(2),
          Number(d.dailyUsage || 0).toFixed(2),
          d.reStock === 0 ? '0.00' : Number(d.reStock || 0).toFixed(2),
          d.daysOfStock !== null ? d.daysOfStock : '∞',
          d.blocked_stock_days || 0, // Actual blocked days from stock
          d.shortfall.toFixed(2),
        ];
      }),
      styles: { fontSize: 9, halign: 'center', cellPadding: 3 },
      headStyles: {
        fillColor: [41, 128, 185],
        textColor: 255,
        fontStyle: 'bold',
        fontSize: 9,
      },
      columnStyles: {
        0: { cellWidth: 12 },
        1: { cellWidth: 22 },
        2: { halign: 'left', cellWidth: 40 },
        3: { cellWidth: 25 },
        4: { cellWidth: 25 },
        5: { cellWidth: 25 },
        6: { cellWidth: 20 },
        7: { cellWidth: 20 },
        8: { cellWidth: 25, fillColor: [255, 220, 220] },
      },
      didParseCell: (h) => {
        // Highlight shortfall column
        if (h.section === 'body' && h.column.index === 8) {
          const v = Number(h.cell.raw);
          if (v > 0) {
            h.cell.styles.fillColor = [255, 200, 200];
            h.cell.styles.textColor = [153, 27, 27];
            h.cell.styles.fontStyle = 'bold';
          }
        }
      },
      alternateRowStyles: { fillColor: [248, 250, 252] },
    });

    const pc = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pc; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text(`Page ${i} of ${pc}`, pw / 2, doc.internal.pageSize.getHeight() - 8, {
        align: 'center',
      });
    }

    const dateString = today.toISOString().split('T')[0];
    const fname = vendorFilter
      ? `Shortfall_Report_${vendorFilter}_${dateString}.pdf`
      : `Shortfall_Report_${dateString}.pdf`;

    doc.save(fname);
    toast.success('Shortfall report exported successfully!');
  }, [fabricUsageData, shortfallFabrics, vendorFilter, daysFilter]);

  /* 4b. Shortfall Report CSV - same rows/columns as the PDF export */
  const downloadShortfallCSV = useCallback(() => {
    if (!fabricUsageData || shortfallFabrics.length === 0) {
      toast.error('No shortfall data available.');
      return;
    }

    let entries = shortfallFabrics;
    if (vendorFilter) {
      entries = entries.filter(([, d]) => d.vendor_source === vendorFilter);
    }

    if (entries.length === 0) {
      toast.error('No fabrics with shortfall match the filter.');
      return;
    }

    const threshold = daysFilter !== '' ? Number(daysFilter) : 30;

    const escapeCsv = (val) => {
      const s = String(val ?? '');
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };

    const headers = [
      'S.No',
      'Fabric No.',
      'Fabric Name',
      'Total Used (MTR)',
      'Daily Used (MTR/d)',
      'Available Stock (MTR)',
      'Days Left',
      'Blocked Days',
      'Vendor',
      'Shortfall (MTR)',
    ];

    const rows = entries.map(([fn, d], i) => [
      i + 1,
      fn,
      d.fabricName || '—',
      Number(d.totalMeter || 0).toFixed(2),
      Number(d.dailyUsage || 0).toFixed(2),
      d.reStock === 0 ? '0.00' : Number(d.reStock || 0).toFixed(2),
      d.daysOfStock !== null ? d.daysOfStock : 'Infinity',
      d.blocked_stock_days || 0,
      d.vendor_source || 'Unknown',
      d.shortfall.toFixed(2),
    ]);

    const csvContent = [headers, ...rows].map((row) => row.map(escapeCsv).join(',')).join('\r\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const dateString = new Date().toISOString().split('T')[0];
    const fname = vendorFilter
      ? `Shortfall_Report_${vendorFilter}_${dateString}.csv`
      : `Shortfall_Report_${dateString}.csv`;

    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', fname);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success('Shortfall CSV exported successfully!');
  }, [fabricUsageData, shortfallFabrics, vendorFilter, daysFilter]);

  /* 5. Vendor Shortfall Report PDF - Only vendors with shortfall > 0 */
  const exportVendorShortfallPDF = useCallback(() => {
    if (!fabricUsageData || Object.keys(vendorShortfallRows).length === 0) {
      toast.error('No shortfall data available.');
      return;
    }

    const doc = new jsPDF('landscape');
    const today = new Date();
    const pw = doc.internal.pageSize.getWidth();
    const threshold = daysFilter !== '' ? Number(daysFilter) : 30;

    let sortedVendors = Object.keys(vendorShortfallRows).sort();
    if (vendorFilter) {
      sortedVendors = sortedVendors.filter((v) => v === vendorFilter);
      if (sortedVendors.length === 0) {
        toast.error(`No shortfall data found for vendor: ${vendorFilter}`);
        return;
      }
    }

    // Header
    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, pw, 38, 'F');

    doc.setFontSize(16);
    doc.setTextColor(255, 255, 255);
    doc.text(`VENDOR SHORTFALL REPORT — NEXT ${threshold} DAYS`, pw / 2, 14, { align: 'center' });

    doc.setFontSize(9);
    doc.setTextColor(148, 163, 184);
    doc.text(
      `Generated: ${today.toLocaleString()}  |  Total Vendors: ${sortedVendors.length}${vendorFilter ? `  |  Filtered: ${vendorFilter}` : ''}`,
      pw / 2,
      23,
      { align: 'center' }
    );

    let startY = 44;
    let vendorIndex = 1;

    sortedVendors.forEach((vendor) => {
      const fabrics = vendorShortfallRows[vendor];

      if (fabrics.length === 0) return;

      if (startY > 220) {
        doc.addPage();
        startY = 20;
        doc.setFillColor(15, 23, 42);
        doc.rect(0, 0, pw, 38, 'F');
        doc.setFontSize(16);
        doc.setTextColor(255, 255, 255);
        doc.text(`VENDOR SHORTFALL REPORT — NEXT ${threshold} DAYS`, pw / 2, 14, {
          align: 'center',
        });
        doc.setFontSize(9);
        doc.setTextColor(148, 163, 184);
        doc.text(
          `Generated: ${today.toLocaleString()}  |  Total Vendors: ${sortedVendors.length}${vendorFilter ? `  |  Filtered: ${vendorFilter}` : ''}`,
          pw / 2,
          23,
          { align: 'center' }
        );
        startY = 44;
      }

      // Vendor header
      doc.setFontSize(11);
      doc.setTextColor(41, 128, 185);
      const totalShortfall = fabrics.reduce((sum, f) => sum + f.shortfallMeters, 0);
      doc.text(
        `${vendorIndex}. ${vendor} (${fabrics.length} fabrics | Total Shortfall: ${totalShortfall.toFixed(2)} MTR)`,
        14,
        startY
      );

      startY += 6;

      const tableData = fabrics.map((f, i) => [
        i + 1,
        f.fabricNumber,
        f.fabricName,
        f.totalMeter.toFixed(2),
        f.dailyUsage.toFixed(2),
        f.currentStock.toFixed(2),
        f.daysOfStock !== null ? f.daysOfStock : '∞',
        f.blockedStockDays, // Each fabric's actual blocked days from stock
        f.shortfallMeters.toFixed(2),
      ]);

      autoTable(doc, {
        startY: startY,
        head: [
          [
            '#',
            'Fabric No.',
            'Fabric Name',
            'Total Used (MTR)',
            'Daily Used (MTR/d)',
            'Available Stock (MTR)',
            'Days Left',
            'Blocked Days',
            'Shortfall (MTR)',
          ],
        ],
        body: tableData,
        styles: { fontSize: 8, halign: 'center', cellPadding: 2.5 },
        headStyles: {
          fillColor: [41, 128, 185],
          textColor: 255,
          fontStyle: 'bold',
          fontSize: 8,
        },
        columnStyles: {
          0: { cellWidth: 10 },
          1: { cellWidth: 22 },
          2: { halign: 'left', cellWidth: 35 },
          3: { cellWidth: 22 },
          4: { cellWidth: 22 },
          5: { cellWidth: 22 },
          6: { cellWidth: 18 },
          7: { cellWidth: 18 },
          8: { cellWidth: 22, fillColor: [255, 220, 220] },
        },
        didParseCell: (h) => {
          if (h.section === 'body' && h.column.index === 6) {
            const v = h.cell.raw;
            if (v !== '∞') {
              const d = Number(v);
              if (d < 10) {
                h.cell.styles.fillColor = [255, 200, 200];
                h.cell.styles.textColor = [153, 27, 27];
              } else if (d < 20) {
                h.cell.styles.fillColor = [255, 230, 200];
                h.cell.styles.textColor = [146, 64, 14];
              } else if (d < 30) {
                h.cell.styles.fillColor = [255, 243, 205];
                h.cell.styles.textColor = [120, 53, 15];
              }
            }
          }
          if (h.section === 'body' && h.column.index === 8) {
            const v = Number(h.cell.raw);
            if (v > 0) {
              h.cell.styles.fillColor = [255, 200, 200];
              h.cell.styles.textColor = [153, 27, 27];
              h.cell.styles.fontStyle = 'bold';
            }
          }
        },
        margin: { left: 10, right: 10 },
      });

      const finalY = doc.lastAutoTable.finalY || startY + 30;
      startY = finalY + 8;
      vendorIndex++;
    });

    const pc = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pc; i++) {
      doc.setPage(i);
      doc.setFontSize(7);
      doc.setTextColor(150, 150, 150);
      doc.text(`Page ${i} of ${pc}`, pw / 2, doc.internal.pageSize.getHeight() - 6, {
        align: 'center',
      });
    }

    const dateString = today.toISOString().split('T')[0];
    const fname = vendorFilter
      ? `Vendor_Shortfall_${vendorFilter}_${dateString}.pdf`
      : `Vendor_Shortfall_Report_${dateString}.pdf`;

    doc.save(fname);
    toast.success('Vendor shortfall report exported successfully!');
  }, [fabricUsageData, vendorShortfallRows, daysFilter, vendorFilter]);

  const clearFilters = useCallback(() => {
    setChannelFilter('');
    setDateFrom('');
    setDateTo('');
    setVendorFilter('');
  }, []);

  /* ─── Full-page loading spinner ────────────────────────── */
  if (loading || stockLoading || styleLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <PulseLoader color="#4F46E5" size={12} />
          <p className="text-slate-500 text-sm font-medium">Loading production data…</p>
        </div>
      </div>
    );
  }

  /* ─── Render ────────────────────────────────────────────── */
  return (
    <>
      <div className="min-h-screen bg-slate-50">
        {/* ══ Top gradient header bar ══ */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 px-6 py-5">
          <div className="max-w-7xl mx-auto flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 p-2.5 rounded-xl">
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
                <h1 className="text-lg font-bold text-white tracking-tight">Production Report</h1>
                <p className="text-xs text-slate-400">
                  Analyse, forecast and export production &amp; stock data
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Btn
                onClick={fetchNocoDbRecords}
                disabled={filteredData.length === 0}
                variant="indigo"
                icon={
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                  </svg>
                }
              >
                Generate Report
              </Btn>

              <Btn
                onClick={getGroupedRecords}
                disabled={productionStyles.length === 0}
                variant="emerald"
                icon={
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                    />
                  </svg>
                }
              >
                Pattern Averages
              </Btn>

              {groupedData && (
                <>
                  <div className="relative" ref={exportMenuRef}>
                    <Btn
                      variant="violet"
                      onClick={() => setShowExportMenu((v) => !v)}
                      icon={
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                          />
                        </svg>
                      }
                    >
                      Export Averages
                      <svg
                        className={`w-3 h-3 transition-transform ${showExportMenu ? 'rotate-180' : ''}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 9l-7 7-7-7"
                        />
                      </svg>
                    </Btn>
                    {showExportMenu && (
                      <div className="absolute right-0 mt-2 w-52 bg-white border border-slate-200 rounded-2xl shadow-2xl z-50 p-1.5 space-y-0.5">
                        {[
                          {
                            label: 'Channel Summary',
                            emoji: '📊',
                            fn: () => {
                              exportChannelSummaryPDF();
                              setShowExportMenu(false);
                            },
                          },
                          {
                            label: 'Missing Averages',
                            emoji: '⚠️',
                            fn: () => {
                              exportMissingAveragesPDF();
                              setShowExportMenu(false);
                            },
                          },
                        ].map(({ label, emoji, fn }) => (
                          <button
                            key={label}
                            onClick={fn}
                            className="flex items-center gap-2.5 w-full px-3 py-2.5 text-sm text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 rounded-xl transition-colors cursor-pointer"
                          >
                            {emoji} {label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <Btn
                    variant="orange"
                    onClick={generateUnmappedRelationshipData}
                    icon={
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                    }
                  >
                    Unmapped MTR &amp; KG
                  </Btn>

                  <Btn
                    variant="red"
                    onClick={downloadShortfallReport}
                    disabled={shortfallFabrics.length === 0}
                    icon={
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                        />
                      </svg>
                    }
                  >
                    Shortfall PDF
                  </Btn>

                  <Btn
                    variant="cyan"
                    onClick={downloadShortfallCSV}
                    disabled={shortfallFabrics.length === 0}
                    icon={
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                        />
                      </svg>
                    }
                  >
                    Shortfall CSV
                  </Btn>

                  <Btn
                    variant="orange"
                    onClick={exportVendorShortfallPDF}
                    disabled={Object.keys(vendorShortfallRows).length === 0}
                    icon={
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                        />
                      </svg>
                    }
                  >
                    Vendor Shortfall
                  </Btn>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 py-6 space-y-5">
          {/* ── Grouped data summary ── */}
          {groupedData && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">
                Report Summary
              </p>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatChip label="Total Orders" value={groupedData.totalOrders || 0} color="blue" />
                <StatChip
                  label="Channels"
                  value={Object.keys(groupedData.channelMap).length}
                  color="slate"
                />
                <StatChip
                  label="Missing Averages"
                  value={groupedData.missingAverages.length}
                  color="red"
                />
                <StatChip
                  label="Generated At"
                  value={<span className="text-sm leading-snug">{groupedData.generatedAt}</span>}
                  color="emerald"
                />
              </div>
            </div>
          )}

          {/* ══ TAB NAVIGATION - Only Sync Log and Vendor Shortfall ══ */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex border-b border-slate-200 bg-slate-50 overflow-x-auto">
              {[
                {
                  id: 'sync-log',
                  label: 'Sync Log',
                  count: filteredData.length,
                  icon: (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 6h16M4 10h16M4 14h16M4 18h16"
                      />
                    </svg>
                  ),
                },
                {
                  id: 'shortfall',
                  label: 'Shortfall Fabrics',
                  count: shortfallFabrics.length,
                  icon: (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                  ),
                },
                {
                  id: 'vendor-shortfall',
                  label: 'Vendor Shortfall',
                  count: Object.keys(vendorShortfallRows).length,
                  icon: (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                      />
                    </svg>
                  ),
                },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-3.5 text-sm font-semibold transition-all cursor-pointer border-b-2 -mb-px whitespace-nowrap
                    ${
                      activeTab === tab.id
                        ? 'border-indigo-600 text-indigo-700 bg-white'
                        : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-100'
                    }`}
                >
                  {tab.icon}
                  {tab.label}
                  {tab.count !== null && tab.count > 0 && (
                    <span
                      className={`text-xs font-bold px-2 py-0.5 rounded-full ${activeTab === tab.id ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-200 text-slate-600'}`}
                    >
                      {tab.count}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* ═══ SYNC LOG TAB ═══ */}
            {activeTab === 'sync-log' && (
              <div>
                <div className="px-6 pt-5 pb-4 border-b border-slate-100">
                  <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                      Filter Records
                    </p>
                    <div className="flex gap-2">
                      {[
                        // { label: 'Last 7 days', days: 7 },
                        { label: 'Last 15 days', days: 15 },
                        { label: 'Last 30 days', days: 30 },
                      ].map(({ label, days }) => (
                        <button
                          key={label}
                          onClick={() => {
                            const d = new Date();
                            d.setDate(d.getDate() - days);
                            setDateFrom(d.toISOString().slice(0, 16));
                            setDateTo('');
                          }}
                          className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition-colors cursor-pointer"
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                        Channel
                      </label>
                      <select
                        value={channelFilter}
                        onChange={(e) => setChannelFilter(e.target.value)}
                        className="w-full px-3 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none bg-white text-slate-700 transition-all"
                      >
                        <option value="">All Channels</option>
                        {CHANNELS.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                        From
                      </label>
                      <input
                        type="datetime-local"
                        value={dateFrom}
                        onChange={(e) => setDateFrom(e.target.value)}
                        className="w-full px-3 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                        To
                      </label>
                      <input
                        type="datetime-local"
                        value={dateTo}
                        min={dateFrom}
                        onChange={(e) => setDateTo(e.target.value)}
                        className="w-full px-3 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                      />
                    </div>
                  </div>

                  {(channelFilter || dateFrom || dateTo) && (
                    <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-slate-100">
                      <span className="text-xs text-slate-400 font-medium">Active:</span>
                      {channelFilter && (
                        <Chip
                          label={`Channel: ${channelFilter}`}
                          onRemove={() => setChannelFilter('')}
                        />
                      )}
                      {dateFrom && (
                        <Chip
                          label={`From: ${new Date(dateFrom).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}`}
                          onRemove={() => setDateFrom('')}
                        />
                      )}
                      {dateTo && (
                        <Chip
                          label={`To: ${new Date(dateTo).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}`}
                          onRemove={() => setDateTo('')}
                        />
                      )}
                      <button
                        onClick={clearFilters}
                        className="text-xs text-red-500 hover:text-red-700 font-semibold ml-1 cursor-pointer"
                      >
                        Clear all
                      </button>
                    </div>
                  )}
                </div>

                <div className="px-6 py-3 flex items-center justify-between bg-white">
                  <p className="text-xs text-slate-400">
                    Showing <span className="font-bold text-slate-700">{filteredData.length}</span>{' '}
                    of <span className="font-bold text-slate-700">{syncLogData.length}</span>{' '}
                    records
                  </p>
                  {filteredData.length !== syncLogData.length && (
                    <span className="text-xs bg-indigo-50 text-indigo-700 border border-indigo-200 px-2 py-1 rounded-full font-semibold">
                      Filtered
                    </span>
                  )}
                </div>

                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-100 text-sm">
                    <thead className="bg-slate-50">
                      <tr>
                        {['#', 'Channel', 'Picklist ID', 'Sync ID', 'Created At'].map((h) => (
                          <th
                            key={h}
                            className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider"
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {filteredData.length > 0 ? (
                        filteredData.map((r, i) => (
                          <tr
                            key={r.id || r._id || i}
                            className="hover:bg-slate-50 transition-colors"
                          >
                            <td className="px-5 py-3.5 text-xs text-slate-400">{i + 1}</td>
                            <td className="px-5 py-3.5">
                              <span className="bg-indigo-50 text-indigo-700 border border-indigo-100 text-xs font-semibold px-2.5 py-1 rounded-full">
                                {r.channel || '—'}
                              </span>
                            </td>
                            <td className="px-5 py-3.5 font-mono text-xs text-slate-600">
                              {r.picklist_id || '—'}
                            </td>
                            <td className="px-5 py-3.5 font-mono text-xs text-slate-600">
                              {r.sync_id || '—'}
                            </td>
                            <td className="px-5 py-3.5 text-xs text-slate-600">
                              {r.createdAt
                                ? new Date(r.createdAt).toLocaleString('en-IN', {
                                    day: '2-digit',
                                    month: 'short',
                                    year: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })
                                : '—'}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={5} className="py-16 text-center">
                            <EmptyState
                              message={
                                syncLogData.length === 0
                                  ? 'No sync records found'
                                  : 'No records match filters'
                              }
                              sub={
                                syncLogData.length === 0
                                  ? 'Check backend connection'
                                  : 'Try adjusting filters'
                              }
                            />
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ═══ SHORTFALL FABRICS TAB ═══ */}
            {activeTab === 'shortfall' && (
              <div>
                <div className="px-6 py-5 border-b border-slate-100">
                  {!fabricUsageData ? (
                    <div className="flex items-center gap-3 text-slate-500 text-sm py-2">
                      <svg
                        className="w-5 h-5 text-slate-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      Click <strong className="text-indigo-600 mx-1">Generate Report</strong> to
                      load fabric usage data
                    </div>
                  ) : shortfallFabrics.length === 0 ? (
                    <div className="flex items-center gap-3 text-emerald-600 text-sm py-2">
                      <svg
                        className="w-5 h-5"
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
                      No shortfall detected for <strong>{daysFilter || '30'}</strong> days! All
                      fabrics have sufficient stock.
                    </div>
                  ) : (
                    <div className="flex flex-col sm:flex-row sm:items-end gap-4">
                      <div className="flex-1 space-y-1">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">
                          Shortfall Days
                        </label>
                        <div className="flex items-center gap-2">
                          <div className="relative flex-1 max-w-xs">
                            <input
                              type="number"
                              min="1"
                              placeholder="e.g. 30"
                              value={daysFilter}
                              onChange={(e) => setDaysFilter(e.target.value)}
                              className="w-full pl-4 pr-10 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                            />
                            {daysFilter && (
                              <button
                                onClick={() => setDaysFilter('')}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer text-lg leading-none"
                              >
                                ×
                              </button>
                            )}
                          </div>
                          <div className="flex gap-2">
                            {[7, 15, 30, 60].map((d) => (
                              <button
                                key={d}
                                onClick={() => setDaysFilter(String(d))}
                                className={`text-xs font-bold px-2.5 py-2 rounded-lg border transition-colors cursor-pointer
                                  ${daysFilter === String(d) ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-600 border-slate-300 hover:border-indigo-400 hover:text-indigo-600'}`}
                              >
                                {d}d
                              </button>
                            ))}
                          </div>
                        </div>
                        <p className="text-xs text-slate-400 mt-1">
                          Showing{' '}
                          <strong className="text-red-600">{shortfallFabrics.length}</strong>{' '}
                          fabric(s) with shortfall for <strong>{daysFilter || '30'}</strong> days
                        </p>
                      </div>

                      <div className="space-y-1 min-w-[120px]">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">
                          Sort By
                        </label>
                        <select
                          value={sortBy}
                          onChange={(e) => setSortBy(e.target.value)}
                          className="w-full px-3 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none bg-white text-slate-700 transition-all"
                        >
                          <option value="shortfall">Highest Shortfall</option>
                          <option value="used">Highest Used</option>
                        </select>
                      </div>

                      <div className="space-y-1 min-w-[120px]">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">
                          Vendor Filter
                        </label>
                        <select
                          value={vendorFilter}
                          onChange={(e) => setVendorFilter(e.target.value)}
                          className="w-full px-3 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none bg-white text-slate-700 transition-all"
                        >
                          <option value="">All Vendors</option>
                          {uniqueVendors.map((v) => (
                            <option key={v} value={v}>
                              {v}
                            </option>
                          ))}
                        </select>
                      </div>

                      <Btn
                        variant="cyan"
                        onClick={downloadShortfallReport}
                        icon={
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                            />
                          </svg>
                        }
                      >
                        Export PDF
                      </Btn>

                      <Btn
                        variant="slate"
                        onClick={downloadShortfallCSV}
                        icon={
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                            />
                          </svg>
                        }
                      >
                        Export CSV
                      </Btn>
                    </div>
                  )}
                </div>

                {fabricUsageData && shortfallFabrics.length > 0 && (
                  <div className="overflow-x-auto">
                    <table
                      className="min-w-full text-sm"
                      style={{ borderCollapse: 'separate', borderSpacing: 0 }}
                    >
                      <thead style={{ position: 'sticky', top: 0, zIndex: 10 }}>
                        <tr>
                          <th
                            style={{
                              position: 'sticky',
                              left: 0,
                              minWidth: 44,
                              width: 44,
                              zIndex: 11,
                              background: '#f8fafc',
                              boxShadow: '2px 0 4px -1px rgba(0,0,0,0.08)',
                            }}
                            className="px-3 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200"
                          >
                            #
                          </th>
                          <th
                            style={{
                              position: 'sticky',
                              left: 44,
                              minWidth: 100,
                              width: 100,
                              zIndex: 11,
                              background: '#f8fafc',
                              boxShadow: '2px 0 4px -1px rgba(0,0,0,0.08)',
                            }}
                            className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap border-b border-slate-200"
                          >
                            Fabric No.
                          </th>
                          <th
                            style={{
                              position: 'sticky',
                              left: 144,
                              minWidth: 140,
                              width: 140,
                              zIndex: 11,
                              background: '#f8fafc',
                              boxShadow: '2px 0 4px -1px rgba(0,0,0,0.08)',
                            }}
                            className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap border-b border-slate-200"
                          >
                            Fabric Name
                          </th>
                          {[
                            'Total Used (MTR)',
                            'Daily Used (MTR/d)',
                            'Available Stock (MTR)',
                            'Days Left',
                            'Blocked Days',
                            'Vendor',
                            'Shortfall (MTR)',
                          ].map((h) => (
                            <th
                              key={h}
                              className="px-3 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap border-b border-slate-200 bg-slate-50"
                            >
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {shortfallFabrics.map(([fn, d], i) => {
                          const days = d.daysOfStock;
                          const isActuallyOutOfStock = Number(d.reStock) === 0;
                          const shortfall = d.shortfall || 0;
                          const rowBg = '#fef2f2'; // Always red for shortfall fabrics
                          return (
                            <tr
                              key={fn}
                              className="transition-colors hover:brightness-95"
                              style={{ borderBottom: '1px solid #f1f5f9' }}
                            >
                              <td
                                style={{
                                  position: 'sticky',
                                  left: 0,
                                  width: 44,
                                  minWidth: 44,
                                  zIndex: 5,
                                  background: rowBg,
                                  boxShadow: '2px 0 4px -1px rgba(0,0,0,0.06)',
                                }}
                                className="px-3 py-3.5 text-xs text-slate-400 font-medium"
                              >
                                {i + 1}
                              </td>
                              <td
                                style={{
                                  position: 'sticky',
                                  left: 44,
                                  width: 100,
                                  minWidth: 100,
                                  zIndex: 5,
                                  background: rowBg,
                                  boxShadow: '2px 0 4px -1px rgba(0,0,0,0.06)',
                                }}
                                className="px-4 py-3.5 font-mono text-xs font-bold text-indigo-700"
                              >
                                {fn}
                              </td>
                              <td
                                style={{
                                  position: 'sticky',
                                  left: 144,
                                  width: 140,
                                  minWidth: 140,
                                  zIndex: 5,
                                  background: rowBg,
                                  boxShadow: '2px 0 4px -1px rgba(0,0,0,0.06)',
                                }}
                                className="px-4 py-3.5 text-sm text-slate-800 font-medium"
                              >
                                {d.fabricName || '—'}
                              </td>
                              <td className="px-3 py-3.5 text-sm font-semibold text-indigo-600 whitespace-nowrap">
                                {d.totalMeter.toFixed(2)}
                              </td>
                              <td className="px-3 py-3.5 text-xs text-slate-500 whitespace-nowrap">
                                {(d.dailyUsage || 0).toFixed(2)}
                              </td>
                              <td className="px-3 py-3.5 text-sm font-semibold whitespace-nowrap">
                                {isActuallyOutOfStock ? (
                                  <span className="text-red-500 font-bold">0.00</span>
                                ) : (
                                  Number(d.reStock).toFixed(2)
                                )}
                              </td>
                              <td className="px-3 py-3.5 whitespace-nowrap">
                                {days !== null ? `${days}d` : '∞'}
                              </td>
                              <td className="px-3 py-3.5 text-xs text-slate-600 whitespace-nowrap">
                                {d.blocked_stock_days || 0}
                              </td>
                              <td className="px-3 py-3.5 text-xs text-slate-600 whitespace-nowrap">
                                {d.vendor_source || 'Unknown'}
                              </td>
                              <td className="px-3 py-3.5 text-sm font-bold whitespace-nowrap">
                                <span className="text-red-600">{shortfall.toFixed(2)}</span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* ═══ VENDOR SHORTFALL TAB ═══ */}
            {activeTab === 'vendor-shortfall' && (
              <div>
                <div className="px-6 py-5 border-b border-slate-100">
                  {!fabricUsageData ? (
                    <div className="flex items-center gap-3 text-slate-500 text-sm py-2">
                      <svg
                        className="w-5 h-5 text-slate-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      Click <strong className="text-indigo-600 mx-1">Generate Report</strong> to
                      load vendor shortfall data
                    </div>
                  ) : Object.keys(vendorShortfallRows).length === 0 ? (
                    <div className="flex items-center gap-3 text-emerald-600 text-sm py-2">
                      <svg
                        className="w-5 h-5"
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
                      No shortfall detected for <strong>{daysFilter || '30'}</strong> days!
                    </div>
                  ) : (
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <p className="text-sm text-slate-600">
                          <span className="font-bold text-indigo-600">
                            {Object.keys(vendorShortfallRows).length}
                          </span>{' '}
                          vendors with shortfall for <strong>{daysFilter || '30'}</strong> days
                          {vendorFilter && (
                            <span className="ml-2 text-indigo-600">· Filtered: {vendorFilter}</span>
                          )}
                        </p>
                        <p className="text-xs text-slate-400 mt-0.5">
                          Based on {Math.round(fabricUsageData?.numberOfDays || 0)} days of usage
                          data
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <select
                          value={vendorFilter}
                          onChange={(e) => setVendorFilter(e.target.value)}
                          className="px-3 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none bg-white text-slate-700 transition-all"
                        >
                          <option value="">All Vendors</option>
                          {uniqueVendors.map((v) => (
                            <option key={v} value={v}>
                              {v}
                            </option>
                          ))}
                        </select>
                        <Btn
                          variant="red"
                          onClick={exportVendorShortfallPDF}
                          icon={
                            <svg
                              className="w-4 h-4"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                              />
                            </svg>
                          }
                        >
                          Export {vendorFilter ? vendorFilter : 'All'} Shortfall
                        </Btn>
                      </div>
                    </div>
                  )}
                </div>

                {fabricUsageData && Object.keys(vendorShortfallRows).length > 0 && (
                  <div className="p-4 space-y-6">
                    {Object.keys(vendorShortfallRows)
                      .sort()
                      .map((vendor) => {
                        const fabrics = vendorShortfallRows[vendor];
                        const totalShortfall = fabrics.reduce(
                          (sum, f) => sum + f.shortfallMeters,
                          0
                        );

                        return (
                          <div
                            key={vendor}
                            className="border border-slate-200 rounded-xl overflow-hidden"
                          >
                            <div className="bg-gradient-to-r from-slate-50 to-slate-100 px-4 py-3 border-b border-slate-200 flex justify-between items-center">
                              <div className="flex items-center gap-3">
                                <span className="bg-indigo-100 text-indigo-700 text-xs font-bold px-2.5 py-1 rounded-full">
                                  {fabrics.length} fabrics
                                </span>
                                <span className="text-sm font-bold text-slate-700">{vendor}</span>
                              </div>
                              <div className="flex items-center gap-4">
                                <span className="text-xs text-slate-500">
                                  Total Shortfall:{' '}
                                  <span className="font-bold text-red-600">
                                    {totalShortfall.toFixed(2)} MTR
                                  </span>
                                </span>
                              </div>
                            </div>
                            <div className="overflow-x-auto">
                              <table className="min-w-full text-sm">
                                <thead className="bg-slate-50">
                                  <tr>
                                    {[
                                      '#',
                                      'Fabric No.',
                                      'Fabric Name',
                                      'Total Used (MTR)',
                                      'Daily Used (MTR/d)',
                                      'Available Stock (MTR)',
                                      'Days Left',
                                      'Blocked Days',
                                      'Shortfall (MTR)',
                                    ].map((h) => (
                                      <th
                                        key={h}
                                        className="px-3 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap"
                                      >
                                        {h}
                                      </th>
                                    ))}
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                  {fabrics.map((f, i) => (
                                    <tr key={f.fabricNumber} className="bg-red-50/50">
                                      <td className="px-3 py-2.5 text-xs text-slate-400">
                                        {i + 1}
                                      </td>
                                      <td className="px-3 py-2.5 font-mono text-xs font-bold text-indigo-700">
                                        {f.fabricNumber}
                                      </td>
                                      <td className="px-3 py-2.5 text-sm text-slate-800">
                                        {f.fabricName}
                                      </td>
                                      <td className="px-3 py-2.5 text-sm text-indigo-600">
                                        {f.totalMeter.toFixed(2)}
                                      </td>
                                      <td className="px-3 py-2.5 text-xs text-slate-500">
                                        {f.dailyUsage.toFixed(2)}
                                      </td>
                                      <td className="px-3 py-2.5 text-sm font-semibold">
                                        {f.currentStock.toFixed(2)}
                                      </td>
                                      <td className="px-3 py-2.5">
                                        {f.daysOfStock !== null ? `${f.daysOfStock}d` : '∞'}
                                      </td>
                                      <td className="px-3 py-2.5 text-xs text-slate-600">
                                        {f.blockedStockDays}
                                      </td>
                                      <td className="px-3 py-2.5 text-sm font-bold text-red-600">
                                        {f.shortfallMeters.toFixed(2)}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <ToastContainer
        position="top-right"
        autoClose={3000}
        newestOnTop
        closeOnClick
        pauseOnHover
        draggable
        theme="light"
        toastClassName="text-sm"
      />
    </>
  );
};

/* small reusable chip */
const Chip = ({ label, onRemove }) => (
  <span className="flex items-center gap-1 bg-indigo-50 text-indigo-700 border border-indigo-200 text-xs font-semibold px-2.5 py-1 rounded-full">
    {label}
    <button onClick={onRemove} className="ml-0.5 hover:text-indigo-900 cursor-pointer leading-none">
      ×
    </button>
  </span>
);

/* empty state */
const EmptyState = ({ message, sub }) => (
  <div className="flex flex-col items-center gap-2 text-slate-400">
    <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
      />
    </svg>
    <p className="text-sm font-medium text-slate-500">{message}</p>
    <p className="text-xs">{sub}</p>
  </div>
);

export default ProductionReport;
