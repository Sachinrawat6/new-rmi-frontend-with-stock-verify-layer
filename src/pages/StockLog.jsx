import React, { useEffect, useState, useCallback, useMemo } from 'react';
import axios from 'axios';
import { BASE_URL } from '../constant/index.js';
import { NavLink, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';

const StockLog = () => {
  const navigate = useNavigate();
  const [stockLogs, setStockLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isAutoApproving, setIsAutoApproving] = useState(false);
  const [hasAutoApproved, setHasAutoApproved] = useState(false);

  // Fetch stock logs only (no status fetching)
  const fetchStockLogs = useCallback(async (currentPage = 1) => {
    try {
      setLoading(true);

      const { data } = await axios.get(`${BASE_URL}/stock-logs?page=${currentPage}&limit=25`);

      // Sort logs: pending first, then approved
      const sortedLogs = data.data.stockLogs.sort((a, b) => {
        if (a.approved === b.approved) return 0;
        return a.approved ? 1 : -1;
      });

      setStockLogs(sortedLogs);
      setTotalPages(data.data.totalPages);
      setPage(data.data.currentPage);
    } catch (error) {
      console.error(error);
      toast.error('Failed to fetch stock logs');
    } finally {
      setLoading(false);
    }
  }, []);

  // Auto-Approve API Call - Only called on page load
  const handleAutoApprove = useCallback(async () => {
    // Don't run if already approved or currently approving
    if (hasAutoApproved || isAutoApproving) return;

    try {
      setIsAutoApproving(true);

      const response = await axios.post(`${BASE_URL}/stock-logs/auto-approve`);
      const data = response.data;

      // Check if it's a success response with statusCode 200
      if (data.statusCode === 200 && data.success === true) {
        const approvedCount = data.data?.approved || 0;
        const message = data.data?.message || data.message || '';

        // Only show toast if logs were actually approved (approved > 0)
        if (approvedCount > 0) {
          toast.success(`✅ ${approvedCount} logs auto-approved successfully!`);
          // Refresh the page to show updated status
          await fetchStockLogs(page);
        } else {
          // No logs approved - this is expected, don't show error
          // Just log it for debugging
          console.log('ℹ️ No eligible logs found:', message);
        }
      } else {
        // This shouldn't happen with proper API, but handle just in case
        toast.warning('Unexpected response from server');
      }
    } catch (error) {
      // Real error occurred (network, server error, etc.)
      console.error('Auto-approve failed:', error);

      // Handle different types of errors
      if (error.response) {
        // Server responded with error status
        const status = error.response.status;
        const data = error.response.data;

        if (status === 404) {
          toast.error('Auto-approve API not found. Please check the endpoint.');
        } else if (status === 500) {
          toast.error('Server error while auto-approving logs. Please try again.');
        } else if (status === 400) {
          toast.error(data?.message || 'Bad request. Please check the data.');
        } else {
          toast.error(data?.message || `Error ${status}: Failed to auto-approve logs`);
        }
      } else if (error.request) {
        // Request made but no response (network error)
        toast.error('Network error: Could not reach server. Please check your connection.');
      } else {
        // Something else happened
        toast.error('An unexpected error occurred. Please try again.');
      }
    } finally {
      setIsAutoApproving(false);
      setHasAutoApproved(true);
    }
  }, [page, fetchStockLogs, hasAutoApproved, isAutoApproving]);

  // Helper function to format date - Memoized
  const formatDate = useCallback((dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '-';

    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  }, []);

  // Handle page change
  const handlePageChange = useCallback(
    (newPage) => {
      if (newPage >= 1 && newPage <= totalPages && newPage !== page) {
        setPage(newPage);
        setHasAutoApproved(false); // Reset auto-approve flag on page change
      }
    },
    [page, totalPages]
  );

  // Go back to previous page
  const handleGoBack = useCallback(() => {
    navigate(-1);
  }, [navigate]);

  // Initial load and page changes
  useEffect(() => {
    const loadData = async () => {
      await fetchStockLogs(page);
      // Auto-approve after fetching logs
      await handleAutoApprove();
    };

    loadData();
  }, [page]); // Only re-run when page changes

  // Memoize table rows for better performance
  const tableRows = useMemo(() => {
    return stockLogs.map((log, i) => {
      const rowBgClass = !log.approved
        ? 'bg-amber-50/30 hover:bg-amber-50/50'
        : 'hover:bg-slate-50/70';

      return (
        <tr key={log._id} className={`transition-colors ${rowBgClass}`}>
          <td className="whitespace-nowrap px-3 py-3.5 text-sm font-medium text-slate-500 md:px-4 lg:px-6">
            {(page - 1) * 25 + i + 1}
          </td>
          <td className="whitespace-nowrap px-3 py-3.5 text-sm font-medium text-slate-700 md:px-4 lg:px-6">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-600">
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
              <span className="truncate max-w-[150px]" title={log.source}>
                {log.source}
              </span>
            </div>
          </td>
          <td className="whitespace-nowrap px-3 py-3.5 text-sm font-medium text-slate-700 md:px-4 lg:px-6">
            <span className="truncate max-w-[120px] block" title={log.log_id}>
              {log.log_id}
            </span>
          </td>
          <td className="whitespace-nowrap px-3 py-3.5 text-center md:px-4 lg:px-6">
            {log.approved ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3.5 py-1.5 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-600/20">
                <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
                Approved
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3.5 py-1.5 text-xs font-semibold text-amber-700 ring-1 ring-amber-600/20">
                <svg className="h-3 w-3 animate-pulse" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"
                    clipRule="evenodd"
                  />
                </svg>
                Pending
              </span>
            )}
          </td>
          <td className="whitespace-nowrap px-3 py-3.5 text-center text-sm text-slate-600 md:px-4 lg:px-6">
            {formatDate(log.createdAt)}
          </td>
          <td className="whitespace-nowrap px-3 py-3.5 text-center text-sm text-slate-600 md:px-4 lg:px-6">
            {formatDate(log.updatedAt)}
          </td>
          <td className="whitespace-nowrap px-3 py-3.5 text-center md:px-4 lg:px-6">
            <div className="flex items-center justify-center gap-2">
              <NavLink
                to={`/stock-log-records/${log.log_id}`}
                className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-50 px-3 py-1.5 text-xs font-medium text-indigo-600 transition-all hover:bg-indigo-100 hover:text-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 active:scale-95 md:px-4 md:py-2 md:text-sm"
              >
                <svg
                  className="h-3 w-3 md:h-4 md:w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                  />
                </svg>
                <span className="hidden sm:inline">View Records</span>
                <span className="sm:hidden">View</span>
              </NavLink>

              {log.approved ? (
                <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-2 py-1.5 text-xs font-medium text-emerald-600 md:px-3 md:py-2">
                  <svg className="h-3 w-3 md:h-4 md:w-4" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span className="hidden sm:inline">Approved</span>
                  <span className="sm:hidden">✓</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 rounded-lg bg-amber-50 px-2 py-1.5 text-xs font-medium text-amber-600 md:px-3 md:py-2">
                  <svg
                    className="h-3 w-3 md:h-4 md:w-4 animate-pulse"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span className="hidden sm:inline">Pending</span>
                  <span className="sm:hidden">⏳</span>
                </span>
              )}
            </div>
          </td>
        </tr>
      );
    });
  }, [stockLogs, formatDate, page]);

  return (
    <div className="p-4 md:p-8 max-w-full">
      <div className="mx-auto container-fluid max-w-full">
        <div className="rounded-2xl bg-white shadow-slate-200/50 ring-1 ring-slate-200/50 transition-all overflow-hidden">
          {/* Header with Back Button */}
          <div className="border-b border-slate-200/80 px-6 py-5 md:px-8 md:py-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                {/* Back Button
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
                </button> */}

                <div>
                  <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-slate-800 md:text-3xl">
                    <span className="inline-block h-8 w-1 rounded-full bg-blue-600"></span>
                    Stock Log Management
                  </h1>
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
                    View and manage stock logs
                  </p>
                </div>
              </div>

              {/* Show loading indicator only when auto-approving */}
              {isAutoApproving && (
                <div className="flex items-center gap-2 text-sm text-green-600">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-green-600 border-t-transparent"></div>
                  Auto-approving...
                </div>
              )}
            </div>
          </div>

          {/* Loading State */}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="relative h-12 w-12">
                <div className="absolute h-12 w-12 animate-spin rounded-full border-4 border-blue-100 border-t-blue-600"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="h-6 w-6 rounded-full bg-blue-600/20"></div>
                </div>
              </div>
              <p className="mt-4 text-sm font-medium text-slate-500">Loading stock logs...</p>
            </div>
          ) : (
            <>
              {/* Table */}
              <div className="overflow-x-auto px-4 pb-2 pt-2 md:px-6">
                <div className="min-w-[1200px]">
                  <table className="w-full divide-y divide-slate-200">
                    <thead>
                      <tr className="bg-slate-50/80">
                        <th className="whitespace-nowrap px-3 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-600 md:px-4 lg:px-6">
                          #
                        </th>
                        <th className="whitespace-nowrap px-3 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-600 md:px-4 lg:px-6">
                          Source
                        </th>
                        <th className="whitespace-nowrap px-3 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-600 md:px-4 lg:px-6">
                          Session ID
                        </th>
                        <th className="whitespace-nowrap px-3 py-3.5 text-center text-xs font-semibold uppercase tracking-wider text-slate-600 md:px-4 lg:px-6">
                          Status
                        </th>
                        <th className="whitespace-nowrap px-3 py-3.5 text-center text-xs font-semibold uppercase tracking-wider text-slate-600 md:px-4 lg:px-6">
                          Created At
                        </th>
                        <th className="whitespace-nowrap px-3 py-3.5 text-center text-xs font-semibold uppercase tracking-wider text-slate-600 md:px-4 lg:px-6">
                          Updated At
                        </th>
                        <th className="whitespace-nowrap px-3 py-3.5 text-center text-xs font-semibold uppercase tracking-wider text-slate-600 md:px-4 lg:px-6">
                          Action
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {stockLogs.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="px-4 py-16 text-center">
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
                                No Stock Logs Found
                              </span>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        tableRows
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Pagination */}
              <div className="border-t border-slate-200/80 px-4 py-4 md:px-6 md:py-5">
                <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
                  <div className="flex items-center gap-2">
                    <button
                      disabled={page === 1 || loading}
                      onClick={() => handlePageChange(page - 1)}
                      className="inline-flex items-center justify-center gap-2 rounded-lg bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm ring-1 ring-slate-200 transition-all hover:bg-slate-50 hover:ring-slate-300 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-white"
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

                    <button
                      disabled={page === totalPages || loading}
                      onClick={() => handlePageChange(page + 1)}
                      className="inline-flex items-center justify-center gap-2 rounded-lg bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm ring-1 ring-slate-200 transition-all hover:bg-slate-50 hover:ring-slate-300 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-white"
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

                  <div className="flex items-center gap-2">
                    <span className="rounded-lg bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700">
                      Page {page} <span className="text-slate-400">of</span> {totalPages}
                    </span>
                    <span className="text-sm text-slate-500">
                      ({(page - 1) * 25 + 1}-{Math.min(page * 25, page * 25)} items)
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handlePageChange(1)}
                      disabled={page === 1 || loading}
                      className="inline-flex items-center justify-center rounded-lg bg-white px-3 py-2.5 text-sm font-medium text-slate-700 shadow-sm ring-1 ring-slate-200 transition-all hover:bg-slate-50 hover:ring-slate-300 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-white"
                    >
                      First
                    </button>
                    <button
                      onClick={() => handlePageChange(totalPages)}
                      disabled={page === totalPages || loading}
                      className="inline-flex items-center justify-center rounded-lg bg-white px-3 py-2.5 text-sm font-medium text-slate-700 shadow-sm ring-1 ring-slate-200 transition-all hover:bg-slate-50 hover:ring-slate-300 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-white"
                    >
                      Last
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default StockLog;
