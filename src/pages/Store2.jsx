import React, { useEffect, useState } from "react";
import { useGlobalContext } from "../components/context/StockContextProvider";

const Stock2 = () => {
    const { stock2, stockLoading } = useGlobalContext();
    const [currentPage, setCurrentPage] = useState(1);
    const [searchTerm, setSearchTerm] = useState("");
    const [inputValue, setInputValue] = useState("");
    const [expandedItems, setExpandedItems] = useState({});

    console.log(stock2)

    const itemsPerPage = 50;
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const totalPages = Math.ceil(stock2.length / itemsPerPage);

    const filteredData = stock2.filter((p) => {
        const term = searchTerm.toLowerCase();
        return (
            p.fabricNumber?.toString().toLowerCase().includes(term) ||
            p.fabricName?.toLowerCase().includes(term) ||
            p.styleNumbers?.some((s) => s.toString().toLowerCase().includes(term))
        );
    });

    const displayItems = searchTerm
        ? filteredData.slice(startIndex, endIndex)
        : stock2.slice(startIndex, endIndex);

    const handleClearFilter = () => {
        setInputValue("");
        setSearchTerm("");
        setCurrentPage(1);
    };

    const toggleExpanded = (fabricNumber) => {
        setExpandedItems(prev => ({
            ...prev,
            [fabricNumber]: !prev[fabricNumber]
        }));
    };

    useEffect(() => {
        window.scrollTo({ top: 0, behavior: "smooth" });
    }, [currentPage]);

    if (stockLoading) {
        return (
            <div className="flex flex-col items-center justify-center h-screen space-y-4">
                <div className="animate-spin rounded-full h-14 w-14 border-t-4 border-blue-500 border-solid"></div>
                <span className="text-gray-600 text-lg">Loading stock data...</span>
            </div>
        );
    }

    return (
        <div className="max-w-screen-2xl mx-auto px-6 py-10">
            <div className="bg-white rounded-2xl shadow-md border border-gray-200 overflow-hidden">
                {/* Header */}
                <div className="px-6 py-6 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-gray-100">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-800">Fabric Stock Inventory</h1>
                            <p className="mt-1 text-sm text-gray-500">
                                Track, search, and manage your fabric stock with ease
                            </p>
                        </div>
                        <div className="flex gap-3">
                            {/* Search Box */}
                            <div className="relative">
                                <input
                                    type="text"
                                    value={inputValue}
                                    onChange={(e) => setInputValue(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter") {
                                            setSearchTerm(inputValue.trim());
                                            setCurrentPage(1);
                                        }
                                    }}
                                    placeholder="Search by Fabric No., Name, or Style No."
                                    className="pl-10 pr-4 py-2 w-72 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
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
                            {searchTerm && (
                                <button
                                    onClick={handleClearFilter}
                                    className="px-4 py-2 text-sm rounded-lg border bg-gray-50 text-gray-600 hover:bg-gray-100 transition"
                                >
                                    Clear
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* Summary */}
                <div className="px-6 py-3 bg-blue-50 border-b border-blue-100 flex justify-between items-center">
                    <div className="flex items-center gap-2 text-sm">
                        <span className="px-3 py-1 rounded-full bg-blue-100 text-blue-800 font-medium">
                            {searchTerm ? filteredData.length : stock2.length} Total Items
                        </span>
                        {searchTerm && (
                            <span className="px-3 py-1 rounded-full bg-indigo-100 text-indigo-800 font-medium">
                                {filteredData.length} Results
                            </span>
                        )}
                    </div>
                    <p className="text-gray-600">
                        Showing{" "}
                        <span className="font-medium">{startIndex + 1}</span> –{" "}
                        <span className="font-medium">
                            {Math.min(endIndex, searchTerm ? filteredData.length : stock2.length)}
                        </span>{" "}
                        of{" "}
                        <span className="font-medium">
                            {searchTerm ? filteredData.length : stock2.length}
                        </span>
                    </p>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                        <thead className="bg-gray-100 sticky top-0 z-10">
                            <tr>
                                {["#", "Fabric No.", "Fabric Name", "Available Stock", "Location", "Style Numbers", "Actions"].map(
                                    (head) => (
                                        <th
                                            key={head}
                                            className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider"
                                        >
                                            {head}
                                        </th>
                                    )
                                )}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {displayItems.map((curStock, i) => (
                                <React.Fragment key={`${curStock.fabricNumber}-${i}`}>
                                    <tr className="hover:bg-gray-50 transition">
                                        <td className="px-6 py-4 font-medium text-gray-900">{startIndex + i + 1}</td>
                                        <td className="px-6 py-4 text-blue-600">{curStock.fabricNumber}</td>
                                        <td className="px-6 py-4">{curStock.fabricName}</td>
                                        <td className="px-6 py-4">


                                            <div
                                                className={`px-3 py-1 rounded-full text-xs font-semibold flex justify-between ${curStock.availableStock > 100
                                                    ? "bg-green-100 text-green-700"
                                                    : curStock.availableStock > 50
                                                        ? "bg-yellow-100 text-yellow-700"
                                                        : "bg-red-100 text-red-700"
                                                    }`}
                                            >

                                                <span>

                                                    {`${curStock.availableStock} MTR`}
                                                </span>
                                            </div>


                                        </td>
                                        <td className="px-6 py-4 text-gray-500">{curStock.location}</td>
                                        <td className="px-6 py-4 text-gray-500">
                                            {curStock.styleNumbers?.length > 0
                                                ? `${curStock.styleNumbers.length} style(s)`
                                                : "-"}
                                        </td>
                                        <td className="px-6 py-4">
                                            {curStock.styleNumbers?.length > 0 && (
                                                <button
                                                    onClick={() => toggleExpanded(curStock.fabricNumber)}
                                                    className="px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 transition"
                                                >
                                                    {expandedItems[curStock.fabricNumber] ? "Hide" : "Show"} Styles
                                                </button>
                                            )}
                                        </td>
                                    </tr>

                                    {/* Expanded row for style numbers */}
                                    {expandedItems[curStock.fabricNumber] && curStock.styleNumbers?.length > 0 && (
                                        <tr className="bg-blue-50">
                                            <td colSpan="7" className="px-6 py-4">
                                                <div className="mb-2 font-medium text-blue-800">Linked Style Numbers:</div>
                                                <div className="flex flex-wrap gap-2">
                                                    {curStock.styleNumbers.map((styleNumber, idx) => (
                                                        <span
                                                            key={idx}
                                                            className="px-3 py-1 bg-white border border-blue-200 rounded-full text-blue-700 text-xs"
                                                        >
                                                            {styleNumber}
                                                        </span>
                                                    ))}
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
                    <div className="text-center py-14">
                        <svg
                            className="mx-auto h-14 w-14 text-gray-400"
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
                            {searchTerm
                                ? "Try adjusting your search or filters."
                                : "Your stock inventory is currently empty."}
                        </p>
                        {searchTerm && (
                            <button
                                onClick={handleClearFilter}
                                className="mt-5 px-5 py-2 rounded-lg bg-blue-600 text-white font-medium shadow hover:bg-blue-700"
                            >
                                Clear Search
                            </button>
                        )}
                    </div>
                )}

                {/* Pagination */}
                {stock2.length > itemsPerPage && (
                    <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-between items-center">
                        <p className="text-sm text-gray-600">
                            Page <span className="font-semibold">{currentPage}</span> of {totalPages}
                        </p>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                                disabled={currentPage === 1}
                                className="px-3 py-1 rounded-lg border bg-white text-sm text-gray-600 hover:bg-gray-100 disabled:opacity-50"
                            >
                                Previous
                            </button>
                            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                                <button
                                    key={page}
                                    onClick={() => setCurrentPage(page)}
                                    className={`px-3 py-1 rounded-lg text-sm ${currentPage === page
                                        ? "bg-blue-600 text-white"
                                        : "bg-white border text-gray-600 hover:bg-gray-100"
                                        }`}
                                >
                                    {page}
                                </button>
                            ))}
                            <button
                                onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                                disabled={currentPage === totalPages}
                                className="px-3 py-1 rounded-lg border bg-white text-sm text-gray-600 hover:bg-gray-100 disabled:opacity-50"
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

export default Stock2;