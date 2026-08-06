import React, { useEffect, useState, useMemo } from 'react';
import { useGlobalContext } from './context/StockContextProvider';

const MeterAndKgRelationship = () => {
  const { fetchMeterAndKgRelationShip, meterAndKG, styleLoading } = useGlobalContext();
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [recordsPerPage] = useState(25);

  useEffect(() => {
    fetchMeterAndKgRelationShip();
  }, []);

  // Filter data based on search term
  const filteredData = useMemo(() => {
    if (!meterAndKG) return [];

    return meterAndKG.filter((item) =>
      item.fabric_number?.toString()?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [meterAndKG, searchTerm]);

  // Get data with fabric_in_meter > 0
  const filteredWithMeter = useMemo(() => {
    return filteredData.filter((item) => item.fabric_in_meter > 0);
  }, [filteredData]);

  // Calculate pagination
  const totalPages = Math.ceil(filteredWithMeter.length / recordsPerPage);
  const indexOfLastRecord = currentPage * recordsPerPage;
  const indexOfFirstRecord = indexOfLastRecord - recordsPerPage;
  const currentRecords = filteredWithMeter.slice(indexOfFirstRecord, indexOfLastRecord);

  // Change page
  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  // Go to next page
  const nextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage((prev) => prev + 1);
    }
  };

  // Go to previous page
  const prevPage = () => {
    if (currentPage > 1) {
      setCurrentPage((prev) => prev - 1);
    }
  };

  // Reset to first page when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  // ---------- EXPORT FUNCTIONS ----------
  const exportToCSV = (data, filename) => {
    if (!data || data.length === 0) {
      alert('No data available to export.');
      return;
    }

    // Define CSV headers
    const headers = ['Fabric Number', 'Fabric Weight (KG)', 'Fabric Length (Meter)'];
    const csvRows = [headers];

    // Populate rows
    for (const item of data) {
      const row = [
        `"${item.fabric_number || ''}"`,
        filename === 'fabrics_meter_non_positive' ? '' : item.fabric_in_KG,
        item.fabric_in_meter,
      ];
      csvRows.push(row.join(','));
    }

    // Create blob and download
    const csvString = csvRows.join('\n');
    const blob = new Blob([csvString], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${filename}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const exportPositiveMeterData = () => {
    if (!meterAndKG) return;
    const positiveData = meterAndKG.filter((item) => item.fabric_in_meter > 0);
    exportToCSV(positiveData, 'fabrics_meter_positive');
  };

  const exportNonPositiveMeterData = () => {
    if (!meterAndKG) return;
    const nonPositiveData = meterAndKG.filter((item) => item.fabric_in_meter <= 0);
    exportToCSV(nonPositiveData, 'fabrics_meter_non_positive');
  };

  if (styleLoading) {
    return (
      <div className="flex flex-col justify-center items-center min-h-[400px] bg-gradient-to-b from-gray-900 to-black">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-gray-700 border-t-blue-500 rounded-full animate-spin"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-transparent border-t-white rounded-full animate-spin"></div>
          </div>
        </div>
        <p className="mt-4 text-lg text-gray-300 font-medium">Loading fabric data...</p>
        <p className="text-sm text-gray-500 mt-1">Please wait a moment</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="container mx-auto px-4 py-8">
        {/* Header Section */}
        <div className="text-center mb-10">
          <div className="inline-block bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-2 rounded-full mb-4">
            <span className="text-sm font-semibold tracking-wider">FABRIC CONVERSION</span>
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-3 tracking-tight">
            Meter ↔ Kilogram Relationship
          </h1>
          <p className="text-gray-600 max-w-2xl mx-auto text-lg">
            Comprehensive fabric weight and length conversion database with real-time filtering
          </p>
        </div>

        {/* Stats and Search Card */}
        <div className="bg-white rounded-2xl  border border-gray-200 p-6 mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="flex-1">
              <div className="relative max-w-xl">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg
                    className="w-5 h-5 text-gray-400"
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
                  placeholder="Search by fabric number..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-gray-50 text-gray-900 placeholder-gray-500"
                />
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex flex-col items-end">
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold text-gray-900">
                    {filteredWithMeter.length}
                  </span>
                  <span className="text-gray-600">of</span>
                  <span className="text-2xl font-bold text-gray-900">{filteredData.length}</span>
                  <span className="text-gray-600">results</span>
                </div>
                <p className="text-sm text-gray-500 mt-1">
                  Showing {Math.min(currentRecords.length, recordsPerPage)} records per page
                </p>
              </div>
              <div className="h-10 w-px bg-gray-300"></div>
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-5 py-3 rounded-xl border border-blue-100">
                <div className="text-sm font-medium text-gray-600">Total Pages</div>
                <div className="text-2xl font-bold text-blue-600">{totalPages}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Export Buttons Section */}
        <div className="flex  ml-auto w-md gap-4 mt-6 pt-6 border-t mb-4 border-gray-200">
          <button
            onClick={exportPositiveMeterData}
            className="px-5 py-2.5 bg-gradient-to-r from-green-600 to-emerald-600 text-white font-medium rounded-xl hover:from-green-700 hover:to-emerald-700 transition-all duration-200 shadow-md flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
              />
            </svg>
            Mapped Fabric Relation
          </button>
          <button
            onClick={exportNonPositiveMeterData}
            className="px-5 py-2.5 bg-gradient-to-r from-orange-500 to-red-500 text-white font-medium rounded-xl hover:from-orange-600 hover:to-red-600 transition-all duration-200 shadow-md flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
              />
            </svg>
            Missing Fabric Relation
          </button>
        </div>
        {/* </div> */}

        {/* Main Table Card */}
        <div className="bg-white rounded-2xl shadow-xs border border-gray-200 overflow-hidden mb-8">
          {currentRecords.length > 0 ? (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gradient-to-r from-gray-900 to-black">
                    <tr>
                      <th className="px-8 py-5 text-left font-bold text-sm uppercase tracking-wider text-white">
                        <div className="flex items-center gap-2">
                          <span>Fabric Number</span>
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
                              d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"
                            />
                          </svg>
                        </div>
                      </th>
                      <th className="px-8 py-5 text-left font-bold text-sm uppercase tracking-wider text-white">
                        Fabric Weight (KG)
                      </th>
                      <th className="px-8 py-5 text-left font-bold text-sm uppercase tracking-wider text-white">
                        Fabric Length (Meter)
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {currentRecords.map((item, index) => (
                      <tr
                        key={item._id}
                        className={`transition-all duration-200 hover:bg-blue-50 ${
                          index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                        }`}
                      >
                        <td className="px-8 py-5">
                          <div className="flex items-center gap-3">
                            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                            <span className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-semibold bg-blue-100 text-blue-800">
                              #{item.fabric_number}
                            </span>
                          </div>
                        </td>
                        <td className="px-8 py-5">
                          <div className="flex items-center">
                            <div className="w-24 bg-gray-200 rounded-full h-2.5 mr-4">
                              <div
                                className="bg-gradient-to-r from-green-400 to-emerald-500 h-2.5 rounded-full"
                                style={{
                                  width: `${Math.min((item.fabric_in_KG / 100) * 100, 100)}%`,
                                }}
                              ></div>
                            </div>
                            <span className="text-lg font-bold text-gray-900">
                              {item.fabric_in_KG}
                            </span>
                            <span className="ml-1 text-gray-600">kg</span>
                          </div>
                        </td>
                        <td className="px-8 py-5">
                          <div className="flex items-center">
                            <div className="w-24 bg-gray-200 rounded-full h-2.5 mr-4">
                              <div
                                className="bg-gradient-to-r from-purple-400 to-pink-500 h-2.5 rounded-full"
                                style={{
                                  width: `${Math.min((item.fabric_in_meter / 1000) * 100, 100)}%`,
                                }}
                              ></div>
                            </div>
                            <span className="text-lg font-bold text-gray-900">
                              {item.fabric_in_meter}
                            </span>
                            <span className="ml-1 text-gray-600">m</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="px-8 py-6 border-t border-gray-200 bg-gray-50">
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="text-sm text-gray-700">
                      Showing <span className="font-semibold">{indexOfFirstRecord + 1}</span> to{' '}
                      <span className="font-semibold">
                        {Math.min(indexOfLastRecord, filteredWithMeter.length)}
                      </span>{' '}
                      of <span className="font-semibold">{filteredWithMeter.length}</span> results
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Previous Button */}
                      <button
                        onClick={prevPage}
                        disabled={currentPage === 1}
                        className={`px-4 py-2.5 rounded-lg font-medium flex items-center gap-2 transition-all ${
                          currentPage === 1
                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                            : 'bg-white text-gray-700 hover:bg-blue-50 hover:text-blue-600 border border-gray-300'
                        }`}
                      >
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
                            d="M15 19l-7-7 7-7"
                          />
                        </svg>
                        Previous
                      </button>

                      {/* Page Numbers */}
                      <div className="flex items-center gap-1">
                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                          let pageNumber;
                          if (totalPages <= 5) {
                            pageNumber = i + 1;
                          } else if (currentPage <= 3) {
                            pageNumber = i + 1;
                          } else if (currentPage >= totalPages - 2) {
                            pageNumber = totalPages - 4 + i;
                          } else {
                            pageNumber = currentPage - 2 + i;
                          }

                          return (
                            <button
                              key={pageNumber}
                              onClick={() => paginate(pageNumber)}
                              className={`min-w-[40px] h-10 rounded-lg font-medium transition-all ${
                                currentPage === pageNumber
                                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg'
                                  : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
                              }`}
                            >
                              {pageNumber}
                            </button>
                          );
                        })}

                        {totalPages > 5 && currentPage < totalPages - 2 && (
                          <>
                            <span className="px-2 text-gray-400">...</span>
                            <button
                              onClick={() => paginate(totalPages)}
                              className={`min-w-[40px] h-10 rounded-lg font-medium transition-all ${
                                currentPage === totalPages
                                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg'
                                  : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
                              }`}
                            >
                              {totalPages}
                            </button>
                          </>
                        )}
                      </div>

                      {/* Next Button */}
                      <button
                        onClick={nextPage}
                        disabled={currentPage === totalPages}
                        className={`px-4 py-2.5 rounded-lg font-medium flex items-center gap-2 transition-all ${
                          currentPage === totalPages
                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                            : 'bg-white text-gray-700 hover:bg-blue-50 hover:text-blue-600 border border-gray-300'
                        }`}
                      >
                        Next
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
                            d="M9 5l7 7-7 7"
                          />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-16 px-4">
              <div className="max-w-md mx-auto">
                <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center">
                  <svg
                    className="w-12 h-12 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-3">
                  {searchTerm ? 'No matching results found' : 'No conversion data available'}
                </h3>
                <p className="text-gray-600 mb-8">
                  {searchTerm
                    ? `We couldn't find any fabric numbers matching "${searchTerm}". Try a different search term.`
                    : 'The fabric conversion data will appear here once available. Please check back later.'}
                </p>
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-medium rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 shadow-lg hover:shadow-xl"
                  >
                    Clear Search & Show All
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer Note */}
        <div className="text-center text-gray-500 text-sm">
          <p>
            Data updates in real-time • 50 records per page • Total {filteredWithMeter.length}{' '}
            active fabric entries
          </p>
        </div>
      </div>
    </div>
  );
};

export default MeterAndKgRelationship;
