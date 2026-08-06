import React, { useEffect, useState } from 'react';
import axios from 'axios';
import {
  FaImage,
  FaSpinner,
  FaExclamationTriangle,
  FaSearch,
  FaSort,
  FaSortUp,
  FaSortDown,
} from 'react-icons/fa';
import { BASE_URL } from '../constant/index.js';
const FabricTable = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: 'patternNumber', direction: 'asc' });
  const [expandedRow, setExpandedRow] = useState(null);

  // API Call
  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await axios.get(`${BASE_URL}/average`);
        setData(res.data.data || []);
      } catch (err) {
        console.error(err);
        setError('Failed to fetch fabric data. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Filter data based on search term
  const filteredData = data.filter(
    (item) =>
      item.patternNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.fabrics?.some((f) => f.width?.toString().includes(searchTerm)) ||
      item.accessories?.some((a) => a.average_xxs_m?.toString().includes(searchTerm))
  );

  // Sort data
  const sortedData = React.useMemo(() => {
    if (!sortConfig.key) return filteredData;

    return [...filteredData].sort((a, b) => {
      if (a[sortConfig.key] < b[sortConfig.key]) {
        return sortConfig.direction === 'asc' ? -1 : 1;
      }
      if (a[sortConfig.key] > b[sortConfig.key]) {
        return sortConfig.direction === 'asc' ? 1 : -1;
      }
      return 0;
    });
  }, [filteredData, sortConfig]);

  const handleSort = (key) => {
    setSortConfig((prevConfig) => ({
      key,
      direction: prevConfig.key === key && prevConfig.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  const getSortIcon = (key) => {
    if (sortConfig.key !== key) return <FaSort className="text-gray-400" />;
    return sortConfig.direction === 'asc' ? (
      <FaSortUp className="text-blue-600" />
    ) : (
      <FaSortDown className="text-blue-600" />
    );
  };

  const toggleRowExpand = (index) => {
    setExpandedRow(expandedRow === index ? null : index);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="text-center">
          <FaSpinner className="animate-spin text-4xl text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600 text-lg">Loading fabric data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="text-center max-w-md">
          <FaExclamationTriangle className="text-4xl text-red-500 mx-auto mb-4" />
          <p className="text-red-600 text-lg mb-2">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Fabric Patterns Averages</h1>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">Total Patterns</p>
                <p className="text-2xl font-bold text-gray-900">{data.length}</p>
              </div>
              <div className="p-3 bg-blue-50 rounded-lg">
                <FaImage className="text-2xl text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">With Fabrics</p>
                <p className="text-2xl font-bold text-gray-900">
                  {data.filter((item) => item.fabrics && item.fabrics.length > 0).length}
                </p>
              </div>
              <div className="p-3 bg-green-50 rounded-lg">
                <div className="w-6 h-6 bg-green-200 rounded"></div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">With Accessories</p>
                <p className="text-2xl font-bold text-gray-900">
                  {data.filter((item) => item.accessories && item.accessories.length > 0).length}
                </p>
              </div>
              <div className="p-3 bg-purple-50 rounded-lg">
                <div className="w-6 h-6 bg-purple-200 rounded"></div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">With Images</p>
                <p className="text-2xl font-bold text-gray-900">
                  {data.filter((item) => item.styleImage).length}
                </p>
              </div>
              <div className="p-3 bg-yellow-50 rounded-lg">
                <FaImage className="text-2xl text-yellow-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Search and Controls */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
            <div className="flex-1 w-full">
              <div className="relative max-w-md">
                <input
                  type="text"
                  placeholder="Search by pattern number, width, or measurements..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                  <FaSearch className="text-gray-400" />
                </div>
              </div>
            </div>
            <div className="text-sm text-gray-600 bg-gray-50 px-4 py-2 rounded-lg border border-gray-200">
              Showing {filteredData.length} of {data.length} patterns
            </div>
          </div>
        </div>

        {/* Table */}
        {sortedData.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl shadow-sm border border-gray-200">
            <FaImage className="text-6xl text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-xl font-medium">No patterns found</p>
            <p className="text-gray-400">
              {searchTerm ? 'Try adjusting your search terms' : 'Add patterns to get started'}
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            {/* Table Header */}
            <div className="grid grid-cols-12 gap-4 px-6 py-4 bg-gray-50 border-b border-gray-200 font-semibold text-gray-700 text-sm">
              <div
                className="col-span-2 flex items-center gap-2 cursor-pointer"
                onClick={() => handleSort('patternNumber')}
              >
                Style No. #{getSortIcon('patternNumber')}
              </div>
              <div
                className="col-span-2 flex  gap-2 cursor-pointer"
                onClick={() => handleSort('style_number')}
              >
                Pattern #{getSortIcon('patternNumber')}
              </div>
              {/* <div className="col-span-2 text-center">Style Image</div> */}
              <div className="col-span-4 text-center">Fabrics</div>
              <div className="col-span-3 text-center">Accessories</div>
              <div className="col-span-1 text-center">Actions</div>
            </div>

            {/* Table Body */}
            <div className="divide-y divide-gray-200">
              {sortedData.map((row, index) => (
                <div key={index} className="transition-colors hover:bg-gray-50">
                  <div className="grid grid-cols-12 gap-4 px-6 py-4 items-center">
                    {/* Pattern Number */}
                    <div className="col-span-2">
                      <span className="font-mono font-semibold text-gray-900 bg-gray-100 px-3 py-1 rounded-lg text-sm">
                        {row.style_number}
                      </span>
                    </div>

                    {/* Style Image */}
                    <div className="col-span-2 flex justify-center">
                      <span className="font-mono font-semibold text-gray-900 bg-gray-100 px-3 py-1 rounded-lg text-sm">
                        {row.patternNumber}
                      </span>
                    </div>

                    {/* Fabrics */}
                    <div className="col-span-4">
                      {row.fabrics && row.fabrics.length > 0 ? (
                        <div className="space-y-2">
                          {row.fabrics
                            .slice(0, expandedRow === index ? undefined : 1)
                            .map((fabric, idx) => (
                              <div
                                key={idx}
                                className="bg-blue-50 rounded-lg p-3 border border-blue-200"
                              >
                                <div className="grid grid-cols-3 gap-2 text-xs">
                                  <div>
                                    <span className="font-semibold">XXS-XS:</span>{' '}
                                    {fabric.average_xxs_xs}
                                  </div>
                                  <div>
                                    <span className="font-semibold">S-M:</span> {fabric.average_s_m}
                                  </div>
                                  <div>
                                    <span className="font-semibold">L-XL:</span>{' '}
                                    {fabric.average_l_xl}
                                  </div>
                                  <div>
                                    <span className="font-semibold">2XL-3XL:</span>{' '}
                                    {fabric.average_2xl_3xl}
                                  </div>
                                  <div>
                                    <span className="font-semibold">4XL-5XL:</span>{' '}
                                    {fabric.average_4xl_5xl}
                                  </div>
                                  <div>
                                    <span className="font-semibold">Width:</span> {fabric.width}
                                  </div>
                                </div>
                              </div>
                            ))}
                          {row.fabrics.length > 1 && (
                            <button
                              onClick={() => toggleRowExpand(index)}
                              className="text-blue-600 text-sm font-medium hover:text-blue-800 transition-colors"
                            >
                              {expandedRow === index
                                ? 'Show Less'
                                : `+${row.fabrics.length - 1} More`}
                            </button>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-400 text-sm">-</span>
                      )}
                    </div>

                    {/* Accessories */}
                    <div className="col-span-3">
                      {row.accessories && row.accessories.length > 0 ? (
                        <div className="space-y-2">
                          {row.accessories.map((accessory, idx) => (
                            <div
                              key={idx}
                              className="bg-green-50 rounded-lg p-3 border border-green-200"
                            >
                              <div className="grid grid-cols-2 gap-2 text-xs">
                                <div>
                                  <span className="font-semibold">XXS-M:</span>{' '}
                                  {accessory.average_xxs_m}
                                </div>
                                <div>
                                  <span className="font-semibold">L-5XL:</span>{' '}
                                  {accessory.average_l_5xl}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span className="text-gray-400 text-sm">-</span>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="col-span-1 flex justify-center">
                      <button
                        onClick={() => toggleRowExpand(index)}
                        className="bg-gray-100 text-gray-600 px-3 py-2 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
                      >
                        {expandedRow === index ? 'Collapse' : 'View'}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer Info */}
        {data.length > 0 && (
          <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-center gap-3 text-blue-800">
              <div className="p-2 bg-blue-100 rounded-lg">
                <FaImage className="text-lg" />
              </div>
              <div className="text-sm">
                <strong>Measurement Guide:</strong> All measurements are in centimeters. Click on
                images to view full size.
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FabricTable;
