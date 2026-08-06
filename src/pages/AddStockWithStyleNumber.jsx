import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useGlobalContext } from '../components/context/StockContextProvider';
import axios from 'axios';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { FaSpinner, FaCheckCircle, FaSearch } from 'react-icons/fa';
import { BASE_URL } from '../constant/index.js';

const EMPTY_FORM = {
  fabricNumber: '',
  availableStock: '',
  location: '',
  kg_unit: '',
  meter_unit: '',
  fabric_source: '',
  width: '',
};

/* ── Confirm dialog ─────────────────────────────────────── */
const ConfirmDialog = ({ message, onConfirm, onCancel }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
    <div className="bg-white rounded-2xl border border-slate-200 max-w-sm w-full p-6">
      <div className="flex items-start gap-3 mb-5">
        <div className="bg-amber-100 p-2.5 rounded-xl flex-shrink-0">
          <svg
            className="w-5 h-5 text-amber-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
            />
          </svg>
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-800 mb-1">Confirm Transfer</p>
          <p className="text-sm text-slate-500">{message}</p>
        </div>
      </div>
      <div className="flex gap-2">
        <button
          onClick={onCancel}
          className="flex-1 py-2 text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
        >
          Cancel
        </button>
        <button
          onClick={onConfirm}
          className="flex-1 py-2 text-sm font-semibold text-white bg-amber-500 hover:bg-amber-600 rounded-xl transition-colors cursor-pointer"
        >
          Yes, Transfer
        </button>
      </div>
    </div>
  </div>
);

/* ── Submitting overlay ──────────────────────────────────── */
const SubmittingOverlay = ({ label }) => (
  <div className="absolute inset-0 z-10 bg-white/80 backdrop-blur-[2px] rounded-2xl flex flex-col items-center justify-center gap-4">
    <div className="bg-white border border-slate-200 rounded-2xl px-8 py-6 flex flex-col items-center gap-3">
      <div className="relative">
        <div className="w-14 h-14 rounded-full border-4 border-emerald-100 border-t-emerald-600 animate-spin" />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-5 h-5 rounded-full bg-emerald-50 border-2 border-emerald-300 animate-pulse" />
        </div>
      </div>
      <div className="text-center">
        <p className="text-sm font-bold text-slate-800">{label}</p>
        <p className="text-xs text-slate-400 mt-0.5">Please wait…</p>
      </div>
      <div className="flex gap-1.5">
        {[0, 150, 300].map((delay) => (
          <div
            key={delay}
            className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-bounce"
            style={{ animationDelay: `${delay}ms` }}
          />
        ))}
      </div>
    </div>
  </div>
);

/* ── Unit toggle ─────────────────────────────────────────── */
const UnitToggle = ({ value, onChange }) => (
  <div className="flex bg-slate-100 rounded-lg p-0.5 w-fit">
    {['KG', 'MTR'].map((u) => (
      <button
        key={u}
        type="button"
        onClick={() => onChange(u)}
        className={`px-3 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
          value === u
            ? 'bg-white text-emerald-700 border border-slate-200'
            : 'text-slate-500 hover:text-slate-700'
        }`}
      >
        {u}
      </button>
    ))}
  </div>
);

