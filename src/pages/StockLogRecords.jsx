import React, { useEffect, useState, useCallback } from 'react';
import { BASE_URL } from '../constant/index.js';
import axios from 'axios';
import { useNavigate, useParams } from 'react-router-dom';
import OtpModal from '../components/OtpModel.jsx';

/* ---------------------------------------------------------
   Custom Modal (replaces window.alert / window.confirm)
   - type: 'confirm' -> shows Cancel + Confirm buttons
   - type: 'info'    -> shows a single Close button
   - stats: optional array of { label, value, tone } rows,
     used to show "X approved, Y skipped" style breakdowns
--------------------------------------------------------- */
const Modal = ({
  open,
  type = 'info',
  title,
  message,
  stats,
  confirmLabel = 'Continue',
  cancelLabel = 'Cancel',
  tone = 'default', // 'default' | 'success' | 'danger'
  onConfirm,
  onClose,
}) => {
  if (!open) return null;

  const toneStyles = {
    default: {
      icon: 'bg-indigo-50 text-indigo-600',
      confirmBtn: 'bg-indigo-600 hover:bg-indigo-700',
    },
    success: {
      icon: 'bg-emerald-50 text-emerald-600',
      confirmBtn: 'bg-emerald-600 hover:bg-emerald-700',
    },
    danger: {
      icon: 'bg-red-50 text-red-600',
      confirmBtn: 'bg-red-600 hover:bg-red-700',
    },
  };
  const styles = toneStyles[tone] || toneStyles.default;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl ring-1 ring-slate-200/60"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3">
          <div
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${styles.icon}`}
          >
            {tone === 'danger' ? (
              <svg
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : tone === 'success' ? (
              <svg
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v3.75m0 3.75h.008v.008H12v-.008zM21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            )}
          </div>
          <div className="flex-1">
            <h3 className="text-base font-semibold text-slate-800">{title}</h3>
            {message && <p className="mt-1 text-sm text-slate-500">{message}</p>}

            {stats && stats.length > 0 && (
              <div className="mt-4 space-y-1.5 rounded-xl bg-slate-50 p-3">
                {stats.map((s, i) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <span className="text-slate-500">{s.label}</span>
                    <span
                      className={`font-semibold ${
                        s.tone === 'success'
                          ? 'text-emerald-600'
                          : s.tone === 'danger'
                            ? 'text-red-600'
                            : s.tone === 'warning'
                              ? 'text-amber-600'
                              : 'text-slate-700'
                      }`}
                    >
                      {s.value}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          {type === 'confirm' && (
            <button
              onClick={onClose}
              className="rounded-lg bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 transition-all hover:bg-slate-200"
            >
              {cancelLabel}
            </button>
          )}
          <button
            onClick={type === 'confirm' ? onConfirm : onClose}
            className={`rounded-lg px-4 py-2 text-sm font-medium text-white transition-all ${styles.confirmBtn}`}
          >
            {type === 'confirm' ? confirmLabel : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
};

const StockLogRecords = () => {
  const navigate = useNavigate();
  const [stockLogRecords, setStockLogRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [editingId, setEditingId] = useState(null);
  const [selectedRecords, setSelectedRecords] = useState([]);
  const [selectAll, setSelectAll] = useState(false);
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [selectedLogId, setSelectedLogId] = useState(null);
  const [editData, setEditData] = useState({
    added_stock: '',
    location: '',
    status: '',
    width: '',
  });
  const { session_id } = useParams();

  // State for bulk approve with OTP
  const [bulkApproveData, setBulkApproveData] = useState({
    ids: [],
    nonApprovable: [],
    totalSelected: 0,
  });

  // Modal state: one for confirmations, one for result/info messages
  const [confirmModal, setConfirmModal] = useState({ open: false });
  const [infoModal, setInfoModal] = useState({ open: false });

  const closeConfirmModal = () => setConfirmModal({ open: false });
  const closeInfoModal = () => setInfoModal({ open: false });

  const askConfirm = ({ title, message, tone = 'default', confirmLabel, onConfirm }) => {
    setConfirmModal({
      open: true,
      type: 'confirm',
      title,
      message,
      tone,
      confirmLabel,
      onConfirm: () => {
        closeConfirmModal();
        onConfirm();
      },
      onClose: closeConfirmModal,
    });
  };

  const showInfo = ({ title, message, stats, tone = 'default' }) => {
    setInfoModal({
      open: true,
      type: 'info',
      title,
      message,
      stats,
      tone,
      onClose: closeInfoModal,
    });
  };

  console.log('session id', session_id);
  const fetchStockLogRecords = async (currentPage = 1) => {
    try {
      setLoading(true);

      const { data } = await axios.get(
        `${BASE_URL}/verify-stocks/record/${session_id}?page=${currentPage}&limit=200`
      );

      setStockLogRecords(data.data.stockRecords);
      setTotalPages(data.data.totalPages);
      setPage(data.data.currentPage);
    } catch (error) {
      console.error(error);
      showInfo({
        title: 'Failed to load records',
        message: 'Something went wrong while fetching stock logs. Please try again.',
        tone: 'danger',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStockLogRecords(page);
  }, [page]);

  // Handle single record selection
  const handleSelectRecord = (logId) => {
    setSelectedRecords((prev) => {
      if (prev.includes(logId)) {
        return prev.filter((id) => id !== logId);
      } else {
        return [...prev, logId];
      }
    });
  };

  // Handle select all
  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedRecords([]);
    } else {
      const allIds = stockLogRecords.map((log) => log._id);
      setSelectedRecords(allIds);
    }
    setSelectAll(!selectAll);
  };

  // Bulk Approve - OTP based
  const handleBulkApprove = () => {
    if (selectedRecords.length === 0) {
      showInfo({ title: 'No records selected', message: 'Please select at least one record.' });
      return;
    }

    const approvableRecords = stockLogRecords
      .filter((log) => selectedRecords.includes(log._id) && log.is_stock_added === false)
      .map((log) => log._id);

    const nonApprovableRecords = stockLogRecords
      .filter((log) => selectedRecords.includes(log._id) && log.is_stock_added === true)
      .map((log) => log._id);

    if (approvableRecords.length === 0) {
      showInfo({
        title: 'Cannot approve',
        message: 'Stock is already added for all selected records.',
        tone: 'danger',
      });
      return;
    }

    // Store bulk approve data and show OTP modal
    setBulkApproveData({
      ids: approvableRecords,
      nonApprovable: nonApprovableRecords,
      totalSelected: selectedRecords.length,
    });
    setShowOtpModal(true);
  };

  // Bulk Reject - OTP based
  const handleBulkReject = () => {
    if (selectedRecords.length === 0) {
      showInfo({ title: 'No records selected', message: 'Please select at least one record.' });
      return;
    }

    // Store bulk reject data and show OTP modal
    setBulkApproveData({
      ids: selectedRecords,
      nonApprovable: [],
      totalSelected: selectedRecords.length,
      isReject: true,
    });
    setShowOtpModal(true);
  };

  // Single approve - OTP based
  const handleApprove = (logId) => {
    const record = stockLogRecords.find((log) => log._id === logId);

    if (record && record.is_stock_added === true) {
      showInfo({
        title: 'Cannot approve',
        message: 'Stock is already added for this record.',
        tone: 'danger',
      });
      return;
    }

    setSelectedLogId(logId);
    setBulkApproveData({ ids: [], nonApprovable: [], totalSelected: 0 });
    setShowOtpModal(true);
  };

  // Single reject - OTP based
  const handleReject = (logId) => {
    setSelectedLogId(logId);
    setBulkApproveData({
      ids: [logId],
      nonApprovable: [],
      totalSelected: 1,
      isReject: true,
    });
    setShowOtpModal(true);
  };

  // OTP Verified Handler - Handles both single and bulk operations
  const handleOtpVerified = async () => {
    // Check if it's a bulk operation
    if (bulkApproveData.ids && bulkApproveData.ids.length > 0) {
      const isReject = bulkApproveData.isReject || false;

      try {
        if (isReject) {
          // Bulk Reject
          console.log('Bulk rejecting records after OTP:', bulkApproveData.ids);
          const response = await axios.put(`${BASE_URL}/verify-stocks/bulk-reject`, {
            ids: bulkApproveData.ids,
          });

          const { totalRequested, rejectedCount, failedCount, alreadyRejectedCount } =
            response.data.data;

          const stats = [
            { label: 'Total requested', value: totalRequested ?? bulkApproveData.totalSelected },
            { label: 'Rejected', value: rejectedCount ?? 0, tone: 'success' },
          ];
          if (alreadyRejectedCount)
            stats.push({
              label: 'Already rejected (skipped)',
              value: alreadyRejectedCount,
              tone: 'warning',
            });
          if (failedCount) stats.push({ label: 'Failed', value: failedCount, tone: 'danger' });

          showInfo({
            title: 'Bulk reject complete',
            stats,
            tone: failedCount ? 'danger' : 'success',
          });
        } else {
          // Bulk Approve
          console.log('Bulk approving records after OTP:', bulkApproveData.ids);
          const response = await axios.put(`${BASE_URL}/verify-stocks/bulk-approve`, {
            ids: bulkApproveData.ids,
          });

          const { totalRequested, approvedCount, skippedCount, failedCount } = response.data.data;

          const stats = [
            { label: 'Total requested', value: totalRequested ?? bulkApproveData.totalSelected },
            { label: 'Approved', value: approvedCount ?? 0, tone: 'success' },
          ];
          if (skippedCount)
            stats.push({
              label: 'Skipped (stock already added)',
              value: skippedCount,
              tone: 'warning',
            });
          if (bulkApproveData.nonApprovable && bulkApproveData.nonApprovable.length > 0)
            stats.push({
              label: 'Skipped (already added)',
              value: bulkApproveData.nonApprovable.length,
              tone: 'warning',
            });
          if (failedCount) stats.push({ label: 'Failed', value: failedCount, tone: 'danger' });

          showInfo({
            title: 'Bulk approve complete',
            stats,
            tone: failedCount ? 'danger' : 'success',
          });
        }

        setSelectedRecords([]);
        setSelectAll(false);
        setBulkApproveData({ ids: [], nonApprovable: [], totalSelected: 0 });
        fetchStockLogRecords(page);
      } catch (error) {
        console.error(error);
        showInfo({
          title: isReject ? 'Failed to reject records' : 'Failed to approve records',
          message: error.response?.data?.message || 'Something went wrong. Please try again.',
          tone: 'danger',
        });
      } finally {
        setShowOtpModal(false);
        setSelectedLogId(null);
        setBulkApproveData({ ids: [], nonApprovable: [], totalSelected: 0 });
      }
    } else if (selectedLogId) {
      // Single operation
      const isReject = bulkApproveData.isReject || false;

      try {
        if (isReject) {
          // Single Reject
          console.log('Rejecting record after OTP:', selectedLogId);
          await axios.put(`${BASE_URL}/verify-stocks/${selectedLogId}/reject`);
          showInfo({ title: 'Record rejected', tone: 'success' });
        } else {
          // Single Approve
          console.log('Approving record after OTP:', selectedLogId);
          await axios.put(`${BASE_URL}/verify-stocks/${selectedLogId}/approve`);
          showInfo({ title: 'Record approved', tone: 'success' });
        }

        setShowOtpModal(false);
        setSelectedLogId(null);
        setBulkApproveData({ ids: [], nonApprovable: [], totalSelected: 0 });
        fetchStockLogRecords(page);
      } catch (error) {
        console.error(error);
        showInfo({
          title: isReject ? 'Failed to reject record' : 'Failed to approve record',
          message: error.response?.data?.message || 'Something went wrong. Please try again.',
          tone: 'danger',
        });
        setShowOtpModal(false);
        setSelectedLogId(null);
        setBulkApproveData({ ids: [], nonApprovable: [], totalSelected: 0 });
      }
    }
  };

  const handleEdit = (log) => {
    setEditingId(log._id);
    setEditData({
      added_stock: log.added_stock || '',
      location: log.location || '',
      status: log.status || '',
      width: log.width || 'normal',
    });
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleWidthChange = (e) => {
    const value = e.target.value;
    setEditData((prev) => {
      let updatedData = {
        ...prev,
        width: value,
      };

      // If width is 'wide', multiply added_stock by 1.4
      if (value === 'wide' && prev.added_stock) {
        const numValue = parseFloat(prev.added_stock);
        if (!isNaN(numValue)) {
          updatedData.added_stock = (numValue * 1.4).toFixed(2);
        }
      } else if (value === 'normal' && prev.added_stock) {
        // If switching back to normal, divide by 1.4
        const numValue = parseFloat(prev.added_stock);
        if (!isNaN(numValue)) {
          updatedData.added_stock = (numValue / 1.4).toFixed(2);
        }
      }

      return updatedData;
    });
  };

  const handleSaveEdit = async (logId) => {
    try {
      console.log('Saving edit for record:', logId, editData);
      await axios.put(`${BASE_URL}/verify-stocks/${logId}`, editData);
      showInfo({ title: 'Record updated', tone: 'success' });
      setEditingId(null);
      fetchStockLogRecords(page);
    } catch (error) {
      console.error(error);
      showInfo({
        title: 'Failed to update record',
        message: error.response?.data?.message || 'Something went wrong. Please try again.',
        tone: 'danger',
      });
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditData({
      added_stock: '',
      location: '',
      status: '',
      width: '',
    });
  };

  // Go back to previous page
  const handleGoBack = useCallback(() => {
    navigate(-1);
  }, [navigate]);

  return (
    <div className="p-2 md:p-8">
      <div className="mx-auto w-full">
        {/* Card Container */}
        <div className="rounded-2xl bg-white ring-1 ring-slate-200/50 transition-all">
          {/* Header */}
          <div className="border-b border-slate-200/80 px-6 py-5 md:px-8 md:py-6">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-slate-800 md:text-3xl">
                  <span className="inline-block h-8 w-1 rounded-full bg-indigo-600"></span>
                  Stock Records Verification
                </h1>
                {/* Back Button */}

                <p className="mt-1 flex items-center gap-2 text-sm text-slate-500">
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                    />
                  </svg>
                  Verify and manage stock records
                </p>
              </div>
              <div>
                <button
                  onClick={handleGoBack}
                  className="inline-flex items-center gap-2 rounded-lg bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 transition-all hover:bg-slate-200 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-400/20 active:scale-95"
                  title="Go Back"
                >
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M10 19l-7-7m0 0l7-7m-7 7h18"
                    />
                  </svg>
                  <span className="hidden sm:inline">Back</span>
                </button>
              </div>
            </div>

            <OtpModal
              isOpen={showOtpModal}
              onClose={() => {
                setShowOtpModal(false);
                setSelectedLogId(null);
                setBulkApproveData({ ids: [], nonApprovable: [], totalSelected: 0 });
              }}
              onVerified={handleOtpVerified}
            />

            {/* Bulk Actions */}
            {selectedRecords.length > 0 && (
              <div className="mt-4 flex flex-wrap items-center gap-2 rounded-lg bg-indigo-50 p-3">
                <span className="text-sm font-medium text-indigo-700">
                  {selectedRecords.length} record(s) selected
                </span>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={handleBulkApprove}
                    className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white transition-all hover:bg-emerald-700"
                  >
                    <svg
                      className="h-3.5 w-3.5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2.5}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    Approve All
                  </button>
                  <button
                    onClick={handleBulkReject}
                    className="inline-flex items-center gap-1 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white transition-all hover:bg-red-700"
                  >
                    <svg
                      className="h-3.5 w-3.5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2.5}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    Reject All
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Loading State */}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="relative h-12 w-12">
                <div className="absolute h-12 w-12 animate-spin rounded-full border-4 border-indigo-100 border-t-indigo-600"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="h-6 w-6 rounded-full bg-indigo-600/20"></div>
                </div>
              </div>
              <p className="mt-4 text-sm font-medium text-slate-500">Loading stock records...</p>
            </div>
          ) : (
            <>
              {/* Table */}
              <div className="overflow-x-auto px-4 pb-2 pt-2 md:px-6">
                <table className="min-w-full divide-y divide-slate-200">
                  <thead>
                    <tr className="bg-slate-50/80">
                      <th className="whitespace-nowrap px-3 py-3.5 text-center text-xs font-semibold uppercase tracking-wider text-slate-600">
                        <input
                          type="checkbox"
                          checked={selectAll}
                          onChange={handleSelectAll}
                          className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                        />
                      </th>
                      <th className="whitespace-nowrap px-3 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">
                        Fabric
                      </th>
                      <th className="whitespace-nowrap px-3 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">
                        Employee
                      </th>
                      <th className="whitespace-nowrap px-3 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">
                        Location
                      </th>
                      <th className="whitespace-nowrap px-3 py-3.5 text-center text-xs font-semibold uppercase tracking-wider text-slate-600">
                        Old
                      </th>
                      <th className="whitespace-nowrap px-3 py-3.5 text-center text-xs font-semibold uppercase tracking-wider text-slate-600">
                        Added
                      </th>
                      <th className="whitespace-nowrap px-3 py-3.5 text-center text-xs font-semibold uppercase tracking-wider text-slate-600">
                        Current
                      </th>
                      <th className="whitespace-nowrap px-3 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">
                        Source
                      </th>
                      <th className="whitespace-nowrap px-3 py-3.5 text-center text-xs font-semibold uppercase tracking-wider text-slate-600">
                        Width
                      </th>
                      <th className="whitespace-nowrap px-3 py-3.5 text-center text-xs font-semibold uppercase tracking-wider text-slate-600">
                        Stock Added
                      </th>
                      <th className="whitespace-nowrap px-3 py-3.5 text-center text-xs font-semibold uppercase tracking-wider text-slate-600">
                        Status
                      </th>
                      <th className="whitespace-nowrap px-3 py-3.5 text-center text-xs font-semibold uppercase tracking-wider text-slate-600">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {stockLogRecords?.length === 0 ? (
                      <tr>
                        <td colSpan={12} className="px-4 py-16 text-center">
                          <div className="flex flex-col items-center gap-2">
                            <svg
                              className="h-12 w-12 text-slate-300"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                              strokeWidth={1.5}
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M20 13V7a2 2 0 00-2-2H6a2 2 0 00-2 2v6m16 0v6a2 2 0 01-2 2H6a2 2 0 01-2-2v-6m16 0H4"
                              />
                            </svg>
                            <span className="text-sm font-medium text-slate-500">
                              No Stock Records Found
                            </span>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      stockLogRecords.map((log) => {
                        const isEditing = editingId === log._id;
                        const isSelected = selectedRecords.includes(log._id);
                        const isApproveDisabled = log.is_stock_added === true;

                        return (
                          <tr
                            key={log._id}
                            className={`transition-colors ${isEditing ? 'bg-indigo-50/50' : ''} ${isSelected ? 'bg-indigo-50/30' : 'hover:bg-slate-50/70'}`}
                          >
                            {/* Checkbox */}
                            <td className="whitespace-nowrap px-3 py-3.5 text-center">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => handleSelectRecord(log._id)}
                                className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                              />
                            </td>

                            {/* Fabric - Always visible */}
                            <td className="whitespace-nowrap px-3 py-3.5">
                              <div className="flex items-center gap-2">
                                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-50 text-indigo-600">
                                  <svg
                                    className="h-4 w-4"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                    strokeWidth={2}
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                                    />
                                  </svg>
                                </div>
                                <div>
                                  <div className="font-medium text-slate-700">
                                    {log.fabric_name}
                                  </div>
                                  <div className="text-xs text-slate-400">#{log.fabric_number}</div>
                                </div>
                              </div>
                            </td>

                            {/* Employee - Always visible */}
                            <td className="whitespace-nowrap px-3 py-3.5">
                              <div className="flex items-center gap-1.5 text-sm text-slate-600">
                                <svg
                                  className="h-4 w-4 text-slate-400"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                  strokeWidth={2}
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                                  />
                                </svg>
                                {log.employee_number}
                              </div>
                            </td>

                            {/* Location - Editable */}
                            <td className="whitespace-nowrap px-3 py-3.5">
                              {isEditing ? (
                                <input
                                  type="text"
                                  name="location"
                                  value={editData.location}
                                  onChange={handleEditChange}
                                  className="w-32 rounded-lg border border-indigo-300 px-2 py-1 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                                  placeholder="Enter location"
                                />
                              ) : (
                                <div className="flex items-center gap-1.5 text-sm text-slate-600">
                                  <svg
                                    className="h-4 w-4 text-slate-400"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                    strokeWidth={2}
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                                    />
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                                    />
                                  </svg>
                                  {log.location}
                                </div>
                              )}
                            </td>

                            {/* Old Stock - Always visible */}
                            <td className="whitespace-nowrap px-3 py-3.5 text-center">
                              <span className="text-sm font-medium text-slate-600">
                                {log.old_stock.toFixed()}
                              </span>
                            </td>

                            {/* Added Stock - Editable */}
                            <td className="whitespace-nowrap px-3 py-3.5 text-center">
                              {isEditing ? (
                                <input
                                  type="number"
                                  name="added_stock"
                                  value={editData.added_stock}
                                  onChange={handleEditChange}
                                  className="w-20 rounded-lg border border-indigo-300 px-2 py-1 text-center text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                                  placeholder="0"
                                />
                              ) : (
                                <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-sm font-semibold text-emerald-700">
                                  <svg
                                    className="h-3 w-3"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                    strokeWidth={2.5}
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      d="M12 4v16m8-8H4"
                                    />
                                  </svg>
                                  {log.added_stock.toFixed()}
                                </span>
                              )}
                            </td>

                            {/* Current Stock - Always visible */}
                            <td className="whitespace-nowrap px-3 py-3.5 text-center">
                              <span className="text-sm font-bold text-slate-800">
                                {log.current_stock.toFixed()}
                              </span>
                            </td>

                            {/* Source - Always visible */}
                            <td className="whitespace-nowrap px-3 py-3.5">
                              <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
                                <svg
                                  className="h-3 w-3"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                  strokeWidth={2}
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                                  />
                                </svg>
                                {log.source}
                              </span>
                            </td>

                            {/* Width - Editable */}
                            <td className="whitespace-nowrap px-3 py-3.5 text-center">
                              {isEditing ? (
                                <select
                                  name="width"
                                  value={editData.width}
                                  onChange={handleWidthChange}
                                  className="rounded-lg border border-indigo-300 px-3 py-1 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                                >
                                  <option value="normal">Normal</option>
                                  <option value="wide">Wide</option>
                                </select>
                              ) : (
                                <span
                                  className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium
                                  ${log.width === 'wide' ? 'bg-purple-50 text-purple-700 ring-1 ring-purple-600/20' : 'bg-slate-100 text-slate-600'}`}
                                >
                                  {log.width || 'normal'}
                                </span>
                              )}
                            </td>

                            {/* Stock Added - Always visible */}
                            <td className="whitespace-nowrap px-3 py-3.5 text-center">
                              <span
                                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium
                                ${log.is_stock_added ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20' : 'bg-red-50 text-red-700 ring-1 ring-red-600/20'}`}
                              >
                                {log.is_stock_added ? 'Yes' : 'No'}
                              </span>
                            </td>

                            {/* Status - Editable */}
                            <td className="whitespace-nowrap px-3 py-3.5 text-center">
                              {isEditing ? (
                                <select
                                  name="status"
                                  value={editData.status}
                                  onChange={handleEditChange}
                                  className="rounded-lg border border-indigo-300 px-3 py-1 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                                >
                                  <option value="approved">Approved</option>
                                  <option value="rejected">Rejected</option>
                                  <option value="pending">Pending</option>
                                </select>
                              ) : (
                                <span
                                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold
                                  ${log.status === 'approved' ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20' : ''}
                                  ${log.status === 'pending' ? 'bg-amber-50 text-amber-700 ring-1 ring-amber-600/20' : ''}
                                  ${log.status === 'rejected' ? 'bg-red-50 text-red-700 ring-1 ring-red-600/20' : ''}
                                  ${!['approved', 'pending', 'rejected'].includes(log.status) ? 'bg-slate-100 text-slate-600' : ''}`}
                                >
                                  <span
                                    className={`h-1.5 w-1.5 rounded-full
                                    ${log.status === 'approved' ? 'bg-emerald-500' : ''}
                                    ${log.status === 'pending' ? 'bg-amber-500' : ''}
                                    ${log.status === 'rejected' ? 'bg-red-500' : ''}
                                    ${!['approved', 'pending', 'rejected'].includes(log.status) ? 'bg-slate-400' : ''}`}
                                  ></span>
                                  {log.status || 'N/A'}
                                </span>
                              )}
                            </td>

                            {/* Actions */}
                            <td className="whitespace-nowrap px-3 py-3.5 text-center">
                              {isEditing ? (
                                <div className="flex items-center justify-center gap-1.5">
                                  <button
                                    onClick={() => handleSaveEdit(log._id)}
                                    className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white transition-all hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 active:scale-95"
                                    title="Save"
                                  >
                                    <svg
                                      className="h-3.5 w-3.5"
                                      fill="none"
                                      viewBox="0 0 24 24"
                                      stroke="currentColor"
                                      strokeWidth={2.5}
                                    >
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        d="M5 13l4 4L19 7"
                                      />
                                    </svg>
                                    Save
                                  </button>
                                  <button
                                    onClick={handleCancelEdit}
                                    className="inline-flex items-center gap-1 rounded-lg bg-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 transition-all hover:bg-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-500/20 active:scale-95"
                                    title="Cancel"
                                  >
                                    <svg
                                      className="h-3.5 w-3.5"
                                      fill="none"
                                      viewBox="0 0 24 24"
                                      stroke="currentColor"
                                      strokeWidth={2.5}
                                    >
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        d="M6 18L18 6M6 6l12 12"
                                      />
                                    </svg>
                                    Cancel
                                  </button>
                                </div>
                              ) : (
                                <div className="flex items-center justify-center gap-1.5">
                                  <button
                                    onClick={() => handleApprove(log._id)}
                                    disabled={isApproveDisabled}
                                    className={`inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500/20 active:scale-95
                                      ${
                                        isApproveDisabled
                                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                          : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100 hover:text-emerald-700'
                                      }`}
                                    title={
                                      isApproveDisabled
                                        ? 'Cannot approve - Stock already added'
                                        : 'Approve'
                                    }
                                  >
                                    <svg
                                      className="h-3.5 w-3.5"
                                      fill="none"
                                      viewBox="0 0 24 24"
                                      stroke="currentColor"
                                      strokeWidth={2.5}
                                    >
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        d="M5 13l4 4L19 7"
                                      />
                                    </svg>
                                    Approve
                                  </button>

                                  <button
                                    onClick={() => handleReject(log._id)}
                                    className="inline-flex items-center gap-1 rounded-lg bg-red-50 px-3 py-1.5 text-xs font-medium text-red-600 transition-all hover:bg-red-100 hover:text-red-700 focus:outline-none focus:ring-2 focus:ring-red-500/20 active:scale-95"
                                    title="Reject"
                                  >
                                    <svg
                                      className="h-3.5 w-3.5"
                                      fill="none"
                                      viewBox="0 0 24 24"
                                      stroke="currentColor"
                                      strokeWidth={2.5}
                                    >
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        d="M6 18L18 6M6 6l12 12"
                                      />
                                    </svg>
                                    Reject
                                  </button>

                                  <button
                                    onClick={() => handleEdit(log)}
                                    className="inline-flex items-center gap-1 rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-600 transition-all hover:bg-blue-100 hover:text-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 active:scale-95"
                                    title="Edit"
                                  >
                                    <svg
                                      className="h-3.5 w-3.5"
                                      fill="none"
                                      viewBox="0 0 24 24"
                                      stroke="currentColor"
                                      strokeWidth={2}
                                    >
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                                      />
                                    </svg>
                                    Edit
                                  </button>
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="border-t border-slate-200/80 px-4 py-4 md:px-6 md:py-5">
                <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
                  <button
                    disabled={page === 1}
                    onClick={() => setPage((prev) => prev - 1)}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-white px-5 py-2.5 text-sm font-medium text-slate-700 ring-1 ring-slate-200 transition-all hover:bg-slate-50 hover:ring-slate-300 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-white sm:w-auto"
                  >
                    <svg
                      className="h-4 w-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                    </svg>
                    Previous
                  </button>

                  <div className="flex items-center gap-2">
                    <span className="rounded-lg bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700">
                      Page {page} <span className="text-slate-400">of</span> {totalPages}
                    </span>
                  </div>

                  <button
                    disabled={page === totalPages}
                    onClick={() => setPage((prev) => prev + 1)}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-white px-5 py-2.5 text-sm font-medium text-slate-700 ring-1 ring-slate-200 transition-all hover:bg-slate-50 hover:ring-slate-300 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-white sm:w-auto"
                  >
                    Next
                    <svg
                      className="h-4 w-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Confirm & Info Modals */}
      <Modal {...confirmModal} />
      <Modal {...infoModal} />
    </div>
  );
};

export default StockLogRecords;
