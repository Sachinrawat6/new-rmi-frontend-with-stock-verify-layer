import axios from 'axios';
import { PulseLoader } from 'react-spinners';
import { Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import fetchOrdersFromNocoDbWithSyncId from '../service/fetchNocoDbRecords';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useGlobalContext } from '../components/context/StockContextProvider';

const ProductionReport = () => {
  const { stock, stockLoading, fetchMeterAndKgRelationShip, meterAndKG, styleLoading } =
    useGlobalContext();
  const [filteredData, setFilteredData] = useState([]);
  const [syncLogData, setSyncLogData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [channelFilter, setChannelFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [productionStyles, setProductionStyles] = useState([]);
  const [averageData, setAverageData] = useState([]);
  const [groupedData, setGroupedData] = useState(null);
  const [showExportMenu, setShowExportMenu] = useState(false);

  const BASE_URL = 'https://raw-material-backend.onrender.com';

  // FETCHING METER AND KG RELATIONSHIP RECORDS
  useEffect(() => {
    fetchMeterAndKgRelationShip();
  }, []);

  // FETCH SYNC LOG DATA
  const fetchSyncLogData = async () => {
    setLoading(true);
    try {
      const response = await axios.get(
        `https://picklist-backend.onrender.com/api/v1/picklist-history`
      );
      setSyncLogData(response.data.data);
    } catch (error) {
      console.log('Failed to get synclog data error :: ', error);
    } finally {
      setLoading(false);
    }
  };

  // GET SYNC IDS
  const getSyncIds = () => {
    const syncIds = filteredData.map((r) => r.sync_id);
    return syncIds;
  };

  // ************************** FETCH SYNC ORDERS FROM NOCODB*************************
  const fetchNocoDbRecords = async () => {
    setLoading(true);
    try {
      const ids = getSyncIds();
      console.log('All sync ids', ids);
      const allRecords = await Promise.all(ids.map((i) => fetchOrdersFromNocoDbWithSyncId(i)));
      const mergedRecords = allRecords.flat();
      setProductionStyles(mergedRecords);
    } catch (error) {
      console.error('Error fetching NocoDB records:', error);
    } finally {
      setLoading(false);
    }
  };

  // API Call
  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await axios.get(`${BASE_URL}/api/v1/average`);
        const data = res.data.data || [];
        setAverageData(data);
        console.log('Average data', data.slice(1, 5));
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // GROUPING CHANNELS
  const getGroupedRecords = () => {
    const map = {};
    const missingAverages = [];

    // Channel grouping
    for (const record of productionStyles) {
      if (record.channel) {
        map[record.channel] = (map[record.channel] || 0) + 1;
      }
    }

    // Fast lookup map
    const styleMap = new Map();
    averageData.forEach((item) => {
      styleMap.set(Number(item.style_number), item);
    });

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
      const matchedStyle = styleMap.get(Number(order.style_number));

      if (!matchedStyle) {
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

      if (!matchedStyle.fabrics?.length) {
        missingAverages.push({
          order_id: order.order_id || 'N/A',
          style_number: order.style_number || 'N/A',
          channel: order.channel || 'N/A',
          patternNumber: matchedStyle.patternNumber || 'N/A',
          size: order.size || 'N/A',
          reason: 'No fabrics found',
          missing_field: 'N/A',
        });
        continue;
      }

      const size = order.size?.toUpperCase().trim();
      const averageField = sizeFieldMap[size];

      if (!averageField) {
        missingAverages.push({
          order_id: order.order_id || 'N/A',
          channel: order.channel || 'N/A',
          style_number: order.style_number || 'N/A',
          patternNumber: matchedStyle.patternNumber || 'N/A',
          size: size || 'N/A',
          reason: 'Invalid size mapping',
          missing_field: 'N/A',
        });
        continue;
      }

      matchedStyle.fabrics.forEach((fabric) => {
        const value = fabric[averageField];

        if (value === undefined || value === null) {
          missingAverages.push({
            order_id: order.order_id || 'N/A',
            style_number: order.style_number || 'N/A',
            channel: order.channel || 'N/A',
            patternNumber: matchedStyle.patternNumber || 'N/A',
            size: size || 'N/A',
            reason: 'Missing average value',
            missing_field: averageField || 'N/A',
            fabric_id: fabric._id || 'N/A',
          });
        }
      });
    }

    const result = {
      channelMap: map,
      missingAverages,
      totalOrders: productionStyles.length,
      generatedAt: new Date().toLocaleString(),
    };

    setGroupedData(result);
    setShowExportMenu(true);

    return result;
  };

  // ************************ UNMAPPED KB AND WEIGHT RELATIONSHIP ***************************

  const generateUnmappedRelationshipData = () => {
    if (filteredData.length === 0) {
      alert('No data for report generation');
      return;
    }

    // unmapped kg and weight relationship array
    let unmappedRelation = [];
    // all style numbers
    const cuttingStyleNumbers = productionStyles.map((r) => r.style_number);

    // unique fabric numbers store karne ke liye
    const uniqueFabricSet = new Set();

    stock.forEach((s) => {
      const hasMatchingStyle = s.styleNumbers.some((styleNo) =>
        cuttingStyleNumbers.includes(styleNo)
      );

      if (hasMatchingStyle) {
        uniqueFabricSet.add(s.fabricNumber);
      }
    });

    // Set → Array
    const fabricNumbers = [...uniqueFabricSet];

    // unmapped kg and weight relationship records
    unmappedRelation = fabricNumbers.filter((un) => {
      return meterAndKG.some(
        (m) => m.fabric_number === un && (m.fabric_in_meter === null || m.fabric_in_meter === 0)
      );
    });

    // console.log('Unique fabric numbers', fabricNumbers);
    // console.log('meter and kg', meterAndKG);
    // console.log('Unmapped kg and weight', unmappedRelation);

    // PDF Export functionality
    if (unmappedRelation.length === 0) {
      alert('No unmapped fabric numbers found');
      return;
    }

    // Create new PDF document
    const doc = new jsPDF();

    // Add title
    doc.setFontSize(18);
    doc.setTextColor(40, 40, 40);
    doc.text('Unmapped Fabric KG AND METER Report', 14, 22);

    // Add generation date
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    const today = new Date();
    const dateString = today.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
    doc.text(`Generated on: ${dateString}`, 14, 30);

    // Add summary
    doc.setFontSize(11);
    doc.setTextColor(60, 60, 60);
    doc.text(`Total Unmapped Fabrics: ${unmappedRelation.length}`, 14, 38);

    // Prepare table data
    const tableColumn = ['S.No', 'Fabric Number', 'Status'];
    const tableRows = [];

    unmappedRelation.forEach((fabricNumber, index) => {
      const fabricData = meterAndKG.find((m) => m.fabric_number === fabricNumber);
      const rowData = [
        (index + 1).toString(),
        fabricNumber,
        fabricData?.fabric_in_meter === null ? 'Null' : 'Zero',
      ];
      tableRows.push(rowData);
    });

    // Generate table
    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 45,
      theme: 'striped',
      headStyles: {
        fillColor: [79, 70, 229], // Purple color
        textColor: [255, 255, 255],
        fontStyle: 'bold',
      },
      alternateRowStyles: {
        fillColor: [245, 245, 250],
      },
      margin: { top: 45 },
    });

    // Add footer with additional info
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text(
        `Page ${i} of ${pageCount}`,
        doc.internal.pageSize.width / 2,
        doc.internal.pageSize.height - 10,
        { align: 'center' }
      );
    }

    // Save the PDF
    const fileName = `unmapped-fabrics-${today.toISOString().split('T')[0]}.pdf`;
    doc.save(fileName);

    // Optional: Return the unmappedRelation for further use
    return unmappedRelation;
  };

  //************************** */ EXPORT CHANNEL SUMMARY ONLY PDF*******************
  const exportChannelSummaryPDF = () => {
    if (!groupedData) {
      alert('Please generate grouped records first');
      return;
    }

    try {
      const { channelMap, totalOrders, generatedAt } = groupedData;
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();

      doc.setFontSize(18);
      doc.setTextColor(41, 128, 185);
      doc.text('CHANNEL SUMMARY REPORT', pageWidth / 2, 20, { align: 'center' });

      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text(`Generated: ${new Date().toLocaleString()}`, pageWidth / 2, 30, { align: 'center' });
      doc.text(`Total Orders: ${totalOrders || 0}`, 14, 45);

      const headers = [['Channel', 'Order Count', 'Percentage']];
      const total = Object.values(channelMap).reduce((a, b) => a + b, 0);
      const rows = Object.entries(channelMap).map(([channel, count]) => [
        channel,
        count.toString(),
        total ? ((count / total) * 100).toFixed(2) + '%' : '0%',
      ]);

      autoTable(doc, {
        head: headers,
        body: rows,
        startY: 55,
        theme: 'striped',
        headStyles: { fillColor: [41, 128, 185], textColor: 255 },
        styles: { fontSize: 11 },
      });

      doc.save(`channel_summary_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (error) {
      console.error('PDF Generation Error:', error);
      alert('Error generating PDF');
    }
  };

  //************************** */ EXPORT MISSING AVERAGES ONLY PDF******************
  const exportMissingAveragesPDF = () => {
    if (!groupedData) {
      alert('Please generate grouped records first');
      return;
    }

    try {
      const { missingAverages } = groupedData;
      const doc = new jsPDF('landscape');

      // Title
      doc.setFontSize(20);
      doc.setTextColor(231, 76, 60);
      doc.text('MISSING AVERAGES REPORT', 148, 20, { align: 'center' });

      // Subtitle
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text(`Generated on: ${new Date().toLocaleString()}`, 148, 28, { align: 'center' });
      doc.text(
        `Total Unique Patterns: ${new Set(missingAverages.map((i) => i.patternNumber)).size}`,
        148,
        35,
        { align: 'center' }
      );

      // Get unique pattern numbers only
      const patternMap = new Map();
      missingAverages.forEach((item) => {
        const key = `${item.patternNumber}`;
        if (!patternMap.has(key)) {
          patternMap.set(key, {
            style_number: item.style_number || 'N/A',
            patternNumber: item.patternNumber || 'N/A',
          });
        }
      });

      const uniqueMissingData = Array.from(patternMap.values());

      if (uniqueMissingData.length > 0) {
        // Headers with ONLY the requested fields
        const headers = [
          ['S.No', 'Style Number', 'Pattern Number', 'XXS_XS', 'S_M', 'L_XL', '2XL_3XL', '4XL_5XL'],
        ];

        const rows = uniqueMissingData
          .sort((a, b) => b.style_number - a.style_number)
          .map((item, index) => [
            (index + 1).toString(),
            item.style_number,
            item.patternNumber,
            '', // XXS_XS - blank
            '', // S_M - blank
            '', // L_XL - blank
            '', // 2XL_3XL - blank
            '', // 4XL_5XL - blank
          ]);

        autoTable(doc, {
          head: headers,
          body: rows,
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
            overflow: 'linebreak',
          },
          columnStyles: {
            0: { cellWidth: 20, halign: 'center' }, // S.No
            1: { cellWidth: 45, halign: 'center' }, // Style Number
            2: { cellWidth: 50, halign: 'center' }, // Pattern Number
            3: { cellWidth: 30, halign: 'center', fillColor: [255, 240, 240] }, // XXS_XS
            4: { cellWidth: 30, halign: 'center', fillColor: [255, 240, 240] }, // S_M
            5: { cellWidth: 30, halign: 'center', fillColor: [255, 240, 240] }, // L_XL
            6: { cellWidth: 30, halign: 'center', fillColor: [255, 240, 240] }, // 2XL_3XL
            7: { cellWidth: 30, halign: 'center', fillColor: [255, 240, 240] }, // 4XL_5XL
          },
          margin: { left: 10, right: 10 },
          tableWidth: 'auto',
          didDrawPage: (data) => {
            // Add "BLANK = MISSING" note
            doc.setFontSize(18);
            doc.setTextColor(231, 76, 60);
            doc.setFont('helvetica', 'italic');
          },
        });
      } else {
        doc.setFontSize(18);
        doc.setTextColor(0, 0, 0);
        doc.text('No missing averages found!', 148, 60, { align: 'center' });
      }

      // Footer
      const pageCount = doc.internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text(
          `Page ${i} of ${pageCount}`,
          doc.internal.pageSize.getWidth() / 2,
          doc.internal.pageSize.getHeight() - 10,
          { align: 'center' }
        );
      }

      doc.save(`missing_averages_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (error) {
      console.error('PDF Generation Error:', error);
      alert('Error generating PDF: ' + error.message);
    }
  };
  useEffect(() => {
    fetchSyncLogData();
  }, []);

  useEffect(() => {
    let result = syncLogData;

    if (channelFilter) {
      result = result.filter((record) =>
        record.channel?.toLowerCase().includes(channelFilter.toLowerCase())
      );
    }

    if (dateFilter) {
      const filterDate = new Date(dateFilter).setHours(0, 0, 0, 0);
      result = result.filter((record) => {
        const recordDate = new Date(record.createdAt).setHours(0, 0, 0, 0);
        return recordDate === filterDate;
      });
    }

    setFilteredData(result);
  }, [syncLogData, channelFilter, dateFilter]);

  // ************************** DOWNLOAD USED FABRIC REPORT *******************************

  // const downloadUsedFabricReport = () => {
  //   if (!productionStyles?.length || !averageData?.length || !stock?.length) {
  //     alert('No data available');
  //     return;
  //   }

  //   const allCombinedData = [];
  //   const allDataWithAverages = [];

  //   /* ---------------------------------------------------
  //    STEP 1 : STYLE → FABRIC NUMBER MAP
  // --------------------------------------------------- */
  //   productionStyles.forEach((ps) => {
  //     stock.forEach((st) => {
  //       if (Array.isArray(st.styleNumbers) && st.styleNumbers.includes(ps.style_number)) {
  //         allCombinedData.push({
  //           ...ps,
  //           fabricNumber: st.fabricNumber,
  //         });
  //       }
  //     });
  //   });

  //   /* ---------------------------------------------------
  //    STEP 2 : ADD AVERAGES DATA
  // --------------------------------------------------- */
  //   allCombinedData.forEach((ac) => {
  //     averageData.forEach((avg) => {
  //       if (avg.style_number === ac.style_number) {
  //         allDataWithAverages.push({
  //           ...ac,
  //           fabrics: avg.fabrics || [],
  //         });
  //       }
  //     });
  //   });

  //   /* ---------------------------------------------------
  //    STEP 3 : SIZE → AVERAGE PICKER
  // --------------------------------------------------- */
  //   const getAverageBySize = (size, fabricAvg) => {
  //     if (!fabricAvg) return 0;

  //     const s = String(size).toUpperCase();

  //     if (['XXS', 'XS'].includes(s)) return fabricAvg.average_xxs_xs || 0;
  //     if (['S', 'M'].includes(s)) return fabricAvg.average_s_m || 0;
  //     if (['L', 'XL'].includes(s)) return fabricAvg.average_l_xl || 0;
  //     if (['2XL', '3XL'].includes(s)) return fabricAvg.average_2xl_3xl || 0;
  //     if (['4XL', '5XL'].includes(s)) return fabricAvg.average_4xl_5xl || 0;

  //     return 0;
  //   };

  //   /* ---------------------------------------------------
  //    STEP 4 : FABRIC USAGE CALCULATION (DYNAMIC FABRICS)
  // --------------------------------------------------- */

  //   const fabricUsage = {};

  //   allDataWithAverages.forEach((item) => {
  //     // 👇 multiple fabrics handle karega
  //     item.fabrics.forEach((fabricAvg) => {
  //       const fabricNumber = item.fabricNumber;

  //       const avgMeter = getAverageBySize(item.size, fabricAvg);

  //       if (!fabricUsage[fabricNumber]) {
  //         fabricUsage[fabricNumber] = {
  //           totalMeter: 0,
  //           totalPieces: 0,
  //         };
  //       }

  //       const qty = item.scan_tracking_2s || 1;

  //       fabricUsage[fabricNumber].totalMeter += avgMeter * qty;
  //       fabricUsage[fabricNumber].totalPieces += qty;
  //     });
  //   });

  //   console.log('All Combined Data:', allCombinedData);
  //   console.log('All Data With Averages:', allDataWithAverages);
  //   console.log('Final Fabric Usage:', fabricUsage);

  //   /* ---------------------------------------------------
  //    RESULT FORMAT
  //    {
  //      3049: { totalMeter: 120, totalPieces: 40 }
  //    }
  // --------------------------------------------------- */
  // };
  const downloadUsedFabricReport = () => {
    if (!productionStyles?.length || !averageData?.length || !stock?.length) {
      alert('No data available');
      return;
    }

    const allCombinedData = [];
    const allDataWithAverages = [];

    /* STEP 1 */
    productionStyles.forEach((ps) => {
      stock.forEach((st) => {
        if (Array.isArray(st.styleNumbers) && st.styleNumbers.includes(ps.style_number)) {
          allCombinedData.push({
            ...ps,
            fabricNumber: st.fabricNumber,
          });
        }
      });
    });

    /* STEP 2 */
    allCombinedData.forEach((ac) => {
      averageData.forEach((avg) => {
        if (avg.style_number === ac.style_number) {
          allDataWithAverages.push({
            ...ac,
            fabrics: avg.fabrics || [],
          });
        }
      });
    });

    /* STEP 3 */
    const getAverageBySize = (size, fabricAvg) => {
      if (!fabricAvg) return 0;

      const s = String(size).toUpperCase();

      if (['XXS', 'XS'].includes(s)) return fabricAvg.average_xxs_xs || 0;
      if (['S', 'M'].includes(s)) return fabricAvg.average_s_m || 0;
      if (['L', 'XL'].includes(s)) return fabricAvg.average_l_xl || 0;
      if (['2XL', '3XL'].includes(s)) return fabricAvg.average_2xl_3xl || 0;
      if (['4XL', '5XL'].includes(s)) return fabricAvg.average_4xl_5xl || 0;

      return 0;
    };

    /* STEP 4 */
    const fabricUsage = {};

    allDataWithAverages.forEach((item) => {
      item.fabrics.forEach((fabricAvg) => {
        const fabricNumber = item.fabricNumber;
        const avgMeter = getAverageBySize(item.size, fabricAvg);
        const qty = 1;

        if (!fabricUsage[fabricNumber]) {
          fabricUsage[fabricNumber] = {
            totalMeter: 0,
            totalPieces: 0,
          };
        }

        fabricUsage[fabricNumber].totalMeter += avgMeter * qty;
        fabricUsage[fabricNumber].totalPieces += qty;
      });
    });

    /* ---------------------------------------------------
     STEP 5 : PDF GENERATION
  --------------------------------------------------- */

    const doc = new jsPDF('portrait');

    // Title
    doc.setFontSize(18);
    doc.text('USED FABRIC REPORT', 14, 15);
    const tableRows = Object.entries(fabricUsage)
      .sort((a, b) => b[1].totalMeter - a[1].totalMeter) // DESCENDING sort
      .map(([fabricNumber, data], index) => [
        index + 1,
        fabricNumber,
        data.totalPieces,
        data.totalMeter.toFixed(2),
      ]);

    autoTable(doc, {
      startY: 25,
      head: [['S.No', 'Fabric Number', 'Total Pieces', 'Used Fabric (Meter)']],
      body: tableRows,
      styles: {
        fontSize: 10,
        halign: 'center',
      },
      headStyles: {
        fillColor: [41, 128, 185],
      },
    });

    // Save PDF
    doc.save(`Used_Fabric_Report_${Date.now()}.pdf`);
  };

  if (loading || stockLoading || styleLoading) {
    return (
      <div className="flex justify-center items-center h-64 mt-15">
        <PulseLoader color="#2563EB" size={12} />
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8 container mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Production Report</h1>

        <div className="mt-4 flex flex-wrap gap-3">
          <button
            onClick={fetchNocoDbRecords}
            disabled={filteredData.length === 0}
            className={`px-4 py-2 rounded-md transition ${
              filteredData.length > 0
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            Generate Report
          </button>

          <button
            onClick={getGroupedRecords}
            disabled={productionStyles.length === 0}
            className={`px-4 py-2 rounded-md transition ${
              productionStyles.length > 0
                ? 'bg-green-600 text-white hover:bg-green-700'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            Generate Missing Pattern Averages
          </button>

          {groupedData && (
            <div className="relative flex gap-3">
              <button
                onClick={() => setShowExportMenu(!showExportMenu)}
                className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition flex items-center"
              >
                <span>Export Pattern Averages</span>
                <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </button>

              {showExportMenu && (
                <div className="absolute left-0 mt-2 w-64 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-50">
                  <div className="py-1">
                    <button
                      onClick={() => {
                        exportChannelSummaryPDF();
                        setShowExportMenu(false);
                      }}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      📊 Channel Summary Only
                    </button>
                    <button
                      onClick={() => {
                        exportMissingAveragesPDF();
                        setShowExportMenu(false);
                      }}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      ⚠️ Missing Averages Only
                    </button>
                  </div>
                </div>
              )}
              <button
                onClick={generateUnmappedRelationshipData}
                className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 transition flex items-center"
              >
                {' '}
                Download Unmapped (MTR & KG){' '}
              </button>

              <button
                onClick={downloadUsedFabricReport}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition flex items-center"
              >
                Download Used Fabric Report
              </button>
            </div>
          )}
        </div>

        {groupedData && (
          <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <span className="text-sm text-gray-600">Total Orders</span>
                <p className="text-2xl font-bold text-gray-900">{groupedData.totalOrders || 0}</p>
              </div>
              <div>
                <span className="text-sm text-gray-600">Total Channels</span>
                <p className="text-2xl font-bold text-gray-900">
                  {Object.keys(groupedData.channelMap).length}
                </p>
              </div>
              <div>
                <span className="text-sm text-gray-600">Missing Averages</span>
                <p className="text-2xl font-bold text-red-600">
                  {groupedData.missingAverages.length}
                </p>
              </div>
              <div>
                <span className="text-sm text-gray-600">Generated</span>
                <p className="text-sm font-medium text-gray-900">{groupedData.generatedAt}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Filter Controls */}
      <div className="mb-6 bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="channel-filter"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Filter by Channel
            </label>
            <select
              onChange={(e) => setChannelFilter(e.target.value)}
              className="border border-gray-300 w-full bg-gray-100 py-2 px-4 rounded-md cursor-pointer outline-gray-300"
              value={channelFilter}
            >
              <option value="">All Channels</option>
              <option value="Myntra">Myntra</option>
              <option value="Nykaa">Nykaa</option>
              <option value="Ajio">Ajio</option>
              <option value="Tatacliq">Tatacliq</option>
              <option value="Shopify">Shopify</option>
            </select>
          </div>
          <div>
            <label htmlFor="date-filter" className="block text-sm font-medium text-gray-700 mb-1">
              Filter by Date
            </label>
            <input
              type="date"
              id="date-filter"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="w-full px-3 py-2 border bg-gray-100 border-gray-300 rounded-md cursor-pointer focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
            {dateFilter && (
              <button
                onClick={() => setDateFilter('')}
                className="mt-2 text-sm text-blue-600 hover:text-blue-800"
              >
                Clear date filter
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Sync Log Table */}
      <div className="bg-white shadow-md rounded-lg overflow-hidden ring-1 ring-gray-200">
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-800">Sync Log Records</h2>
          <p className="text-sm text-gray-600">
            Showing {filteredData.length} of {syncLogData.length} records
          </p>
        </div>
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="text-left font-medium text-gray-700 px-6 py-3">#</th>
              <th className="text-left font-medium text-gray-700 px-6 py-3">Channel</th>
              <th className="text-left font-medium text-gray-700 px-6 py-3">Picklist ID</th>
              <th className="text-left font-medium text-gray-700 px-6 py-3">Sync ID</th>
              <th className="text-left font-medium text-gray-700 px-6 py-3">Created At</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {filteredData.length > 0 ? (
              filteredData.map((record, i) => (
                <tr key={record.id || record._id || i} className="hover:bg-gray-50 transition">
                  <td className="px-6 py-4 text-gray-900">{i + 1}</td>
                  <td className="px-6 py-4 text-gray-700">
                    <span className="px-2 py-1 bg-gray-100 rounded-full text-xs">
                      {record.channel || '-'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-gray-700 font-mono text-xs">
                    {record.picklist_id || '-'}
                  </td>
                  <td className="px-6 py-4 text-gray-700 font-mono text-xs">
                    {record.sync_id || '-'}
                  </td>
                  <td className="px-6 py-4 text-gray-700">
                    {record.createdAt
                      ? new Date(record.createdAt).toLocaleString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : '-'}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="text-center py-8 text-gray-500">
                  {syncLogData.length === 0
                    ? '📭 No sync records found. Please check backend connection.'
                    : '🔍 No records match your selected filters.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ProductionReport;
