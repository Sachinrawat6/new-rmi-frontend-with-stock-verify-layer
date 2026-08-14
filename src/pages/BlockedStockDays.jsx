import React, { useEffect, useState } from 'react';
import { BASE_URL } from '../constant/index.js';
import axios from 'axios';

const BlockedStockDays = () => {
  const [blockedStocksDays, setBlockedStockDays] = useState([]);
  const [loading, setLoading] = useState(false);
  const [updatingStockDays, setUpdatingStockDays] = useState(false);

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedVendor, setSelectedVendor] = useState(null);
  const [editDays, setEditDays] = useState('');

  const fetchBlockedStockDays = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${BASE_URL}/stock/vendor-source`);
      const data = response.data.data || [];
      console.log(data);
      setBlockedStockDays(data);
    } catch (error) {
      console.log(`Failed to fetched blocked stocks days error :: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBlockedStockDays();
  }, []);

  // Update vendor stock days
  const updateBlockedStockDays = async (vendor_source, blocked_stock_days) => {
    try {
      setUpdatingStockDays(true);
      const response = await axios.put(`${BASE_URL}/stock/set-blocked-days`, {
        vendor_source,
        blocked_stock_days,
      });
      console.log('response', response);

      // Update local state
      setBlockedStockDays((prev) =>
        prev.map((item) =>
          item.vendor_source === vendor_source ? { ...item, blocked_stock_days } : item
        )
      );

      // Close modal and reset
      setIsModalOpen(false);
      setSelectedVendor(null);
      setEditDays('');

      // Show success message
      alert('Blocked stock days updated successfully!');
    } catch (error) {
      console.error('Failed to update blocked stocks days error :: ', error);
      alert('Failed to update blocked stock days. Please try again.');
    } finally {
      setUpdatingStockDays(false);
    }
  };

  // Open modal with vendor data
  const handleEditClick = (vendor) => {
    setSelectedVendor(vendor);
    setEditDays(vendor.blocked_stock_days?.toString() || '0');
    setIsModalOpen(true);
  };

  // Close modal
  const handleCloseModal = () => {
    if (updatingStockDays) return;
    setIsModalOpen(false);
    setSelectedVendor(null);
    setEditDays('');
  };

  // Handle save from modal
  const handleSaveEdit = () => {
    if (!editDays || editDays.trim() === '') {
      alert('Please enter valid blocked stock days');
      return;
    }

    const days = parseInt(editDays);
    if (isNaN(days) || days < 0) {
      alert('Please enter a valid positive number');
      return;
    }

    if (selectedVendor) {
      updateBlockedStockDays(selectedVendor.vendor_source, days);
    }
  };

  // Handle Enter key press
  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSaveEdit();
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-block w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-4 text-gray-600 font-medium">Loading blocked stock days...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800">Blocked Stock Days</h1>
          <p className="text-gray-500 mt-1">Manage vendor blocked stock days configuration</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <p className="text-sm text-gray-500 font-medium">Total Vendors</p>
            <p className="text-2xl font-bold text-gray-800">{blockedStocksDays.length}</p>
          </div>
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <p className="text-sm text-gray-500 font-medium">Total Linked Fabrics</p>
            <p className="text-2xl font-bold text-gray-800">
              {blockedStocksDays.reduce((sum, item) => sum + (item.linked_fabric || 0), 0)}
            </p>
          </div>
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <p className="text-sm text-gray-500 font-medium">Average Blocked Days</p>
            <p className="text-2xl font-bold text-gray-800">
              {blockedStocksDays.length > 0
                ? Math.round(
                    blockedStocksDays.reduce(
                      (sum, item) => sum + (item.blocked_stock_days || 0),
                      0
                    ) / blockedStocksDays.length
                  )
                : 0}
            </p>
          </div>
        </div>

        {/* Table Section */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    #
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Vendor
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Linked Fabrics
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Blocked Stock Days
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {blockedStocksDays.length > 0 ? (
                  blockedStocksDays.map((b, i) => (
                    <tr
                      key={b.vendor_source}
                      className="hover:bg-gray-50 transition-colors duration-200"
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{i + 1}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-medium text-gray-800">{b.vendor_source}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {b.linked_fabric || 0}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-700">
                          {b.blocked_stock_days || 0} days
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <button
                          onClick={() => handleEditClick(b)}
                          className="px-4 py-1.5 text-sm font-medium text-blue-600 bg-blue-50 rounded-md hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors duration-200"
                        >
                          Edit
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="5" className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center">
                        <svg
                          className="w-12 h-12 text-gray-300 mb-3"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
                          />
                        </svg>
                        <p className="text-gray-500 font-medium">No blocked stock days found</p>
                        <p className="text-sm text-gray-400 mt-1">
                          No vendors have been configured yet
                        </p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-4 text-xs text-gray-400 text-center">
          Showing {blockedStocksDays.length} vendor{blockedStocksDays.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* ========== MODAL ========== */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
            onClick={handleCloseModal}
          ></div>

          {/* Modal */}
          <div className="flex items-center justify-center min-h-screen p-4">
            <div className="relative bg-white rounded-lg w-full max-w-md mx-auto border border-gray-200">
              {/* Modal Header */}
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <div>
                  <h3 className="text-lg font-semibold text-gray-800">Update Blocked Stock Days</h3>
                  <p className="text-sm text-gray-500 mt-1">
                    Vendor:{' '}
                    <span className="font-medium text-gray-700">
                      {selectedVendor?.vendor_source}
                    </span>
                  </p>
                </div>
                <button
                  onClick={handleCloseModal}
                  disabled={updatingStockDays}
                  className="text-gray-400 hover:text-gray-600 transition-colors duration-200 disabled:opacity-50"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6">
                <div className="space-y-4">
                  <div>
                    <label
                      htmlFor="blockedDays"
                      className="block text-sm font-medium text-gray-700 mb-2"
                    >
                      Blocked Stock Days
                    </label>
                    <div className="relative">
                      <input
                        id="blockedDays"
                        type="number"
                        min="0"
                        value={editDays}
                        onChange={(e) => setEditDays(e.target.value)}
                        onKeyPress={handleKeyPress}
                        className="w-full px-4 py-2.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors duration-200"
                        placeholder="Enter number of days"
                        autoFocus
                        disabled={updatingStockDays}
                      />
                      <span className="absolute right-3 top-2.5 text-sm text-gray-400">days</span>
                    </div>
                    <p className="mt-1 text-xs text-gray-500">
                      Enter the number of days to block stock for this vendor
                    </p>
                  </div>

                  {/* Current value display */}
                  <div className="bg-gray-50 rounded-md p-3 border border-gray-200">
                    <p className="text-xs text-gray-500">Current Value</p>
                    <p className="text-sm font-medium text-gray-700">
                      {selectedVendor?.blocked_stock_days || 0} days
                    </p>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50 rounded-b-lg">
                <button
                  onClick={handleCloseModal}
                  disabled={updatingStockDays}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveEdit}
                  disabled={updatingStockDays || !editDays}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                >
                  {updatingStockDays ? (
                    <>
                      <svg
                        className="inline w-4 h-4 mr-2 animate-spin"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                      Updating...
                    </>
                  ) : (
                    'Update Days'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BlockedStockDays;
