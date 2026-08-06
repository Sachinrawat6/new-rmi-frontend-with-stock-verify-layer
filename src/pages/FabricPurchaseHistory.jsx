import React, { useEffect, useState } from 'react'
import { useGlobalContext } from '../components/context/StockContextProvider'

const FabricPurchaseHistory = () => {
    const [error, setError] = useState(null);
    const [openDetails, setOpenDetails] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const PAGE_SIZE = 50;
    const {
        fabricPurchaseHistory,
        fetchFabricPurchaseHistory,
    } = useGlobalContext();

    const [searchTerm, setSearchTerm] = useState('');
    const [filteredHistory, setFilteredHistory] = useState([]);

    const fetchpurchaseHistory = async () => {
        setIsLoading(true);
        try {
            await fetchFabricPurchaseHistory();
            setError(null);
        } catch (error) {
            setError(error?.message || "Failed to fetch fabric purchase history");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchpurchaseHistory();
    }, []);

    // Search and filter logic
    useEffect(() => {
        let filtered = fabricPurchaseHistory;
        if (searchTerm.trim() !== '') {
            const term = searchTerm.toLowerCase();
            filtered = fabricPurchaseHistory.filter(fab =>
                (fab.fabric_number && fab.fabric_number.toString().toLowerCase().includes(term)) ||
                (fab.fabric_name && fab.fabric_name.toLowerCase().includes(term)) ||
                (fab.vender && fab.vender.toLowerCase().includes(term))
            );
        }
        setFilteredHistory(filtered);
        setCurrentPage(1); // Reset to first page on search
    }, [searchTerm, fabricPurchaseHistory]);

    // Pagination logic
    const totalPages = Math.ceil(filteredHistory.length / PAGE_SIZE);
    const paginatedData = filteredHistory.slice(
        (currentPage - 1) * PAGE_SIZE,
        currentPage * PAGE_SIZE
    );

    const handleSearchChange = (e) => {
        setSearchTerm(e.target.value);
    };

    const handlePageChange = (page) => {
        if (page >= 1 && page <= totalPages) {
            setCurrentPage(page);
            // Scroll to top when page changes
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        if (isNaN(date)) return dateStr;
        return date.toLocaleDateString('en-GB', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
        });
    };

    const toggleDetails = (index) => {
        setOpenDetails(openDetails === index ? null : index);
    };

    // Function to generate page numbers for pagination
    const getPageNumbers = () => {
        const pages = [];
        const maxVisiblePages = 5;

        if (totalPages <= maxVisiblePages) {
            for (let i = 1; i <= totalPages; i++) {
                pages.push(i);
            }
        } else {
            const startPage = Math.max(1, currentPage - 2);
            const endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

            for (let i = startPage; i <= endPage; i++) {
                pages.push(i);
            }
        }
        return pages;
    };

    const formatWidth = (width) => {
        if (!width) return '';
        const widthStr = width.toString().toLowerCase().trim();
        if (widthStr.startsWith('normal')) return 'Normal';
        if (widthStr.startsWith('big')) return 'Big';
        return width;
    };

    return (
        <div className="min-h-screen bg-gray-50 py-8 ">
            <div className="container mx-auto ">
                {/* Header Section */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">Fabric Purchase History</h1>
                    <p className="text-gray-600">Track and manage all fabric purchase records</p>
                </div>

                {/* Error Alert */}
                {error && (
                    <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center">
                        <div className="flex-shrink-0">
                            <svg className="w-5 h-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                            </svg>
                        </div>
                        <div className="ml-3">
                            <h3 className="text-sm font-medium text-red-800">Error</h3>
                            <div className="text-sm text-red-700 mt-1">{error}</div>
                        </div>
                    </div>
                )}

                {/* Loading State */}
                {isLoading && (
                    <div className="mb-6 bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
                        <p className="mt-4 text-gray-600">Loading purchase history...</p>
                    </div>
                )}

                {/* Search and Stats Bar */}
                <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div className="flex-1 max-w-md">
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                            </div>
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={handleSearchChange}
                                placeholder="Search by fabric no, name, or vendor..."
                                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                            />
                        </div>
                    </div>

                    {/* Stats */}
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                        <span className="bg-white px-3 py-1 rounded-lg border border-gray-200">
                            Total: <span className="font-semibold text-gray-900">{filteredHistory.length}</span> records
                        </span>
                        {searchTerm && (
                            <span className="bg-blue-50 px-3 py-1 rounded-lg border border-blue-200 text-blue-700">
                                Filtered: <span className="font-semibold">{filteredHistory.length}</span>
                            </span>
                        )}
                    </div>
                </div>

                {/* Table Container */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    {/* Table */}
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">#</th>
                                    <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Fabric No.</th>
                                    <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Name</th>
                                    <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Vendor</th>
                                    <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Rate</th>
                                    <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Unit</th>
                                    <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Length</th>
                                    <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">RCD IN (MTR)</th>
                                    <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">RCD IN (KG)</th>
                                    <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Width</th>
                                    <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Received Date</th>
                                    <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Action</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {!isLoading && paginatedData.length === 0 ? (
                                    <tr>
                                        <td colSpan={12} className="px-6 py-12 text-center">
                                            <div className="flex flex-col items-center justify-center text-gray-500">
                                                <svg className="w-16 h-16 text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                                                </svg>
                                                <h3 className="text-lg font-medium text-gray-900 mb-1">
                                                    {searchTerm ? 'No matching records found' : 'No purchase history found'}
                                                </h3>
                                                <p className="text-gray-500">
                                                    {searchTerm ? 'Try adjusting your search terms' : 'There are no fabric purchase records available.'}
                                                </p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    paginatedData.map((fab, i) => {
                                        const globalIndex = (currentPage - 1) * PAGE_SIZE + i;
                                        return (
                                            <React.Fragment key={globalIndex}>
                                                {/* Main Row */}
                                                <tr className="hover:bg-gray-50 transition-colors duration-150 ease-in-out">
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                                        {globalIndex + 1}
                                                    </td>
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
                                                        {fab.fabric_length}m
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                        {fab.recieved_qty_meter}m
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                        {fab.recieved_qty_kg}kg
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                        {formatWidth(fab.width)}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                        <div className="flex items-center">
                                                            <svg className="w-4 h-4 text-gray-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                            </svg>
                                                            {formatDate(fab.recieved_date)}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                                        {fab.purchase_history && fab.purchase_history.length > 0 ? (
                                                            <button
                                                                onClick={() => toggleDetails(globalIndex)}
                                                                className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-full shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors duration-200"
                                                            >
                                                                {openDetails === globalIndex ? 'Hide Details' : 'View Details'}
                                                                <svg
                                                                    className={`ml-1.5 w-4 h-4 transition-transform duration-200 ${openDetails === globalIndex ? 'rotate-180' : ''}`}
                                                                    fill="none"
                                                                    stroke="currentColor"
                                                                    viewBox="0 0 24 24"
                                                                >
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                                                </svg>
                                                            </button>
                                                        ) : (
                                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                                                No Details
                                                            </span>
                                                        )}
                                                    </td>
                                                </tr>

                                                {/* Expanded Details Row */}
                                                {openDetails === globalIndex && fab.purchase_history && fab.purchase_history.length > 0 && (
                                                    <tr className="bg-gray-25">
                                                        <td colSpan={12} className="px-6 py-6">
                                                            <div className="bg-gray-50 rounded-lg border border-gray-200 p-6">
                                                                <div className="flex items-center justify-between mb-4">
                                                                    <h4 className="text-lg font-semibold text-gray-900 flex items-center">
                                                                        <svg className="w-5 h-5 text-indigo-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                                        </svg>
                                                                        Purchase History Details - {fab.fabric_name} ({fab.fabric_number})
                                                                    </h4>
                                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                                                                        {fab.purchase_history.length} records
                                                                    </span>
                                                                </div>

                                                                <div className="overflow-x-auto">
                                                                    <table className="min-w-full divide-y divide-gray-200">
                                                                        <thead className="bg-gray-100">
                                                                            <tr>
                                                                                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">#</th>
                                                                                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rate</th>
                                                                                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Unit</th>
                                                                                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Length</th>
                                                                                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">RCD IN (MTR)</th>
                                                                                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">RCD IN (KG)</th>
                                                                                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Width</th>
                                                                                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Received Date</th>
                                                                            </tr>
                                                                        </thead>
                                                                        <tbody className="bg-white divide-y divide-gray-200">
                                                                            {fab.purchase_history.map((ph, idx) => (
                                                                                <tr key={idx} className="hover:bg-gray-50">
                                                                                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">{idx + 1}</td>
                                                                                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">₹{ph.fabric_rate}</td>
                                                                                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{ph.unit}</td>
                                                                                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{ph.fabric_length}m</td>
                                                                                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{ph.recieved_qty_meter}m</td>
                                                                                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{ph.recieved_qty_kg}kg</td>
                                                                                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{formatWidth(ph.width)}</td>
                                                                                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                                                                                        {formatDate(ph.recieved_date)}
                                                                                    </td>
                                                                                </tr>
                                                                            ))}
                                                                        </tbody>
                                                                    </table>
                                                                </div>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                )}
                                            </React.Fragment>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {!isLoading && paginatedData.length > 0 && (
                        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
                            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                                <div className="text-sm text-gray-700">
                                    Showing <span className="font-medium">{(currentPage - 1) * PAGE_SIZE + 1}</span> to{' '}
                                    <span className="font-medium">
                                        {Math.min(currentPage * PAGE_SIZE, filteredHistory.length)}
                                    </span> of{' '}
                                    <span className="font-medium">{filteredHistory.length}</span> results
                                    {searchTerm && (
                                        <span className="text-blue-600 ml-2">(filtered)</span>
                                    )}
                                </div>

                                <div className="flex items-center space-x-1">
                                    <button
                                        onClick={() => handlePageChange(1)}
                                        disabled={currentPage === 1}
                                        className={`px-3 py-1.5 rounded-md text-sm font-medium ${currentPage === 1
                                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                            : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
                                            }`}
                                    >
                                        First
                                    </button>

                                    <button
                                        onClick={() => handlePageChange(currentPage - 1)}
                                        disabled={currentPage === 1}
                                        className={`px-3 py-1.5 rounded-md text-sm font-medium ${currentPage === 1
                                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                            : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
                                            }`}
                                    >
                                        Previous
                                    </button>

                                    {getPageNumbers().map(page => (
                                        <button
                                            key={page}
                                            onClick={() => handlePageChange(page)}
                                            className={`px-3 py-1.5 rounded-md text-sm font-medium ${currentPage === page
                                                ? 'bg-indigo-600 text-white'
                                                : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
                                                }`}
                                        >
                                            {page}
                                        </button>
                                    ))}

                                    <button
                                        onClick={() => handlePageChange(currentPage + 1)}
                                        disabled={currentPage === totalPages}
                                        className={`px-3 py-1.5 rounded-md text-sm font-medium ${currentPage === totalPages
                                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                            : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
                                            }`}
                                    >
                                        Next
                                    </button>

                                    <button
                                        onClick={() => handlePageChange(totalPages)}
                                        disabled={currentPage === totalPages}
                                        className={`px-3 py-1.5 rounded-md text-sm font-medium ${currentPage === totalPages
                                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                            : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
                                            }`}
                                    >
                                        Last
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

export default FabricPurchaseHistory