import { useState } from 'react';
import cronService from '../service/cron.service.js';

const Setting = () => {
  const [syncing, setSyncing] = useState(false);
  const [response, setResponse] = useState(null);
  const [error, setError] = useState(null);
  const [syncingCollectionName, setSyncingCollectionName] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const resetState = () => {
    setError(null);
    setSuccessMessage('');
    setResponse(null);
  };

  const handleSyncStyleAverages = async () => {
    try {
      resetState();
      setSyncing(true);
      setSyncingCollectionName('Average Collection');
      const res = await cronService.syncFabricAverage();
      console.log('response', res);
      setResponse(res?.data);
      setSuccessMessage('Averages synced successfully!');
    } catch (err) {
      setError(err.message || 'Failed to sync averages. Please try again.');
    } finally {
      setSyncing(false);
      setSyncingCollectionName('');
    }
  };

  const handleStyleAndFabricMapping = async () => {
    try {
      resetState();
      setSyncing(true);
      setSyncingCollectionName('Style & Fabric Mapping');
      const res = await cronService.syncFabricAndStyleMapping();
      console.log('style and fabric mapping', res);
      setResponse(res?.data);
      setSuccessMessage('Style and fabric mapping synced successfully!');
    } catch (err) {
      setError(err.message || 'Failed to sync style and fabric mapping.');
    } finally {
      setSyncing(false);
      setSyncingCollectionName('');
    }
  };

  const handleStylePatternAndFabricMapping = async () => {
    try {
      resetState();
      setSyncing(true);
      setSyncingCollectionName('Style Pattern & Fabric Mapping');
      const res = await cronService.syncFabricPatternAndStyles();
      console.log('style pattern and fabric mapping', res);
      setResponse(res?.data);
      setSuccessMessage('Style pattern and fabric mapping synced successfully!');
    } catch (err) {
      setError(err.message || 'Failed to sync style pattern and fabric mapping.');
    } finally {
      setSyncing(false);
      setSyncingCollectionName('');
    }
  };

  const isButtonSyncing = (name) => syncing && syncingCollectionName === name;

  return (
    <div className="  py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-xl font-semibold text-gray-900">Settings</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage data synchronization and mappings</p>
        </div>

        {/* Card */}
        <div className="bg-white border border-gray-200 rounded-lg">
          <div className="px-5 py-5 space-y-5">
            {/* Status Messages */}
            {error && (
              <div className="border border-red-200 bg-red-50 rounded-md px-4 py-3">
                <p className="text-sm font-medium text-red-800">Error</p>
                <p className="text-sm text-red-700 mt-0.5">{error}</p>
              </div>
            )}

            {successMessage && !error && (
              <div className="border border-green-200 bg-green-50 rounded-md px-4 py-3">
                <p className="text-sm font-medium text-green-800">Success</p>
                <p className="text-sm text-green-700 mt-0.5">{successMessage}</p>
              </div>
            )}

            {syncing && (
              <div className="border border-blue-200 bg-blue-50 rounded-md px-4 py-3 flex items-center gap-2">
                <svg
                  className="animate-spin h-4 w-4 text-blue-600 flex-shrink-0"
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
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                <p className="text-sm text-blue-800">
                  {syncingCollectionName} — syncing, please wait...
                </p>
              </div>
            )}

            {/* Response Data */}
            {response?.matched && (
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">
                  Response
                </p>
                <pre className="text-xs text-gray-700 bg-gray-50 border border-gray-200 rounded-md p-3 overflow-x-auto">
                  {JSON.stringify(response, null, 2)}
                </pre>
              </div>
            )}

            {/* Divider */}
            <div className="border-t border-gray-100" />

            {/* Action Buttons */}
            <div className="space-y-2.5">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                Sync Actions
              </p>

              <button
                onClick={handleSyncStyleAverages}
                disabled={syncing}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-md
                  border border-gray-300 bg-white text-sm font-medium text-gray-800
                  hover:bg-gray-50 focus:outline-none focus:ring-1 focus:ring-gray-400
                  disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
              >
                {isButtonSyncing('Average Collection') ? (
                  <>
                    <svg
                      className="animate-spin h-4 w-4"
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
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    Syncing...
                  </>
                ) : (
                  'Sync Averages'
                )}
              </button>

              <button
                onClick={handleStyleAndFabricMapping}
                disabled={syncing}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-md
                  border border-gray-300 bg-white text-sm font-medium text-gray-800
                  hover:bg-gray-50 focus:outline-none focus:ring-1 focus:ring-gray-400
                  disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
              >
                {isButtonSyncing('Style & Fabric Mapping') ? (
                  <>
                    <svg
                      className="animate-spin h-4 w-4"
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
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    Syncing...
                  </>
                ) : (
                  'Sync Style And Fabric Mapping'
                )}
              </button>

              <button
                onClick={handleStylePatternAndFabricMapping}
                disabled={syncing}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-md
                  border border-gray-300 bg-white text-sm font-medium text-gray-800
                  hover:bg-gray-50 focus:outline-none focus:ring-1 focus:ring-gray-400
                  disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
              >
                {isButtonSyncing('Style Pattern & Fabric Mapping') ? (
                  <>
                    <svg
                      className="animate-spin h-4 w-4"
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
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    Syncing...
                  </>
                ) : (
                  'Sync Style Pattern & Fabric Mapping'
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Setting;
