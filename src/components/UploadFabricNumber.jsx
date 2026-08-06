import React, { useState } from 'react';
import Papa from 'papaparse';
import { BASE_URL } from '../constant/index.js';
const StyleUploader = () => {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [fileName, setFileName] = useState('');
  const [progress, setProgress] = useState(0);

  const API_BASE_URL = `${BASE_URL}`;

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

  const fixValue = (v) => {
    if (v === undefined || v === null) return null;
    if (v === '') return null;
    return v;
  };

  const handleUpload = () => {
    if (!file) {
      alert('Please select a CSV file first!');
      return;
    }

    setUploading(true);
    setProgress(0);

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
          const formattedData = results.data.map((row) => {
            const fabrics = [];
            for (let i = 1; i <= 3; i++) {
              const fno = fixValue(row[`Fabric ${i}`]);
              const fname = fixValue(row[`Fabric ${i} Name`]);
              const fimg = fixValue(row[`Fabric ${i} Image`]);

              if (fno || fname || fimg) {
                fabrics.push({
                  fabric_no: Number(fno) || null, // number type
                  fabric_name: fname,
                  fabric_image: fimg,
                });
              }
            }

            const accessories = [];
            for (let i = 1; i <= 3; i++) {
              const acc = fixValue(row[`Accessory ${i}`]);
              if (acc) accessories.push({ name: acc });
            }

            return {
              styleNumber: Number(fixValue(row['Style Number'])) || null, // number type
              patternNumber: fixValue(row['Pattern Number']),
              styleImage: fixValue(row['Style Image']),
              fabrics,
              accessories,
            };
          });

          // 🔥 FINAL FIX → proper body
          const response = await fetch(`${API_BASE_URL}/style-details`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              styles: formattedData,
            }),
          });

          const resData = await response.json();
          console.log('UPLOADED DATA', resData);

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
    document.getElementById('style-file-input').value = '';
  };

  return (
    <div className="max-w-2xl mx-auto mt-10 p-8 bg-white border border-gray-200 rounded-2xl  transition-all duration-300">
      {/* Header Section */}
      <div className="text-center mb-8">
        <div className="w-20 h-20 bg-gradient-to-br from-purple-100 to-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-inner">
          <svg
            className="w-10 h-10 text-purple-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z"
            />
          </svg>
        </div>
        <h2 className="text-3xl font-bold text-gray-800 mb-2">Style Data Upload</h2>
        <p className="text-gray-600 text-lg">
          Upload CSV file containing style details, fabrics, and accessories
        </p>
        <div>
          <a
            className="bg-gradient-to-r from-purple-500 to-blue-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:from-purple-600 hover:to-blue-600 top-2 relative transition-all duration-200"
            href="/style_upload_sample.csv"
          >
            Download Sample
          </a>
        </div>
      </div>

      {/* File Upload Section */}
      <div className="space-y-6">
        <div className="bg-gray-50 rounded-xl p-6 border-2 border-dashed border-gray-200 transition-colors duration-200 hover:border-purple-300">
          <label className="block text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">
            Select Style CSV File
          </label>

          <div className="flex items-center space-x-4">
            <label className="flex-1 cursor-pointer">
              <input
                id="style-file-input"
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                className="hidden"
              />
              <div className="flex items-center justify-between p-4 bg-white rounded-lg border border-gray-300 hover:border-purple-400 transition-colors duration-200">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                    <svg
                      className="w-5 h-5 text-purple-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                  </div>
                  <div>
                    <p className="font-medium text-gray-800 truncate max-w-xs">
                      {fileName || 'No file selected'}
                    </p>
                    <p className="text-sm text-gray-500">Click to browse your files</p>
                  </div>
                </div>
                <div className="bg-gradient-to-r from-purple-500 to-blue-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:from-purple-600 hover:to-blue-600 transition-all duration-200">
                  Choose File
                </div>
              </div>
            </label>

            {file && !uploading && (
              <button
                onClick={handleCancel}
                className="p-3 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all duration-200"
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
          <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
            <div className="flex justify-between text-sm font-medium text-gray-700 mb-3">
              <span>Processing Styles...</span>
              <span>{progress}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className="bg-gradient-to-r from-purple-500 to-blue-500 h-3 rounded-full transition-all duration-500 ease-out shadow-sm"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Uploading style data, fabrics, and accessories...
            </p>
          </div>
        )}

        {/* Upload Button */}
        <button
          onClick={handleUpload}
          disabled={uploading || !file}
          className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white px-8 py-4 rounded-xl font-semibold text-lg hover:from-purple-700 hover:to-blue-700 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] shadow-lg hover:shadow-xl"
        >
          {uploading ? (
            <div className="flex items-center justify-center space-x-3">
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              <span>Processing Style Data...</span>
            </div>
          ) : (
            'Upload Style Data'
          )}
        </button>

        {/* Success Message */}
        {result && (
          <div className="mt-6 bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-2xl p-6 animate-fade-in">
            <div className="flex items-start space-x-4">
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <svg className="w-6 h-6 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-green-800 text-xl mb-2">Style Upload Successful!</h3>
                <div className="grid grid-cols-3 gap-6">
                  <div className="text-center bg-white rounded-lg p-3 shadow-sm">
                    <p className="text-green-600 font-bold text-2xl">{result.total}</p>
                    <p className="text-green-700 font-medium">Total Styles</p>
                  </div>
                  <div className="text-center bg-white rounded-lg p-3 shadow-sm">
                    <p className="text-green-600 font-bold text-2xl">{result.inserted}</p>
                    <p className="text-green-700 font-medium">New Styles</p>
                  </div>
                  <div className="text-center bg-white rounded-lg p-3 shadow-sm">
                    <p className="text-green-600 font-bold text-2xl">{result.updated}</p>
                    <p className="text-green-700 font-medium">Updated</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mt-6 bg-gradient-to-br from-red-50 to-pink-50 border border-red-200 rounded-2xl p-6 animate-fade-in">
            <div className="flex items-start space-x-4">
              <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <svg className="w-6 h-6 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div>
                <h3 className="font-bold text-red-800 text-xl mb-1">Upload Failed</h3>
                <p className="text-red-700">{error}</p>
                <button
                  onClick={() => setError(null)}
                  className="mt-3 text-red-600 hover:text-red-800 text-sm font-medium transition-colors duration-200"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Help Text */}
        <div className="text-center pt-4 border-t border-gray-100">
          <p className="text-sm text-gray-500">
            Expected columns: Style Number, Pattern Number, Style Image, Fabric 1-3, Fabric 1-3
            Name, Fabric 1-3 Image, Accessory 1-3
          </p>
        </div>
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
          animation: fade-in 0.4s ease-out;
        }
      `}</style>
    </div>
  );
};

export default StyleUploader;
