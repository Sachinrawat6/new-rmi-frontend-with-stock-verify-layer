import React, { useEffect, useState } from 'react';
import StockKeepingWithStyleNumber from './StockKeepingWithStyleNumber';
import AddStockWithStyleNumber from './AddStockWithStyleNumber';
import { BASE_URL, LOCAL_STORAGE_KEY } from '../constant/index.js';
import Session from '../components/Session.jsx';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const OPERATIONS = [
  {
    value: 'vendor',
    label: 'Add Stock',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z"
        />
      </svg>
    ),
    color: 'teal',
  },
  {
    value: 'stock_keeping',
    label: 'Stock Keeping',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
        />
      </svg>
    ),
    color: 'orange',
  },
];

const colorMap = {
  emerald: {
    card: 'border-emerald-200 bg-emerald-50',
    icon: 'bg-emerald-100 text-emerald-600',
    iconActive: 'bg-emerald-600 text-white',
    badge: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    dot: 'bg-emerald-500',
    ring: 'ring-emerald-500',
    title: 'text-emerald-700',
  },
  teal: {
    card: 'border-teal-200 bg-teal-50',
    icon: 'bg-teal-100 text-teal-600',
    iconActive: 'bg-teal-600 text-white',
    badge: 'bg-teal-100 text-teal-700 border-teal-200',
    dot: 'bg-teal-500',
    ring: 'ring-teal-500',
    title: 'text-teal-700',
  },
  blue: {
    card: 'border-blue-200 bg-blue-50',
    icon: 'bg-blue-100 text-blue-600',
    iconActive: 'bg-blue-600 text-white',
    badge: 'bg-blue-100 text-blue-700 border-blue-200',
    dot: 'bg-blue-500',
    ring: 'ring-blue-500',
    title: 'text-blue-700',
  },
  violet: {
    card: 'border-violet-200 bg-violet-50',
    icon: 'bg-violet-100 text-violet-600',
    iconActive: 'bg-violet-600 text-white',
    badge: 'bg-violet-100 text-violet-700 border-violet-200',
    dot: 'bg-violet-500',
    ring: 'ring-violet-500',
    title: 'text-violet-700',
  },
  orange: {
    card: 'border-orange-200 bg-orange-50',
    icon: 'bg-orange-100 text-orange-600',
    iconActive: 'bg-orange-600 text-white',
    badge: 'bg-orange-100 text-orange-700 border-orange-200',
    dot: 'bg-orange-500',
    ring: 'ring-orange-500',
    title: 'text-orange-700',
  },
};

