import React, { useState } from 'react';
import { BASE_URL } from '../constant/index.js';

// const API_BASE_URL = "http://localhost:5000/api/v1/accessory";
const API_BASE_URL = `${BASE_URL}/accessory`;

const AccessoryStockManager = () => {
  const [accessoryNumber, setAccessoryNumber] = useState('');
  const [styleNumber, setStyleNumber] = useState('');
  const [accessory, setAccessory] = useState(null);
  const [quantity, setQuantity] = useState('');
  const [action, setAction] = useState('add');
  const [message, setMessage] = useState({ text: '', type: '' });
  const [loading, setLoading] = useState(false);

  // 🔹 Fetch accessory by accessory_number
  const fetchAccessory = async () => {
    if (!accessoryNumber.trim()) {
      setMessage({ text: 'Please enter an accessory number.', type: 'error' });
      return;
    }

    setLoading(true);
    setMessage({ text: '', type: '' });
    try {
      const searchTerm = accessoryNumber.startsWith('A-')
        ? accessoryNumber
        : `A-${accessoryNumber}`;
      const res = await fetch(`${API_BASE_URL}?search=${encodeURIComponent(searchTerm)}`);
      const data = await res.json();

      if (res.ok && data?.message?.accessories?.length > 0) {
        const acc = data.message?.accessories[0];
        console.log(data);
        setAccessory(acc);
        setStyleNumber(acc.style_number);
        setMessage({ text: 'Accessory found successfully!', type: 'success' });
      } else {
        setAccessory(null);
        setMessage({ text: 'Accessory not found. Please check the number.', type: 'error' });
      }
    } catch (error) {
      console.error('Error fetching accessory:', error);
      setMessage({ text: 'Error fetching accessory. Please try again.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  // 🔹 Handle Add / Ship Stock Update
  const handleStockUpdate = async () => {
    if (!accessoryNumber || !styleNumber) {
      setMessage({ text: 'Style number and accessory number are required.', type: 'error' });
      return;
    }
    if (!quantity || isNaN(quantity) || quantity <= 0) {
      setMessage({ text: 'Please enter a valid quantity greater than 0.', type: 'error' });
      return;
    }

    setLoading(true);
    setMessage({ text: '', type: '' });

    const newStock =
      action === 'add'
        ? accessory.stock_unit + Number(quantity)
        : accessory.stock_unit - Number(quantity);

    if (newStock < 0) {
      setMessage({ text: 'Stock cannot go negative. Please adjust the quantity.', type: 'error' });
      setLoading(false);
      return;
    }

    try {
      const searchTerm = accessoryNumber.startsWith('A-')
        ? accessoryNumber
        : `A-${accessoryNumber}`;
      const res = await fetch(`${API_BASE_URL}/${encodeURIComponent(searchTerm)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stock_unit: newStock }),
      });

      const data = await res.json();

      if (res.ok && data?.success) {
        setAccessory({ ...accessory, stock_unit: newStock });
        setMessage({
          text:
            action === 'add'
              ? `✅ Added ${quantity} units successfully! New stock: ${newStock}`
              : `📦 Shipped ${quantity} units successfully! New stock: ${newStock}`,
          type: 'success',
        });
        setQuantity('');
      } else {
        setMessage({ text: data?.message || 'Update failed. Please try again.', type: 'error' });
      }
    } catch (error) {
      console.error('Error updating stock:', error);
      setMessage({ text: 'Error updating stock. Please try again.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      fetchAccessory();
    }
  };

  const getMessageStyles = (type) => {
    const baseStyles = 'mt-4 p-4 rounded-xl border flex items-center';
    switch (type) {
      case 'success':
        return `${baseStyles} bg-green-50 border-green-200 text-green-800`;
      case 'error':
        return `${baseStyles} bg-red-50 border-red-200 text-red-800`;
      case 'info':
        return `${baseStyles} bg-blue-50 border-blue-200 text-blue-800`;
      default:
        return `${baseStyles} bg-gray-50 border-gray-200 text-gray-800`;
    }
  };

  const getMessageIcon = (type) => {
    const iconClass = 'h-5 w-5 mr-3 flex-shrink-0';
    switch (type) {
      case 'success':
        return (
          <svg
            className={`${iconClass} text-green-500`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        );
      case 'error':
        return (
          <svg
            className={`${iconClass} text-red-500`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        );
      default:
        return null;
    }
  };

  return (
    <div className="  flex items-center justify-center">
      <div className="bg-white rounded-2xl shadow  w-full max-w-lg overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white mb-2">Accessory Stock Manager</h1>
              <p className="text-blue-100 text-sm">Manage inventory levels for accessories</p>
            </div>
            <div className="bg-blue-500 rounded-xl p-3">
              <svg
                className="h-8 w-8 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                />
              </svg>
            </div>
          </div>
        </div>

        <div className="p-8">
          {/* Search Section */}
          <div className="mb-8">
            <label className="block text-sm font-medium text-gray-700 mb-3">Search Accessory</label>
            <div className="flex space-x-3">
              <div className="flex-1 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg
                    className="h-5 w-5 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                </div>
                <input
                  type="text"
                  placeholder="Enter accessory number (e.g., A-001)"
                  value={accessoryNumber}
                  onChange={(e) => setAccessoryNumber(e.target.value)}
                  onKeyPress={handleKeyPress}
                  className="block w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                />
              </div>
              <button
                onClick={fetchAccessory}
                disabled={loading}
                className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-xl text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-sm hover:shadow-md"
              >
                {loading ? (
                  <svg className="animate-spin h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24">
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
                ) : (
                  <svg
                    className="h-5 w-5 mr-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                )}
                {loading ? 'Searching...' : 'Search'}
              </button>
            </div>
          </div>

          {/* Accessory Info Card */}
          {accessory && (
            <div className="mb-8 bg-gradient-to-br from-gray-50 to-blue-50 border border-gray-200 rounded-xl p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Accessory Details</h3>
                <span
                  className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                    accessory.stock_unit > 10
                      ? 'bg-green-100 text-green-800'
                      : accessory.stock_unit > 0
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-red-100 text-red-800'
                  }`}
                >
                  {accessory.stock_unit} in stock
                </span>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Style Number:</span>
                  <p className="font-medium text-gray-900">{accessory.style_number}</p>
                </div>
                <div>
                  <span className="text-gray-500">Accessory Number:</span>
                  <p className="font-medium text-gray-900">{accessory.accessory_number}</p>
                </div>
                <div className="col-span-2">
                  <span className="text-gray-500">Accessory Name:</span>
                  <p className="font-medium text-gray-900">
                    {accessory.accessory_name || 'Not specified'}
                  </p>
                </div>
                <div className="col-span-2">
                  <span className="text-gray-500">Type:</span>
                  <p className="font-medium text-gray-900">
                    {accessory.accessorry_type || 'Not specified'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Stock Management Form */}
          {accessory && (
            <div className="space-y-6">
              <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Stock Management</h3>

                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Action Type
                    </label>
                    <select
                      value={action}
                      onChange={(e) => setAction(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                    >
                      <option value="add">Add Stock</option>
                      <option value="ship">Ship Stock</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Quantity</label>
                    <input
                      type="number"
                      value={quantity}
                      onChange={(e) => setQuantity(e.target.value)}
                      placeholder="Enter quantity"
                      min="1"
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                    />
                  </div>
                </div>

                <button
                  onClick={handleStockUpdate}
                  disabled={loading || !quantity}
                  className={`w-full mt-6 py-4 px-6 border border-transparent text-base font-medium rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-offset-2 transition-all duration-200 shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed ${
                    action === 'add'
                      ? 'bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 focus:ring-green-500'
                      : 'bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 focus:ring-red-500'
                  }`}
                >
                  {loading ? (
                    <div className="flex items-center justify-center">
                      <svg
                        className="animate-spin h-5 w-5 mr-3 text-white"
                        fill="none"
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
                      Updating Stock...
                    </div>
                  ) : action === 'add' ? (
                    <div className="flex items-center justify-center">
                      <svg
                        className="h-5 w-5 mr-2"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                        />
                      </svg>
                      Add {quantity} Units
                    </div>
                  ) : (
                    <div className="flex items-center justify-center">
                      <svg
                        className="h-5 w-5 mr-2"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M20 12H4"
                        />
                      </svg>
                      Ship {quantity} Units
                    </div>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Message Display */}
          {message.text && (
            <div className={getMessageStyles(message.type)}>
              {getMessageIcon(message.type)}
              <span className="font-medium">{message.text}</span>
            </div>
          )}

          {/* Help Text */}
          {!accessory && (
            <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-xl">
              <div className="flex items-start">
                <svg
                  className="h-5 w-5 text-blue-500 mr-3 mt-0.5 flex-shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <div>
                  <p className="text-sm font-medium text-blue-800 mb-1">How to use</p>
                  <p className="text-sm text-blue-700">
                    Enter an accessory number (e.g., A-001) to search and manage its stock levels.
                    You can add new stock or ship existing inventory.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AccessoryStockManager;
