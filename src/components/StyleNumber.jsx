import React, { useEffect, useState } from 'react';
import { useGlobalContext } from './context/StockContextProvider';
import { Link } from 'react-router-dom';
import {
  fetchFabricNoFromFabricAverageSheet,
  fetchFabricNoFromStylwise,
} from '../service/GoogleSheet.services';
import axios from 'axios';

import { BASE_URL } from '../constant/index.js';

const StyleNumber = () => {
  const { styleNumber, styleLoading } = useGlobalContext();
  const [fabricAvgSheetFabricNo, setFabricAvgSheetFabricNo] = useState([]);
  const [stylewiseSheetFabricNo, setStylewiseSheetFabricNo] = useState([]);
  const [upsertNewRecord, setUpsertNewRecord] = useState(false);
  const [googleSheetLoading, setGoogleSheetLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [inputValue, setInputValue] = useState('');
  const [expandedFabrics, setExpandedFabrics] = useState({});
  const [itemsPerPage, setItemsPerPage] = useState(50); // Default to 50 records per page
  const API_URL = `${BASE_URL}`;

  // pagination logic
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const totalPages = Math.ceil(styleNumber.length / itemsPerPage);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [currentPage]);

  // fetch google sheet data

  const fetchDataFromGoogleSheet = async () => {
    setGoogleSheetLoading(true);
    try {
      const [fabricAvgFabricNo, stylewiseFabricNo] = await Promise.all([
        fetchFabricNoFromFabricAverageSheet(),
        fetchFabricNoFromStylwise(),
      ]);
      // console.log('Fabric avg sheet ', fabricAvgFabricNo);
      // console.log('Stylewise fabric no', stylewiseFabricNo);

      const withFabricNoStyles = stylewiseFabricNo.filter(
        (style) => style.fabric_1_no && style.fabric_1_no !== ''
      );
      setStylewiseSheetFabricNo(withFabricNoStyles);
      // console.log('Stylewise filtered fabric no', withFabricNoStyles);
    } catch (error) {
      console.error('Failed to fetch google sheet data error::', error);
    } finally {
      setGoogleSheetLoading(false);
    }
  };

  useEffect(() => {
    fetchDataFromGoogleSheet();
  }, []);

  // search filter
  const filteredData = styleNumber.filter((p) => {
    const term = searchTerm.toLowerCase();
    return (
      p.styleNumber?.toString().toLowerCase().includes(term) ||
      p.patternNumber?.toString().toLowerCase().includes(term) ||
      p.fabrics?.some((f) => f.fabric_no?.toString().toLowerCase().includes(term))
    );
  });

  const displayItems = searchTerm
    ? filteredData.slice(startIndex, endIndex)
    : styleNumber.slice(startIndex, endIndex);

  const handleClearFilter = () => {
    setInputValue('');
    setSearchTerm('');
    setCurrentPage(1);
  };

  // Toggle fabric details visibility
  const toggleFabricDetails = (styleNumber) => {
    setExpandedFabrics((prev) => ({
      ...prev,
      [styleNumber]: !prev[styleNumber],
    }));
  };

  // Handle items per page change
  const handleItemsPerPageChange = (e) => {
    setItemsPerPage(Number(e.target.value));
    setCurrentPage(1); // Reset to first page when changing items per page
  };

  const missingFabricNumbers = () => {
    const missingFabricNo = styleNumber.filter((fab) => fab?.fabrics?.length === 0);
    return missingFabricNo;
  };

  // GENERATE MISSING FABRIC NUMBERS
  const downloadMissingFabricNumbers = () => {
    const data = missingFabricNumbers();
    if (data.length === 0) return;
    // const data = [
    //   {
    //     accessories: [],
    //     fabricAvgDetails: [{}],
    //     fabrics: [],
    //     patternNumber: '250',
    //     styleNumber: 19114,
    //     _id: '69302fb190024fbe56bd27c8',
    //   },
    // ];

    const csvHeader =
      'Style Number,Pattern Number,Article Type,Style Image,Fabric 1,Fabric 1 Name,Fabric 1 Image,Fabric 2,Fabric 2 Name,Fabric 2 Image,Fabric 3,Fabric 3 Name,Fabric 3 Image\n';

    const csvRows = data.map((item) => {
      return [
        item.styleNumber || '',
        item.patternNumber || '',
        '', // Article Type
        '', // Style Image
        '',
        '',
        '', // Fabric 1
        '',
        '',
        '', // Fabric 2
        '',
        '',
        '', // Fabric 3
      ].join(',');
    });

    const csvContent = csvHeader + csvRows.join('\n');

    // Create blob
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });

    // Create download link
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'missing_fabrics.csv');

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // upsert data to database
  const transformData = () => {
    return stylewiseSheetFabricNo.map((style) => {
      const fabrics = [];
      // collect up to 3 fabrics
      for (let i = 1; i < 4; i++) {
        if (style[`fabric_${i}_no`]) {
          fabrics.push({
            fabric_no: Number(style[`fabric_${i}_no`]) || null,
            fabric_name: style[`fabric_${i}_name`] || '',
            fabric_image: '',
          });
        }
      }
      return {
        styleNumber: Number(style?.style_number),
        patternNumber: style?.pattern_number,
        articleType: style?.articleType || 'Na',
        fabrics,
      };
    });
  };

  const upsert = async () => {
    const payload = transformData();
    const missingFab = missingFabricNumbers();
    const filteredRecords = payload.filter(
      (rec) => rec.fabrics && rec.fabrics.length > 0 && rec.fabrics[0]?.fabric_no
    );

    const styleNumbers = missingFab.map((m) => m.styleNumber);
    const combinedData = filteredRecords.filter((s) => styleNumbers.includes(s.styleNumber));

    if (combinedData.length === 0) {
      alert('No valid fabric records to upsert');
      return;
    }

    try {
      setUpsertNewRecord(true);
      const res = await axios.post(`${API_URL}/style-details/`, {
        styles: combinedData,
      });

      console.log(res.data.message);
      alert('New fabric no upserted');
    } catch (error) {
      console.error('Failed to upsert new Fabric no :: ', error);
    } finally {
      setUpsertNewRecord(false);
    }
  };

  if (styleLoading || googleSheetLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (upsertNewRecord) {
    return <div className="flex justify-center items-center h-64">updating...</div>;
  }

  return (
    <div className="container mx-auto p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="px-6 py-5 bg-white rounded-xl shadow-sm mb-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Style Number Details</h1>
            <p className="text-sm text-gray-500 mt-1">
              Browse and search through all style numbers
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative">
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
                placeholder="Search Style, Pattern, or Fabric #"
                className="pl-10 pr-4 py-2.5 w-full md:w-80 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition duration-200 shadow-sm"
              />
              <svg
                className="absolute left-3 top-3 h-5 w-5 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
            {searchTerm && (
              <button
                onClick={handleClearFilter}
                className="flex items-center justify-center px-4 py-2.5 border border-gray-300 rounded-lg bg-white text-gray-700 hover:bg-gray-50 transition duration-200 shadow-sm"
              >
                <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
                Clear
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Records per page selector */}
      <div className="flex justify-between items-center mb-4">
        <div className="bg-blue-50 border border-blue-100 flex justify-between items-center rounded-lg p-4 flex-1 mr-4">
          <span className="text-blue-800 font-medium">
            Showing {searchTerm ? filteredData.length : displayItems.length} of {styleNumber.length}{' '}
            records
          </span>
          {searchTerm && (
            <span className="text-blue-600 ml-3">
              for "<strong>{searchTerm}</strong>"
            </span>
          )}
          <div className="flex gap-4 items-center">
            <button
              onClick={downloadMissingFabricNumbers}
              className="bg-red-400 text-white py-2 px-4 rounded-md hover:bg-red-500 cursor-pointer ease-in duration-75"
            >
              Export Missing Fabric No
            </button>

            <button
              onClick={upsert}
              className="bg-green-400 text-white py-2 px-4 rounded-md hover:bg-green-500 cursor-pointer ease-in duration-75"
            >
              Upsert New Fabric No.
            </button>
          </div>
        </div>

        <div className="flex items-center">
          <label htmlFor="itemsPerPage" className="text-sm text-gray-600 mr-2">
            Records per page:
          </label>
          <select
            id="itemsPerPage"
            value={itemsPerPage}
            onChange={handleItemsPerPageChange}
            className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="10">10</option>
            <option value="20">20</option>
            <option value="50">50</option>
            <option value="100">100</option>
            <option value="200">200</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-gray-200 shadow-sm bg-white">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider border-r border-gray-200">
                Style No.
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider border-r border-gray-200">
                Pattern No.
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider border-r border-gray-200">
                Style Image
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Fabrics
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>

          <tbody className="bg-white divide-y divide-gray-200">
            {displayItems.length > 0 ? (
              displayItems.map((curStyle) => (
                <React.Fragment key={curStyle.styleNumber}>
                  <tr className="hover:bg-gray-50 transition-colors duration-150">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900 border-r border-gray-200">
                      {curStyle.styleNumber}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 border-r border-gray-200">
                      {curStyle.patternNumber || <span className="text-gray-400">N/A</span>}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm border-r border-gray-200">
                      {curStyle.styleImage ? (
                        <Link
                          to={curStyle.styleImage}
                          target="_blank"
                          className="inline-flex items-center px-3 py-1.5 bg-blue-100 text-blue-700 rounded-full hover:bg-blue-200 transition duration-200 text-xs font-medium"
                        >
                          <svg
                            className="w-4 h-4 mr-1"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                            />
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                            />
                          </svg>
                          View Image
                        </Link>
                      ) : (
                        <span className="text-gray-400">No image</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700">
                      {curStyle.fabrics?.length > 0 ? (
                        <span className="font-medium">
                          {curStyle.fabrics.length} fabric(s) available
                        </span>
                      ) : (
                        <span className="text-gray-400 italic">
                          No fabric information available
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {curStyle.fabrics?.length > 0 && (
                        <button
                          onClick={() => toggleFabricDetails(curStyle.styleNumber)}
                          className="inline-flex items-center px-3 py-1.5 bg-green-100 text-green-700 rounded-full hover:bg-green-200 transition duration-200 text-xs font-medium"
                        >
                          <svg
                            className={`w-4 h-4 mr-1 transform transition-transform ${expandedFabrics[curStyle.styleNumber] ? 'rotate-180' : ''}`}
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M19 9l-7 7-7-7"
                            />
                          </svg>
                          {expandedFabrics[curStyle.styleNumber] ? 'Hide' : 'Show'} Details
                        </button>
                      )}
                    </td>
                  </tr>

                  {/* Expanded fabric details row */}
                  {expandedFabrics[curStyle.styleNumber] && curStyle.fabrics?.length > 0 && (
                    <tr>
                      <td colSpan="5" className="px-6 py-4 bg-gray-50">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {curStyle?.fabrics.map((fab, idx) => (
                            <div
                              key={idx}
                              className="p-4 border border-gray-200 rounded-lg bg-white shadow-sm"
                            >
                              <h4 className="font-medium text-gray-800 mb-3 pb-2 border-b">
                                Fabric #{idx + 1}
                              </h4>
                              <div className="space-y-2">
                                <div>
                                  <span className="font-medium text-gray-700">Fabric No: </span>
                                  <span>{fab.fabric_no}</span>
                                </div>
                                <div>
                                  <span className="font-medium text-gray-700">Name: </span>
                                  <span>{fab.fabric_name}</span>
                                </div>
                                {fab.fabric_image && (
                                  <div>
                                    <Link
                                      to={fab.fabric_image}
                                      target="_blank"
                                      className="inline-flex items-center text-blue-600 hover:text-blue-800 font-medium text-sm"
                                    >
                                      <svg
                                        className="w-4 h-4 mr-1"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        stroke="currentColor"
                                      >
                                        <path
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                          strokeWidth={2}
                                          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                                        />
                                        <path
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                          strokeWidth={2}
                                          d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                                        />
                                      </svg>
                                      View Fabric Image
                                    </Link>
                                  </div>
                                )}
                                <div>
                                  <span className="font-medium text-gray-700">Avg (XXS-XS): </span>
                                  {/* <span>{fab.average_xxs_m}</span> */}
                                  <span>
                                    {' '}
                                    {curStyle.fabricAvgDetails[0]?.fabrics[idx]?.average_xxs_xs ||
                                      'NA'}{' '}
                                  </span>
                                  {console.log('current style details', curStyle)}
                                </div>
                                <div>
                                  <span className="font-medium text-gray-700">Avg (S-M): </span>

                                  <span>
                                    {' '}
                                    {curStyle.fabricAvgDetails[0]?.fabrics[idx]?.average_s_m ||
                                      'NA'}{' '}
                                  </span>
                                </div>
                                <div>
                                  <span className="font-medium text-gray-700">Avg (L-XL): </span>

                                  <span>
                                    {' '}
                                    {curStyle.fabricAvgDetails[0]?.fabrics[idx]?.average_l_xl ||
                                      'NA'}{' '}
                                  </span>
                                </div>
                                <div>
                                  <span className="font-medium text-gray-700">Avg (2XL-3XL): </span>

                                  <span>
                                    {' '}
                                    {curStyle.fabricAvgDetails[0]?.fabrics[idx]?.average_2xl_3xl ||
                                      'NA'}{' '}
                                  </span>
                                </div>
                                <div>
                                  <span className="font-medium text-gray-700">Avg (4XL-5XL): </span>

                                  <span>
                                    {' '}
                                    {curStyle.fabricAvgDetails[0]?.fabrics[idx]?.average_4xl_5xl ||
                                      'NA'}{' '}
                                  </span>
                                </div>
                                <div>
                                  <span className="font-medium text-gray-700">(WIDTH): </span>
                                  {/* <span>{fab.average_l_5xl}</span> */}
                                  <span> {curStyle.fabricAvgDetails[0]?.fabrics[idx]?.width} </span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))
            ) : (
              <tr>
                <td colSpan="5" className="px-6 py-12 text-center text-gray-500">
                  <svg
                    className="w-12 h-12 mx-auto text-gray-300 mb-3"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <p className="text-lg font-medium">No results found</p>
                  <p className="mt-1">
                    Try adjusting your search or filter to find what you're looking for.
                  </p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between mt-6 px-2">
          <div className="text-sm text-gray-600 mb-4 sm:mb-0">
            Showing {startIndex + 1} to{' '}
            {Math.min(endIndex, searchTerm ? filteredData.length : styleNumber.length)} of{' '}
            {searchTerm ? filteredData.length : styleNumber.length} entries
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="flex items-center px-4 py-2 bg-white border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg className="w-5 h-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
              Previous
            </button>

            <div className="hidden md:flex">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                // Show pages around current page
                let pageNum;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }

                return (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`px-3 py-2 border text-sm font-medium ${
                      currentPage === pageNum
                        ? 'z-10 bg-blue-600 border-blue-600 text-white'
                        : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                    } ${i === 0 ? 'rounded-l-md' : ''} ${
                      i === 4 || pageNum === totalPages ? 'rounded-r-md' : ''
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>

            <button
              onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="flex items-center px-4 py-2 bg-white border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
              <svg className="w-5 h-5 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
      )}
    </div>
  );
};

export default StyleNumber;
