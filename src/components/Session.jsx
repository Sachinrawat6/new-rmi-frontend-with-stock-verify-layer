import { Key } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { LOCAL_STORAGE_KEY, BASE_URL } from '../constant/index.js';

const Session = ({ onSessionCreated }) => {
  const [employeeNumber, setEmployeeNumber] = useState('');
  const [source, setSource] = useState('');
  const [savedSession, setSavedSession] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [whitelistCheck, setWhitelistCheck] = useState(null);

  // fetch saved session
  const fetchSession = () => {
    const session = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY)) || {};
    setSavedSession(session);
  };

  useEffect(() => {
    fetchSession();
  }, []);

  // Check if user is whitelisted and active
  const checkWhitelistedUser = async (mobileNumber) => {
    try {
      setIsLoading(true);
      const response = await axios.get(`${BASE_URL}/whitelisted/mobile/${mobileNumber}`);

      if (response.data.success && response.data.data) {
        const user = response.data.data;

        // Check if user is active
        if (!user.isActive) {
          setWhitelistCheck({
            isWhitelisted: true,
            isActive: false,
            user: user,
            error: 'Your account has been deactivated. Please contact admin.',
          });
          toast.error('Your account has been deactivated. Please contact admin.');
          return false;
        }

        // User is whitelisted and active
        setWhitelistCheck({
          isWhitelisted: true,
          isActive: true,
          user: user,
        });
        return true;
      } else {
        setWhitelistCheck({
          isWhitelisted: false,
          isActive: false,
          user: null,
          error: 'Mobile number not found in whitelist',
        });
        toast.error('Access denied. This mobile number is not whitelisted.');
        return false;
      }
    } catch (error) {
      console.error('Whitelist check error:', error);
      setWhitelistCheck({
        isWhitelisted: false,
        isActive: false,
        user: null,
        error: error.response?.data?.message || 'Failed to check whitelist status',
      });
      toast.error(error.response?.data?.message || 'Failed to verify user');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const saveSessionToLocalStorage = async (e) => {
    e.preventDefault();

    // Validate inputs
    if (!employeeNumber || !source) {
      toast.error('Mobile Number and Source are required');
      return;
    }

    // Validate mobile number length (assuming 10 digits)
    if (employeeNumber.toString().length !== 10) {
      toast.error('Please enter a valid 10-digit mobile number');
      return;
    }

    // Check if user is whitelisted and active
    setIsLoading(true);
    const isWhitelisted = await checkWhitelistedUser(employeeNumber);

    if (!isWhitelisted) {
      setIsLoading(false);
      return;
    }

    // If whitelisted and active, create session
    const payload = {
      employeeNumber,
      source,
      sessionId: Date.now(),
      whitelistedUser: whitelistCheck?.user || null,
      totalAddedFabric: 0,
    };

    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(payload));
    setSavedSession(payload);
    fetchSession();
    onSessionCreated();

    toast.success(
      `Welcome ${whitelistCheck?.user?.username || 'User'}! Session started successfully`
    );
    setEmployeeNumber('');
    setSource('');
    setIsLoading(false);
  };

  // End session
  const endSession = () => {
    localStorage.removeItem(LOCAL_STORAGE_KEY);
    setSavedSession(null);
    setWhitelistCheck(null);
    toast.info('Session ended successfully');
  };

  return (
    <div className="flex items-center justify-center p-4">
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        pauseOnHover
        draggable
        theme="light"
      />

      <div className="w-2xl bg-white rounded-2xl border border-gray-100 p-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8 pb-4 border-b border-gray-200">
          <div className="p-2 bg-blue-50 rounded-lg">
            <Key className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Session Management</h1>
            <p className="text-sm text-gray-500">Start or end your working session</p>
          </div>
        </div>

        {/* Active Session Display */}
        {savedSession && Object.keys(savedSession).length > 0 && (
          <div className="mb-6 p-4 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-sm font-medium text-green-700">Active Session</span>
              </div>
              <button
                onClick={endSession}
                className="text-xs font-medium text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 px-3 py-1 rounded-lg transition-colors"
              >
                End Session
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
              <div className="flex flex-col">
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Mobile Number
                </span>
                <span className="font-semibold text-gray-800">{savedSession.employeeNumber}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Source
                </span>
                <span className="font-semibold text-gray-800 capitalize">
                  {savedSession.source}
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Session ID
                </span>
                <span className="font-semibold text-gray-800 text-xs truncate">
                  {savedSession.sessionId}
                </span>
              </div>
            </div>
            {savedSession.whitelistedUser && (
              <div className="mt-3 pt-3 border-t border-green-200">
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-gray-500">User:</span>
                  <span className="font-medium text-gray-700">
                    {savedSession.whitelistedUser.username}
                  </span>
                  <span className="text-gray-300">|</span>
                  <span className="text-gray-500">Role:</span>
                  <span className="font-medium text-gray-700 capitalize">
                    {savedSession.whitelistedUser.role}
                  </span>
                  <span className="text-gray-300">|</span>
                  <span className="text-gray-500">Status:</span>
                  <span
                    className={`font-medium ${savedSession.whitelistedUser.isActive ? 'text-green-600' : 'text-red-600'}`}
                  >
                    {savedSession.whitelistedUser.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Form - Only show if no active session */}
        {(!savedSession || Object.keys(savedSession).length === 0) && (
          <form className="flex flex-col gap-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="relative">
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Mobile Number <span className="text-red-500">*</span>
                </label>
                <input
                  className="w-full py-2.5 px-4 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 hover:border-gray-300 disabled:opacity-50"
                  onChange={(e) => setEmployeeNumber(e.target.value)}
                  type="number"
                  placeholder="Enter your mobile number"
                  value={employeeNumber}
                  disabled={isLoading}
                />
                {whitelistCheck && whitelistCheck.isWhitelisted === false && (
                  <p className="text-xs text-red-500 mt-1">This number is not whitelisted</p>
                )}
                {whitelistCheck && whitelistCheck.isActive === false && whitelistCheck.user && (
                  <p className="text-xs text-red-500 mt-1">
                    ⚠️ Account deactivated. Contact admin.
                  </p>
                )}
              </div>
              <div className="relative">
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Source <span className="text-red-500">*</span>
                </label>
                <select
                  className="w-full py-2.5 px-4 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 hover:border-gray-300 appearance-none cursor-pointer disabled:opacity-50"
                  onChange={(e) => setSource(e.target.value)}
                  value={source}
                  disabled={isLoading}
                >
                  <option value="">Select Source</option>
                  <option value="vendor">Vendor</option>
                  <option value="stock_keeping">Stock Keeping</option>
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 pt-5">
                  <svg
                    className="w-4 h-4 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </div>
              </div>
            </div>

            {/* Whitelist user info */}
            {whitelistCheck && whitelistCheck.isWhitelisted && whitelistCheck.user && (
              <div
                className={`p-3 rounded-lg border ${
                  whitelistCheck.isActive
                    ? 'bg-green-50 border-green-200'
                    : 'bg-red-50 border-red-200'
                }`}
              >
                <div className="flex items-center gap-2">
                  <div
                    className={`w-2 h-2 rounded-full ${
                      whitelistCheck.isActive ? 'bg-green-500' : 'bg-red-500'
                    }`}
                  ></div>
                  <span
                    className={`text-sm font-medium ${
                      whitelistCheck.isActive ? 'text-green-700' : 'text-red-700'
                    }`}
                  >
                    {whitelistCheck.isActive ? 'Whitelisted User Verified' : 'Account Deactivated'}
                  </span>
                </div>
                <div className="flex items-center gap-4 mt-1 text-xs">
                  <span className={whitelistCheck.isActive ? 'text-green-600' : 'text-red-600'}>
                    👤 {whitelistCheck.user.username}
                  </span>
                  <span className={whitelistCheck.isActive ? 'text-green-600' : 'text-red-600'}>
                    🔑 {whitelistCheck.user.role}
                  </span>
                  <span className={whitelistCheck.isActive ? 'text-green-600' : 'text-red-600'}>
                    {whitelistCheck.isActive ? '✅ Active' : '❌ Inactive'}
                  </span>
                </div>
                {whitelistCheck.error && (
                  <p className="text-xs text-red-500 mt-1">{whitelistCheck.error}</p>
                )}
              </div>
            )}

            {/* Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                className="flex-1 bg-gradient-to-r from-blue-500 to-blue-600 text-white py-2.5 px-6 rounded-lg font-medium hover:from-blue-600 hover:to-blue-700 transition-all duration-200 transform hover:scale-[1.02] active:scale-95 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                onClick={saveSessionToLocalStorage}
                disabled={isLoading || !employeeNumber || !source}
              >
                {isLoading ? (
                  <>
                    <svg
                      className="animate-spin h-5 w-5 text-white"
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
                    Verifying...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M13 10V3L4 14h7v7l9-11h-7z"
                      />
                    </svg>
                    Start Session
                  </>
                )}
              </button>
            </div>

            {/* Help text */}
            <p className="text-xs text-gray-400 text-center mt-2">
              Enter your mobile number to verify whitelist status and start your session
            </p>
          </form>
        )}
      </div>
    </div>
  );
};

export default Session;
