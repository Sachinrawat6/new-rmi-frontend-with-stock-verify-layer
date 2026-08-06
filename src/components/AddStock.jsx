import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useGlobalContext } from './context/StockContextProvider';
import axios from 'axios';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { FaSpinner, FaCheckCircle } from 'react-icons/fa';
import { BASE_URL } from '../constant/index.js';

const EMPTY_FORM = {
  fabricNumber: '',
  availableStock: '',
  location: '',
  kg_unit: '',
  meter_unit: '',
  fabric_source: '',
  width: 'Normal',
};

/* ── Confirm dialog ─────────────────────────────────────── */
const ConfirmDialog = ({ message, onConfirm, onCancel }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
    <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-sm w-full p-6">
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
    <div className="bg-white border border-slate-200 shadow-lg rounded-2xl px-8 py-6 flex flex-col items-center gap-3">
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
            ? 'bg-white text-emerald-700 shadow-sm border border-slate-200'
            : 'text-slate-500 hover:text-slate-700'
        }`}
      >
        {u}
      </button>
    ))}
  </div>
);

/* ── Main component ─────────────────────────────────────── */
const AddStock = () => {
  const { stock, fetchStock } = useGlobalContext();
  const [product, setProduct] = useState(null);

  // ── Separate loading states to prevent hasRelation from flickering ──
  const [loadingRelation, setLoadingRelation] = useState(false);
  const [loadingProduct, setLoadingProduct] = useState(false);
  const [loadingStore2, setLoadingStore2] = useState(false);

  const loading = loadingRelation || loadingProduct || loadingStore2;

  const [submitting, setSubmitting] = useState(false);
  const [relationDetails, setRelationDetails] = useState({});
  const [stock2, setStock2] = useState({});
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [showConfirm, setShowConfirm] = useState(false);
  const [addUnit, setAddUnit] = useState('KG'); // 'KG' | 'MTR'

  /* ─── Derived values ──────────────────────────────────── */

  const existingStock = useMemo(
    () => stock.find((item) => Number(item.fabricNumber) === Number(formData.fabricNumber)),
    [stock, formData.fabricNumber]
  );

  // hasRelation only depends on loadingRelation — not the full loading state
  const hasRelation = !loadingRelation && relationDetails?.fabric_in_meter > 0;

  const showKgMeterInputs =
    !hasRelation && !!formData.fabric_source && formData.fabric_source !== 'Store2';

  const showQuantityInput =
    (formData.fabric_source === 'Vendor' || !formData.fabric_source) &&
    !(stock2?.availableStock > 0) &&
    !showKgMeterInputs;

  /* ─── Width multiplier ────────────────────────────────── */
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
            `${formData.fabricNumber} — fabric not found or no stock in Store 2. Please add new.`
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
    [formData.fabricNumber]
  );

  const fetchProduct = useCallback(async () => {
    if (!existingStock?.styleNumbers?.[0]) return;
    setLoadingProduct(true);
    try {
      const res = await axios.get(
        `https://inventorybackend-m1z8.onrender.com/api/product?style_code=${existingStock.styleNumbers[0]}`
      );
      setProduct(res.data[0] ?? null);
    } catch {
      setProduct(null);
    } finally {
      setLoadingProduct(false);
    }
  }, [existingStock?.styleNumbers]);

  /* ─── Effects ─────────────────────────────────────────── */

  useEffect(() => {
    const len = formData.fabricNumber.toString().length;
    if (len === 3 || len === 4) {
      fetchFabricRelationship(formData.fabricNumber);
      setStock2({});
    }
    if (len > 3) fetchProduct();
    if (len < 3) setProduct(null);
  }, [formData.fabricNumber]);

  // Reset addUnit when fabric number changes — NOT when hasRelation changes
  // (hasRelation was previously flickering because it depended on shared loading state)
  useEffect(() => {
    setAddUnit('KG');
    setFormData((prev) => ({ ...prev, availableStock: '' }));
  }, [formData.fabricNumber]);

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

  // Clear availableStock when unit switches so stale value doesn't carry over
  useEffect(() => {
    setFormData((prev) => ({ ...prev, availableStock: '' }));
  }, [addUnit]);

  /* ─── Handlers ────────────────────────────────────────── */

  const handleChange = useCallback((e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  }, []);

  const resetAll = useCallback(() => {
    setFormData(EMPTY_FORM);
    setRelationDetails({});
    setStock2({});
    setProduct(null);
    setAddUnit('KG');
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

      if (fabric_source === 'Store2') {
        // Transfer full Store 2 quantity (width multiplier does not apply to transfers)
        updatePayload.availableStock =
          Number(existingStock.availableStock || 0) + Number(stock2?.availableStock || 0);
      } else if (hasRelation) {
        const qty = Number(availableStock);
        let metersToAdd;
        if (addUnit === 'KG') {
          metersToAdd = qty * Number(relationDetails.fabric_in_meter) * wMul;
        } else {
          // MTR direct — add exactly what user entered (× width multiplier)
          metersToAdd = qty * wMul;
        }
        updatePayload.availableStock = Number(existingStock.availableStock || 0) + metersToAdd;
      } else {
        // No relation — create mapping from kg_unit/meter_unit; add meter_unit as stock
        if (!kg_unit || !meter_unit || Number(kg_unit) <= 0 || Number(meter_unit) <= 0) {
          toast.error('Please enter valid KG and Meter units.');
          return;
        }
        const one_kg = Number(meter_unit) / Number(kg_unit);
        await axios.post(`${BASE_URL}/relation/add-relationship`, [
          { fabric_number: formData.fabricNumber, fabric_in_KG: 1, fabric_in_meter: one_kg },
        ]);
        const metersToAdd = Number(meter_unit) * wMul;
        updatePayload.availableStock = Number(existingStock.availableStock || 0) + metersToAdd;
      }

      await axios.put(
        `${BASE_URL}/stock/${existingStock._id}?fabric_source=${fabric_source}`,
        updatePayload
      );

      toast.success('Stock updated successfully!');
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

  /* ─── Render ──────────────────────────────────────────── */

  const submitLabel = submitting
    ? formData.fabric_source === 'Store2'
      ? 'Transferring Stock…'
      : 'Adding Stock…'
    : formData.fabric_source === 'Store2'
      ? 'Transfer from Store 2'
      : 'Add Stock';

  return (
    <>
      {showConfirm && (
        <ConfirmDialog
          message="Are you sure you want to transfer this stock and remove it from Store 2?"
          onConfirm={doSubmit}
          onCancel={() => {
            setShowConfirm(false);
            resetAll();
          }}
        />
      )}

      <div className="min-h-screen bg-slate-50 py-10 px-4">
        {/* Page header */}
        <div className="max-w-5xl mx-auto mb-8">
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
              <p className="text-sm text-slate-500">Add new or transfer fabric inventory</p>
            </div>
          </div>
        </div>

        <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* ── Form card ── */}
          <div className="relative bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
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
              <h2 className="text-white font-semibold text-base">Stock Details</h2>
              <p className="text-emerald-100 text-xs mt-0.5">
                Fill in the fabric information below
              </p>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {/* Fabric Number + Source */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700">
                    Fabric Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    name="fabricNumber"
                    value={formData.fabricNumber}
                    onChange={handleChange}
                    placeholder="e.g. 6020"
                    className="w-full px-4 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all placeholder:text-slate-400"
                    required
                  />
                </div>
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
              </div>

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
                  <label className="text-sm font-medium text-slate-700 flex items-center justify-between">
                    <span>
                      Quantity to Add{' '}
                      <span className="text-slate-400 font-normal">
                        ({hasRelation ? addUnit : 'MTR'})
                      </span>
                      <span className="text-red-500"> *</span>
                    </span>
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
                      ≈ <span className="font-semibold text-emerald-600">{meterPreview} MTR</span>{' '}
                      will be added to stock
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
                    <p className="text-sm font-semibold text-blue-800">Store 2 Available Stock</p>
                    <p className="text-xs text-blue-600 mt-0.5">
                      Full quantity will be transferred to main store
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
                    className="w-full px-4 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all text-slate-700 bg-white"
                  >
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
              {formData.fabric_source && formData.fabricNumber && (
                <div className="flex gap-3 pt-1">
                  <button
                    type="button"
                    onClick={resetAll}
                    className="flex-1 py-2.5 text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
                  >
                    Reset
                  </button>
                  <button
                    type="submit"
                    disabled={submitting || loading}
                    className="flex-[2] flex items-center justify-center gap-2 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 rounded-xl transition-all disabled:opacity-60 disabled:cursor-not-allowed shadow-md shadow-emerald-200 cursor-pointer"
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

          {/* ── Product preview ── */}
          <div>
            {loadingProduct && !product ? (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 flex flex-col items-center justify-center min-h-[420px] gap-3">
                <div className="w-10 h-10 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
                <p className="text-sm text-slate-500">Loading product…</p>
              </div>
            ) : product?.style_id ? (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                  <div>
                    <h2 className="text-sm font-semibold text-slate-800">Product Preview</h2>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Style #{existingStock?.styleNumbers?.[0]}
                    </p>
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
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 flex flex-col items-center justify-center min-h-[420px] gap-3 text-center px-6">
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
                <p className="text-sm font-semibold text-slate-600">Enter a fabric number</p>
                <p className="text-xs text-slate-400">Product preview will appear here</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <ToastContainer
        position="top-right"
        autoClose={3000}
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

export default AddStock;
