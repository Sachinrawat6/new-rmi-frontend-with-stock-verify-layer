import React, { useState } from 'react';
import Papa from 'papaparse';
import axios from 'axios';
import { BASE_URL } from '../constant/index.js';

const StyleCsvUploader = () => {
  const [csvData, setCsvData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [fileName, setFileName] = useState('');

  const API_URL = `${BASE_URL}`;

  // 🧩 Handle CSV Upload
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setFileName(file.name);
    setMessage('');

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (result) => {
        setCsvData(result.data);
        console.log('Parsed CSV Data:', result.data);
      },
      error: (error) => {
        setMessage('Error parsing CSV file');
        console.error('CSV Parse Error:', error);
      },
    });
  };

  // 🧩 Convert CSV rows to backend payload format
  const transformData = () => {
    return csvData.map((row) => {
      const fabrics = [];
      const accessories = [];

      // Collect up to 3 fabrics
      for (let i = 1; i <= 3; i++) {
        if (row[`Fabric ${i}`]) {
          fabrics.push({
            fabric_no: Number(row[`Fabric ${i}`]),
            fabric_name: row[`Fabric ${i} Name`] || '',
            fabric_image: row[`Fabric ${i} Image`] || '',
          });
        }
      }

      // Collect up to 2 accessories
      for (let i = 1; i <= 2; i++) {
        if (row[`Accessory ${i}`]) {
          accessories.push({
            accessory_no: `A-${row[`Accessory ${i}`]}`,
            accessory_name: row[`Access. ${i} Name`] || '',
            accessory_type: row[`Access. ${i} Type`] || '',
            accessory_image: row[`Access. ${i} Image`] || '',
          });
        }
      }

      return {
        styleNumber: Number(row['Style Number']),
        patternNumber: row['Pattern Number'],
        articleType: row['Article Type'],
        styleImage: row['Style Image'],
        fabrics,
        accessories,
      };
    });
  };

  // 🧩 Send data to backend API
  const handleUpload = async () => {
    try {
      if (csvData.length === 0) {
        setMessage('Please upload a CSV file first.');
        return;
      }

      const payload = transformData();

      setLoading(true);
      setMessage('');

      const res = await axios.post(`${API_URL}/style-details/`, { styles: payload });

      setLoading(false);
      setMessage(res.data.message || 'Upload successful!');
    } catch (error) {
      console.error(error);
      setLoading(false);
      // Safely handle different error response formats
      const errorMessage =
        error.response?.data?.message ||
        error.response?.data?.error ||
        error.message ||
        'Upload failed. Please try again.';
      setMessage(errorMessage);
    }
  };

  // 🧩 Helper function to safely check message content
  const getMessageType = () => {
    if (!message) return '';
    const messageString = String(message).toLowerCase();
    if (messageString.includes('success') || messageString.includes('ready')) {
      return 'success';
    }
    if (messageString.includes('error') || messageString.includes('fail')) {
      return 'error';
    }
    return 'info';
  };

  const messageType = getMessageType();
  return (
    <div className="max-w-4xl mx-auto mt-8 p-8 border border-gray-200 rounded-xl shadow-lg bg-white">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Style Data Upload</h1>
        <p className="text-gray-600">
          Upload CSV files containing style, fabric, and accessory information
        </p>
      </div>

      {/* File Upload Card */}
      <div className="mb-8 p-6 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors duration-200">
        <div className="text-center">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
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
          <div className="mt-4">
            <label htmlFor="file-upload" className="cursor-pointer">
              <span className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200">
                Choose CSV File
              </span>
              <input
                id="file-upload"
                name="file-upload"
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                className="sr-only"
              />
            </label>
            <p className="mt-2 text-sm text-gray-500">CSV files only</p>
          </div>
        </div>

        {/* File Name Display */}
        {fileName && (
          <div className="mt-4 p-3 bg-white rounded-md border border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <svg
                  className="h-5 w-5 text-green-500"
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
                <span className="ml-2 text-sm font-medium text-gray-700 truncate">{fileName}</span>
              </div>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                Ready
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Status Information */}
      {csvData.length > 0 && (
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center">
            <svg
              className="h-5 w-5 text-blue-500 mr-2"
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
              <p className="text-sm font-medium text-blue-800">
                ✅ {csvData.length} records parsed successfully
              </p>
              <p className="text-xs text-blue-600 mt-1">Ready to upload to the server</p>
            </div>
          </div>
        </div>
      )}

      {/* Upload Button */}
      <div className="flex justify-center items-center gap-4">
        <button
          onClick={handleUpload}
          disabled={loading || csvData.length === 0}
          className={`inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200 ${
            loading || csvData.length === 0
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700'
          }`}
        >
          {loading ? (
            <>
              <svg
                className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
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
              Uploading...
            </>
          ) : (
            <>
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                />
              </svg>
              Upload to Server
            </>
          )}
        </button>
        <a
          className="bg-gradient-to-r from-purple-500 to-blue-500 text-white px-4 py-3 rounded-lg text-sm font-medium hover:from-purple-600 hover:to-blue-600  transition-all duration-200"
          href="/style_upload_sample.csv"
        >
          Download Sample
        </a>
      </div>

      {/* Message Display */}
      {message && (
        <div
          className={`mt-6 p-4 rounded-lg ${
            messageType === 'success'
              ? 'bg-green-50 border border-green-200 text-green-800'
              : messageType === 'error'
                ? 'bg-red-50 border border-red-200 text-red-800'
                : 'bg-blue-50 border border-blue-200 text-blue-800'
          }`}
        >
          <div className="flex items-center">
            {messageType === 'success' ? (
              <svg
                className="h-5 w-5 text-green-500 mr-2"
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
            ) : messageType === 'error' ? (
              <svg
                className="h-5 w-5 text-red-500 mr-2"
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
            ) : (
              <svg
                className="h-5 w-5 text-blue-500 mr-2"
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
            )}
            <p className="text-sm font-medium flex gap-3">
              <span className="py-2 px-4 rounded-md bg-blue-400 text-white">
                {' '}
                Matched : {message?.matchedCount}{' '}
              </span>
              <span className="py-2 px-4 rounded-md bg-yellow-400 text-white">
                {' '}
                Modified : {message?.modifiedCount}{' '}
              </span>
              <span className="py-2 px-4 rounded-md bg-green-400 text-white">
                Upserted : {message?.upsertedCount}{' '}
              </span>
            </p>
          </div>
        </div>
      )}

      {/* Help Text */}
      <div className="mt-8 pt-6 border-t border-gray-200">
        <h3 className="text-sm font-medium text-gray-900 mb-2">Expected CSV Format</h3>
        <div className="text-xs text-gray-600 space-y-1">
          <p>• Required columns: Style Number, Pattern Number, Article Type, Style Image</p>
          <p>• Fabric columns: Fabric 1, Fabric 1 Name, Fabric 1 Image (up to 3 fabrics)</p>
          <p>
            • Accessory columns: Accessory 1, Access. 1 Name, Access. 1 Type, Access. 1 Image (up to
            2 accessories)
          </p>
        </div>
      </div>
    </div>
  );
};

export default StyleCsvUploader;
