import React, { useEffect, useRef, useState } from 'react';
import { useGlobalContext } from './context/StockContextProvider';
import axios from 'axios';
import Papa from 'papaparse'; // For CSV parsing
import { BASE_URL } from '../constant/index.js';

const ShipStock = () => {
  const { stock, styleNumber, storeHelperOrderIds, fetchStoreHelperOrderIds, styleLoading } =
    useGlobalContext();
  const [product, setProduct] = useState([]);
  const [orderId, setOrderId] = useState('');
  const [apiResponse, setApiResponse] = useState([]);
  const [formData, setFormData] = useState({ styleNumber: '', size: '' });
  const [mode, setMode] = useState('single');
  const [csvData, setCsvData] = useState([]);
  const [processing, setProcessing] = useState(false);
  const [date, setDate] = useState('');

  const buttonRef = useRef();
  const orderIdRef = useRef();

  const API = 'https://fastapi.qurvii.com';

  // ***************************** POST Scan Data *****************************
  const postScanData = async (order) => {
    if (!order) return null;
    try {
      const response = await axios.post(`${API}/scan`, {
        user_id: 23,
        order_id: parseInt(order),
        user_location_id: 143,
      });
      return response.data.data;
    } catch (error) {
      console.error('Failed to scan data for order:', order, error);
      return null;
    }
  };

  //  *********************************** fetching store helper scanned order ids ********************************

  useEffect(() => {
    if (!date) return;
    fetchStoreHelperOrderIds(date);
  }, [date]);

  const uniqueOrdersMap = new Map();

  storeHelperOrderIds.forEach((item) => {
    if (!uniqueOrdersMap.has(item.order_id)) {
      uniqueOrdersMap.set(item.order_id, item);
    }
  });

  // Convert back to an array
  const uniqueOrdersArray = Array.from(uniqueOrdersMap.values());

  // ***************************** EFFECT: Single Order *****************************
  useEffect(() => {
    if (mode !== 'single') return;
    if (orderId.toString().length >= 5) {
      postScanData(orderId).then((data) => setApiResponse(data));
    } else {
      setApiResponse([]);
      setFormData({ styleNumber: '', size: '' });
    }
  }, [orderId, mode]);

  const effectiveStyleNumber = orderId ? apiResponse?.style_number : formData.styleNumber;

  const matchedStyleDetails = styleNumber.find(
    (style) => style.styleNumber == effectiveStyleNumber
  );

  const getAverageValue = (
    average_xxs_xs,
    average_s_m,
    average_l_xl,
    average_2xl_3xl,
    average_4xl_5xl,
    size
  ) => {
    const sizeToCheck = size || formData.size;
    if (!sizeToCheck) return '';

    const sizes = {
      XXS: average_xxs_xs,
      XS: average_xxs_xs,
      S: average_s_m,
      M: average_s_m,
      L: average_l_xl,
      XL: average_l_xl,
      '2XL': average_2xl_3xl,
      '3XL': average_2xl_3xl,
      '4XL': average_4xl_5xl,
      '5XL': average_4xl_5xl,
    };
    return sizes[sizeToCheck];
  };

  // ***************************** HANDLE STOCK UPDATE *****************************

  let localStock = stock.map((s) => ({ ...s })); // clone stock

  const handleStockUpdate = async (scanData) => {
    const effectiveStyle = styleNumber.find(
      (style) => Number(style.styleNumber) === Number(scanData?.style_number)
    );
    if (!effectiveStyle) return;

    const size = scanData.size;

    const fabricsToUpdate = effectiveStyle.fabrics
      .map((fab, idx) => {
        const fabAvg = effectiveStyle.fabricAvgDetails?.[0]?.fabrics?.[idx];
        if (!fabAvg) return null;

        return {
          no: fab.fabric_no,
          avg: getAverageValue(
            fabAvg.average_xxs_xs,
            fabAvg.average_s_m,
            fabAvg.average_l_xl,
            fabAvg.average_2xl_3xl,
            fabAvg.average_4xl_5xl,
            size
          ),
        };
      })
      .filter((f) => f);

    for (const fabric of fabricsToUpdate) {
      const avg = Number(fabric.avg);
      if (!fabric.no || isNaN(avg) || avg <= 0) continue;
      const existingStock = localStock.find(
        (item) => Number(item.fabricNumber) === Number(fabric.no)
      );

      if (!existingStock) continue;

      const newStock = Math.max(0, Number(existingStock.availableStock || 0) - avg);

      try {
        await axios.put(`${BASE_URL}/stock/${existingStock._id}`, {
          availableStock: newStock,
        });

        console.log(
          `Updated fabric ${fabric.no}: ${existingStock.availableStock} - ${avg} = ${newStock}`
        );

        // Update local stock for next iteration
        existingStock.availableStock = newStock;
      } catch (error) {
        console.error(`Failed to update stock for fabric ${fabric.no}`, error);
      }
    }
  };

  const handleSingleSubmit = async (e) => {
    e.preventDefault();
    if (!orderId) return;

    try {
      await handleStockUpdate(apiResponse);
      alert('Stock updated successfully!');
      setOrderId('');
      setFormData({ styleNumber: '', size: '' });
      setApiResponse([]);
      orderIdRef.current.focus();
    } catch (error) {
      console.error('Error updating stock:', error);
      alert('Failed to update stock.');
    }
  };

  // ***************************** HANDLE CSV UPLOAD *****************************
  const handleCsvUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const orders = results.data.map((row) => row.order_id);
        setCsvData(orders);
      },
    });
  };

  const handleBulkSubmit = async () => {
    if (!csvData.length) return;
    setProcessing(true);

    try {
      const promises = csvData.map(async (order) => {
        const scanData = await postScanData(order);
        if (scanData) await handleStockUpdate(scanData);
        return scanData;
      });

      const results = await Promise.all(promises);
      console.log('All scanData results:', results);

      alert('Bulk stock updated successfully!');
      setCsvData([]);
    } catch (error) {
      console.error('Error updating bulk stock:', error);
    } finally {
      setProcessing(false);
    }
  };

  const handleFetchProduct = async () => {
    try {
      const response = await fetch(
        `https://inventorybackend-m1z8.onrender.com/api/product?style_code=${apiResponse?.style_number}`
      );
      const data = await response.json();
      setProduct(data[0]);
    } catch (error) {
      console.error('Failed to fetch product details.', error);
    }
  };

  useEffect(() => {
    if (apiResponse) {
      handleFetchProduct();
    }
  }, [apiResponse?.style_number]);

  // ************************ exporting order ids ******************************
  const downloadCSV = () => {
    const orderIds = uniqueOrdersArray.map((o) => o.order_id);
    const csvContent = ['order_id', ...orderIds].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = 'order_ids.csv';
    link.click();

    URL.revokeObjectURL(url);
  };

  if (styleLoading) {
    return <p>loading...</p>;
  }

  return (
    <>
      <div className="container mx-auto overflow-hidden">
        <div className="grid grid-cols-2 gap-4">
          <div className="left p-6 bg-white rounded-lg border border-gray-200">
            <h2 className="text-2xl font-bold text-gray-700 mb-6">Ship Fabric Stock</h2>

            {/* ***************************** Mode Selector ***************************** */}
            <div className="mb-6 flex items-center flex-col">
              <select
                className="border border-gray-300  cursor-pointer w-full px-3 py-2 rounded-md"
                value={mode}
                onChange={(e) => setMode(e.target.value)}
              >
                <option value="">Select Mode</option>
                <option value="single">Single Ship</option>
                <option value="bulk">Bulk Ship</option>
              </select>
            </div>

            {/* ***************************** Single Ship Form ***************************** */}

            {mode === 'single' && (
              <form className="space-y-4" onSubmit={handleSingleSubmit}>
                <input
                  type="number"
                  placeholder="Scan Order Id..."
                  value={orderId}
                  ref={orderIdRef}
                  onChange={(e) => setOrderId(e.target.value)}
                  className="border border-gray-300 rounded px-3 py-2 w-full"
                />

                {/* Style Number & Size */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Style Number *
                    </label>
                    <input
                      type="number"
                      disabled
                      value={apiResponse?.style_number || formData.styleNumber}
                      className="bg-gray-100 rounded px-3 py-2 w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Size *</label>
                    <input
                      type="text"
                      disabled
                      value={apiResponse?.size || formData.size}
                      className="bg-gray-100 rounded px-3 py-2 w-full"
                    />
                  </div>
                </div>

                {/* Fabric Details */}
                <div className="space-y-4">
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="bg-gray-50 p-4 rounded-md">
                      <h4 className="text-sm font-medium text-gray-600 mb-3">Fabric {i + 1}</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">Fabric Number</label>
                          <input
                            type="number"
                            disabled
                            value={matchedStyleDetails?.fabrics[i]?.fabric_no || ''}
                            className="w-full border border-gray-200 rounded-md py-2 px-3 bg-gray-100 cursor-not-allowed"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">
                            Average (XXS-5XL)
                          </label>
                          <input
                            type="number"
                            disabled
                            value={
                              apiResponse?.size
                                ? getAverageValue(
                                    matchedStyleDetails?.fabricAvgDetails?.[0]?.fabrics?.[i]
                                      ?.average_xxs_xs,
                                    matchedStyleDetails?.fabricAvgDetails?.[0]?.fabrics?.[i]
                                      ?.average_s_m,
                                    matchedStyleDetails?.fabricAvgDetails?.[0]?.fabrics?.[i]
                                      ?.average_l_xl,
                                    matchedStyleDetails?.fabricAvgDetails?.[0]?.fabrics?.[i]
                                      ?.average_2xl_3xl,
                                    matchedStyleDetails?.fabricAvgDetails?.[0]?.fabrics?.[i]
                                      ?.average_4xl_5xl,

                                    apiResponse?.size
                                  )
                                : ''
                            }
                            className="w-full border border-gray-200 rounded-md py-2 px-3 bg-gray-100 cursor-not-allowed"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <button
                  type="submit"
                  className="w-full bg-red-500 hover:bg-red-600 text-white py-2 px-4 rounded-md"
                >
                  Minus Fabric
                </button>
              </form>
            )}

            {/* /* ***************************** Bulk Ship Form *****************************  */}
            {mode === 'bulk' && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 w-full gap-2">
                  {/* <a
                    className="py-2 px-4 rounded-md bg-purple-500 hover:bg-purple-600 text-white text-center transition-colors duration-200"
                    href="/ship_order_id.csv"
                    download
                  >
                    Download Sample File
                  </a> */}

                  <button
                    className="py-2 px-4 rounded-md bg-purple-500 hover:bg-purple-600 text-white text-center transition-colors duration-200"
                    onClick={downloadCSV}
                  >
                    Download Order ids
                  </button>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="py-2 px-4 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-400"
                  />
                </div>
                {date && (
                  <>
                    <input
                      type="file"
                      accept=".csv"
                      onChange={handleCsvUpload}
                      className="border border-gray-300 rounded px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-purple-400"
                    />

                    <button
                      disabled={processing || !csvData.length}
                      onClick={handleBulkSubmit}
                      className={`w-full py-2 px-4 rounded-md text-white transition-colors duration-200 ${
                        processing || !csvData.length
                          ? 'bg-gray-400 cursor-not-allowed'
                          : 'bg-red-500 hover:bg-red-600'
                      }`}
                    >
                      {processing ? 'Processing...' : 'Minus Bulk Fabric'}
                    </button>
                  </>
                )}
              </div>
            )}
          </div>

          {/* ***************************** Product Preview ***************************** */}
          <div
            className={`right ${
              product?.style_id && mode === 'single' ? 'block' : 'hidden'
            } overflow-hidden w-[695px] -mt-35 rounded-lg shadow-xs`}
          >
            <iframe
              className="w-full h-[100vh]"
              src={`https://www.myntra.com/dresses/qurvii/qurvii-flared-sleeves-sequinned-georgette-a-line-midi-dress/${product?.style_id}/buy`}
              frameBorder="0"
            ></iframe>
          </div>
        </div>
      </div>
      {storeHelperOrderIds.length > 0 && mode === 'bulk' && (
        <div className="mt-8 bg-white rounded-lg shadow border border-gray-200 p-4">
          <h3 className="text-lg font-semibold text-gray-700 mb-4">Scanned Orders</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    #
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Order Id
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Employee Name
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Location
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {uniqueOrdersArray.map((o, idx) => (
                  <tr key={o.order_id} className="hover:bg-gray-50">
                    <td className="px-4 py-2">{idx + 1}</td>
                    <td className="px-4 py-2">{o.order_id}</td>
                    <td className="px-4 py-2">{o.employees.user_name}</td>
                    <td className="px-4 py-2">{o.locations.name}</td>
                    {console.log(o)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
};

export default ShipStock;
