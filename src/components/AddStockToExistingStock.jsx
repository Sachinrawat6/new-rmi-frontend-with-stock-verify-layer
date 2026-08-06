import React, { useEffect, useState, useMemo, useCallback } from 'react';
import axios from 'axios';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import {
  FaBox,
  FaPlus,
  FaSpinner,
  FaCheckCircle,
  FaWarehouse,
  FaCalendarAlt,
  FaTag,
  FaSearchLocation,
  FaLayerGroup,
} from 'react-icons/fa';
import { useGlobalContext } from './context/StockContextProvider';
import { BASE_URL } from '../constant/index.js';

// const BASE_URL = 'https://raw-material-backend.onrender.com';

const EMPTY_FORM = { fabricNumber: '', stockQuantity: '', location: '', width: 'Normal' };

const AddStockToExistingStock = () => {
  const { meterAndKG, fetchMeterAndKgRelationShip, styleLoading, stock } = useGlobalContext();
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [product, setProduct] = useState({});
  const [loading, setLoading] = useState(false);
  const [updatedStock, setUpdatedStock] = useState(null);

  useEffect(() => {
    fetchMeterAndKgRelationShip();
  }, []);

  /* ─── Derived values ─────────────────────────────────── */

  const fabricEntry = useMemo(
    () => stock.find((f) => f.fabricNumber === Number(formData.fabricNumber)),
    [stock, formData.fabricNumber]
  );

  const currentExistingStock = fabricEntry?.availableStock;
  const currentExistingStockId = fabricEntry?._id;
  const styleNumber = fabricEntry?.styleNumbers?.[0];

  const fabricAverage = useMemo(() => {
    if (!meterAndKG.length || formData.fabricNumber.toString().length <= 3) return null;
    return (
      meterAndKG.find((fab) => fab.fabric_number === Number(formData.fabricNumber))
        ?.fabric_in_meter ?? null
    );
  }, [meterAndKG, formData.fabricNumber]);

  const widthMultiplier = formData.width === 'Wide' ? 1.4 : 1;

  const mtrPreview = useMemo(() => {
    if (!fabricAverage || !formData.stockQuantity) return null;
    return (Number(formData.stockQuantity) * fabricAverage * widthMultiplier).toFixed(2);
  }, [fabricAverage, formData.stockQuantity, widthMultiplier]);

  /* ─── Fetch product preview ──────────────────────────── */

  const handleFetchProduct = useCallback(async () => {
    if (!styleNumber) return;
    try {
      const res = await axios.get(
        `https://inventorybackend-m1z8.onrender.com/api/product?style_code=${styleNumber}`
      );
      setProduct(res.data[0] ?? {});
    } catch {
      setProduct({});
    }
  }, [styleNumber]);

  useEffect(() => {
    if (formData.fabricNumber.length >= 3) {
      handleFetchProduct();
    } else {
      setProduct({});
    }
  }, [formData.fabricNumber, handleFetchProduct]);

  /* ─── Handlers ───────────────────────────────────────── */

  const handleInputChange = useCallback((e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  }, []);

  const resetForm = useCallback((e) => {
    e?.preventDefault();
    setFormData(EMPTY_FORM);
    setProduct({});
    setUpdatedStock(null);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.fabricNumber || !formData.stockQuantity) {
      toast.error('Please fill all required fields.');
      return;
    }
    if (!fabricAverage || fabricAverage < 1) {
      toast.error('Unmapped relationship. Please map KG and METER first.');
      return;
    }

    setLoading(true);
    try {
      const metersToAdd = Number(formData.stockQuantity) * fabricAverage * widthMultiplier;

      const [response] = await Promise.all([
        axios.put(
          `${BASE_URL}/stock/update`,
          {
            fabricNumber: formData.fabricNumber,
            stockQuantity: metersToAdd,
            location: formData.location,
          },
          { headers: { 'Content-Type': 'application/json' } }
        ),
        axios.put(`${BASE_URL}/stock/${currentExistingStockId}?fabric_source=Vendor`, {
          location: formData.location,
        }),
      ]);

      if (response.data.success) {
        setUpdatedStock(response.data.message);
        toast.success('Stock updated successfully!');
        // Clear form + product so preview doesn't reappear after success card disappears
        setFormData(EMPTY_FORM);
        setProduct({});
        setTimeout(() => setUpdatedStock(null), 3000);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update stock.');
    } finally {
      setLoading(false);
    }
  };

  /* ─── Loading state ──────────────────────────────────── */

  if (styleLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <FaSpinner className="animate-spin text-indigo-600 text-3xl" />
          <p className="text-slate-500 text-sm font-medium">Loading stock data…</p>
        </div>
      </div>
    );
  }

  const showPreview = !updatedStock && styleNumber;

  /* ─── Render ─────────────────────────────────────────── */

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4">
      {/* Page header */}
      <div className="max-w-5xl mx-auto mb-8">
        <div className="flex items-center gap-3">
          <div className="bg-indigo-600 text-white p-2.5 rounded-xl">
            <FaLayerGroup className="text-lg" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800">Add Stock</h1>
            <p className="text-sm text-slate-500">Update existing fabric inventory</p>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ── Form Card ── */}

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="bg-gradient-to-r from-indigo-600 to-violet-600 px-6 py-4">
            <h2 className="text-white font-semibold text-base">Stock Details</h2>
            <p className="text-indigo-200 text-xs mt-0.5">Fill in the fabric information below</p>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            {/* Fabric Number */}
            <div className="space-y-1.5">
              <label
                htmlFor="fabricNumber"
                className="flex items-center gap-2 text-sm font-medium text-slate-700"
              >
                <FaTag className="text-indigo-500 text-xs" />
                Fabric Number <span className="text-red-500">*</span>
                {currentExistingStock !== undefined && (
                  <span className="ml-auto text-xs font-semibold bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full border border-indigo-100">
                    Stock: {parseInt(currentExistingStock)} MTR
                  </span>
                )}
              </label>
              <input
                type="number"
                id="fabricNumber"
                name="fabricNumber"
                value={formData.fabricNumber}
                onChange={handleInputChange}
                placeholder="e.g. 6020"
                className="w-full px-4 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all placeholder:text-slate-400"
                required
              />
            </div>

            {/* Stock Quantity */}
            <div className="space-y-1.5">
              <label
                htmlFor="stockQuantity"
                className="flex items-center gap-2 text-sm font-medium text-slate-700"
              >
                <FaPlus className="text-emerald-500 text-xs" />
                Quantity to Add (KG) <span className="text-red-500">*</span>
                {fabricAverage > 0 && (
                  <span className="ml-auto text-xs font-semibold bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full border border-emerald-100">
                    1 KG = {fabricAverage} MTR
                  </span>
                )}
              </label>
              <input
                type="number"
                id="stockQuantity"
                name="stockQuantity"
                value={formData.stockQuantity}
                onChange={handleInputChange}
                placeholder="Enter quantity in KG"
                className="w-full px-4 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all placeholder:text-slate-400"
                required
              />
              {mtrPreview && (
                <p className="text-xs text-slate-500 pl-1">
                  ≈ <span className="font-semibold text-indigo-600">{mtrPreview} MTR</span> will be
                  added
                  {formData.width === 'Wide' && (
                    <span className="text-amber-600 ml-1">(×1.4 Wide)</span>
                  )}
                </p>
              )}
            </div>

            {/* Width */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">Width</label>
              <select
                name="width"
                value={formData.width}
                onChange={handleInputChange}
                className="w-full px-4 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-slate-700 bg-white"
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

            {/* Location */}
            <div className="space-y-1.5">
              <label
                htmlFor="location"
                className="flex items-center gap-2 text-sm font-medium text-slate-700 "
              >
                <FaSearchLocation className="text-amber-500 text-xs" />
                Location <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="location"
                name="location"
                value={formData.location}
                onChange={handleInputChange}
                placeholder="e.g. Warehouse A, Rack 3"
                className="w-full px-4 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all placeholder:text-slate-400"
                required
              />
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-1">
              <button
                onClick={resetForm}
                type="button"
                className="flex-1 py-2.5 px-4 text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all duration-150 cursor-pointer"
              >
                Reset
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-[2] flex items-center justify-center gap-2 py-2.5 px-4 text-sm font-semibold text-white bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 rounded-xl transition-all duration-150 disabled:opacity-60 disabled:cursor-not-allowed shadow-md shadow-indigo-200 cursor-pointer"
              >
                {loading ? (
                  <>
                    <FaSpinner className="animate-spin" />
                    Updating…
                  </>
                ) : (
                  <>
                    <FaPlus />
                    Add Stock
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* ── Right Panel ── */}
        <div>
          {/* Success Card */}
          {updatedStock && (
            <div className="bg-white rounded-2xl shadow-sm border border-emerald-200 overflow-hidden animate-fade-in">
              <div className="bg-gradient-to-r from-emerald-500 to-teal-500 px-6 py-4 flex items-center gap-3">
                <div className="bg-white/20 p-2 rounded-full">
                  <FaCheckCircle className="text-white text-lg" />
                </div>
                <div>
                  <h2 className="text-white font-semibold text-base">Stock Updated!</h2>
                  <p className="text-emerald-100 text-xs mt-0.5">Changes saved successfully</p>
                </div>
              </div>

              <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                    <p className="text-xs text-slate-400 mb-1">Fabric Name</p>
                    <p className="text-sm font-semibold text-slate-800">
                      {updatedStock.fabricName}
                    </p>
                  </div>
                  <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                    <p className="text-xs text-slate-400 mb-1">Fabric Number</p>
                    <p className="text-sm font-semibold text-slate-800">
                      {updatedStock.fabricNumber}
                    </p>
                  </div>
                </div>

                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center justify-between">
                  <div>
                    <p className="text-xs text-emerald-600 mb-0.5">Available Stock</p>
                    <p className="text-2xl font-bold text-emerald-700">
                      {updatedStock.availableStock?.toFixed(2)}
                      <span className="text-sm font-medium ml-1">MTR</span>
                    </p>
                  </div>
                  <div className="bg-emerald-100 p-3 rounded-xl">
                    <FaBox className="text-emerald-600 text-xl" />
                  </div>
                </div>

                <div className="space-y-2.5">
                  <div className="flex items-center gap-3 text-sm">
                    <div className="bg-slate-100 p-1.5 rounded-lg">
                      <FaWarehouse className="text-slate-500 text-xs" />
                    </div>
                    <span className="text-slate-500">Location</span>
                    <span className="ml-auto font-medium text-slate-800">
                      {updatedStock.location}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <div className="bg-slate-100 p-1.5 rounded-lg">
                      <FaCalendarAlt className="text-slate-500 text-xs" />
                    </div>
                    <span className="text-slate-500">Updated</span>
                    <span className="ml-auto font-medium text-slate-800">
                      {new Date(updatedStock.updatedAt).toLocaleString()}
                    </span>
                  </div>
                </div>

                {updatedStock.styleNumbers?.length > 0 && (
                  <div className="border-t border-slate-100 pt-4">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                      Style Numbers
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {updatedStock.styleNumbers.slice(0, 6).map((style, i) => (
                        <span
                          key={i}
                          className="bg-indigo-50 text-indigo-700 border border-indigo-100 px-2 py-0.5 rounded-lg text-xs font-medium"
                        >
                          {style}
                        </span>
                      ))}
                      {updatedStock.styleNumbers.length > 6 && (
                        <span className="bg-slate-100 text-slate-500 px-2 py-0.5 rounded-lg text-xs">
                          +{updatedStock.styleNumbers.length - 6} more
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Product Preview */}
          {showPreview && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-semibold text-slate-800">Product Preview</h2>
                  <p className="text-xs text-slate-400 mt-0.5">Style #{styleNumber}</p>
                </div>
                <span className="text-xs bg-indigo-50 text-indigo-600 border border-indigo-100 px-2 py-1 rounded-full font-medium">
                  Live
                </span>
              </div>

              <div className="bg-slate-50 min-h-[480px] flex items-center justify-center">
                {loading ? (
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                    <p className="text-sm text-slate-500">Loading preview…</p>
                  </div>
                ) : product?.style_id ? (
                  <iframe
                    className="w-full h-[520px] -mt-36"
                    src={`https://www.myntra.com/dresses/qurvii/qurvii-flared-sleeves-sequinned-georgette-a-line-midi-dress/${product.style_id}/buy`}
                    frameBorder="0"
                    title="Product Preview"
                  />
                ) : (
                  <div className="flex flex-col items-center gap-3 text-slate-400 px-6 text-center">
                    <div className="bg-slate-200 p-5 rounded-2xl">
                      <FaBox className="text-3xl text-slate-400" />
                    </div>
                    <p className="text-sm font-medium text-slate-600">
                      No product found for this style
                    </p>
                    <p className="text-xs text-slate-400">Try a different fabric number</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Empty state */}
          {!showPreview && !updatedStock && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-10 flex flex-col items-center justify-center text-center min-h-[300px]">
              <div className="bg-indigo-50 p-5 rounded-2xl mb-4">
                <FaLayerGroup className="text-3xl text-indigo-400" />
              </div>
              <p className="text-sm font-semibold text-slate-600">Enter a fabric number</p>
              <p className="text-xs text-slate-400 mt-1">Product preview will appear here</p>
            </div>
          )}
        </div>
      </div>

      <ToastContainer
        position="top-right"
        autoClose={4000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        pauseOnHover
        draggable
        theme="light"
        toastClassName="text-sm"
      />
    </div>
  );
};

export default AddStockToExistingStock;
