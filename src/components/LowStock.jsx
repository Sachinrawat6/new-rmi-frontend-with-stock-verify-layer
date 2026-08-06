import React, { useEffect, useState } from 'react';
import { useGlobalContext } from './context/StockContextProvider';
import Papa from 'papaparse';
import { fetchColorsFromGoogleSheet } from '../service/GoogleSheet.services';

const LowStock = () => {
  const { stockLoading, stock } = useGlobalContext();
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    fetchColorsFromGoogleSheet();
  }, []);

  if (stockLoading) {
    return (
      <div className="flex justify-center items-center h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-600 mx-auto"></div>
          <span className="ml-3 text-gray-600 text-lg mt-4 block">Loading stock data...</span>
        </div>
      </div>
    );
  }

  const lowStockItems = stock.filter((p) => p.availableStock < 20);

  const handleDownloadCSV = async () => {
    setExporting(true);

    try {
      // Enhanced CSV data with more details
      const csvData = lowStockItems.map((item) => ({
        'Fabric Number': item.fabricNumber,
        'Fabric Name': item.fabricName || 'N/A',
        'Available Stock': item.availableStock,
        'Stock Status': item.availableStock > 100 ? 'Medium' : 'Critical',
        Location: item.location || 'Main Warehouse',
        'Last Updated': new Date().toLocaleDateString(),
        'Style Numbers': item.styleNumbers ? item.styleNumbers.join(', ') : 'No styles assigned',
        'Total Styles': item.styleNumbers ? item.styleNumbers.length : 0,
        'Urgency Level': item.availableStock > 100 ? 'Medium Priority' : 'High Priority',
      }));

      const csv = Papa.unparse(csvData, {
        quotes: true,
        delimiter: ',',
        header: true,
      });

      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute(
        'download',
        `low_stock_report_${new Date().toISOString().split('T')[0]}.csv`
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Show success feedback
      setTimeout(() => setExporting(false), 1000);
    } catch (error) {
      console.error('Export failed:', error);
      setExporting(false);
    }
  };

  const getStockStatus = (stock) => {
    if (stock > 100)
      return { label: 'Medium', color: 'bg-yellow-100 text-yellow-800', badge: 'bg-yellow-500' };
    if (stock > 50)
      return { label: 'Low', color: 'bg-orange-100 text-orange-800', badge: 'bg-orange-500' };
    return { label: 'Critical', color: 'bg-red-100 text-red-800', badge: 'bg-red-500' };
  };

  const getPriorityIcon = (stock) => {
    if (stock > 100) return '🟡';
    if (stock > 50) return '🟠';
    return '🔴';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 py-8 px-4 sm:px-6 lg:px-8 container mx-auto">
      <div className="container mx-auto">
        {/* Header Section */}
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-3">Stock Management Dashboard</h1>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto">
            Monitor fabric inventory levels and take proactive actions for low stock items
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-2xl  p-6 border-l-4 border-blue-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Fabrics</p>
                <p className="text-3xl font-bold text-gray-900">{stock.length}</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-full">
                <svg
                  className="w-6 h-6 text-blue-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                  />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl  p-6 border-l-4 border-red-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Low Stock Items</p>
                <p className="text-3xl font-bold text-red-600">{lowStockItems.length}</p>
              </div>
              <div className="p-3 bg-red-100 rounded-full">
                <svg
                  className="w-6 h-6 text-red-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.35 16.5c-.77.833.192 2.5 1.732 2.5z"
                  />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl  p-6 border-l-4 border-yellow-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Critical Items</p>
                <p className="text-3xl font-bold text-yellow-600">
                  {lowStockItems.filter((item) => item.availableStock <= 50).length}
                </p>
              </div>
              <div className="p-3 bg-yellow-100 rounded-full">
                <svg
                  className="w-6 h-6 text-yellow-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl  p-6 border-l-4 border-green-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">In Stock Items</p>
                <p className="text-3xl font-bold text-green-600">
                  {stock.length - lowStockItems.length}
                </p>
              </div>
              <div className="p-3 bg-green-100 rounded-full">
                <svg
                  className="w-6 h-6 text-green-600"
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
            </div>
          </div>
        </div>

        {/* Main Content Card */}
        <div className="bg-white rounded-2xl  border border-gray-200 overflow-hidden">
          {/* Card Header */}
          <div className="px-8 py-6 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-blue-50">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
              <div className="mb-4 lg:mb-0">
                <h2 className="text-2xl font-bold text-gray-800 flex items-center">
                  <span className="w-3 h-3 bg-red-500 rounded-full mr-3 animate-pulse"></span>
                  Low Stock Alert
                </h2>
                <p className="text-gray-600 mt-1">
                  Fabrics requiring immediate attention and restocking
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                {lowStockItems.length > 0 && (
                  <button
                    onClick={handleDownloadCSV}
                    disabled={exporting}
                    className="inline-flex items-center justify-center px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-medium rounded-lg hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 transition-all duration-200 shadow-lg hover:shadow-xl"
                  >
                    {exporting ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                        Exporting...
                      </>
                    ) : (
                      <>
                        <svg
                          className="w-5 h-5 mr-2"
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
                        Export CSV Report
                      </>
                    )}
                  </button>
                )}

                <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-2">
                  <span className="text-red-800 font-semibold">
                    {lowStockItems.length} Items Need Attention
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Table Section */}
          <div className="overflow-x-auto">
            {lowStockItems.length > 0 ? (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th
                      scope="col"
                      className="px-8 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider"
                    >
                      Priority
                    </th>
                    <th
                      scope="col"
                      className="px-8 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider"
                    >
                      Fabric Details
                    </th>
                    <th
                      scope="col"
                      className="px-8 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider"
                    >
                      Stock Level
                    </th>
                    <th
                      scope="col"
                      className="px-8 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider"
                    >
                      Location
                    </th>
                    <th
                      scope="col"
                      className="px-8 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider"
                    >
                      Associated Styles
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {lowStockItems.map((item, i) => {
                    const status = getStockStatus(item.availableStock);
                    return (
                      <tr
                        key={`${item.fabricNumber}-${i}`}
                        className="hover:bg-blue-50 transition-all duration-200 group"
                      >
                        <td className="px-8 py-5 whitespace-nowrap">
                          <div className="flex items-center">
                            <span className="text-2xl mr-3">
                              {getPriorityIcon(item.availableStock)}
                            </span>
                            <span
                              className={`px-3 py-1 rounded-full text-xs font-bold ${status.color}`}
                            >
                              {status.label}
                            </span>
                          </div>
                        </td>
                        <td className="px-8 py-5 whitespace-nowrap">
                          <div>
                            <div className="text-lg font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                              #{item.fabricNumber}
                            </div>
                            <div className="text-sm text-gray-500">
                              {item.fabricName || 'No name provided'}
                            </div>
                          </div>
                        </td>
                        <td className="px-8 py-5 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="w-24 bg-gray-200 rounded-full h-2.5 mr-3">
                              <div
                                className={`h-2.5 rounded-full ${status.badge}`}
                                style={{
                                  width: `${Math.min((item.availableStock / 200) * 100, 100)}%`,
                                }}
                              ></div>
                            </div>
                            <span className="text-lg font-bold text-gray-900">
                              {item.availableStock}
                            </span>
                            <span className="text-sm text-gray-500 ml-1">/200</span>
                          </div>
                        </td>
                        <td className="px-8 py-5 whitespace-nowrap text-sm text-gray-900">
                          {item.location || 'Main Warehouse'}
                        </td>
                        <td className="px-8 py-5">
                          <div className="flex flex-wrap gap-1 max-w-xs">
                            {item.styleNumbers && item.styleNumbers.length > 0 ? (
                              item.styleNumbers.slice(0, 3).map((style, idx) => (
                                <span
                                  key={idx}
                                  className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full"
                                >
                                  {style}
                                </span>
                              ))
                            ) : (
                              <span className="text-gray-400 text-sm">No styles assigned</span>
                            )}
                            {item.styleNumbers && item.styleNumbers.length > 3 && (
                              <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                                +{item.styleNumbers.length - 3} more
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <div className="text-center py-16 bg-gradient-to-br from-green-50 to-blue-50">
                <div className="max-w-md mx-auto">
                  <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <svg
                      className="w-12 h-12 text-green-600"
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
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">
                    Excellent Stock Levels! 🎉
                  </h3>
                  <p className="text-gray-600 mb-6">
                    All fabrics are well-stocked above the threshold. Great inventory management!
                  </p>
                  <div className="bg-white rounded-lg p-4 inline-block shadow-sm">
                    <span className="text-green-600 font-semibold">✓ All systems operational</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          {lowStockItems.length > 0 && (
            <div className="px-8 py-4 bg-gray-50 border-t border-gray-200">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between text-sm text-gray-600">
                <span>
                  Showing <span className="font-semibold">{lowStockItems.length}</span> low stock
                  items
                  {lowStockItems.filter((item) => item.availableStock <= 50).length > 0 && (
                    <span className="ml-2 text-red-600 font-semibold">
                      ({lowStockItems.filter((item) => item.availableStock <= 50).length} critical)
                    </span>
                  )}
                </span>
                <span className="mt-2 sm:mt-0">
                  Last updated: {new Date().toLocaleDateString()}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LowStock;
