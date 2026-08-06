import React, { useEffect, useState } from 'react';
import { fetchFabricDataFromGoogleSheet } from '../service/GoogleSheet.services';
import axios from 'axios';
import { BASE_URL } from '../constant/index.js';

const FabricRate = () => {
  const [fabricRate, setFabricRate] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 50;

  const FABRIC_RELATION_URL = `${BASE_URL}/relation/add-relationship`;

  // Fetch data from Google Sheet
  const fetchFabricRates = async () => {
    setLoading(true);
    try {
      const response = await fetchFabricDataFromGoogleSheet();
      setFabricRate(response);
      setError(null);
    } catch (error) {
      console.log('Failed to fetch fabric weight from google sheet error :: ', error?.message);
      setError(`Failed to fetch fabric data: ${error?.message}`);
    } finally {
      setLoading(false);
    }
  };

  const upsertFabricDetails = async () => {
    try {
      const payload = fabricRate.map((fab) => ({
        fabric_number: Number(fab.fabric_number),
        fabric_name: fab.fabric_name || '',
        vender: fab.vender || '',
        fabric_rate: Number(fab.fabric_rate) || '',
        unit: fab.unit || '',
        fabric_length: fab.length || '',
        recieved_qty_meter: Number(fab.recieved_qty_meter) || 0,
        recieved_qty_kg: Number(fab.recieved_qty_kg) || 0,
        width: fab.width || '',
        recieved_date: fab.date || '',
      }));

      // const response = await axios.post("http://localhost:5000/api/v1/fabric-rate/add-fabric-details", payload,
      const response = await axios.post(`${BASE_URL}/fabric-rate/add-fabric-details`, payload, {
        headers: { 'Content-Type': 'application/json' },
      });
      console.log(response.data);
      alert(response.data?.message);
    } catch (error) {
      console.log('Failed to upsertFabricDetails error :: ', error);
    }
  };

  useEffect(() => {
    fetchFabricRates();
  }, []);

  useEffect(() => {
    if (fabricRate.length > 0) {
      upsertFabricDetails();
    }
  }, [fabricRate]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const updateMeterAndKgRelationShip = async () => {
    try {
      const payload = fabricRate.map((fab) => ({
        fabric_number: fab.fabric_number || '',
        fabric_in_KG: 1,
        fabric_in_meter:
          fab.recieved_qty_kg > 0 ? (fab.recieved_qty_meter / fab.recieved_qty_kg).toFixed(2) : '',
      }));

      const response = await axios.post(FABRIC_RELATION_URL, payload);
      console.log(response.data);
      alert('Fabric relationship updated successfully!');
    } catch (error) {
      console.log('Failed to update fabric relationship error :: ', error);
      alert('Failed to update fabric relationship');
    }
  };

  // Filtered data based on search
  const filteredData = fabricRate.filter((fab) => {
    const term = searchTerm.toLowerCase();
    return (
      fab.fabric_number?.toString().toLowerCase().includes(term) ||
      fab.fabric_name?.toLowerCase().includes(term) ||
      fab.vender?.toLowerCase().includes(term) ||
      fab.unit?.toString().toLowerCase().includes(term) ||
      fab.length?.toString().toLowerCase().includes(term) ||
      fab.width?.toString().toLowerCase().includes(term) ||
      fab.date?.toString().toLowerCase().includes(term)
    );
  });

  const totalRecords = filteredData.length;
  const NO_OF_PAGES = Math.ceil(totalRecords / PAGE_SIZE);
  const start = (currentPage - 1) * PAGE_SIZE;
  const end = Math.min(start + PAGE_SIZE, totalRecords);
  const dataToDisplay = filteredData.slice(start, end);

  // Pagination handlers
  const handlePrev = () => {
    if (currentPage > 1) setCurrentPage(currentPage - 1);
  };

  const handleNext = () => {
    if (currentPage < NO_OF_PAGES) setCurrentPage(currentPage + 1);
  };

  const formatWidth = (width) => {
    if (!width) return '';
    const widthStr = width.toString().toLowerCase().trim();
    if (widthStr.startsWith('normal')) return 'Normal';
    if (widthStr.startsWith('big')) return 'Big';
    return width;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading fabric data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="container mx-auto">
        {/* Header Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Latest Fabric purchase</h1>
          <p className="text-gray-600">Manage and view fabric rates from Google Sheets</p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center">
            <div className="flex-shrink-0">
              <svg className="w-5 h-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <div className="text-sm text-red-700 mt-1">{error}</div>
            </div>
          </div>
        )}

        {/* Search and Actions Bar */}
        <div className="mb-6 flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
          <div className="flex-1 max-w-lg">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg
                  className="h-4 w-4 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </div>
              <input
                type="text"
                placeholder="Search by fabric no, name, vendor, unit, length, width, or date..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
              />
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={updateMeterAndKgRelationShip}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors duration-200"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              Update Relations
            </button>
          </div>
        </div>

        {/* Stats Bar */}
        <div className="mb-4 flex flex-wrap gap-4 text-sm text-gray-600">
          <span className="bg-white px-3 py-1 rounded-lg border border-gray-200">
            Total: <span className="font-semibold text-gray-900">{filteredData.length}</span>{' '}
            records
          </span>
          {searchTerm && (
            <span className="bg-blue-50 px-3 py-1 rounded-lg border border-blue-200 text-blue-700">
              Filtered: <span className="font-semibold">{filteredData.length}</span>
            </span>
          )}
          <span className="bg-green-50 px-3 py-1 rounded-lg border border-green-200 text-green-700">
            Page: <span className="font-semibold">{currentPage}</span> of{' '}
            <span className="font-semibold">{NO_OF_PAGES}</span>
          </span>
        </div>

        {/* Table Container */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider"
                  >
                    Fabric No.
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider"
                  >
                    Fabric Name
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider"
                  >
                    Vendor
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider"
                  >
                    Rate
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider"
                  >
                    Unit
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider"
                  >
                    Length
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider"
                  >
                    RCD (MTR)
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider"
                  >
                    RCD (KG)
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider"
                  >
                    Meter/KG Ratio
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider"
                  >
                    Width
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider"
                  >
                    Received Date
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {dataToDisplay.length > 0 ? (
                  dataToDisplay.map((fab, i) => (
                    <tr
                      key={fab.fabric_number + i}
                      className="hover:bg-gray-50 transition-colors duration-150 ease-in-out"
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-indigo-600">
                        {fab.fabric_number}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {fab.fabric_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {fab.vender}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        ₹{fab.fabric_rate}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {fab.unit}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {fab.length}m
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {fab.recieved_qty_meter}m
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {fab.recieved_qty_kg}kg
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        {fab.recieved_qty_kg > 0 ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            {(fab.recieved_qty_meter / fab.recieved_qty_kg).toFixed(2)} m/kg
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                            N/A
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatWidth(fab.width)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {fab.date ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            {new Date(fab.date).toLocaleString('en-IN', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            NA
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={11} className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center justify-center text-gray-500">
                        <svg
                          className="w-16 h-16 text-gray-300 mb-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={1}
                            d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                        <h3 className="text-lg font-medium text-gray-900 mb-1">
                          {searchTerm ? 'No matching records found' : 'No fabric data available'}
                        </h3>
                        <p className="text-gray-500">
                          {searchTerm
                            ? 'Try adjusting your search terms'
                            : 'No fabric records found in the system.'}
                        </p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {NO_OF_PAGES > 1 && (
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="text-sm text-gray-700">
                  Showing <span className="font-medium">{start + 1}</span> to{' '}
                  <span className="font-medium">{end}</span> of{' '}
                  <span className="font-medium">{totalRecords}</span> results
                  {searchTerm && <span className="text-blue-600 ml-2">(filtered)</span>}
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={handlePrev}
                    disabled={currentPage === 1}
                    className={`inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md ${
                      currentPage === 1
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : 'bg-white text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    Previous
                  </button>

                  <div className="flex space-x-1">
                    {[...Array(NO_OF_PAGES)].map((_, i) => (
                      <button
                        key={i}
                        onClick={() => setCurrentPage(i + 1)}
                        className={`w-10 h-10 rounded-md text-sm font-medium ${
                          currentPage === i + 1
                            ? 'bg-indigo-600 text-white'
                            : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
                        }`}
                      >
                        {i + 1}
                      </button>
                    ))}
                  </div>

                  <button
                    onClick={handleNext}
                    disabled={currentPage === NO_OF_PAGES}
                    className={`inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md ${
                      currentPage === NO_OF_PAGES
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : 'bg-white text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FabricRate;
