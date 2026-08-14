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

// const BASE_URL = 'https://raw-material-backend.onrender.com';
const CHANNELS = ['Myntra', 'Nykaa', 'Ajio', 'Tatacliq', 'Shopify'];

/* ─────────────────────────── Helpers ─────────────────────────── */

const sortByDaysAsc = (entries) =>
  [...entries].sort(([, a], [, b]) => {
    if (a.daysOfStock === null && b.daysOfStock === null) return 0;
    if (a.daysOfStock === null) return 1; // ∞ → bottom
    if (b.daysOfStock === null) return -1;
    return a.daysOfStock - b.daysOfStock;
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

// stock prop = actual remaining stock value (to distinguish true 0-stock vs rounding to 0)
const DaysBadge = ({ days, stock }) => {
  if (days === null || days === undefined)
    return <span className="text-slate-400 font-semibold text-xs">∞</span>;
  // Only show "Out of stock" when actual stock is genuinely 0
  if (Number(stock) === 0)
    return (
      <span className="bg-red-600 text-white text-xs font-bold px-2 py-0.5 rounded-lg">
        Out of stock
      </span>
    );
  // days rounds to 0 but stock > 0 means less than 1 day remaining
  if (days === 0)
    return (
      <span className="bg-red-100 text-red-700 text-xs font-bold px-2 py-0.5 rounded-lg">
        &lt; 1d
      </span>
    );
  if (days < 30)
    return (
      <span className="bg-red-100 text-red-700 text-xs font-bold px-2 py-0.5 rounded-lg">
        {days}d
      </span>
    );
  if (days < 60)
    return (
      <span className="bg-amber-100 text-amber-700 text-xs font-bold px-2 py-0.5 rounded-lg">
        {days}d
      </span>
    );
  return (
    <span className="bg-emerald-100 text-emerald-700 text-xs font-bold px-2 py-0.5 rounded-lg">
      {days}d
    </span>
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
  const [daysFilter, setDaysFilter] = useState(''); // '' = all, number = shortfall within N days

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

  /* shared fabric-usage builder */
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
        if (Array.isArray(st.styleNumbers) && st.styleNumbers.includes(ps.style_number))
          combined.push({
            ...ps,
            fabricNumber: st.fabricNumber,
            fabricName: st.fabricName,
            remainingStock: st.availableStock,
            status: st.status,
          });
      });
    });
    const withAvg = [];
    combined.forEach((ac) => {
      averageData.forEach((avg) => {
        if (avg.style_number === ac.style_number)
          withAvg.push({ ...ac, fabrics: avg.fabrics || [] });
      });
    });
    const fu = {};
    withAvg.forEach((item) => {
      item.fabrics.forEach((fab) => {
        const fn = item.fabricNumber;
        const m = getAvg(item.size, fab);
        if (!fu[fn])
          fu[fn] = {
            fabricName: item.fabricName,
            reStock: item.remainingStock,
            totalMeter: 0,
            totalPieces: 0,
            status: item.status,
          };
        else {
          fu[fn].fabricName = item.fabricName;
          fu[fn].reStock = item.remainingStock;
        }
        fu[fn].totalMeter += m;
        fu[fn].totalPieces += 1;
      });
    });
    Object.values(fu).forEach((d) => {
      const daily = d.totalMeter / numberOfDays;
      d.daysOfStock = daily > 0 ? Math.round(Number(d.reStock) / daily) : null;
      d.dailyUsage = daily;
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

  /* stock table rows — filtered by daysFilter + sorted by daysOfStock asc */
  const stockTableRows = useMemo(() => {
    if (!fabricUsageData) return [];
    const threshold = daysFilter !== '' ? Number(daysFilter) : null;
    const entries = Object.entries(fabricUsageData.fabricUsage).filter(([, d]) => {
      if (threshold === null || isNaN(threshold) || threshold <= 0) return true;
      if (d.daysOfStock === null) return false; // infinite stock → not in shortfall
      return d.daysOfStock <= threshold;
    });
    return sortByDaysAsc(entries);
  }, [fabricUsageData, daysFilter]);

  /* ── PDFs ──────────────────────────────────────────────── */

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

  const generateUnmappedRelationshipData = useCallback(() => {
    if (!filteredData.length) {
      toast.error('No data.');
      return;
    }
    const sns = productionStyles.map((r) => r.style_number);
    const set = new Set();
    stock.forEach((s) => {
      if (s.styleNumbers.some((sn) => sns.includes(sn))) set.add(s.fabricNumber);
    });
    const unmapped = [...set].filter((un) =>
      meterAndKG.some(
        (m) => m.fabric_number === un && (m.fabric_in_meter === null || m.fabric_in_meter === 0)
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
        const fd = meterAndKG.find((m) => m.fabric_number === fn);
        return [(i + 1).toString(), fn, fd?.fabric_in_meter === null ? 'Null' : 'Zero'];
      }),
      startY: 45,
      theme: 'striped',
      headStyles: { fillColor: [79, 70, 229], textColor: [255, 255, 255], fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [245, 245, 250] },
    });
    doc.save(`unmapped-fabrics-${today.toISOString().split('T')[0]}.pdf`);
  }, [filteredData, productionStyles, stock, meterAndKG]);

  const downloadUsedFabricReport = useCallback(() => {
    const result = buildFabricUsage();
    if (!result) {
      toast.error('No data available.');
      return;
    }
    const { fabricUsage, numberOfDays } = result;
    const rows = sortByDaysAsc(Object.entries(fabricUsage));
    const doc = new jsPDF('landscape'),
      today = new Date(),
      pw = doc.internal.pageSize.getWidth();
    doc.setFontSize(18);
    doc.setTextColor(41, 128, 185);
    doc.text('USED FABRIC REPORT', pw / 2, 16, { align: 'center' });
    doc.setFontSize(9);
    doc.setTextColor(120, 120, 120);
    doc.text(
      `Generated: ${today.toLocaleString()}  |  Period: ${Math.round(numberOfDays)} day(s)`,
      pw / 2,
      23,
      { align: 'center' }
    );
    autoTable(doc, {
      startY: 30,
      head: [
        [
          'S.No',
          'Fabric Number',
          'Fabric Name',
          'Total Pieces',
          'Used (MTR)',
          'Remaining Stock (MTR)',
          'Days of Stock',
        ],
      ],
      body: rows.map(([fn, d], i) => [
        i + 1,
        fn,
        d.fabricName,
        d.totalPieces,
        d.totalMeter.toFixed(2),
        d.reStock === 0 ? '0' : Number(d.reStock).toFixed(2),
        d.daysOfStock !== null ? d.daysOfStock : '∞',
      ]),
      styles: { fontSize: 9, halign: 'center' },
      headStyles: { fillColor: [41, 128, 185], textColor: 255, fontStyle: 'bold' },
      didParseCell: (h) => {
        if (h.section === 'body' && h.column.index === 6) {
          const v = h.cell.raw;
          if (v !== '∞') {
            const d = Number(v);
            if (d < 30) h.cell.styles.fillColor = [255, 220, 220];
            else if (d < 60) h.cell.styles.fillColor = [255, 243, 205];
            else h.cell.styles.fillColor = [209, 250, 229];
          }
        }
      },
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
    doc.save(`Used_Fabric_Report_${today.toISOString().split('T')[0]}.pdf`);
  }, [buildFabricUsage]);

  /* stock table PDF — respects daysFilter */
  // const exportStockTablePDF = useCallback(() => {
  //   if (!fabricUsageData) {
  //     toast.error('No data. Generate report first.');
  //     return;
  //   }
  //   const { numberOfDays } = fabricUsageData;
  //   const threshold = daysFilter !== '' ? Number(daysFilter) : null;
  //   if (stockTableRows.length === 0) {
  //     toast.error('No fabric data matches the current filter.');
  //     return;
  //   }

  //   const doc = new jsPDF(),
  //     today = new Date(),
  //     pw = doc.internal.pageSize.getWidth();
  //   const isFiltered = threshold !== null && !isNaN(threshold) && threshold > 0;
  //   const title = isFiltered
  //     ? `STOCK SHORTFALL — NEXT ${threshold} DAYS`
  //     : 'STOCK DAYS REPORT — ALL FABRICS';

  //   doc.setFillColor(15, 23, 42);
  //   doc.rect(0, 0, pw, isFiltered ? 42 : 36, 'F');
  //   doc.setFontSize(15);
  //   doc.setTextColor(255, 255, 255);
  //   doc.text(title, pw / 2, 14, { align: 'center' });
  //   doc.setFontSize(9);
  //   doc.setTextColor(148, 163, 184);
  //   doc.text(
  //     `Generated: ${today.toLocaleString()}  |  Based on ${Math.round(numberOfDays)} day(s) of usage`,
  //     pw / 2,
  //     22,
  //     { align: 'center' }
  //   );
  //   if (isFiltered) {
  //     doc.setTextColor(251, 191, 36);
  //     doc.text(
  //       `Showing ${stockTableRows.length} fabric(s) with ≤ ${threshold} days remaining stock`,
  //       pw / 2,
  //       30,
  //       { align: 'center' }
  //     );
  //   }

  //   // legend
  //   const ly = isFiltered ? 36 : 29;
  //   doc.setFontSize(7);
  //   doc.setFillColor(255, 220, 220);
  //   doc.rect(14, ly, 8, 4, 'F');
  //   doc.setTextColor(180, 30, 30);
  //   doc.text('< 30 days', 24, ly + 3.5);
  //   doc.setFillColor(255, 243, 205);
  //   doc.rect(56, ly, 8, 4, 'F');
  //   doc.setTextColor(146, 64, 14);
  //   doc.text('30–59 days', 66, ly + 3.5);
  //   doc.setFillColor(209, 250, 229);
  //   doc.rect(104, ly, 8, 4, 'F');
  //   doc.setTextColor(6, 95, 70);
  //   doc.text('≥ 60 days', 114, ly + 3.5);

  //   autoTable(doc, {
  //     startY: isFiltered ? 46 : 39,
  //     head: [
  //       [
  //         'S.No',
  //         'Fabric No.',
  //         'Fabric Name',
  //         'Used (MTR)',
  //         'Stock (MTR)',
  //         'Daily (MTR/d)',
  //         'Days Left',
  //       ],
  //     ],
  //     body: stockTableRows.map(([fn, d], i) => [
  //       i + 1,
  //       fn,
  //       d.fabricName || '—',
  //       d.totalMeter.toFixed(2),
  //       d.reStock === 0 ? '0.00' : Number(d.reStock).toFixed(2),
  //       (d.dailyUsage || 0).toFixed(2),
  //       d.daysOfStock !== null ? d.daysOfStock : '∞',
  //     ]),
  //     styles: { fontSize: 9, halign: 'center', cellPadding: 3 },
  //     headStyles: { fillColor: [15, 23, 42], textColor: 255, fontStyle: 'bold', fontSize: 9 },
  //     columnStyles: {
  //       0: { cellWidth: 12 },
  //       1: { cellWidth: 26 },
  //       2: { halign: 'left', cellWidth: 52 },
  //       3: { cellWidth: 22 },
  //       4: { cellWidth: 22 },
  //       5: { cellWidth: 22 },
  //       6: { cellWidth: 20 },
  //     },
  //     didParseCell: (h) => {
  //       if (h.section === 'body' && h.column.index === 6) {
  //         const v = h.cell.raw;
  //         if (v !== '∞') {
  //           const d = Number(v);
  //           if (d < 30) {
  //             h.cell.styles.fillColor = [255, 220, 220];
  //             h.cell.styles.textColor = [153, 27, 27];
  //           } else if (d < 60) {
  //             h.cell.styles.fillColor = [255, 243, 205];
  //             h.cell.styles.textColor = [120, 53, 15];
  //           } else {
  //             h.cell.styles.fillColor = [209, 250, 229];
  //             h.cell.styles.textColor = [6, 78, 59];
  //           }
  //         }
  //       }
  //     },
  //     alternateRowStyles: { fillColor: [248, 250, 252] },
  //   });
  //   const pc = doc.internal.getNumberOfPages();
  //   for (let i = 1; i <= pc; i++) {
  //     doc.setPage(i);
  //     doc.setFontSize(8);
  //     doc.setTextColor(150, 150, 150);
  //     doc.text(`Page ${i} of ${pc}`, pw / 2, doc.internal.pageSize.getHeight() - 8, {
  //       align: 'center',
  //     });
  //   }
  //   const fname = isFiltered
  //     ? `Shortfall_Next${threshold}Days_${today.toISOString().split('T')[0]}.pdf`
  //     : `Stock_Days_Report_${today.toISOString().split('T')[0]}.pdf`;
  //   doc.save(fname);
  // }, [fabricUsageData, stockTableRows, daysFilter]);
  const exportStockTablePDF = useCallback(() => {
    if (!fabricUsageData) {
      toast.error('No data. Generate report first.');
      return;
    }

    const { numberOfDays } = fabricUsageData;

    const threshold = daysFilter !== '' ? Number(daysFilter) : null;

    // status === false wale fabrics ko PDF se remove karo
    console.log('stock table', stockTableRows);
    const activeStockTableRows = stockTableRows.filter(([fn, d]) => d.status !== false);

    if (activeStockTableRows.length === 0) {
      toast.error('No active fabric data matches the current filter.');
      return;
    }

    const doc = new jsPDF();
    const today = new Date();
    const pw = doc.internal.pageSize.getWidth();

    const isFiltered = threshold !== null && !isNaN(threshold) && threshold > 0;

    const title = isFiltered
      ? `STOCK SHORTFALL — NEXT ${threshold} DAYS`
      : 'STOCK DAYS REPORT — ALL FABRICS';

    // =========================
    // HEADER
    // =========================

    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, pw, isFiltered ? 42 : 36, 'F');

    doc.setFontSize(15);
    doc.setTextColor(255, 255, 255);

    doc.text(title, pw / 2, 14, {
      align: 'center',
    });

    doc.setFontSize(9);
    doc.setTextColor(148, 163, 184);

    doc.text(
      `Generated: ${today.toLocaleString()}  |  Based on ${Math.round(numberOfDays)} day(s) of usage`,
      pw / 2,
      22,
      {
        align: 'center',
      }
    );

    if (isFiltered) {
      doc.setTextColor(251, 191, 36);

      doc.text(
        `Showing ${activeStockTableRows.length} fabric(s) with ≤ ${threshold} days remaining stock`,
        pw / 2,
        30,
        {
          align: 'center',
        }
      );
    }

    // =========================
    // LEGEND
    // =========================

    const ly = isFiltered ? 36 : 29;

    doc.setFontSize(7);

    // < 30 days
    doc.setFillColor(255, 220, 220);
    doc.rect(14, ly, 8, 4, 'F');

    doc.setTextColor(180, 30, 30);
    doc.text('< 30 days', 24, ly + 3.5);

    // 30–59 days
    doc.setFillColor(255, 243, 205);
    doc.rect(56, ly, 8, 4, 'F');

    doc.setTextColor(146, 64, 14);
    doc.text('30–59 days', 66, ly + 3.5);

    // >= 60 days
    doc.setFillColor(209, 250, 229);
    doc.rect(104, ly, 8, 4, 'F');

    doc.setTextColor(6, 95, 70);
    doc.text('≥ 60 days', 114, ly + 3.5);

    // =========================
    // TABLE
    // =========================

    autoTable(doc, {
      startY: isFiltered ? 46 : 39,

      head: [
        [
          'S.No',
          'Fabric No.',
          'Fabric Name',
          'Used (MTR)',
          'Stock (MTR)',
          'Daily (MTR/d)',
          'Days Left',
        ],
      ],

      body: activeStockTableRows.map(([fn, d], i) => [
        i + 1,
        fn,
        d.fabricName || '—',
        Number(d.totalMeter || 0).toFixed(2),
        d.reStock === 0 ? '0.00' : Number(d.reStock || 0).toFixed(2),
        Number(d.dailyUsage || 0).toFixed(2),
        d.daysOfStock !== null && d.daysOfStock !== undefined ? d.daysOfStock : '∞',
      ]),

      styles: {
        fontSize: 9,
        halign: 'center',
        cellPadding: 3,
      },

      headStyles: {
        fillColor: [15, 23, 42],
        textColor: 255,
        fontStyle: 'bold',
        fontSize: 9,
      },

      columnStyles: {
        0: {
          cellWidth: 12,
        },
        1: {
          cellWidth: 26,
        },
        2: {
          halign: 'left',
          cellWidth: 52,
        },
        3: {
          cellWidth: 22,
        },
        4: {
          cellWidth: 22,
        },
        5: {
          cellWidth: 22,
        },
        6: {
          cellWidth: 20,
        },
      },

      // =========================
      // DAYS LEFT COLOR
      // =========================

      didParseCell: (h) => {
        if (h.section === 'body' && h.column.index === 6) {
          const v = h.cell.raw;

          if (v !== '∞') {
            const d = Number(v);

            if (d < 30) {
              h.cell.styles.fillColor = [255, 220, 220];
              h.cell.styles.textColor = [153, 27, 27];
            } else if (d < 60) {
              h.cell.styles.fillColor = [255, 243, 205];
              h.cell.styles.textColor = [120, 53, 15];
            } else {
              h.cell.styles.fillColor = [209, 250, 229];
              h.cell.styles.textColor = [6, 78, 59];
            }
          }
        }
      },

      alternateRowStyles: {
        fillColor: [248, 250, 252],
      },
    });

    // =========================
    // PAGE NUMBERS
    // =========================

    const pc = doc.internal.getNumberOfPages();

    for (let i = 1; i <= pc; i++) {
      doc.setPage(i);

      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);

      doc.text(`Page ${i} of ${pc}`, pw / 2, doc.internal.pageSize.getHeight() - 8, {
        align: 'center',
      });
    }

    // =========================
    // FILE NAME
    // =========================

    const dateString = today.toISOString().split('T')[0];

    const fname = isFiltered
      ? `Shortfall_Next${threshold}Days_${dateString}.pdf`
      : `Stock_Days_Report_${dateString}.pdf`;

    doc.save(fname);
  }, [fabricUsageData, stockTableRows, daysFilter]);
  const clearFilters = useCallback(() => {
    setChannelFilter('');
    setDateFrom('');
    setDateTo('');
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
            {/* title */}
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

            {/* action buttons */}
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
                    onClick={downloadUsedFabricReport}
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
                    Used Fabric PDF
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

          {/* ══ TAB NAVIGATION ══ */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex border-b border-slate-200 bg-slate-50">
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
                  id: 'stock-table',
                  label: 'Stock Table',
                  count: fabricUsageData ? stockTableRows.length : null,
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
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-6 py-3.5 text-sm font-semibold transition-all cursor-pointer border-b-2 -mb-px
                    ${
                      activeTab === tab.id
                        ? 'border-indigo-600 text-indigo-700 bg-white'
                        : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-100'
                    }`}
                >
                  {tab.icon}
                  {tab.label}
                  {tab.count !== null && (
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
                {/* filter bar */}
                <div className="px-6 pt-5 pb-4 border-b border-slate-100">
                  <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                      Filter Records
                    </p>
                    <div className="flex gap-2">
                      {[
                        { label: 'Last 7 days', days: 7 },
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

                {/* table header */}
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

                {/* sync log table */}
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

            {/* ═══ STOCK TABLE TAB ═══ */}
            {activeTab === 'stock-table' && (
              <div>
                {/* days filter + export bar */}
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
                  ) : (
                    <div className="flex flex-col sm:flex-row sm:items-end gap-4">
                      {/* days input */}
                      <div className="flex-1 space-y-1">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">
                          Shortfall Threshold (Days)
                        </label>
                        <div className="flex items-center gap-2">
                          <div className="relative flex-1 max-w-xs">
                            <input
                              type="number"
                              min="1"
                              placeholder="e.g. 10  (leave blank for all)"
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
                            {[7, 10, 15, 30].map((d) => (
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
                          {daysFilter ? (
                            <>
                              <span className="text-amber-600 font-semibold">
                                ⚠ {stockTableRows.length} fabric(s)
                              </span>{' '}
                              will run out within <strong>{daysFilter} days</strong>
                            </>
                          ) : (
                            <>
                              Showing{' '}
                              <strong className="text-slate-600">
                                all {stockTableRows.length} fabric(s)
                              </strong>{' '}
                              · Based on{' '}
                              <strong className="text-slate-600">
                                {Math.round(fabricUsageData.numberOfDays)} day(s)
                              </strong>{' '}
                              of usage data
                            </>
                          )}
                        </p>
                      </div>

                      {/* export button */}
                      <Btn
                        variant="cyan"
                        onClick={exportStockTablePDF}
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
                        {daysFilter
                          ? `Export Next ${daysFilter}d Shortfall`
                          : 'Export All Stock PDF'}
                      </Btn>
                    </div>
                  )}
                </div>

                {/* stock table */}
                {fabricUsageData && (
                  <>
                    {/* legend */}
                    <div className="px-6 py-2.5 bg-slate-50 border-b border-slate-100 flex items-center gap-5 flex-wrap">
                      <span className="text-xs text-slate-400 font-semibold uppercase tracking-wide">
                        Legend:
                      </span>
                      {[
                        ['bg-red-100 text-red-700', '< 30 days'],
                        ['bg-amber-100 text-amber-700', '30–59 days'],
                        ['bg-emerald-100 text-emerald-700', '≥ 60 days'],
                        ['bg-slate-100 text-slate-500', '∞ (no usage)'],
                      ].map(([cls, label]) => (
                        <span
                          key={label}
                          className={`text-xs font-bold px-2 py-0.5 rounded-md ${cls}`}
                        >
                          {label}
                        </span>
                      ))}
                    </div>

                    {/* col widths: # 44px | FabricNo 140px | FabricName 220px | rest free */}
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
                                minWidth: 140,
                                width: 140,
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
                                left: 184,
                                minWidth: 220,
                                width: 220,
                                zIndex: 11,
                                background: '#f8fafc',
                                boxShadow: '2px 0 4px -1px rgba(0,0,0,0.08)',
                              }}
                              className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap border-b border-slate-200"
                            >
                              Fabric Name
                            </th>
                            {['Used (MTR)', 'Stock (MTR)', 'Daily (MTR/d)', 'Days Left'].map(
                              (h) => (
                                <th
                                  key={h}
                                  className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap border-b border-slate-200 bg-slate-50"
                                >
                                  {h}
                                </th>
                              )
                            )}
                          </tr>
                        </thead>
                        <tbody>
                          {stockTableRows.length > 0 ? (
                            stockTableRows.map(([fn, d], i) => {
                              const days = d.daysOfStock;
                              const isActuallyOutOfStock = Number(d.reStock) === 0;
                              const rowBg = isActuallyOutOfStock
                                ? '#fef2f2'
                                : days !== null && days < 30
                                  ? 'rgba(254,242,242,0.6)'
                                  : days !== null && days < 60
                                    ? 'rgba(255,251,235,0.6)'
                                    : '#ffffff';
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
                                      width: 140,
                                      minWidth: 140,
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
                                      left: 184,
                                      width: 220,
                                      minWidth: 220,
                                      zIndex: 5,
                                      background: rowBg,
                                      boxShadow: '2px 0 4px -1px rgba(0,0,0,0.06)',
                                    }}
                                    className="px-4 py-3.5 text-sm text-slate-800 font-medium"
                                  >
                                    {d.fabricName || '—'}
                                  </td>
                                  <td className="px-4 py-3.5 text-sm font-semibold text-indigo-600 whitespace-nowrap">
                                    {d.totalMeter.toFixed(2)}
                                  </td>
                                  <td className="px-4 py-3.5 text-sm font-semibold whitespace-nowrap">
                                    {isActuallyOutOfStock ? (
                                      <span className="text-red-500 font-bold">0.00</span>
                                    ) : (
                                      Number(d.reStock).toFixed(2)
                                    )}
                                  </td>
                                  <td className="px-4 py-3.5 text-xs text-slate-500 whitespace-nowrap">
                                    {(d.dailyUsage || 0).toFixed(2)}
                                  </td>
                                  <td className="px-4 py-3.5 whitespace-nowrap">
                                    <DaysBadge days={days} stock={d.reStock} />
                                  </td>
                                </tr>
                              );
                            })
                          ) : (
                            <tr>
                              <td colSpan={7} className="py-16 text-center">
                                <EmptyState
                                  message={
                                    !productionStyles.length
                                      ? 'No production data loaded'
                                      : 'No fabrics match the filter'
                                  }
                                  sub={
                                    !productionStyles.length
                                      ? 'Click Generate Report first'
                                      : `No fabric runs out within ${daysFilter} days`
                                  }
                                />
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </>
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
