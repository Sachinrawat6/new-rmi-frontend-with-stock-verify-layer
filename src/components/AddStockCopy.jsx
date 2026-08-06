import React, { useState, useEffect } from "react";
import { useGlobalContext } from "./context/StockContextProvider";
import axios from "axios";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const AddStock = () => {
    const { stock, fetchStock } = useGlobalContext();
    const [product, setProduct] = useState([]);
    const [loading, setLoading] = useState(false);
    const [relationDetails, setRelationDetails] = useState({});
    const [stock2, setStock2] = useState({});
    const [formData, setFormData] = useState({
        fabricNumber: "",
        availableStock: "",
        location: "",
        unit: "METER",
        kg_unit: "",
        meter_unit: "",
        fabric_source: ""
    });
    const BASE_URL = "https://raw-material-backend.onrender.com"
    // const BASE_URL = "http://localhost:5000"


    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: value,
        }));
    };

    const fetchFabricKgAndMeterRelationShip = async (fabric_number) => {
        setLoading(true);
        try {
            if (!fabric_number) return
            const response = await axios.get(`${BASE_URL}/api/v1/relation/details?fabric_number=${fabric_number}`);
            console.log(response.data?.data);
            setRelationDetails(response.data?.data || {});

        } catch (error) {
            console.log("Failed to fetch relations details error :: ", error);
        } finally {

            setLoading(false);
        }
    }

    const fetchStore2Stock = async (fabric_number) => {
        setLoading(true);
        try {
            const response = await axios.get(`${BASE_URL}/api/v1/stock2?search=${fabric_number}`);
            const data = response.data.message?.stocks[0]
            if (!data?.availableStock || !data?.availableStock > 0) {
                alert(`${formData.fabricNumber} fabric number or stock not found in store 2. Please add new.`)
                setFormData({ fabricNumber: "", availableStock: "", location: "", kg_unit: "", meter_unit: "", fabric_source: "" });
                return
            }
            setStock2(data)
        } catch (error) {
            console.log("Failed to fetch store2 stock error :: ", error);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        if (relationDetails?.fabric_number && formData.fabric_source === "Store2") {
            fetchStore2Stock(relationDetails?.fabric_number)
        }
    }, [relationDetails?.fabric_number, formData.fabric_source])

    const handleSubmit = async (e) => {
        e.preventDefault();
        let confirmAction = true;

        if (formData.fabric_source === "Store2") {
            let confirmAction = window.confirm("Are you sure you want to add stock and remove the current stock from Store 2?");
            if (!confirmAction) {
                confirmAction = false;
                setFormData({ fabricNumber: "", availableStock: "", location: "", kg_unit: "", meter_unit: "", fabric_source: "" });
                return
            }
        }



        try {
            const { fabricNumber, availableStock, location, meter_unit, kg_unit } = formData;

            // Check if fabricNumber exists
            const existingStock = stock.find(
                (item) => Number(item.fabricNumber) === Number(fabricNumber)
            );

            if (!existingStock) {
                toast.error("Fabric number not found in current stock list.", {
                    position: "top-right",
                    autoClose: 3000,
                });
                return;
            }

            // Prepare payload according to schema
            let updatePayload = { location };
            // updatePayload.availableStock = Number(existingStock.availableStock || 0) + Number(availableStock)

            if (relationDetails.fabric_in_meter > 0) {
                updatePayload.availableStock = confirmAction ? Number(existingStock.availableStock || 0) + stock2?.availableStock : Number(availableStock) * Number(relationDetails.fabric_in_meter);
            }

            else {
                try {
                    let one_kg = Number(meter_unit) / Number(kg_unit);
                    const payload = [
                        {
                            fabric_number: fabricNumber,
                            fabric_in_KG: 1,
                            fabric_in_meter: one_kg
                        }
                    ]

                    updatePayload.availableStock = Number(existingStock.availableStock || 0) + Number(meter_unit)
                    const res = await axios.post(`${BASE_URL}/api/v1/relation/add-relationship`, payload)

                } catch (error) {
                    console.log("Failed to update fabric relationship error :: ", error);
                }
            }

            // Update via API
            const response = await axios.put(
                `${BASE_URL}/api/v1/stock/${existingStock._id}?fabric_source=${formData.fabric_source}`,
                updatePayload,

                //  { withCredentials: true }
            );
            console.log(response)

            toast.success("Stock updated successfully!", {
                position: "top-right",
                autoClose: 3000,
            });

            setFormData({ fabricNumber: "", availableStock: "", location: "", kg_unit: "", meter_unit: "", fabric_source: "" });
            setRelationDetails({})
            setProduct([])
            fetchStock();

        } catch (error) {
            console.error("Error updating stock:", error.response?.data || error.message);
            toast.error(`Failed to update stock ${error.response?.data.message} `, {
                position: "top-right",
                autoClose: 3000,
            });
        }
    };

    // Fetch product details for preview
    const handleFetchProduct = async () => {
        setLoading(true);
        try {
            const existingStock = stock.find(
                (item) => Number(item.fabricNumber) === Number(formData.fabricNumber)
            );

            if (!existingStock) return;
            console.log(existingStock)


            const response = await fetch(
                `https://inventorybackend-m1z8.onrender.com/api/product?style_code=${existingStock?.styleNumbers[0]}`
                // `https://inventorybackend-m1z8.onrender.com/api/product?style_code=24042`
            );
            const data = await response.json();
            setProduct(data[0]);
        } catch (error) {
            console.log("Failed to fetch product details.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (formData.fabricNumber.toString().length > 3) {
            handleFetchProduct();
        }
    }, [formData.fabricNumber]);

    useEffect(() => {
        if (formData.fabricNumber?.toString().length === 4 || formData.fabricNumber?.toString().length === 3) {
            fetchFabricKgAndMeterRelationShip(formData.fabricNumber);
            setRelationDetails({})
        }
    }, [formData.fabricNumber]);


    console.log("stock ", stock2)

    return (
        <div className="container mx-auto p-6 bg-white rounded-lg relative border border-gray-200">
            <div className="grid grid-cols-2 gap-10">
                {/* Left Side Form */}
                <div className="left">
                    <ToastContainer />

                    <h2 className="text-2xl font-bold text-gray-700 mb-6">Add Fabric Stock</h2>

                    <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4 items-center">
                        {/* Fabric Number */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Fabric Number
                            </label>
                            <input
                                type="number"
                                name="fabricNumber"
                                value={formData.fabricNumber}
                                onChange={handleChange}
                                placeholder="Enter fabric number..."
                                className="w-full px-4 py-2 bg-gray-100 rounded-md outline-gray-200"
                                required
                            />
                        </div>
                        <div >
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Fabric Source
                            </label>
                            <select name="fabric_source"
                                value={formData.fabric_source}
                                onChange={handleChange}
                                className="w-full px-4 py-2 bg-gray-100 rounded-md outline-gray-200"
                            >
                                <option value="">Select Source </option>
                                <option value="Vendor">Vendor </option>
                                <option value="Store2">Store2</option>
                            </select>
                        </div>


                        {relationDetails?.fabric_in_KG && formData.fabric_source && (
                            <>
                                <div>

                                    {relationDetails.fabric_in_meter > 0 && !loading && (
                                        <p className="w-full cursor-not-allowed px-4 py-2 bg-gray-100 rounded-md outline-gray-200"> 1 KG </p>
                                    )}
                                </div>
                                <div>

                                    {relationDetails.fabric_in_meter > 0 && !loading && (
                                        <p className="w-full cursor-not-allowed px-4 py-2 bg-gray-100 rounded-md outline-gray-200"> {relationDetails.fabric_in_meter} Meter </p>
                                    )}
                                </div>
                                {!loading && (!stock2?.availableStock > 0 || formData.fabric_source !== "Store2") && !relationDetails?.fabric_in_meter > 0 && (
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Kg Unit
                                        </label>
                                        <input
                                            type="number"
                                            name="kg_unit"
                                            value={formData.kg_unit}
                                            onChange={handleChange}
                                            placeholder="Enter Kg unit"
                                            className="w-full px-4 py-2 bg-gray-100 rounded-md outline-gray-200"
                                            required
                                            min="1"
                                        />
                                    </div>
                                )}

                                {!loading && (!stock2?.availableStock > 0 || formData.fabric_source !== "Store2") && !relationDetails?.fabric_in_meter > 0 && (
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Meter Unit
                                        </label>
                                        <input
                                            type="number"
                                            name="meter_unit"
                                            value={formData.meter_unit}
                                            onChange={handleChange}
                                            placeholder="Enter Meter unit"
                                            className="w-full px-4 py-2 bg-gray-100 rounded-md outline-gray-200"
                                            required
                                            min="1"
                                        />
                                    </div>
                                )}

                                {/* Quantity */}

                                {/* {relationDetails.fabric_in_meter > 0 && !loading && ( */}
                                {!stock2?.availableStock > 0 && !loading && (
                                    <div className="col-span-2">
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Quantity to Add (KG)
                                        </label>
                                        <input
                                            type="number"
                                            name="availableStock"
                                            value={formData.fabric_source === "Store2" && stock2?.availableStock > 0 ? stock2?.availableStock : formData.availableStock}
                                            onChange={handleChange}
                                            placeholder="Enter quantity in KG"
                                            className="w-full px-4 py-2 bg-gray-100 rounded-md outline-gray-200"
                                            required
                                            min="1"
                                        />
                                    </div>
                                )}

                                {/* Location */}
                                <div className="col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Location
                                    </label>
                                    <input
                                        type="text"
                                        name="location"
                                        value={formData.location}
                                        onChange={handleChange}
                                        placeholder="Enter Location"
                                        className="w-full px-4 py-2 uppercase bg-gray-100 rounded-md outline-gray-200"
                                        required
                                    />
                                </div>

                                {/* Submit */}
                                <div className="col-span-2">
                                    <button
                                        type="submit"
                                        className="w-full bg-[#222] hover:bg-[#333] text-white font-medium py-2.5 px-4 rounded-md transition duration-200 hover:shadow-md active:scale-95"
                                    >
                                        Add Stock
                                    </button>
                                </div>

                            </>
                        )}
                    </form>
                </div>




                {/* Right Side Product Preview */}
                {loading ? (
                    <div className="flex flex-col items-center justify-center mt-10 gap-2">
                        <div className="w-8 h-8 border-4 border-[#222] border-t-transparent rounded-full animate-spin"></div>
                        <p className="text-center text-sm text-gray-600">
                            Product image loading...
                        </p>
                    </div>
                ) : (
                    product?.style_id && (
                        <div className="right overflow-hidden w-[695px] -mt-4 rounded-lg shadow-xs">
                            <iframe
                                className="w-full h-[100vh] -mt-35"
                                src={`https://www.myntra.com/dresses/qurvii/qurvii-flared-sleeves-sequinned-georgette-a-line-midi-dress/${product?.style_id}/buy`}
                                frameBorder="0"
                            ></iframe>
                        </div>
                    )
                )}


            </div>
        </div>
    );
};

export default AddStock;
