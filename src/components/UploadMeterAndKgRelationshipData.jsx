import React, { useState } from 'react';
import Papa from 'papaparse';
import { BASE_URL } from '../constant/index.js';
const MeterAndKgUploader = () => {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState(0);
  const [fileName, setFileName] = useState('');

  const API_URL = `${BASE_URL}`;

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      setFileName(selectedFile.name);
      setResult(null);
      setError(null);
      setProgress(0);
    }
  };

  const handleUpload = () => {
    if (!file) {
      alert('Please select a CSV file first!');
      return;
    }

    setUploading(true);
    setProgress(0);

    // Simulate progress for parsing
    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 90) {
          clearInterval(progressInterval);
          return 90;
        }
        return prev + 10;
      });
    }, 200);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        clearInterval(progressInterval);
        setProgress(100);

        try {
          const response = await fetch(`${API_URL}/relation/add-relationship`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(results.data),
          });

          const resData = await response.json();

          if (!response.ok) {
            throw new Error(resData?.message || 'Upload failed');
          }

          setResult(resData.data);
          setError(null);
        } catch (err) {
          setError(err.message);
          setResult(null);
        } finally {
          setUploading(false);
          setTimeout(() => setProgress(0), 2000);
        }
      },
      error: (error) => {
        clearInterval(progressInterval);
        setError('Error parsing CSV file: ' + error.message);
        setUploading(false);
        setProgress(0);
      },
    });
  };

  const handleCancel = () => {
    setFile(null);
    setFileName('');
    setProgress(0);
    setUploading(false);
    setError(null);
    setResult(null);
    // Clear file input
    document.getElementById('file-input').value = '';
  };

  return (
    <div className="max-w-lg mx-auto mt-10 p-8 bg-white border border-gray-200 rounded-xl shadow-lg transition-all duration-300 hover:shadow-xl">
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg
            className="w-8 h-8 text-blue-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
            />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Upload Fabric Data</h2>
        <p className="text-gray-600">Upload your CSV file containing meter and kg relationships</p>
        <div>
          <a
            className="bg-blue-100 text-blue-900 py-2 px-4 rounded-md top-2 relative hover:bg-blue-200 duration-75 ease-in "
            href="/fabric_payload_sample.csv"
          >
            Download Sample
          </a>
        </div>
      </div>

      {/* File Input Section */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">Select CSV File</label>
        <div className="flex items-center space-x-4">
          <label className="flex-1 cursor-pointer">
            <input
              id="file-input"
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="hidden"
            />
            <div className="flex items-center justify-between p-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-400 transition-colors duration-200">
              <span className="text-gray-500 truncate">{fileName || 'Choose a file...'}</span>
              <div className="bg-gray-100 hover:bg-gray-200 px-3 py-1 rounded text-sm font-medium text-gray-700 transition-colors duration-200">
                Browse
              </div>
            </div>
          </label>
          {file && !uploading && (
            <button
              onClick={handleCancel}
              className="p-2 text-gray-500 hover:text-gray-700 transition-colors duration-200"
              title="Remove file"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      {uploading && (
        <div className="mb-6">
          <div className="flex justify-between text-sm text-gray-600 mb-2">
            <span>Uploading...</span>
            <span>{progress}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div
              className="bg-blue-600 h-2.5 rounded-full transition-all duration-300 ease-out"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        </div>
      )}

      {/* Upload Button */}
      <button
        onClick={handleUpload}
        disabled={uploading || !file}
        className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-3 rounded-lg font-medium hover:from-blue-700 hover:to-blue-800 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] shadow-md hover:shadow-lg"
      >
        {uploading ? (
          <div className="flex items-center justify-center space-x-2">
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            <span>Processing...</span>
          </div>
        ) : (
          'Upload Data'
        )}
      </button>

      {/* Success Message */}
      {result && (
        <div className="mt-6 bg-green-50 border border-green-200 rounded-lg p-4 animate-fade-in">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
              <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-green-800">Upload Successful!</h3>
              <div className="grid grid-cols-3 gap-4 mt-2 text-sm">
                <div className="text-center">
                  <p className="text-green-600 font-bold text-lg">{result.total}</p>
                  <p className="text-green-700">Total Records</p>
                </div>
                <div className="text-center">
                  <p className="text-green-600 font-bold text-lg">{result.inserted}</p>
                  <p className="text-green-700">New Inserted</p>
                </div>
                <div className="text-center">
                  <p className="text-green-600 font-bold text-lg">{result.updated}</p>
                  <p className="text-green-700">Updated</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="mt-6 bg-red-50 border border-red-200 rounded-lg p-4 animate-fade-in">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
              <svg className="w-4 h-4 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold text-red-800">Upload Failed</h3>
              <p className="text-red-700 text-sm mt-1">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Help Text */}
      <div className="mt-6 text-center text-sm text-gray-500">
        <p>Supported format: CSV with headers</p>
      </div>

      <style jsx>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fade-in {
          animation: fade-in 0.3s ease-out;
        }
      `}</style>
    </div>
  );
};

export default MeterAndKgUploader;
