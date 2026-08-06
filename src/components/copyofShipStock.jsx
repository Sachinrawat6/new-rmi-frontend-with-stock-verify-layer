import React, { useEffect, useRef, useState } from "react";
import { useGlobalContext } from "./context/StockContextProvider";
import axios from "axios";

const ShipStock = () => {
    const { stock, styleNumber } = useGlobalContext();
    const [product, setProduct] = useState([]);
    const [orderId, setOrderId] = useState("");
    const [apiResponse, setApiResponse] = useState([]);
    const [readyToSubmit, setReadyToSubmit] = useState(false);

    const buttonRef = useRef();
    const orderIdRef = useRef();
    const BASE_URL = "https://raw-material-backend.onrender.com"

    const API = "https://fastapi.qurvii.com";
    const [formData, setFormData] = useState({
        styleNumber: "",
        size: "",
    });


    console.log("Style details , ", styleNumber)
    console.log("stock details , ", stock)


    const postScanData = async () => {

        if (!orderId) {
            alert("Order Id required");
            return;
        }
        try {
            const response = await axios.post(`${API}/scan`, {
                user_id: 23,
                order_id: parseInt(orderId),
                user_location_id: 143,
            });
            const data = response.data.data;
            setApiResponse(data);
            // setReadyToSubmit(true);
            console.log(data);
        } catch (error) {
            console.log("Failed to scan data", error);
        }
    };

    useEffect(() => {
        if (orderId.toString().length >= 5) {
            postScanData();

            setTimeout(() => {
                buttonRef.current.click();
            }, 1000)


        } else {
            setApiResponse([]);
            if (orderId.toString().length < 5) {
                setFormData({ styleNumber: "", size: "" });
            }
        }
    }, [orderId]);

    const effectiveStyleNumber = orderId
        ? apiResponse?.style_number
        : formData.styleNumber;

    const matchedStyleDetails = styleNumber.find(
        (style) => style.styleNumber == effectiveStyleNumber
    );


    console.log("Matched details ", matchedStyleDetails)
    const getAverageValue = (xxsToM, lTo5xl) => {
        const sizeToCheck = orderId ? apiResponse?.size : formData.size;
        const smallSizes = ["XXS", "XS", "S", "M"];
        if (!sizeToCheck) return "";
        return smallSizes.includes(sizeToCheck) ? xxsToM : lTo5xl;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!orderId) return
        const dataToSave = {
            styleNumber: formData.styleNumber,
            size: formData.size,
            fabric_1_no: matchedStyleDetails?.fabrics[0]?.fabric_no || "",
            fabric_1_average: getAverageValue(
                matchedStyleDetails?.fabrics[0]?.average_xxs_m,
                matchedStyleDetails?.fabrics[0]?.average_l_5xl
            ),
            fabric_2_no: matchedStyleDetails?.fabrics[1]?.fabric_no || "",
            fabric_2_average: getAverageValue(
                matchedStyleDetails?.fabrics[1]?.average_xxs_m,
                matchedStyleDetails?.fabrics[1]?.average_l_5xl
            ),
            fabric_3_no: matchedStyleDetails?.fabrics[2]?.fabric_no || "",
            fabric_3_average: getAverageValue(
                matchedStyleDetails?.fabrics[2]?.average_xxs_m,
                matchedStyleDetails?.fabrics[2]?.average_l_5xl
            ),
        };

        const fabricsToUpdate = [
            { no: dataToSave.fabric_1_no, avg: dataToSave.fabric_1_average },
            { no: dataToSave.fabric_2_no, avg: dataToSave.fabric_2_average },
            { no: dataToSave.fabric_3_no, avg: dataToSave.fabric_3_average },
        ];

        try {
            for (const fabric of fabricsToUpdate) {
                const avg = Number(fabric.avg);
                if (!fabric.no || isNaN(avg) || avg <= 0) {
                    console.warn(`Skipping invalid fabric or avg: ${fabric.no}`);
                    continue; // skip invalid
                }

                const existingStock = stock.find(
                    (item) => item.fabricNumber === Number(fabric.no)
                );

                if (!existingStock) {
                    console.warn(`Stock not found for fabric ${fabric.no}`);
                    continue;
                }

                const currentStock = Number(existingStock.availableStock || 0);
                let newStock = currentStock - avg;

                // Prevent negative stock
                if (newStock < 0) newStock = 0;

                await axios.put(
                    `${BASE_URL}/api/v1/stock/${existingStock._id}`,
                    { availableStock: newStock }
                );

                console.log(
                    `Updated fabric ${fabric.no}: ${currentStock} - ${avg} = ${newStock}`
                );
            }

            alert("Stock updated successfully!");
            setFormData({ styleNumber: "", size: "" });
            setApiResponse([]);
            setOrderId("");
            orderIdRef.current.focus();
        } catch (error) {
            console.error("Error updating stock:", error);
            alert("Failed to update stock.");
            setFormData({ styleNumber: "", size: "" });
            setApiResponse([]);
            setOrderId("");
        }
    };



    // **************************************************************************************
    // *******************************getting styleNumber from api ***************************
    // ***************************************************************************************

    const handleFetchProduct = async () => {
        try {
            const response = await fetch(
                `https://inventorybackend-m1z8.onrender.com/api/product?style_code=${apiResponse?.style_number}`
            );
            const data = await response.json();
            setProduct(data[0]);
            console.log(data);
        } catch (error) {
            console.log("Failed to fetch prodcut details.");
        }
    };


    useEffect(() => {
        if (apiResponse) {
            handleFetchProduct();
        }
    }, [apiResponse?.style_number]);




    return (
        <div className="container mx-auto overflow-hidden">
            <div className=" grid grid-cols-2 ">
                <div className="left   p-6 bg-white rounded-lg border border-gray-200">
                    <h2 className="text-2xl font-bold text-gray-700 mb-6">
                        Minus Fabric Stock
                    </h2>

                    {/* ************************order id scan********************* */}
                    {/* *********************************************************** */}

                    {/* <form className="space-y-4" onSubmit={handleSubmit}> */}
                    <form className="space-y-4">


                        <div className="mt-4 mb-6">
                            <input
                                onChange={(e) => setOrderId(e.target.value)}
                                ref={orderIdRef}
                                value={orderId}
                                className="border border-gray-100 bg-gray-50 py-2 px-4 w-full rounded outline-gray-400 cursor-pointer"
                                type="number"
                                placeholder="Scan Order Id..."
                            />
                        </div>
                        {/* Style Number & Size */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label
                                    htmlFor="styleNumber"
                                    className="block text-sm font-medium text-gray-700 mb-1"
                                >
                                    Style Number *
                                </label>
                                <input
                                    id="styleNumber"
                                    type="number"
                                    name="styleNumber"
                                    className="w-full  bg-gray-100  rounded-md py-3 cursor-not-allowed px-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    required
                                    disabled
                                    value={
                                        !orderId ? formData.styleNumber : apiResponse?.style_number
                                    }
                                    onChange={(e) =>
                                        setFormData({ ...formData, styleNumber: e.target.value })
                                    }
                                />
                            </div>

                            <div>
                                <label
                                    htmlFor="size"
                                    className="block text-sm font-medium text-gray-700 mb-1"
                                >
                                    Size *
                                </label>
                                <input
                                    id="size"
                                    disabled
                                    type="text"
                                    name="size"
                                    className="w-full  bg-gray-100  rounded-md py-3 cursor-not-allowed px-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    required
                                    value={!orderId ? formData.size : apiResponse?.size}
                                    onChange={(e) =>
                                        setFormData({ ...formData, size: e.target.value })
                                    }
                                />
                            </div>
                        </div>

                        {/* Fabric Details */}
                        <div className="space-y-4">
                            <h3 className="text-lg font-medium text-gray-700 border-b border-gray-200 pb-2">
                                Fabric Details
                            </h3>

                            {/* Fabric 1 */}
                            <div className="bg-gray-50 p-4 rounded-md">
                                <h4 className="text-sm font-medium text-gray-600 mb-3">
                                    Fabric 1
                                </h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs text-gray-500 mb-1">
                                            Fabric Number
                                        </label>
                                        <input
                                            type="number"
                                            className="w-full border border-gray-200 rounded-md py-2 px-3 bg-gray-100 cursor-not-allowed"
                                            disabled
                                            value={matchedStyleDetails?.fabrics[0]?.fabric_no || ""}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs text-gray-500 mb-1">
                                            Average (XXS-M / L-5XL)
                                        </label>
                                        <input
                                            type="number"
                                            className="w-full border border-gray-200 rounded-md py-2 px-3 bg-gray-100 cursor-not-allowed"
                                            disabled
                                            name={
                                                formData.size
                                                    ? ["XXS", "XS", "S", "M"].includes(apiResponse?.size)
                                                        ? "average_xxs_m"
                                                        : "average_l_5xl"
                                                    : ""
                                            }
                                            value={
                                                apiResponse?.size
                                                    ? getAverageValue(
                                                        matchedStyleDetails?.fabrics[0]?.average_xxs_m,
                                                        matchedStyleDetails?.fabrics[0]?.average_l_5xl
                                                    )
                                                    : ""
                                            }
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Fabric 2 */}
                            <div className="bg-gray-50 p-4 rounded-md">
                                <h4 className="text-sm font-medium text-gray-600 mb-3">
                                    Fabric 2
                                </h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs text-gray-500 mb-1">
                                            Fabric Number
                                        </label>
                                        <input
                                            type="number"
                                            className="w-full border border-gray-200 rounded-md py-2 px-3 bg-gray-100 cursor-not-allowed"
                                            disabled
                                            value={matchedStyleDetails?.fabrics[1]?.fabric_no || ""}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs text-gray-500 mb-1">
                                            Average (XXS-M / L-5XL)
                                        </label>
                                        <input
                                            type="number"
                                            className="w-full border border-gray-200 rounded-md py-2 px-3 bg-gray-100 cursor-not-allowed"
                                            disabled
                                            name={
                                                formData.size
                                                    ? ["XXS", "XS", "S", "M"].includes(apiResponse?.size)
                                                        ? "average_xxs_m"
                                                        : "average_l_5xl"
                                                    : ""
                                            }
                                            value={
                                                apiResponse?.size
                                                    ? getAverageValue(
                                                        matchedStyleDetails?.fabrics[1]?.average_xxs_m,
                                                        matchedStyleDetails?.fabrics[1]?.average_l_5xl
                                                    )
                                                    : ""
                                            }
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Fabric 3 */}
                            <div className="bg-gray-50 p-4 rounded-md">
                                <h4 className="text-sm font-medium text-gray-600 mb-3">
                                    Fabric 3
                                </h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs text-gray-500 mb-1">
                                            Fabric Number
                                        </label>
                                        <input
                                            type="number"
                                            className="w-full border border-gray-200 rounded-md py-2 px-3 bg-gray-100 cursor-not-allowed"
                                            disabled
                                            value={matchedStyleDetails?.fabrics[2]?.fabric_no || ""}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs text-gray-500 mb-1">
                                            Average (XXS-M / L-5XL)
                                        </label>
                                        <input
                                            type="number"
                                            className="w-full border border-gray-200 rounded-md py-2 px-3 bg-gray-100 cursor-not-allowed"
                                            disabled
                                            name={
                                                formData.size
                                                    ? ["XXS", "XS", "S", "M"].includes(apiResponse?.size)
                                                        ? "average_xxs_m"
                                                        : "average_l_5xl"
                                                    : ""
                                            }
                                            value={
                                                apiResponse?.size
                                                    ? getAverageValue(
                                                        matchedStyleDetails?.fabrics[2]?.average_xxs_m,
                                                        matchedStyleDetails?.fabrics[2]?.average_l_5xl
                                                    )
                                                    : ""
                                            }
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="pt-4">
                            <button
                                // type="submit"
                                ref={buttonRef}
                                type="button"
                                onClick={handleSubmit}


                                className="w-full bg-red-500 cursor-pointer hover:bg-red-600 text-white font-medium py-2 px-4 rounded-md shadow-sm transition-colors duration-200 focus:outline-none "
                            >
                                Minus Fabric
                            </button>
                        </div>
                    </form>
                </div>

                {/* **********************************************right side contaiener which contains prodcut images************************************************
         *************************************************************************************************************************************************
         ************************************************************************************************************************************************* */}
                <div
                    className={`right  ${product?.style_id ? "block" : "hidden"} overflow-hidden w-[695px] -mt-4  rounded-lg shadow-xs `}
                >
                    <div className="overflow-hidden ">
                        <iframe
                            className="w-full h-[100vh] -mt-35"
                            src={`https://www.myntra.com/dresses/qurvii/qurvii-flared-sleeves-sequinned-georgette-a-line-midi-dress/${product?.style_id}/buy`}
                            frameborder="0"
                        ></iframe>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ShipStock;
