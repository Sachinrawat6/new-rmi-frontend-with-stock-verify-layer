import React, { useState } from "react";
import Papa from "papaparse";
import axios from "axios";
import { FiUpload, FiFile, FiCheckCircle, FiAlertCircle } from "react-icons/fi";

const copyofUploadStock = () => {
  const [csvData, setCsvData] = useState([]);
  const [uploadStatus, setUploadStatus] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState([]);
  const [fileName, setFileName] = useState("");

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setFileName(file.name);
    setUploadStatus(null);
    setErrors([]);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      transform: (value) => value.trim(),
      complete: (results) => {
        if (results.errors.length > 0) {
          setErrors(results.errors.map(err => `Row ${err.row}: ${err.message}`));
          return;
        }
        setCsvData(results.data);
      },
      error: (error) => {
        setErrors([`CSV parsing error: ${error.message}`]);
      }
    });
  };

  const handleUpload = async () => {
    if (csvData.length === 0) {
      setErrors(["Please upload a valid CSV file first"]);
      return;
    }

    setIsLoading(true);
    setUploadStatus(null);
    setErrors([]);

    let successCount = 0;
    const failedRows = [];

    try {
      // Process in batches of 10
      for (let i = 0; i < csvData.length; i += 10) {
        const batch = csvData.slice(i, i + 10);
        const results = await Promise.allSettled(
          batch.map(row => 
            axios.post("http://localhost:5000/api/v1/stock/create", row, {
              headers: { 'Content-Type': 'application/json' },
              timeout: 5000
            })
          )
        );

        results.forEach((result, index) => {
          if (result.status === "fulfilled") {
            successCount++;
          } else {
            failedRows.push({
              row: i + index + 1,
              error: result.reason.response?.data?.message || "Upload failed"
            });
          }
        });
      }

      if (failedRows.length > 0) {
        setErrors(failedRows.map(f => `Row ${f.row}: ${f.error}`));
        setUploadStatus({
          type: "partial",
          message: `Upload complete: ${successCount} succeeded, ${failedRows.length} failed`
        });
      } else {
        setUploadStatus({
          type: "success",
          message: `Successfully uploaded ${successCount} records`
        });
        setCsvData([]);
        setFileName("");
      }
    } catch (error) {
      setUploadStatus({
        type: "error",
        message: "Failed to process upload"
      });
      setErrors([error.response?.data?.message || "Network error occurred"]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-6 bg-white rounded-xl shadow-sm">
      <div className="mb-8">
        <h2 className="text-2xl font-semibold text-gray-800">Bulk Stock Upload</h2>
        <p className="text-gray-600">Upload inventory using CSV file format</p>
      </div>

      {/* File Upload Card */}
      <div className="border-2 border-dashed border-gray-200 rounded-lg p-6 mb-6 bg-gray-50 hover:bg-gray-100 transition-colors">
        <label className="flex flex-col items-center justify-center cursor-pointer">
          <div className="p-3 bg-blue-100 rounded-full mb-3">
            <FiUpload className="text-blue-600 text-xl" />
          </div>
          <span className="text-blue-600 font-medium">
            {fileName ? fileName : "Select CSV file"}
          </span>
          <span className="text-sm text-gray-500 mt-1">
            {fileName ? "Click to change file" : "Supports .csv files only"}
          </span>
          <input
            type="file"
            accept=".csv"
            onChange={handleFileChange}
            className="hidden"
          />
        </label>
      </div>

      {/* File Info */}
      {csvData.length > 0 && (
        <div className="flex items-center mb-6 p-4 bg-green-50 rounded-lg">
          <FiFile className="text-green-500 mr-3" />
          <div>
            <p className="font-medium text-gray-800">
              {csvData.length} records ready for import
            </p>
            <p className="text-sm text-gray-500">
              {fileName} • {new Date().toLocaleString()}
            </p>
          </div>
        </div>
      )}

      {/* Status Messages */}
      {uploadStatus && (
        <div className={`mb-6 p-4 rounded-lg ${
          uploadStatus.type === "success" 
            ? "bg-green-50 text-green-700" 
            : uploadStatus.type === "error" 
              ? "bg-red-50 text-red-700" 
              : "bg-yellow-50 text-yellow-700"
        }`}>
          <div className="flex items-center">
            {uploadStatus.type === "success" ? (
              <FiCheckCircle className="mr-2" />
            ) : (
              <FiAlertCircle className="mr-2" />
            )}
            <p>{uploadStatus.message}</p>
          </div>
        </div>
      )}

      {/* Error List */}
      {errors.length > 0 && (
        <div className="mb-6 p-4 bg-red-50 rounded-lg">
          <h4 className="font-medium text-red-700 mb-2">Errors:</h4>
          <ul className="text-sm text-red-600 list-disc pl-5 space-y-1">
            {errors.slice(0, 5).map((error, i) => (
              <li key={i}>{error}</li>
            ))}
            {errors.length > 5 && (
              <li className="text-gray-500">
                + {errors.length - 5} more errors...
              </li>
            )}
          </ul>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex space-x-3">
        <button
          onClick={handleUpload}
          disabled={csvData.length === 0 || isLoading}
          className={`px-5 py-2.5 rounded-lg font-medium flex items-center ${
            csvData.length === 0 || isLoading
              ? "bg-gray-300 text-gray-500 cursor-not-allowed"
              : "bg-blue-600 text-white hover:bg-blue-700"
          }`}
        >
          {isLoading ? (
            <>
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Processing...
            </>
          ) : (
            "Upload Stock Data"
          )}
        </button>

        {csvData.length > 0 && (
          <button
            onClick={() => {
              setCsvData([]);
              setFileName("");
              setUploadStatus(null);
              setErrors([]);
            }}
            className="px-5 py-2.5 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50"
          >
            Clear
          </button>
        )}
      </div>

      {/* Help Text */}
      <div className="mt-6 pt-4 border-t border-gray-100">
        <h4 className="text-sm font-medium text-gray-700 mb-2">CSV Format Requirements:</h4>
        <ul className="text-sm text-gray-500 list-disc pl-5 space-y-1">
          <li>Required fields: <code className="bg-gray-100 px-1 rounded">fabricNumber</code>, <code className="bg-gray-100 px-1 rounded">fabricName</code>, <code className="bg-gray-100 px-1 rounded">fabricType</code></li>
          <li>First row must contain headers</li>
          <li>File size limit: 5MB</li>
          <li>Sample CSV: <a href="sample-stock-import.csv" download className="text-blue-600 hover:underline">Download template</a></li>
        </ul>
      </div>
    </div>
  );
};

export default copyofUploadStock;