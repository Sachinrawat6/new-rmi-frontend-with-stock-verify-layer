import React, { useEffect, useState, useMemo } from 'react';
import { useGlobalContext } from './context/StockContextProvider';
import { BASE_URL } from '../constant/index.js';
import axios from 'axios';

const MeterAndKgRelationship = () => {
  const { fetchMeterAndKgRelationShip, meterAndKG, styleLoading } = useGlobalContext();
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [recordsPerPage] = useState(25);
  const [editingItem, setEditingItem] = useState(null);
  const [editFormData, setEditFormData] = useState({ fabric_in_KG: '', fabric_in_meter: '' });
  const [showEditModal, setShowEditModal] = useState(false);
  const [updateSuccess, setUpdateSuccess] = useState(false);
  const [updateError, setUpdateError] = useState('');

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

    const headers = ['Fabric Number', 'Fabric Weight (KG)', 'Fabric Length (Meter)'];
    const csvRows = [headers];

    for (const item of data) {
      const row = [
        `"${item.fabric_number || ''}"`,
        filename === 'fabrics_meter_non_positive' ? '' : item.fabric_in_KG,
        item.fabric_in_meter,
      ];
      csvRows.push(row.join(','));
    }

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

  // ---------- EDIT FUNCTIONS ----------
  const handleEditClick = (item) => {
    setEditingItem(item);
    setEditFormData({
      fabric_in_KG: item.fabric_in_KG || '',
      fabric_in_meter: item.fabric_in_meter || '',
    });
    setShowEditModal(true);
    setUpdateError('');
    setUpdateSuccess(false);
  };

  const handleEditInputChange = (e) => {
    const { name, value } = e.target;
    setEditFormData((prev) => ({
      ...prev,
      [name]: value === '' ? '' : parseFloat(value) || 0,
    }));
  };

  const handleUpdateRelation = async (e) => {
    e.preventDefault();
    if (!editingItem) return;

    try {
      const payload = [
        {
          fabric_number: editingItem.fabric_number,
          fabric_in_KG: editFormData.fabric_in_KG,
          fabric_in_meter: editFormData.fabric_in_meter,
        },
      ];

      const response = await axios.post(`${BASE_URL}/relation/add-relationship`, payload);

      if (response.status === 200 || response.status === 201) {
        setUpdateSuccess(true);
        setUpdateError('');
        await fetchMeterAndKgRelationShip();
        setTimeout(() => {
          setShowEditModal(false);
          setEditingItem(null);
          setUpdateSuccess(false);
        }, 1500);
      } else {
        setUpdateError('Failed to update relation. Please try again.');
      }
    } catch (error) {
      console.error('Failed to update kg meter relation', error.message);
      setUpdateError(
        error.response?.data?.message || 'Failed to update relation. Please try again.'
      );
    }
  };

  const closeModal = () => {
    setShowEditModal(false);
    setEditingItem(null);
    setUpdateError('');
    setUpdateSuccess(false);
  };

  if (styleLoading) {
    return (
      <div className="flex flex-col justify-center items-center min-h-[400px] bg-gray-50">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-gray-200 border-t-blue-500 rounded-full animate-spin"></div>
        </div>
        <p className="mt-4 text-lg text-gray-600 font-medium">Loading fabric data...</p>
        <p className="text-sm text-gray-400 mt-1">Please wait a moment</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Header Section */}
        <div className="text-center mb-8">
          <div className="inline-block bg-blue-600 text-white px-5 py-1.5 rounded-full mb-3">
            <span className="text-xs font-semibold tracking-wider">FABRIC CONVERSION</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Meter ↔ Kilogram Relationship</h1>
          <p className="text-gray-500 text-sm">Manage fabric conversion rates</p>
        </div>

        {/* Stats and Search Card */}
        <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex-1">
              <div className="relative max-w-md">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg
                    className="w-4 h-4 text-gray-400"
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
                  className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white text-gray-900 placeholder-gray-400 text-sm"
                />
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold text-gray-900">{filteredWithMeter.length}</span>
                <span className="text-gray-500 text-sm">of</span>
                <span className="text-lg font-bold text-gray-900">{filteredData.length}</span>
                <span className="text-gray-500 text-sm">results</span>
              </div>
              <div className="h-8 w-px bg-gray-300"></div>
              <div className="bg-blue-50 px-4 py-2 rounded-lg border border-blue-100">
                <div className="text-xs font-medium text-gray-500">Total Pages</div>
                <div className="text-xl font-bold text-blue-600">{totalPages}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Export Buttons Section */}
        <div className="flex flex-wrap gap-3 mt-4 pt-4 border-t border-gray-200 mb-4">
          <button
            onClick={exportPositiveMeterData}
            className="px-4 py-2 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-colors duration-200 flex items-center gap-2 text-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
            className="px-4 py-2 bg-orange-500 text-white font-medium rounded-lg hover:bg-orange-600 transition-colors duration-200 flex items-center gap-2 text-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

        {/* Main Table Card */}
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          {currentRecords.length > 0 ? (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-900">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold text-xs uppercase tracking-wider text-white">
                        Fabric Number
                      </th>
                      <th className="px-4 py-3 text-left font-semibold text-xs uppercase tracking-wider text-white">
                        Fabric Weight (KG)
                      </th>
                      <th className="px-4 py-3 text-left font-semibold text-xs uppercase tracking-wider text-white">
                        Fabric Length (Meter)
                      </th>
                      <th className="px-4 py-3 text-center font-semibold text-xs uppercase tracking-wider text-white">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {currentRecords.map((item, index) => (
                      <tr
                        key={item._id}
                        className={`transition-colors duration-150 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-blue-50`}
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
                              #{item.fabric_number}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-20 bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-green-500 h-2 rounded-full transition-all duration-300"
                                style={{
                                  width: `${Math.min((item.fabric_in_KG / 100) * 100, 100)}%`,
                                }}
                              ></div>
                            </div>
                            <span className="font-semibold text-gray-900 text-sm">
                              {item.fabric_in_KG}
                            </span>
                            <span className="text-gray-500 text-xs">kg</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-20 bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-purple-500 h-2 rounded-full transition-all duration-300"
                                style={{
                                  width: `${Math.min((item.fabric_in_meter / 1000) * 100, 100)}%`,
                                }}
                              ></div>
                            </div>
                            <span className="font-semibold text-gray-900 text-sm">
                              {item.fabric_in_meter?.toFixed(2)}
                            </span>
                            <span className="text-gray-500 text-xs">m</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => handleEditClick(item)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors duration-200"
                          >
                            <svg
                              className="w-3.5 h-3.5"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                              />
                            </svg>
                            Edit
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="px-4 py-4 border-t border-gray-200 bg-gray-50">
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                    <div className="text-sm text-gray-600">
                      Showing <span className="font-semibold">{indexOfFirstRecord + 1}</span> to{' '}
                      <span className="font-semibold">
                        {Math.min(indexOfLastRecord, filteredWithMeter.length)}
                      </span>{' '}
                      of <span className="font-semibold">{filteredWithMeter.length}</span> results
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={prevPage}
                        disabled={currentPage === 1}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                          currentPage === 1
                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                            : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
                        }`}
                      >
                        Previous
                      </button>

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
                              className={`min-w-[32px] h-8 rounded-lg text-sm font-medium transition-colors ${
                                currentPage === pageNumber
                                  ? 'bg-blue-600 text-white'
                                  : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
                              }`}
                            >
                              {pageNumber}
                            </button>
                          );
                        })}

                        {totalPages > 5 && currentPage < totalPages - 2 && (
                          <>
                            <span className="px-1 text-gray-400 text-sm">...</span>
                            <button
                              onClick={() => paginate(totalPages)}
                              className={`min-w-[32px] h-8 rounded-lg text-sm font-medium transition-colors ${
                                currentPage === totalPages
                                  ? 'bg-blue-600 text-white'
                                  : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
                              }`}
                            >
                              {totalPages}
                            </button>
                          </>
                        )}
                      </div>

                      <button
                        onClick={nextPage}
                        disabled={currentPage === totalPages}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                          currentPage === totalPages
                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                            : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
                        }`}
                      >
                        Next
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-12 px-4">
              <div className="max-w-sm mx-auto">
                <div className="w-20 h-20 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                  <svg
                    className="w-10 h-10 text-gray-400"
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
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  {searchTerm ? 'No matching results found' : 'No conversion data available'}
                </h3>
                <p className="text-gray-500 text-sm mb-6">
                  {searchTerm
                    ? `We couldn't find any fabric numbers matching "${searchTerm}". Try a different search term.`
                    : 'The fabric conversion data will appear here once available.'}
                </p>
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="px-5 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors duration-200"
                  >
                    Clear Search & Show All
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer Note */}
        <div className="text-center text-gray-400 text-xs mt-4">
          <p>
            Data updates in real-time • 25 records per page • Total {filteredWithMeter.length}{' '}
            active fabric entries
          </p>
        </div>
      </div>

      {/* Edit Modal */}
      {showEditModal && editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-lg max-w-sm w-full p-6">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-blue-600 rounded-lg">
                  <svg
                    className="w-5 h-5 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                    />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-gray-900">Edit Fabric Relation</h3>
              </div>
              <button
                onClick={closeModal}
                className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <svg
                  className="w-5 h-5 text-gray-500"
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
            </div>

            <div className="mb-5 p-3 bg-blue-50 rounded-lg border border-blue-100">
              <p className="text-sm text-gray-600">
                Editing relation for{' '}
                <span className="font-semibold text-blue-700">#{editingItem.fabric_number}</span>
              </p>
            </div>

            {updateSuccess && (
              <div className="mb-4 p-2.5 bg-green-50 text-green-700 rounded-lg border border-green-200 flex items-center gap-2 text-sm">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                Relation updated successfully!
              </div>
            )}

            {updateError && (
              <div className="mb-4 p-2.5 bg-red-50 text-red-700 rounded-lg border border-red-200 flex items-center gap-2 text-sm">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                {updateError}
              </div>
            )}

            <form onSubmit={handleUpdateRelation} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Fabric Length (Meter)
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-gray-400 text-sm font-medium">m</span>
                  </div>
                  <input
                    type="number"
                    name="fabric_in_meter"
                    value={editFormData.fabric_in_meter}
                    onChange={handleEditInputChange}
                    step="0.01"
                    className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white text-sm"
                    required
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors duration-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors duration-200"
                >
                  {updateSuccess ? 'Updated!' : 'Update Relation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default MeterAndKgRelationship;
