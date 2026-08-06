import React, { useState } from 'react';
import Papa from 'papaparse';
import axios from 'axios';
import { BASE_URL } from '../constant/index.js';

const FabricUpload = () => {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [response, setResponse] = useState(null);
  const [fileName, setFileName] = useState('');
  const [progress, setProgress] = useState(0);
  const [currentStage, setCurrentStage] = useState('');

  // const BASE_URL = 'https://raw-material-backend.onrender.com';
  // const BASE_URL = "http://localhost:5000"
  // File select handler
  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    setFile(selectedFile);
    setFileName(selectedFile ? selectedFile.name : '');
    setProgress(0);
    setResponse(null);
  };

  // Parse & Transform
  const handleUpload = async () => {
    if (!file) {
      alert('Please select a CSV file first!');
      return;
    }

    setUploading(true);
    setProgress(0);
    setCurrentStage('Parsing CSV file...');

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        try {
          setProgress(30);
          setCurrentStage('Transforming data...');

          const transformed = results.data.map((row) => {
            // --- Fabrics ---
            const fabrics = [];
            for (let i = 1; i <= 3; i++) {
              if (row[`Fabric ${i} XXS-XS`] || row[`Fabric ${i} S-M`]) {
                fabrics.push({
                  average_xxs_xs: Number(row[`Fabric ${i} XXS-XS`] || 0),
                  average_s_m: Number(row[`Fabric ${i} S-M`] || 0),
                  average_l_xl: Number(row[`Fabric ${i} L-XL`] || 0),
                  average_2xl_3xl: Number(row[`Fabric ${i} 2XL-3XL`] || 0),
                  average_4xl_5xl: Number(row[`Fabric ${i} 4XL-5XL`] || 0),
                  width: row[`Fabric ${i} Width`] || 'Normal',
                });
              }
            }

            // --- Accessories ---
            const accessories = [];
            for (let j = 1; j <= 3; j++) {
              if (row[`Accessory ${j} XXS-M`] || row[`Accessory ${j} L-5XL`]) {
                accessories.push({
                  average_xxs_m: Number(row[`Accessory ${j} XXS-M`] || 0),
                  average_l_5xl: Number(row[`Accessory ${j} L-5XL`] || 0),
                });
              }
            }

            return {
              style_number: Number(row['Style Number']),
              patternNumber: row['Pattern #'],
              styleImage: row['Style Image'],
              fabrics,
              accessories,
            };
          });

          setProgress(60);
          setCurrentStage('Uploading to server...');

          // --- Send to backend ---
          const res = await axios.post(`${BASE_URL}/average/add-fabric-avg`, transformed, {
            // withCredentials: true,
            onUploadProgress: (progressEvent) => {
              const percentCompleted = Math.round(
                (progressEvent.loaded * 100) / progressEvent.total
              );
              setProgress(60 + percentCompleted * 0.4); // 60-100% for upload
            },
          });

          setProgress(100);
          setCurrentStage('Processing complete!');

          setTimeout(() => {
            setResponse(res.data);
            setUploading(false);
            setProgress(0);
            setCurrentStage('');
          }, 500);
        } catch (err) {
          console.error(err);
          setCurrentStage('Error occurred!');
          setProgress(0);
          alert('Error uploading file');
          setUploading(false);
        }
      },
    });
  };

  const totalProcessed = response ? response.data.addedCount + response.data.updatedCount : 0;
  const totalRecords = response?.data.results?.length || 0;
  const successRate = totalRecords > 0 ? Math.round((totalProcessed / totalRecords) * 100) : 0;

  return (
    <div className="max-w-4xl mx-auto bg-white rounded-xl border border-gray-200 shadow-lg">
      {/* Header */}
      <div className="px-8 py-6 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold text-gray-900">Fabric Patterns & Averages Upload</h2>
            <p className="text-sm text-gray-600 mt-2">
              Upload CSV files containing fabric pattern data and size averages
            </p>
          </div>
          <div className="bg-blue-100 rounded-full p-3">
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
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-8 space-y-8">
        {/* File Upload Area */}
        <div className="bg-gray-50 rounded-2xl p-6 border-2 border-dashed border-gray-200 hover:border-blue-300 transition-all duration-300">
          <label className="block text-sm font-semibold text-gray-700 mb-4 uppercase tracking-wide">
            Select CSV File
          </label>
          <div className="flex flex-col items-center justify-center space-y-4">
            <label className="w-full cursor-pointer">
              <input type="file" accept=".csv" onChange={handleFileChange} className="hidden" />
              <div className="flex flex-col items-center justify-center py-8 px-4 bg-white rounded-xl border-2 border-gray-300 border-dashed hover:border-blue-400 transition-colors">
                <div className="text-blue-500 mb-3">
                  <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                    />
                  </svg>
                </div>
                <span className="text-lg font-medium text-gray-700 text-center">
                  {fileName ? fileName : 'Choose file or drag and drop'}
                </span>
                <p className="text-sm text-gray-500 mt-2">CSV files only (Max. 10MB)</p>
              </div>
            </label>

            {fileName && (
              <div className="flex items-center space-x-2 bg-green-50 px-4 py-2 rounded-full">
                <svg
                  className="w-4 h-4 text-green-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                <span className="text-sm font-medium text-green-700">File selected</span>
              </div>
            )}
          </div>
        </div>

        {/* Progress Bar */}
        {uploading && (
          <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-gray-700">{currentStage}</span>
              <span className="text-sm font-bold text-blue-600">{progress}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
              <div
                className="bg-gradient-to-r from-blue-500 to-purple-600 h-3 rounded-full transition-all duration-500 ease-out"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
            <div className="grid grid-cols-4 gap-2 mt-2">
              {[0, 30, 60, 100].map((step) => (
                <div
                  key={step}
                  className={`text-xs text-center ${
                    progress >= step ? 'text-blue-600 font-semibold' : 'text-gray-400'
                  }`}
                >
                  {step === 0 && 'Start'}
                  {step === 30 && 'Parsing'}
                  {step === 60 && 'Uploading'}
                  {step === 100 && 'Complete'}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-between items-center">
          <a
            href="/fabric_average_sample.csv"
            className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-xl text-sm font-semibold hover:from-purple-600 hover:to-blue-600 transition-all duration-200 shadow-md hover:shadow-lg"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 10v6m0 0l-3-3m3 3l3-3m-9 1V8a2 2 0 012-2h10a2 2 0 012 2v8a2 2 0 01-2 2H7a2 2 0 01-2-2z"
              />
            </svg>
            Download Sample CSV
          </a>

          <button
            onClick={handleUpload}
            disabled={uploading || !file}
            className="inline-flex items-center px-8 py-4 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl text-base font-semibold hover:from-green-600 hover:to-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 disabled:transform-none"
          >
            {uploading ? (
              <>
                <svg
                  className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
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
                Processing...
              </>
            ) : (
              <>
                <svg className="w-6 h-6 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                  />
                </svg>
                Upload File
              </>
            )}
          </button>
        </div>

        {/* Response Display */}
        {response && (
          <div className="mt-6 animate-fade-in">
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl p-8 border border-green-200 shadow-sm">
              {/* Success Header */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center">
                  <div className="bg-green-100 rounded-full p-3 mr-4">
                    <svg
                      className="w-8 h-8 text-green-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-green-900">Upload Successful!</h3>
                    <p className="text-green-700">
                      Your fabric data has been processed successfully
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-3xl font-bold text-green-600">{successRate}%</div>
                  <div className="text-sm text-green-700">Success Rate</div>
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-6">
                <div className="bg-white rounded-xl p-5 border-l-4 border-green-500 shadow-sm">
                  <div className="text-3xl font-bold text-green-600 mb-1">
                    {response.data.addedCount}
                  </div>
                  <div className="text-sm font-semibold text-green-700">New Records</div>
                  <div className="text-xs text-green-500">Successfully inserted</div>
                </div>

                <div className="bg-white rounded-xl p-5 border-l-4 border-blue-500 shadow-sm">
                  <div className="text-3xl font-bold text-blue-600 mb-1">
                    {response.data.updatedCount}
                  </div>
                  <div className="text-sm font-semibold text-blue-700">Updated Records</div>
                  <div className="text-xs text-blue-500">Existing records modified</div>
                </div>

                <div className="bg-white rounded-xl p-5 border-l-4 border-purple-500 shadow-sm">
                  <div className="text-3xl font-bold text-purple-600 mb-1">{totalRecords}</div>
                  <div className="text-sm font-semibold text-purple-700">Total Processed</div>
                  <div className="text-xs text-purple-500">Records in file</div>
                </div>

                <div className="bg-white rounded-xl p-5 border-l-4 border-amber-500 shadow-sm">
                  <div className="text-3xl font-bold text-amber-600 mb-1">{totalProcessed}</div>
                  <div className="text-sm font-semibold text-amber-700">Records Affected</div>
                  <div className="text-xs text-amber-500">Total changes made</div>
                </div>
              </div>

              {/* Progress Visualization */}
              <div className="bg-white rounded-xl p-6 mb-6 border border-gray-200">
                <div className="flex justify-between text-sm font-medium text-gray-700 mb-3">
                  <span>Processing Summary</span>
                  <span>
                    {totalProcessed} of {totalRecords} records
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-green-400 to-emerald-500 h-4 rounded-full transition-all duration-1000"
                    style={{ width: `${successRate}%` }}
                  ></div>
                </div>
              </div>

              {/* Detailed Results */}
              {response?.data.results && (
                <div className="mt-4">
                  <details className="group">
                    <summary className="flex items-center justify-between p-4 bg-white rounded-xl border border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors">
                      <span className="font-semibold text-gray-700">View Detailed Results</span>
                      <svg
                        className="w-5 h-5 text-gray-400 transition-transform group-open:rotate-180"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 9l-7 7-7-7"
                        />
                      </svg>
                    </summary>
                    <div className="mt-3 p-4 bg-gray-50 rounded-xl border border-gray-200">
                      <pre className="text-xs text-gray-700 whitespace-pre-wrap overflow-x-auto max-h-80">
                        {JSON.stringify(response.data.results, null, 2)}
                      </pre>
                    </div>
                  </details>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-8 py-4 bg-gradient-to-r from-gray-50 to-white rounded-b-xl border-t border-gray-200">
        <div className="flex items-center justify-between text-sm text-gray-500">
          <span>Supported format: CSV with fabric pattern data</span>
          <span>Maximum file size: 10MB</span>
        </div>
      </div>
    </div>
  );
};

export default FabricUpload;