const Add_Ship = () => {
  const [action, setAction] = useState('');
  const [savedSession, setSavedSession] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLocked, setIsLocked] = useState(false);
  const [lockedOperation, setLockedOperation] = useState('');
  const navigator = useNavigate();

  const activeOp = OPERATIONS.find((op) => op.value === action);
  const colors = activeOp ? colorMap[activeOp.color] : null;

  const fetchSavedSession = () => {
    try {
      const sessionData = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (sessionData) {
        const session = JSON.parse(sessionData);
        setSavedSession(session);
        if (session?.source) {
          setAction(session.source);
          setIsLocked(true);
          setLockedOperation(session.source);
        }
      } else {
        setSavedSession(null);
        setIsLocked(false);
        setLockedOperation('');
      }
    } catch (error) {
      console.error('Error fetching session:', error);
      setSavedSession(null);
      setIsLocked(false);
      setLockedOperation('');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOperationSelect = (operationValue) => {
    if (isLocked) {
      alert(`Cannot switch operations. Current session is locked to "${lockedOperation}".`);
      return;
    }

    setAction(operationValue);
    setIsLocked(true);
    setLockedOperation(operationValue);

    try {
      const sessionData = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (sessionData) {
        const session = JSON.parse(sessionData);
        session.isLocked = true;
        session.lockedOperation = operationValue;
        session.source = operationValue;
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(session));
        setSavedSession(session);
      }
    } catch (error) {
      console.error('Error updating session lock:', error);
    }
  };

  const endSession = async (e) => {
    e.preventDefault();
    try {
      const session_id = savedSession.sessionId;
      if (!session_id) {
        return alert('session_id is required');
      }
      const response = await axios.post(`${BASE_URL}/stock-logs/end-session`, {
        session_id,
      });
      console.log('Session ended', response);
      localStorage.removeItem(LOCAL_STORAGE_KEY);
      setSavedSession(null);
      setIsLocked(false);
      setLockedOperation('');
      setAction('');
      navigator('/stock-log');
    } catch (error) {
      console.error('Error ending session:', error);
      alert('Error ending session');
    }
  };

  useEffect(() => {
    fetchSavedSession();
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-slate-600">Loading session...</p>
        </div>
      </div>
    );
  }

  if (!savedSession?.sessionId) {
    return <Session onSessionCreated={fetchSavedSession} />;
  }

  const sessionId = savedSession.sessionId || '';

  return (
    <div>
      {/* Top Bar - Minimal */}
      <div className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="bg-indigo-600 text-white p-2 rounded-lg">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                />
              </svg>
            </div>
            <h1 className="text-lg font-semibold text-slate-800">Stock Management</h1>
          </div>

          <div>
            {/* Lock Banner - Clean */}
            {isLocked && (
              <div className="mt-3 px-4 py-2.5 bg-amber-50 border border-amber-200 rounded-lg flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <svg
                    className="w-4 h-4 text-amber-500 flex-shrink-0"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2h-1V9z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span className="text-sm text-amber-800">
                    Session locked to <span className="font-medium">"{lockedOperation}"</span>
                  </span>
                </div>
                <button
                  onClick={endSession}
                  className="text-xs font-medium text-red-600 hover:text-red-700 px-3 py-1 hover:bg-red-50 rounded-lg transition-colors"
                >
                  End Session
                </button>
              </div>
            )}
          </div>

          {/* Session ID - Clean Style */}
          {sessionId && (
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 rounded-full">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-xs font-medium text-slate-600">Session</span>
                <span className="text-xs font-mono text-slate-800 bg-white px-2 py-0.5 rounded">
                  {sessionId}...
                </span>
              </div>
              <button
                onClick={endSession}
                className="text-xs text-red-600 hover:text-red-700 font-medium px-3 py-1.5 hover:bg-red-50 rounded-lg transition-colors"
              >
                End
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6">
        {/* Operation Selector - Moved to Top */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">
              Select Operation
            </p>
            {isLocked && (
              <div className="flex items-center gap-1.5 text-xs text-amber-600 bg-amber-50 px-3 py-1 rounded-full">
                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
                    clipRule="evenodd"
                  />
                </svg>
                Locked
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {OPERATIONS.map((op) => {
              const c = colorMap[op.color];
              const isActive = action === op.value;
              const isDisabled = isLocked && lockedOperation !== op.value;

              return (
                <button
                  key={op.value}
                  type="button"
                  onClick={() => handleOperationSelect(op.value)}
                  disabled={isDisabled}
                  className={`
                    relative flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-all duration-200
                    ${
                      isDisabled
                        ? 'opacity-40 cursor-not-allowed bg-slate-50 border-slate-200'
                        : isActive
                          ? `${c.card} border-current shadow-sm`
                          : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-sm'
                    }
                  `}
                >
                  <div
                    className={`p-2 rounded-lg transition-colors ${
                      isDisabled
                        ? 'bg-slate-100 text-slate-400'
                        : isActive
                          ? c.iconActive
                          : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {op.icon}
                  </div>
                  <span
                    className={`text-sm font-medium ${
                      isDisabled ? 'text-slate-400' : isActive ? c.title : 'text-slate-700'
                    }`}
                  >
                    {op.label}
                  </span>
                  {isActive && (
                    <div className={`ml-auto w-2 h-2 rounded-full ${c.dot} flex-shrink-0`}></div>
                  )}
                  {isDisabled && (
                    <span className="ml-auto text-xs text-red-400 flex-shrink-0">🔒</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Content Area */}
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden ">
          {action === 'stock_keeping' ? (
            <StockKeepingWithStyleNumber session={savedSession} />
          ) : action === 'vendor' ? (
            <AddStockWithStyleNumber session={savedSession} />
          ) : (
            <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
              <div className="bg-slate-50 p-4 rounded-xl mb-4">
                <svg
                  className="w-8 h-8 text-slate-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                  />
                </svg>
              </div>
              <h3 className="text-sm font-medium text-slate-700 mb-1">No operation selected</h3>
              <p className="text-xs text-slate-400">Choose an operation above to get started</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Add_Ship;
