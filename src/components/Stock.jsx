import React, { useEffect, useState, useCallback } from 'react';
import { useGlobalContext } from './context/StockContextProvider';
import axios from 'axios';
import { BASE_URL } from '../constant/index.js';
import { ProductStyleImages } from 'react-product-style-images';

const Stock = () => {
  const { stock, stockLoading } = useGlobalContext();
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [inputValue, setInputValue] = useState('');
  const [expandedItems, setExpandedItems] = useState({});
  const [updating, setUpdating] = useState(false);

  // Filter states
  const [filters, setFilters] = useState({
    vendor_source: '',
    blocked_stock_days: '',
    minStock: '',
    maxStock: '',
    location: '',
  });
  const [showFilters, setShowFilters] = useState(false);

  // CSV export - how many top fabrics (by available stock) to include
  const [exportCount, setExportCount] = useState('50');
  const [customExportCount, setCustomExportCount] = useState('');

  const itemsPerPage = 50;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const totalPages = Math.ceil(stock.length / itemsPerPage);

  // Get unique vendors and locations for filter dropdowns
  const uniqueVendors = [...new Set(stock.map((item) => item.vendor_source).filter(Boolean))];
  const uniqueLocations = [...new Set(stock.map((item) => item.location).filter(Boolean))];

  // Filter and search data
  const filteredData = stock.filter((p) => {
    // Search term filter
    const term = searchTerm.toLowerCase();
    const matchesSearch =
      p.fabricNumber?.toString().toLowerCase().includes(term) ||
      p.fabricName?.toLowerCase().includes(term) ||
      p.styleNumbers?.some((s) => s.toString().toLowerCase().includes(term)) ||
      p.vendor_source?.toLowerCase().includes(term) ||
      p.blocked_stock_days === Number(term);

    // Vendor filter
    const matchesVendor =
      !filters.vendor_source ||
      p.vendor_source?.toLowerCase() === filters.vendor_source.toLowerCase();

    // Blocked days filter
    const matchesBlockedDays =
      filters.blocked_stock_days === '' ||
      Number(p.blocked_stock_days || 0) === Number(filters.blocked_stock_days);

    // Min stock filter
    const matchesMinStock =
      !filters.minStock || (p.availableStock || 0) >= parseFloat(filters.minStock);

    // Max stock filter
    const matchesMaxStock =
      !filters.maxStock || (p.availableStock || 0) <= parseFloat(filters.maxStock);

    // Location filter
    const matchesLocation =
      !filters.location || p.location?.toLowerCase() === filters.location.toLowerCase();

    return (
      matchesSearch &&
      matchesVendor &&
      matchesBlockedDays &&
      matchesMinStock &&
      matchesMaxStock &&
      matchesLocation
    );
  });

  const displayItems = filteredData.slice(startIndex, endIndex);
  const totalFilteredPages = Math.ceil(filteredData.length / itemsPerPage);

  const handleClearFilter = () => {
    setInputValue('');
    setSearchTerm('');
    setFilters({
      vendor_source: '',
      blocked_stock_days: '',
      minStock: '',
      maxStock: '',
      location: '',
    });
    setCurrentPage(1);
    setShowFilters(false);
  };

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setCurrentPage(1);
  };

  const toggleExpanded = (fabricNumber) => {
    setExpandedItems((prev) => ({
      ...prev,
      [fabricNumber]: !prev[fabricNumber],
    }));
  };

  // Update status
  const updateStatus = async (id, status) => {
    try {
      const userConfirmation = window.confirm(
        `Are you sure want to ${status ? 'Active' : 'Inactive'}`
      );
      if (!userConfirmation) return;
      setUpdating(true);
      const response = await axios.put(`${BASE_URL}/stock/status`, {
        id,
        status,
      });

      window.location.reload();
    } catch (error) {
      console.error(`Failed to updated status error :: ${error.message}`);
    } finally {
      setUpdating(false);
    }
  };

  /* CSV export - takes the current filtered/searched data, sorts by
     available stock (highest first) and exports the top N fabrics.
     N is user-selectable (10 / 15 / 50 / 100), defaulting to 50. */
  const exportStockCSV = useCallback(() => {
    if (!filteredData.length) return;

    const count =
      exportCount === 'custom'
        ? Math.max(1, parseInt(customExportCount, 10) || filteredData.length)
        : Number(exportCount) || 50;

    const topFabrics = [...filteredData]
      .sort((a, b) => (b.availableStock || 0) - (a.availableStock || 0))
      .slice(0, count);

    const escapeCsv = (val) => {
      const s = String(val ?? '');
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };

    const headers = [
      '#',
      'Fabric No.',
      'Fabric Name',
      'Available Stock (MTR)',
      'Location',
      'Style Numbers',
      'Vendor',
      'Blocked Days',
      'Status',
    ];

    const rows = topFabrics.map((item, i) => [
      i + 1,
      item.fabricNumber ?? '—',
      item.fabricName ?? '—',
      Number(item.availableStock || 0).toFixed(2),
      item.location || '-',
      item.styleNumbers && item.styleNumbers.length > 0 ? item.styleNumbers.join(' | ') : '-',
      item.vendor_source || '-',
      item.blocked_stock_days || 0,
      item.status ? 'Active' : 'Inactive',
    ]);

    const csvContent = [headers, ...rows].map((row) => row.map(escapeCsv).join(',')).join('\r\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const dateString = new Date().toISOString().split('T')[0];

    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Fabric_Stock_Top${count}_${dateString}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [filteredData, exportCount, customExportCount]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [currentPage]);

  if (stockLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen space-y-4 bg-gray-50">
        <div className="animate-spin rounded-full h-14 w-14 border-4 border-blue-600 border-t-transparent"></div>
        <span className="text-gray-600 text-lg font-medium">Loading stock data...</span>
      </div>
    );
  }

  if (updating) {
    return (
      <div className="flex flex-col items-center justify-center h-screen space-y-4 bg-gray-50">
        <div className="animate-spin rounded-full h-14 w-14 border-4 border-blue-600 border-t-transparent"></div>
        <span className="text-gray-600 text-lg font-medium">updating status</span>
      </div>
    );
  }
  return (
    <div className="w-full mx-auto px-4 sm:px-6 py-8 bg-gray-50 min-h-screen">
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {/* Header */}
        <div className="px-4 sm:px-6 py-6 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-blue-50/30">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">Fabric Stock Inventory</h1>
              <p className="mt-1 text-sm text-gray-500">
                Track, search, and manage your fabric stock with ease
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              {/* Search Box */}
              <div className="relative flex-1 min-w-[200px]">
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
                  placeholder="Search fabric, name, or style..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm transition-colors duration-200"
                />
                <svg
                  className="absolute left-3 top-2.5 h-5 w-5 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </div>

              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`px-4 py-2 text-sm font-medium rounded-lg border transition-colors duration-200 flex items-center gap-2 ${
                  Object.values(filters).some((v) => v)
                    ? 'bg-blue-600 text-white border-blue-600 hover:bg-blue-700'
                    : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
                  />
                </svg>
                Filters
                {Object.values(filters).some((v) => v) && (
                  <span className="ml-1 px-2 py-0.5 text-xs bg-white/20 rounded-full">Active</span>
                )}
              </button>

              {(searchTerm || Object.values(filters).some((v) => v)) && (
                <button
                  onClick={handleClearFilter}
                  className="px-4 py-2 text-sm font-medium rounded-lg border border-gray-300 bg-white text-gray-600 hover:bg-gray-50 transition-colors duration-200"
                >
                  Clear All
                </button>
              )}

              {/* Export controls */}
              <div className="flex items-center gap-2 pl-1 border-l border-gray-200 ml-1">
                <label className="text-xs font-medium text-gray-500 whitespace-nowrap">
                  Export Top
                </label>
                <select
                  value={exportCount}
                  onChange={(e) => setExportCount(e.target.value)}
                  className="px-2.5 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-700 transition-colors duration-200"
                >
                  {[10, 15, 50, 100].map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                  <option value="custom">Custom</option>
                </select>
                {exportCount === 'custom' && (
                  <input
                    type="number"
                    min="1"
                    value={customExportCount}
                    onChange={(e) => setCustomExportCount(e.target.value)}
                    placeholder="e.g. 25"
                    className="w-24 px-2.5 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors duration-200"
                  />
                )}
                <button
                  onClick={exportStockCSV}
                  disabled={filteredData.length === 0}
                  className="px-4 py-2 text-sm font-medium rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors duration-200 flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                  Export CSV
                </button>
              </div>
            </div>
          </div>

          {/* Filter Section */}
          {showFilters && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Vendor</label>
                  <select
                    value={filters.vendor_source}
                    onChange={(e) => handleFilterChange('vendor_source', e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors duration-200 bg-white"
                  >
                    <option value="">All Vendors</option>
                    {uniqueVendors.map((vendor) => (
                      <option key={vendor} value={vendor}>
                        {vendor}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Location</label>
                  <select
                    value={filters.location}
                    onChange={(e) => handleFilterChange('location', e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors duration-200 bg-white"
                  >
                    <option value="">All Locations</option>
                    {uniqueLocations.map((location) => (
                      <option key={location} value={location}>
                        {location}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Blocked Days
                  </label>
                  <select
                    value={filters.blocked_stock_days}
                    onChange={(e) => handleFilterChange('blocked_stock_days', e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors duration-200 bg-white"
                  >
                    <option value="">All Days</option>
                    {[
                      ...new Set(
                        stock
                          .map((item) => item.blocked_stock_days)
                          .filter((d) => d !== undefined && d !== null)
                      ),
                    ]
                      .sort((a, b) => a - b)
                      .map((days) => (
                        <option key={days} value={days}>
                          {days} days
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Min Stock (MTR)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={filters.minStock}
                    onChange={(e) => handleFilterChange('minStock', e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors duration-200"
                    placeholder="Min stock"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Max Stock (MTR)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={filters.maxStock}
                    onChange={(e) => handleFilterChange('maxStock', e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors duration-200"
                    placeholder="Max stock"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Summary */}
        <div className="px-4 sm:px-6 py-3 bg-blue-50 border-b border-blue-100 flex flex-wrap justify-between items-center gap-2">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="px-3 py-1 rounded-full bg-blue-100 text-blue-800 font-medium">
              {filteredData.length} Total Items
            </span>
            {searchTerm && (
              <span className="px-3 py-1 rounded-full bg-indigo-100 text-indigo-800 font-medium">
                Search: {searchTerm}
              </span>
            )}
            {Object.values(filters).some((v) => v) && (
              <span className="px-3 py-1 rounded-full bg-green-100 text-green-800 font-medium">
                Filters Active
              </span>
            )}
          </div>
          <p className="text-sm text-gray-600">
            Showing{' '}
            <span className="font-medium">{filteredData.length > 0 ? startIndex + 1 : 0}</span> –{' '}
            <span className="font-medium">{Math.min(endIndex, filteredData.length)}</span> of{' '}
            <span className="font-medium">{filteredData.length}</span>
          </p>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 sticky top-0 z-10 border-b border-gray-200">
              <tr>
                {[
                  '#',
                  // 'Image',
                  'Fabric No.',
                  'Fabric Name',
                  'Available Stock',
                  'Location',
                  'Style Numbers',
                  'Vendor',
                  'Blocked Days',
                  'Actions',
                ].map((head) => (
                  <th
                    key={head}
                    className="px-4 sm:px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider"
                  >
                    {head}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {displayItems.map((curStock, i) => (
                <React.Fragment key={`${curStock.fabricNumber}-${i}`}>
                  <tr className="hover:bg-gray-50 transition-colors duration-150">
                    <td className="px-4 sm:px-6 py-4 font-medium text-gray-900 text-sm">
                      {startIndex + i + 1}
                    </td>
                    {/* <td className="px-4 sm:px-6 py-4 w-80">
                      <ProductStyleImages
                        styleNumbers={curStock.styleNumbers[0]}
                        imageCount={1}
                        width="5%"
                        height="5%"
                      />
                    </td> */}

                    <td className="px-4 sm:px-6 py-4">
                      <span className="text-blue-600 font-medium">{curStock.fabricNumber}</span>
                    </td>
                    <td className="px-4 sm:px-6 py-4 text-gray-700">{curStock.fabricName}</td>
                    <td className="px-4 sm:px-6 py-4">
                      <span
                        className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                          (curStock.availableStock || 0) > 100
                            ? 'bg-green-100 text-green-700'
                            : (curStock.availableStock || 0) > 50
                              ? 'bg-yellow-100 text-yellow-700'
                              : 'bg-red-100 text-red-700'
                        }`}
                      >
                        {`${(curStock.availableStock || 0).toFixed(2)} MTR`}
                      </span>
                    </td>
                    <td className="px-4 sm:px-6 py-4 text-gray-500 text-sm">
                      {curStock.location || '-'}
                    </td>
                    <td className="px-4 sm:px-6 py-4 text-gray-500 text-sm">
                      {curStock.styleNumbers?.length > 0
                        ? `${curStock.styleNumbers.length} style(s)`
                        : '-'}
                    </td>
                    <td className="px-4 sm:px-6 py-4 text-gray-700 text-sm">
                      {curStock.vendor_source || '-'}
                    </td>
                    <td className="px-4 sm:px-6 py-4 text-gray-700 text-sm">
                      {curStock.blocked_stock_days || 0} days
                    </td>
                    <td className="px-4 sm:px-6 py-4">
                      <div className="flex flex-wrap gap-2">
                        {curStock.styleNumbers?.length > 0 && (
                          <button
                            onClick={() => toggleExpanded(curStock.fabricNumber)}
                            className="px-3 py-1 text-xs font-medium bg-blue-50 text-blue-700 rounded-md hover:bg-blue-100 transition-colors duration-200 border border-blue-200"
                          >
                            {expandedItems[curStock.fabricNumber] ? 'Hide' : 'Show'} Styles
                          </button>
                        )}
                        <button
                          onClick={() => updateStatus(curStock._id, !curStock.status)}
                          className={`px-3 py-1 text-xs font-medium rounded-md transition-colors duration-200 border ${
                            curStock.status
                              ? 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100'
                              : 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100'
                          }`}
                        >
                          {curStock.status ? 'Active' : 'Inactive'}
                        </button>
                      </div>
                    </td>
                  </tr>

                  {/* Expanded row for style numbers */}
                  {expandedItems[curStock.fabricNumber] && curStock.styleNumbers?.length > 0 && (
                    <tr className="relative bg-blue-50/50">
                      <td colSpan={9} className="px-4 sm:px-6 py-4">
                        {/* Close/Collapse Button */}
                        <button
                          onClick={() => {
                            // Your collapse logic here
                            setExpandedItems((prev) => ({
                              ...prev,
                              [curStock.fabricNumber]: false,
                            }));
                          }}
                          className="absolute top-2 right-4 text-gray-400 hover:text-gray-600 transition-colors duration-200"
                          aria-label="Collapse"
                        >
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
                              d="M6 18L18 6M6 6l12 12"
                            />
                          </svg>
                        </button>

                        {/* Linked Style Numbers - Top */}
                        <div className="mb-3">
                          <div className="text-sm font-medium text-blue-800 mb-2">
                            Linked Style Numbers:
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {curStock.styleNumbers.map((styleNumber, idx) => (
                              <span
                                key={idx}
                                className="px-3 py-1 text-xs font-medium text-blue-700 bg-white border border-blue-200 rounded-full shadow-sm"
                              >
                                {styleNumber}
                              </span>
                            ))}
                          </div>
                        </div>

                        {/* Product Image - Centered with Blur Background */}
                        <div className="relative flex items-center justify-center py-6">
                          {/* Blur Background */}
                          <div className="absolute inset-0 bg-blue-100/30 backdrop-blur-sm rounded-lg -mx-2" />

                          {/* Image Container */}
                          <div className="relative z-10">
                            <ProductStyleImages
                              styleNumbers={curStock.styleNumbers[0]}
                              imageCount={1}
                              width="40%"
                              height="40%"
                            />
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>

        {/* Empty State */}
        {displayItems.length === 0 && (
          <div className="text-center py-14 bg-white">
            <svg
              className="mx-auto h-14 w-14 text-gray-300"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.5}
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9.75 9h.008v.008H9.75V9zm4.5 0h.008v.008h-.008V9zM12 15.25a6.25 6.25 0 100-12.5 6.25 6.25 0 000 12.5z"
              />
            </svg>
            <h3 className="mt-4 text-lg font-semibold text-gray-800">No stock found</h3>
            <p className="mt-2 text-sm text-gray-500">
              {searchTerm || Object.values(filters).some((v) => v)
                ? 'Try adjusting your search or filters.'
                : 'Your stock inventory is currently empty.'}
            </p>
            {(searchTerm || Object.values(filters).some((v) => v)) && (
              <button
                onClick={handleClearFilter}
                className="mt-5 px-5 py-2 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors duration-200"
              >
                Clear All Filters
              </button>
            )}
          </div>
        )}

        {/* Pagination */}
        {filteredData.length > itemsPerPage && (
          <div className="px-4 sm:px-6 py-4 bg-gray-50 border-t border-gray-200 flex flex-wrap justify-between items-center gap-4">
            <p className="text-sm text-gray-600">
              Page <span className="font-semibold">{currentPage}</span> of {totalFilteredPages}
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                disabled={currentPage === 1}
                className="px-3 py-1.5 rounded-lg border border-gray-300 bg-white text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
              >
                Previous
              </button>
              {Array.from({ length: Math.min(totalFilteredPages, 10) }, (_, i) => {
                let pageNum;
                if (totalFilteredPages <= 10) {
                  pageNum = i + 1;
                } else if (currentPage <= 6) {
                  pageNum = i + 1;
                } else if (currentPage >= totalFilteredPages - 5) {
                  pageNum = totalFilteredPages - 9 + i;
                } else {
                  pageNum = currentPage - 5 + i;
                }
                return (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`px-3 py-1.5 rounded-lg text-sm transition-colors duration-200 ${
                      currentPage === pageNum
                        ? 'bg-blue-600 text-white'
                        : 'bg-white border border-gray-300 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
              <button
                onClick={() => setCurrentPage((p) => Math.min(p + 1, totalFilteredPages))}
                disabled={currentPage === totalFilteredPages}
                className="px-3 py-1.5 rounded-lg border border-gray-300 bg-white text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Stock;
