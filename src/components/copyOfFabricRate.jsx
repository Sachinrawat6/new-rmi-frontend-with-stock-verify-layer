import React, { useEffect, useState } from 'react'
import { fetchFabricDataFromGoogleSheet } from '../service/GoogleSheet.services';
import axios from 'axios';

const FabricRate = () => {
    const [fabricRate, setFabricRate] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [searchTerm, setSearchTerm] = useState("");
    const FABRIC_RELATION_URL = "http://localhost:5000/api/v1/relation/add-relationship";
    const [currentPage, setCurrentPage] = useState(1);
    const PAGE_SIZE = 50;

    // Fetch data from Google Sheet
    const fetchFabricRates = async () => {
        setLoading(true);
        try {
            const response = await fetchFabricDataFromGoogleSheet();
            setFabricRate(response);
            setError(null);
        } catch (error) {
            console.log("Failed to fetch fabric weight from google sheet error :: ", error?.message);
            setError(`Failed to fetch fabric weight from google sheet error ::  ${error?.message}`);
        } finally {
            setLoading(false);
        }
    };


    const upsertFabricDetails = async () => {
        try {
            const payload = fabricRate.map((fab) => (

                {
                    fabric_number: Number(fab.fabric_number),
                    fabric_name: fab.fabric_name || "",
                    vender: fab.vender || "",
                    fabric_rate: Number(fab.fabric_rate) || "",
                    unit: fab.unit || "",
                    fabric_length: fab.length || "",
                    recieved_qty_meter: Number(fab.recieved_qty_meter) || 0,
                    recieved_qty_kg: Number(fab.recieved_qty_kg) || 0,
                    width: fab.width || "",
                    recieved_date: fab.date || ""
                }
            ))




            const response = await axios.post("http://localhost:5000/api/v1/fabric-rate/add-fabric-details", payload,
                { headers: { "Content-Type": "application/json" } }
            )
            console.log(response.data)
            alert(response.data?.message)


        } catch (error) {
            console.log("Failed to upsertFabricDetails error :: ", error);
        }
    }


    useEffect(() => {
        fetchFabricRates();
    }, []);

    useEffect(() => {
        if (fabricRate.length > 0) {
            upsertFabricDetails()
        }
    }, [fabricRate])
    // Reset page to 1 when search changes
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm]);


    // ___________________________ updating meter and kg relationship __________________________ 

    const updateMeterAndKgRelationShip = async () => {
        try {
            const payload = fabricRate.map((fab) => (
                {
                    fabric_number: fab.fabric_number || "",
                    fabric_in_KG: 1,
                    fabric_in_meter: fab.recieved_qty_kg > 0 ? (fab.recieved_qty_meter / fab.recieved_qty_kg).toFixed(2) : ""
                }
            ))

            const response = await axios.post(FABRIC_RELATION_URL, payload);
            console.log(response.data);
        } catch (error) {
            console.log("Failed to update fabric relationship error :: ", error);
        }
    }



    if (loading) return <p className='py-4 text-center'>Loading...</p>;

    // Filtered data based on search
    const filteredData = fabricRate.filter((fab) => {
        const term = searchTerm.toLowerCase();
        return (
            fab.fabric_number?.toString().toLowerCase().includes(term) ||
            fab.fabric_name?.toLowerCase().includes(term) ||
            fab.vender?.toLowerCase().includes(term) ||
            fab.unit?.toString().toLowerCase().includes(term) ||
            fab.length?.toString().toLowerCase().includes(term) ||
            fab.width?.toString().toLowerCase().includes(term) ||
            fab.date?.toString().toLowerCase().includes(term)
        );
    });

    const totalRecords = filteredData.length;
    const NO_OF_PAGES = Math.ceil(totalRecords / PAGE_SIZE);
    const start = (currentPage - 1) * PAGE_SIZE;
    const end = Math.min(start + PAGE_SIZE, totalRecords);

    const dataToDisplay = filteredData.slice(start, end);

    // Pagination handlers
    const handlePrev = () => {
        if (currentPage > 1) setCurrentPage(currentPage - 1);
    };

    const handleNext = () => {
        if (currentPage < NO_OF_PAGES) setCurrentPage(currentPage + 1);
    };









    return (
        <div className='max-w-7xl mx-auto p-4'>
            {error && <p className='py-4 px-4 text-center text-red-600 font-medium'>{error}</p>}

            {/* Search Input */}
            <input
                type="text"
                placeholder='Search by fabric no.| fabric name | vender | unit | length | width | date'
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className='w-full border border-gray-300 outline-none py-2 px-4 rounded-md my-4'
            />

            <div className='my-4'>
                <button className='bg-blue-400 text-white py-2 px-4 rounded-md ' onClick={updateMeterAndKgRelationShip}> UpsertFabric </button>
            </div>

            {/* Table */}
            <table className='w-full border-collapse'>
                <thead>
                    <tr className='bg-gray-200'>
                        <th className='text-[14px] py-2 px-4'>FABRIC NO.</th>
                        <th className='text-[14px] py-2 px-4'>FABRIC NAME</th>
                        <th className='text-[14px] py-2 px-4'>VENDER NAME</th>
                        <th className='text-[14px] py-2 px-4'>FABRIC RATE</th>
                        <th className='text-[14px] py-2 px-4'>UNIT</th>
                        <th className='text-[14px] py-2 px-4'>FABRIC LENGTH</th>
                        <th className='text-[14px] py-2 px-4'>RCD IN (MTR)</th>
                        <th className='text-[14px] py-2 px-4'>RCD IN(KG)</th>
                        <th className='text-[14px] py-2 px-4'>W & KG RELATION</th>
                        <th className='text-[14px] py-2 px-4'>WIDTH</th>
                        <th className='text-[14px] py-2 px-4'>RECIEVED DATE</th>
                    </tr>
                </thead>
                <tbody>
                    {dataToDisplay.length > 0 ? (
                        dataToDisplay.map((fab, i) => (
                            <tr key={fab.fabric_number + i} className='border-b cursor-pointer hover:bg-gray-100 ease-in duration-75 border-b-gray-200'>
                                <td className='py-2 px-4'>{fab.fabric_number}</td>
                                <td className='py-2 px-4'>{fab.fabric_name}</td>
                                <td className='py-2 px-4'>{fab.vender}</td>
                                <td className='py-2 px-4'>{fab.fabric_rate}</td>
                                <td className='py-2 px-4'>{fab.unit}</td>
                                <td className='py-2 px-4'>{fab.length}</td>
                                <td className='py-2 px-4'>{fab.recieved_qty_meter}</td>
                                <td className='py-2 px-4'>{fab.recieved_qty_kg}</td>
                                <td className='py-2 px-4'>
                                    {fab.recieved_qty_kg > 0
                                        ? (fab.recieved_qty_meter / fab.recieved_qty_kg).toFixed(2)
                                        : ""}
                                </td>


                                <td className='py-2 px-4 truncate'>{fab.width}</td>
                                <td className='py-2 px-4 truncate'>
                                    <span className={`${!fab.date ? "bg-red-100 text-red-900" : "bg-green-100 text-green-900"} py-1 px-2 rounded-md`}>
                                        {fab.date
                                            ? new Date(fab.date).toLocaleString("en-IN", {
                                                day: "2-digit",
                                                month: "short",
                                                year: "numeric",
                                            })
                                            : "NA"
                                        }

                                        {/* {fab.date || "NA"} */}
                                    </span>
                                </td>
                            </tr>
                        ))
                    ) : (
                        <tr>
                            <td colSpan={10} className='py-4 text-center text-gray-500'>No records found</td>
                        </tr>
                    )}
                </tbody>
            </table>

            {/* Pagination */}
            {NO_OF_PAGES > 1 && (
                <div className='flex justify-center gap-2 my-4'>
                    <button
                        onClick={handlePrev}
                        disabled={currentPage === 1}
                        className={`py-2 px-4 rounded-md ${currentPage === 1 ? "bg-gray-200 cursor-not-allowed" : "bg-gray-100 hover:bg-gray-200"}`}
                    >
                        Previous
                    </button>

                    {[...Array(NO_OF_PAGES)].map((_, i) => (
                        <button
                            key={i}
                            onClick={() => setCurrentPage(i + 1)}
                            className={`w-[40px] h-[40px] rounded-full ${currentPage === i + 1 ? "bg-blue-500 text-white" : "bg-gray-100 hover:bg-gray-200"}`}
                        >
                            {i + 1}
                        </button>
                    ))}

                    <button
                        onClick={handleNext}
                        disabled={currentPage === NO_OF_PAGES}
                        className={`py-2 px-4 rounded-md ${currentPage === NO_OF_PAGES ? "bg-gray-200 cursor-not-allowed" : "bg-gray-100 hover:bg-gray-200"}`}
                    >
                        Next
                    </button>
                </div>
            )}
        </div>
    );
};

export default FabricRate;