/* ── Fabric card ─────────────────────────────────────────── */
const FabricCard = ({ item, isSelected, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className={`w-full text-left p-4 rounded-xl border-2 transition-all cursor-pointer ${
      isSelected
        ? 'border-emerald-500 bg-emerald-50 '
        : 'border-slate-200 bg-white hover:border-emerald-300 hover:bg-emerald-50/40 '
    }`}
  >
    <div className="flex items-start justify-between gap-2">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-slate-800 truncate">Fabric #{item.fabricNumber}</p>
        {item.fabricName && (
          <p className="text-xs text-slate-500 mt-0.5 truncate">{item.fabricName}</p>
        )}
      </div>
      {isSelected && (
        <div className="shrink-0 bg-emerald-500 text-white rounded-full p-0.5">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        </div>
      )}
    </div>
    <div className="flex items-center gap-2 mt-2.5">
      <span
        className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
          Number(item.availableStock) === 0
            ? 'bg-red-100 text-red-600'
            : Number(item.availableStock) < 50
              ? 'bg-amber-100 text-amber-700'
              : 'bg-emerald-100 text-emerald-700'
        }`}
      >
        {Number(item.availableStock) === 0 ? 'Out of stock' : `${item.availableStock} MTR`}
      </span>
      {item.location && (
        <span className="text-xs text-slate-400 flex items-center gap-1">
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
          {item.location}
        </span>
      )}
    </div>
  </button>
);

/* ── Main component ─────────────────────────────────────── */
const AddStockWithStyleNumber = ({ session }) => {
  const { stock, fetchStock } = useGlobalContext();

  // Search mode: 'style' or 'fabric'
  const [searchMode, setSearchMode] = useState('style'); // 'style' | 'fabric'

  const [styleNumber, setStyleNumber] = useState('');
  const [directFabricNumber, setDirectFabricNumber] = useState('');
  const [selectedFabricNumber, setSelectedFabricNumber] = useState('');
  const [product, setProduct] = useState(null);

  // Separate loading states — prevents hasRelation from flickering when product loads
  const [loadingRelation, setLoadingRelation] = useState(false);
  const [loadingProduct, setLoadingProduct] = useState(false);
  const [loadingStore2, setLoadingStore2] = useState(false);
  const [loadingDirectFabric, setLoadingDirectFabric] = useState(false);
  const loading = loadingRelation || loadingProduct || loadingStore2 || loadingDirectFabric;

  const [submitting, setSubmitting] = useState(false);
  const [relationDetails, setRelationDetails] = useState({});
  const [stock2, setStock2] = useState({});
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [showConfirm, setShowConfirm] = useState(false);
  const [addUnit, setAddUnit] = useState('KG');

  /* ─── Derived values ──────────────────────────────────── */

  const linkedFabrics = useMemo(() => {
    if (!styleNumber || String(styleNumber).length < 3) return [];
    return stock.filter(
      (item) =>
        Array.isArray(item.styleNumbers) &&
        item.styleNumbers.some((sn) => String(sn) === String(styleNumber))
    );
  }, [stock, styleNumber]);

  // For direct fabric search
  const directFabricResult = useMemo(() => {
    if (!directFabricNumber || String(directFabricNumber).length < 1) return null;
    return stock.find((item) => String(item.fabricNumber) === String(directFabricNumber)) || null;
  }, [stock, directFabricNumber]);

  const existingStock = useMemo(
    () => stock.find((item) => Number(item.fabricNumber) === Number(selectedFabricNumber)),
    [stock, selectedFabricNumber]
  );

  // hasRelation depends only on loadingRelation — not shared loading state
  const hasRelation = !loadingRelation && relationDetails?.fabric_in_meter > 0;

  const showKgMeterInputs =
    !hasRelation && !!formData.fabric_source && formData.fabric_source !== 'Store2';

  const showQuantityInput =
    (formData.fabric_source === 'Vendor' || !formData.fabric_source) &&
    !(stock2?.availableStock > 0) &&
    !showKgMeterInputs;

  const widthMultiplier = formData.width === 'Wide' ? 1.4 : 1;

  /* ─── Live meter conversion preview ──────────────────── */
  const meterPreview = useMemo(() => {
    if (!hasRelation || !formData.availableStock) return null;
    const base =
      addUnit === 'KG'
        ? formData.availableStock * relationDetails.fabric_in_meter
        : Number(formData.availableStock);
    return (base * widthMultiplier).toFixed(2);
  }, [
    hasRelation,
    formData.availableStock,
    addUnit,
    relationDetails.fabric_in_meter,
    widthMultiplier,
  ]);

  /* ─── API calls ───────────────────────────────────────── */

  const fetchFabricRelationship = useCallback(async (fabricNumber) => {
    if (!fabricNumber) return;
    setLoadingRelation(true);
    try {
      const res = await axios.get(`${BASE_URL}/relation/details?fabric_number=${fabricNumber}`);
      setRelationDetails(res.data?.data || {});
    } catch {
      setRelationDetails({});
    } finally {
      setLoadingRelation(false);
    }
  }, []);

  const fetchStore2Stock = useCallback(
    async (fabricNumber) => {
      setLoadingStore2(true);
      try {
        const res = await axios.get(`${BASE_URL}/stock2?search=${fabricNumber}`);
        const data = res.data.message?.stocks[0];
        if (!data?.availableStock || Number(data.availableStock) <= 0) {
          toast.error(
            `${selectedFabricNumber} — fabric not found or no stock in Store 2. Please add new.`
          );
          setFormData((prev) => ({ ...prev, fabric_source: '' }));
          setStock2({});
          return;
        }
        setStock2(data);
      } catch {
        setStock2({});
      } finally {
        setLoadingStore2(false);
      }
    },
    [selectedFabricNumber]
  );

  const fetchProduct = useCallback(async () => {
    if (!styleNumber || String(styleNumber).length < 5) return;
    setLoadingProduct(true);
    try {
      const res = await axios.get(
        `https://inventorybackend-m1z8.onrender.com/api/product?style_code=${styleNumber || existingStock.styleNumbers[0]}`
      );
      setProduct(res.data[0] ?? null);
    } catch {
      setProduct(null);
    } finally {
      setLoadingProduct(false);
    }
  }, [styleNumber]);

  /* ─── Effects ─────────────────────────────────────────── */

  useEffect(() => {
    if (String(styleNumber).length >= 5) fetchProduct();
    else setProduct(null);
  }, [styleNumber, fetchProduct]);

  useEffect(() => {
    if (selectedFabricNumber) {
      fetchFabricRelationship(selectedFabricNumber);
      setStock2({});
    }
  }, [selectedFabricNumber, fetchFabricRelationship]);

  // Reset addUnit when fabric changes — NOT when hasRelation changes (avoids flicker bug)
  useEffect(() => {
    setAddUnit('KG');
    setFormData((prev) => ({ ...EMPTY_FORM, fabricNumber: prev.fabricNumber }));
  }, [selectedFabricNumber]);

  useEffect(() => {
    if (relationDetails?.fabric_number && formData.fabric_source === 'Store2') {
      fetchStore2Stock(relationDetails.fabric_number);
    }
  }, [relationDetails?.fabric_number, formData.fabric_source]);

  useEffect(() => {
    if (formData.fabric_source && formData.fabric_source !== 'Store2') {
      setStock2({});
      setFormData((prev) => ({ ...prev, availableStock: '' }));
    }
  }, [formData.fabric_source]);

  // Clear quantity when unit switches to prevent stale value
  useEffect(() => {
    setFormData((prev) => ({ ...prev, availableStock: '' }));
  }, [addUnit]);

  // Auto-select fabric when direct fabric is found
  useEffect(() => {
    if (directFabricResult && !selectedFabricNumber) {
      setSelectedFabricNumber(directFabricResult.fabricNumber);
      setFormData({ ...EMPTY_FORM, fabricNumber: directFabricResult.fabricNumber });
      setRelationDetails({});
      setStock2({});
      setAddUnit('KG');
    }
  }, [directFabricResult, selectedFabricNumber]);

  /* ─── Handlers ────────────────────────────────────────── */

  const handleChange = useCallback((e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  }, []);

  const handleFabricSelect = useCallback((fabricNumber) => {
    setSelectedFabricNumber(fabricNumber);
    setFormData({ ...EMPTY_FORM, fabricNumber });
    setRelationDetails({});
    setStock2({});
    setAddUnit('KG');
    // Clear direct fabric input when selecting from list
    setDirectFabricNumber('');
  }, []);

  const resetAll = useCallback(() => {
    setStyleNumber('');
    setDirectFabricNumber('');
    setSelectedFabricNumber('');
    setFormData(EMPTY_FORM);
    setRelationDetails({});
    setStock2({});
    setProduct(null);
    setAddUnit('KG');
    setSearchMode('style');
  }, []);

  const resetForm = useCallback(() => {
    setFormData((prev) => ({ ...EMPTY_FORM, fabricNumber: prev.fabricNumber }));
    setRelationDetails({});
    setStock2({});
    setAddUnit('KG');
    if (selectedFabricNumber) fetchFabricRelationship(selectedFabricNumber);
  }, [selectedFabricNumber, fetchFabricRelationship]);

  const handleDirectFabricSearch = useCallback(
    (e) => {
      const value = e.target.value;
      setDirectFabricNumber(value);
      // Clear selected fabric if exists
      if (selectedFabricNumber) {
        setSelectedFabricNumber('');
        setFormData(EMPTY_FORM);
        setRelationDetails({});
        setStock2({});
      }
      // Reset style number if switching to fabric search
      if (styleNumber) {
        setStyleNumber('');
        setProduct(null);
      }
      // If fabric number is cleared, reset everything
      if (!value) {
        setSelectedFabricNumber('');
        setFormData(EMPTY_FORM);
        setRelationDetails({});
        setStock2({});
      }
    },
    [selectedFabricNumber, styleNumber]
  );

  const handleStyleNumberChange = useCallback((e) => {
    const value = e.target.value;
    setStyleNumber(value);
    // Clear direct fabric input
    setDirectFabricNumber('');
    setSelectedFabricNumber('');
    setFormData(EMPTY_FORM);
    setRelationDetails({});
    setStock2({});
    setProduct(null);
  }, []);

  const doSubmit = async () => {
    setShowConfirm(false);
    setSubmitting(true);
    try {
      const { availableStock, location, meter_unit, kg_unit, fabric_source, width } = formData;
      const wMul = width === 'Wide' ? 1.4 : 1;

      if (!existingStock) {
        toast.error('Fabric number not found in current stock list.');
        return;
      }

      let updatePayload = { location };
      let metersToAdd = 0;

      if (fabric_source === 'Store2') {
        updatePayload.availableStock =
          Number(existingStock.availableStock || 0) + Number(stock2?.availableStock || 0);
        metersToAdd = Number(stock2?.availableStock || 0) * wMul;
      } else if (hasRelation) {
        const qty = Number(availableStock);
        if (addUnit === 'KG') {
          metersToAdd = qty * Number(relationDetails.fabric_in_meter) * wMul;
        } else {
          metersToAdd = qty * wMul;
        }
        updatePayload.availableStock = Number(existingStock.availableStock || 0) + metersToAdd;
      } else {
        if (!kg_unit || !meter_unit || Number(kg_unit) <= 0 || Number(meter_unit) <= 0) {
          toast.error('Please enter valid KG and Meter units.');
          return;
        }
        const one_kg = Number(meter_unit) / Number(kg_unit);
        await axios.post(`${BASE_URL}/relation/add-relationship`, [
          { fabric_number: selectedFabricNumber, fabric_in_KG: 1, fabric_in_meter: one_kg },
        ]);
        metersToAdd = Number(meter_unit) * wMul;
        updatePayload.availableStock = Number(existingStock.availableStock || 0) + metersToAdd;
      }

      // Create verification record
      const payloadForStockVerifyRecord = {
        fabric_number: selectedFabricNumber,
        fabric_name: existingStock.fabricName,
        employee_number: Number(session.employeeNumber),
        location: updatePayload.location,
        session_id: session.sessionId,
        old_stock: Number(existingStock.availableStock || 0),
        added_stock: metersToAdd,
        source: session.source,
        width: formData.width?.toLowerCase(),
      };

      try {
        await axios.post(`${BASE_URL}/verify-stocks`, payloadForStockVerifyRecord);
      } catch (error) {
        console.error('Failed to create verify stocks error', error);
        // Don't fail the main operation if verification fails
      }

      toast.success('Stock updated successfully!');
      // Clear full UI after successful submit
      resetAll();
      fetchStock();
    } catch (error) {
      toast.error(`Failed to update stock: ${error.response?.data?.message || error.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.fabric_source === 'Store2') {
      setShowConfirm(true);
    } else {
      await doSubmit();
    }
  };

  const submitLabel = submitting
    ? formData.fabric_source === 'Store2'
      ? 'Transferring Stock…'
      : 'Adding Stock…'
    : formData.fabric_source === 'Store2'
      ? 'Transfer from Store 2'
      : 'Add Stock';

  /* ─── Render ──────────────────────────────────────────── */
  return (
    <>
      {showConfirm && (
        <ConfirmDialog
          message="Are you sure you want to transfer this stock and remove it from Store 2?"
          onConfirm={doSubmit}
          onCancel={() => {
            setShowConfirm(false);
            resetForm();
          }}
        />
      )}

      <div className="py-10 px-4">
        {/* Page header */}
        <div className="container mx-auto mb-6">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className="bg-emerald-600 text-white p-2.5 rounded-xl">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4v16m8-8H4"
                  />
                </svg>
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-800">Add Fabric Stock</h1>
                <p className="text-sm text-slate-500">
                  Search by style number or direct fabric number
                </p>
              </div>
            </div>
            {(styleNumber || directFabricNumber || selectedFabricNumber) && (
              <button
                onClick={resetAll}
                className="text-xs font-semibold text-slate-500 hover:text-red-600 border border-slate-300 hover:border-red-300 px-3 py-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
                Clear All
              </button>
            )}
          </div>
        </div>

        <div className="container mx-auto space-y-5">
          {/* ── Step 1: Search mode selector ── */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <div className="flex items-center gap-2 mb-4">
              <span className="w-6 h-6 rounded-full bg-emerald-600 text-white text-xs font-bold flex items-center justify-center shrink-0">
                1
              </span>
              <h2 className="text-sm font-semibold text-slate-700">Search Fabric</h2>
              <span className="text-xs text-slate-400 ml-1">Choose search method</span>
            </div>

            {/* Search mode toggle */}
            <div className="flex gap-2 mb-4">
              <button
                type="button"
                onClick={() => {
                  setSearchMode('style');
                  setDirectFabricNumber('');
                  setSelectedFabricNumber('');
                  setFormData(EMPTY_FORM);
                  setRelationDetails({});
                  setStock2({});
                }}
                className={`px-4 py-2 text-sm font-semibold rounded-xl transition-all cursor-pointer ${
                  searchMode === 'style'
                    ? 'bg-emerald-600 text-white shadow-md'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                By Style Number
              </button>
              <button
                type="button"
                onClick={() => {
                  setSearchMode('fabric');
                  setStyleNumber('');
                  setProduct(null);
                  setSelectedFabricNumber('');
                  setFormData(EMPTY_FORM);
                  setRelationDetails({});
                  setStock2({});
                }}
                className={`px-4 py-2 text-sm font-semibold rounded-xl transition-all cursor-pointer ${
                  searchMode === 'fabric'
                    ? 'bg-emerald-600 text-white shadow-md'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                By Fabric Number
              </button>
            </div>

            {/* Search input based on mode */}
            {searchMode === 'style' ? (
              <div className="flex gap-3 items-start">
                <div className="flex-1 relative">
                  <input
                    type="number"
                    value={styleNumber}
                    onChange={handleStyleNumberChange}
                    placeholder="Enter style number e.g. 1042"
                    className="w-full pl-4 pr-10 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all placeholder:text-slate-400"
                  />
                  {styleNumber && (
                    <button
                      onClick={() => {
                        setStyleNumber('');
                        setSelectedFabricNumber('');
                        setFormData(EMPTY_FORM);
                        setProduct(null);
                      }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-lg leading-none cursor-pointer"
                    >
                      ×
                    </button>
                  )}
                </div>
                {linkedFabrics.length > 0 && (
                  <div className="flex items-center gap-2 py-2.5 px-3 bg-emerald-50 border border-emerald-200 rounded-xl shrink-0">
                    <svg
                      className="w-4 h-4 text-emerald-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                      />
                    </svg>
                    <span className="text-xs font-bold text-emerald-700">
                      {linkedFabrics.length} fabric{linkedFabrics.length > 1 ? 's' : ''} found
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex gap-3 items-start">
                <div className="flex-1 relative">
                  <input
                    type="number"
                    value={directFabricNumber}
                    onChange={handleDirectFabricSearch}
                    placeholder="Enter fabric number e.g. 12345"
                    className="w-full pl-4 pr-10 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all placeholder:text-slate-400"
                  />
                  {directFabricNumber && (
                    <button
                      onClick={() => {
                        setDirectFabricNumber('');
                        setSelectedFabricNumber('');
                        setFormData(EMPTY_FORM);
                        setRelationDetails({});
                        setStock2({});
                      }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-lg leading-none cursor-pointer"
                    >
                      ×
                    </button>
                  )}
                </div>
                {directFabricResult && (
                  <div className="flex items-center gap-2 py-2.5 px-3 bg-emerald-50 border border-emerald-200 rounded-xl shrink-0">
                    <FaCheckCircle className="text-emerald-600" />
                    <span className="text-xs font-bold text-emerald-700">Fabric found</span>
                  </div>
                )}
                {directFabricNumber && !directFabricResult && !loadingDirectFabric && (
                  <div className="flex items-center gap-2 py-2.5 px-3 bg-amber-50 border border-amber-200 rounded-xl shrink-0">
                    <span className="text-xs font-bold text-amber-700">No fabric found</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── Step 2: Linked fabrics grid (style mode) ── */}
          {searchMode === 'style' && linkedFabrics.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 p-5">
              <div className="flex items-center gap-2 mb-4">
                <span className="w-6 h-6 rounded-full bg-emerald-600 text-white text-xs font-bold flex items-center justify-center shrink-0">
                  2
                </span>
                <h2 className="text-sm font-semibold text-slate-700">Select a Fabric</h2>
                <span className="text-xs text-slate-400 ml-1">Click a card to add stock</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {linkedFabrics.map((item) => (
                  <FabricCard
                    key={item.fabricNumber}
                    item={item}
                    isSelected={String(selectedFabricNumber) === String(item.fabricNumber)}
                    onClick={() => handleFabricSelect(item.fabricNumber)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* ── No fabrics found (style mode) ── */}
          {searchMode === 'style' &&
            styleNumber &&
            String(styleNumber).length >= 3 &&
            linkedFabrics.length === 0 && (
              <div className="bg-white rounded-2xl border border-slate-200 p-8 flex flex-col items-center gap-3 text-center">
                <div className="bg-slate-100 p-4 rounded-2xl">
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
                      d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <p className="text-sm font-semibold text-slate-600">
                  No fabrics linked to style #{styleNumber}
                </p>
                <p className="text-xs text-slate-400">
                  Check the style number or add fabric links first
                </p>
              </div>
            )}

          {/* ── Direct fabric result preview ── */}
          {searchMode === 'fabric' && directFabricResult && !selectedFabricNumber && (
            <div className="bg-white rounded-2xl border border-slate-200 p-5">
              <div className="flex items-center gap-2 mb-4">
                <span className="w-6 h-6 rounded-full bg-emerald-600 text-white text-xs font-bold flex items-center justify-center shrink-0">
                  2
                </span>
                <h2 className="text-sm font-semibold text-slate-700">Fabric Found</h2>
              </div>
              <FabricCard
                item={directFabricResult}
                isSelected={true}
                onClick={() => handleFabricSelect(directFabricResult.fabricNumber)}
              />
            </div>
          )}

          {/* ── Step 3: Form + Product preview ── */}
          {selectedFabricNumber && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {/* Form card */}
              <div className="relative bg-white rounded-2xl border border-slate-200 overflow-hidden">
                {submitting && (
                  <SubmittingOverlay
                    label={
                      formData.fabric_source === 'Store2'
                        ? 'Transferring from Store 2…'
                        : 'Updating stock…'
                    }
                  />
                )}

                <div className="bg-gradient-to-r from-emerald-600 to-teal-600 px-6 py-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-white font-semibold text-base">
                        Fabric #{selectedFabricNumber}
                      </h2>
                      <p className="text-emerald-100 text-xs mt-0.5">
                        {existingStock?.fabricName || 'Stock Details'}
                        {existingStock?.availableStock !== undefined && (
                          <span className="ml-2 opacity-80">
                            · Current: {existingStock.availableStock} MTR
                          </span>
                        )}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedFabricNumber('');
                        setFormData(EMPTY_FORM);
                        setRelationDetails({});
                        setStock2({});
                        if (searchMode === 'fabric') {
                          setDirectFabricNumber('');
                        }
                      }}
                      className="text-emerald-200 hover:text-white transition-colors cursor-pointer"
                      title="Back to fabric list"
                    >
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </button>
                  </div>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                  {/* Source */}
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-slate-700">
                      Fabric Source <span className="text-red-500">*</span>
                    </label>
                    <select
                      name="fabric_source"
                      value={formData.fabric_source}
                      onChange={handleChange}
                      className="w-full px-4 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all text-slate-700 bg-white"
                      required
                    >
                      <option value="">Select source</option>
                      <option value="Vendor">Vendor</option>
                      <option value="Store2">Store 2</option>
                    </select>
                  </div>

                  {/* Loading relation indicator */}
                  {loadingRelation && (
                    <div className="flex items-center gap-2 text-xs text-slate-400 py-1">
                      <div className="w-3.5 h-3.5 border-2 border-slate-300 border-t-emerald-500 rounded-full animate-spin" />
                      Fetching fabric relation…
                    </div>
                  )}

                  {/* Relation badge + unit toggle */}
                  {hasRelation && (
                    <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="bg-emerald-100 p-1.5 rounded-lg">
                          <FaCheckCircle className="text-emerald-600 text-xs" />
                        </div>
                        <p className="text-sm text-emerald-700">
                          <span className="font-bold">
                            1 KG = {relationDetails.fabric_in_meter} MTR
                          </span>
                        </p>
                      </div>
                      {formData.fabric_source === 'Vendor' && (
                        <UnitToggle value={addUnit} onChange={setAddUnit} />
                      )}
                    </div>
                  )}

                  {/* No-relation: KG + Meter conversion inputs */}
                  {showKgMeterInputs && (
                    <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl space-y-3">
                      <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide">
                        No mapping found — enter conversion to create it
                      </p>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <label className="text-sm font-medium text-slate-700">
                            KG Quantity <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="number"
                            name="kg_unit"
                            value={formData.kg_unit}
                            onChange={handleChange}
                            placeholder="e.g. 10"
                            className="w-full px-4 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-all placeholder:text-slate-400"
                            required
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-sm font-medium text-slate-700">
                            Meter Quantity <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="number"
                            name="meter_unit"
                            value={formData.meter_unit}
                            onChange={handleChange}
                            placeholder="e.g. 45"
                            className="w-full px-4 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-all placeholder:text-slate-400"
                            required
                          />
                        </div>
                      </div>
                      {formData.kg_unit > 0 && formData.meter_unit > 0 && (
                        <div className="flex items-center justify-between bg-white border border-amber-200 rounded-lg px-3 py-2">
                          <p className="text-xs text-slate-500">
                            Ratio:{' '}
                            <span className="font-semibold text-amber-700">
                              1 KG = {(formData.meter_unit / formData.kg_unit).toFixed(3)} MTR
                            </span>
                          </p>
                          <p className="text-xs text-slate-500">
                            Adding:{' '}
                            <span className="font-semibold text-emerald-700">
                              {(formData.meter_unit * widthMultiplier).toFixed(2)} MTR
                            </span>
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Quantity input */}
                  {showQuantityInput && (
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-slate-700">
                        Quantity to Add{' '}
                        <span className="text-slate-400 font-normal">
                          ({hasRelation ? addUnit : 'MTR'})
                        </span>
                        <span className="text-red-500"> *</span>
                      </label>
                      <input
                        type="number"
                        name="availableStock"
                        value={formData.availableStock}
                        onChange={handleChange}
                        placeholder={
                          hasRelation && addUnit === 'KG'
                            ? 'Enter quantity in KG'
                            : 'Enter quantity in MTR'
                        }
                        className="w-full px-4 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all placeholder:text-slate-400"
                        required
                      />
                      {meterPreview && (
                        <p className="text-xs text-slate-500 pl-1">
                          ≈{' '}
                          <span className="font-semibold text-emerald-600">{meterPreview} MTR</span>{' '}
                          will be added
                          {formData.width === 'Wide' && (
                            <span className="text-amber-600 ml-1">(×1.4 Wide)</span>
                          )}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Store 2 transfer banner */}
                  {formData.fabric_source === 'Store2' && stock2?.availableStock > 0 && (
                    <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-xl px-4 py-3">
                      <div>
                        <p className="text-sm font-semibold text-blue-800">
                          Store 2 Available Stock
                        </p>
                        <p className="text-xs text-blue-600 mt-0.5">
                          Full quantity will be transferred
                        </p>
                      </div>
                      <span className="text-lg font-bold text-blue-700">
                        {stock2.availableStock} KG
                      </span>
                    </div>
                  )}

                  {/* Width selector */}
                  {formData.fabric_source && formData.fabric_source !== 'Store2' && (
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-slate-700">Width</label>
                      <select
                        name="width"
                        value={formData.width}
                        onChange={handleChange}
                        required
                        className="w-full px-4 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all text-slate-700 bg-white"
                      >
                        <option value="">Select Width</option>
                        <option value="Normal">Normal</option>
                        <option value="Wide">Wide (×1.4)</option>
                      </select>
                      {formData.width === 'Wide' && (
                        <p className="text-xs text-amber-600 pl-1">
                          Wide fabric: entered quantity will be multiplied by 1.4
                        </p>
                      )}
                    </div>
                  )}

                  {/* Location */}
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-slate-700">
                      Location <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="location"
                      value={formData.location}
                      onChange={handleChange}
                      placeholder="e.g. Warehouse A, Rack 3"
                      className="w-full px-4 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none uppercase transition-all placeholder:text-slate-400 placeholder:normal-case"
                      required
                    />
                  </div>

                  {/* Actions */}
                  {formData.fabric_source && (
                    <div className="flex gap-3 pt-1">
                      <button
                        type="button"
                        onClick={resetForm}
                        className="flex-1 py-2.5 text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
                      >
                        Reset
                      </button>
                      <button
                        type="submit"
                        disabled={submitting || loading}
                        className="flex-[2] flex items-center justify-center gap-2 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 rounded-xl transition-all disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
                      >
                        {submitting ? (
                          <>
                            <FaSpinner className="animate-spin" />
                            {submitLabel}
                          </>
                        ) : (
                          submitLabel
                        )}
                      </button>
                    </div>
                  )}
                </form>
              </div>

              {/* Product preview */}
              <div>
                {loadingProduct && !product ? (
                  <div className="bg-white rounded-2xl border border-slate-200 flex flex-col items-center justify-center min-h-[420px] gap-3">
                    <div className="w-10 h-10 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
                    <p className="text-sm text-slate-500">Loading product…</p>
                  </div>
                ) : product?.style_id ? (
                  <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                    <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                      <div>
                        <h2 className="text-sm font-semibold text-slate-800">Product Preview</h2>
                        <p className="text-xs text-slate-400 mt-0.5">Style #{styleNumber}</p>
                      </div>
                      <span className="text-xs bg-emerald-50 text-emerald-600 border border-emerald-100 px-2 py-1 rounded-full font-medium">
                        Live
                      </span>
                    </div>
                    <div className="overflow-hidden">
                      <iframe
                        className="w-full h-[980px] -mt-56"
                        src={`https://www.myntra.com/dresses/qurvii/qurvii-flared-sleeves-sequinned-georgette-a-line-midi-dress/${product.style_id}/buy`}
                        frameBorder="0"
                        title="Product Preview"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="bg-white rounded-2xl border border-slate-200 flex flex-col items-center justify-center min-h-[420px] gap-3 text-center px-6">
                    <div className="bg-slate-100 p-5 rounded-2xl">
                      <svg
                        className="w-10 h-10 text-slate-400"
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
                    <p className="text-sm font-semibold text-slate-600">
                      {searchMode === 'style'
                        ? 'No product preview found'
                        : 'Product preview available only with style number'}
                    </p>
                    <p className="text-xs text-slate-400">
                      {searchMode === 'style'
                        ? `Style #${styleNumber}`
                        : 'Switch to style search for product preview'}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <ToastContainer
        position="top-right"
        autoClose={2000}
        newestOnTop
        closeOnClick
        pauseOnHover
        draggable
        theme="light"
        toastClassName="text-sm"
      />
    </>
  );
};

export default AddStockWithStyleNumber;
