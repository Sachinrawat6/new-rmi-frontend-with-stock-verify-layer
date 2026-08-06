import React, { useState } from 'react';
import Papa from 'papaparse';
import axios from 'axios';
import { BASE_URL } from '../constant/index.js';

// const API_URL = "http://localhost:5000/api/v1/accessory/bulk-upsert";
const API_URL = `${BASE_URL}/accessory/bulk-upsert`;

const AccessoryCsvUploader = () => {
  const [csvData, setCsvData] = useState([]);
  const [columns, setColumns] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [fileName, setFileName] = useState('');
  const [message, setMessage] = useState({ text: '', type: '' });

  // 🧠 Parse CSV on upload
  const handleCSVUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setFileName(file.name);
    setMessage({ text: '', type: '' });

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const data = results.data;
        if (data.length === 0) {
          setMessage({ text: 'CSV file is empty!', type: 'error' });
          return;
        }
        setColumns(Object.keys(data[0]));
        setCsvData(data);
        setMessage({
          text: `✅ ${data.length} accessories parsed successfully`,
          type: 'success',
        });
      },
      error: (error) => {
        setMessage({ text: 'Error parsing CSV file', type: 'error' });
        console.error('CSV Parse Error:', error);
      },
    });
  };

  // 📤 Upload to backend
  const handleUpload = async () => {
    if (!csvData.length) {
      setMessage({ text: 'Please upload a CSV file first!', type: 'error' });
      return;
    }

    // 🧩 Convert CSV columns → backend expected fields
    const formattedData = csvData.map((row) => ({
      style_number: Number(row['Style Number']),
      accessory_number: `A-${row['Accessory 1']}`,
      accessory_name: row['Access. 1 Name'],
      accessorry_type: row['Access. 1 Type'],
      accessory_image: row['Access. 1 Image'],
    }));

    try {
      setUploading(true);
      setMessage({ text: 'Uploading accessories...', type: 'info' });

      const response = await axios.post(API_URL, { accessories: formattedData });

      setMessage({
        text: response.data.message || 'Accessories uploaded successfully!',
        type: 'success',
      });
      setCsvData([]);
      setColumns([]);
      setFileName('');
    } catch (err) {
      console.error(err);
      const errorMessage = err.response?.data?.message || 'Failed to upload accessories!';
      setMessage({ text: errorMessage, type: 'error' });
    } finally {
      setUploading(false);
    }
  };

  const getMessageStyles = (type) => {
    const baseStyles = 'mt-4 p-4 rounded-lg border flex items-center';
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
      case 'info':
        return (
          <svg
            className={`${iconClass} text-blue-500`}
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
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-6">
      <div className="bg-white w-full max-w-6xl  rounded-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white mb-2">Accessory Data Upload</h1>
              <p className="text-blue-100 text-sm">
                Upload CSV files containing accessory information for bulk processing
              </p>
            </div>
            <div className="bg-blue-500 rounded-lg p-3">
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
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </div>
          </div>
        </div>

        <div className="p-8">
          {/* File Upload Section */}
          <div className="mb-8">
            <div className="border-2 border-dashed border-gray-300 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors duration-200 p-8 text-center">
              <svg
                className="mx-auto h-12 w-12 text-gray-400 mb-4"
                stroke="currentColor"
                fill="none"
                viewBox="0 0 48 48"
              >
                <path
                  d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>

              <label htmlFor="csv-upload" className="cursor-pointer block">
                <span className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200 shadow-sm">
                  <svg
                    className="w-5 h-5 mr-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                    />
                  </svg>
                  Choose CSV File
                </span>
                <input
                  id="csv-upload"
                  type="file"
                  accept=".csv"
                  onChange={handleCSVUpload}
                  className="sr-only"
                />
              </label>
              <p className="mt-3 text-sm text-gray-500">Supports .csv files only</p>
            </div>

            {/* File Info */}
            {fileName && (
              <div className="mt-4 p-4 bg-white border border-gray-200 rounded-lg shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <svg
                      className="h-5 w-5 text-green-500 mr-3"
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
                    <div>
                      <p className="font-medium text-gray-900">{fileName}</p>
                      <p className="text-sm text-gray-500">{csvData.length} records found</p>
                    </div>
                  </div>
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    Ready to Upload
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Data Preview */}
          {columns.length > 0 && (
            <div className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Data Preview</h3>
                <span className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                  Showing {Math.min(csvData.length, 5)} of {csvData.length} records
                </span>
              </div>

              <div className="border border-gray-200 rounded-lg overflow-hidden shadow-sm">
                <div className="overflow-x-auto max-h-96">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        {columns.map((col) => (
                          <th
                            key={col}
                            className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-200"
                          >
                            {col}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {csvData.slice(0, 5).map((row, i) => (
                        <tr key={i} className="hover:bg-gray-50 transition-colors duration-150">
                          {columns.map((col) => (
                            <td key={col} className="px-4 py-3 text-gray-700 whitespace-nowrap">
                              {row[col] || <span className="text-gray-400 italic">empty</span>}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Upload Button */}
          <div className="flex justify-center item-center gap-2">
            <button
              onClick={handleUpload}
              disabled={uploading || csvData.length === 0}
              className={`inline-flex items-center px-8 py-4 border border-transparent text-lg font-medium rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200 ${
                uploading || csvData.length === 0
                  ? 'bg-gray-400 cursor-not-allowed text-gray-200'
                  : 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg hover:shadow-xl transform hover:-translate-y-0.5'
              }`}
            >
              {uploading ? (
                <>
                  <svg
                    className="animate-spin -ml-1 mr-3 h-6 w-6 text-white"
                    xmlns="http://www.w3.org/2000/svg"
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
                  Uploading Accessories...
                </>
              ) : (
                <>
                  <svg
                    className="w-6 h-6 mr-3"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                    />
                  </svg>
                  Upload {csvData.length} Accessories
                </>
              )}
            </button>
            <a href="/accessory.csv" className="py-2 px-4 rounded-md bg-blue-400 text-white  ">
              Download Sample
            </a>
          </div>

          {/* Message Display */}
          {/* {message.text && (
                        <div className={getMessageStyles(message.type)}>
                            {getMessageIcon(message.type)}
                            <span className="font-medium">{message.text}</span>
                        </div>
                    )} */}

          <div>
            <span>{message.insertedCount}</span>
          </div>

          {/* Help Section */}
          <div className="mt-8 pt-6 border-t border-gray-200">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Expected CSV Format</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
              <div className="space-y-2">
                <div className="flex items-center">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
                  <span>
                    <strong>Style Number:</strong> Numeric style identifier
                  </span>
                </div>
                <div className="flex items-center">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
                  <span>
                    <strong>Accessory 1:</strong> Accessory number
                  </span>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
                  <span>
                    <strong>Access. 1 Name:</strong> Accessory name
                  </span>
                </div>
                <div className="flex items-center">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
                  <span>
                    <strong>Access. 1 Type:</strong> Accessory type/category
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AccessoryCsvUploader;
