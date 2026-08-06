import axios from 'axios';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { BASE_URL } from '../../constant/index.js';

const StockContext = createContext();

const StockContextProvider = ({ children }) => {
  const [stock, setStock] = useState([]);
  const [stock2, setStock2] = useState([]);
  const [styleNumber, setStyleNumber] = useState([]);
  const [styleLoading, setStyleLoading] = useState(false);
  const [stockLoading, setStockLoading] = useState(false);
  const [meterAndKG, setMeterAndKG] = useState([]);
  const [user, setUser] = useState();
  const [usersList, setUsersList] = useState([]);
  const [storeHelperOrderIds, setStoreHelperOrderIds] = useState([]);
  const [fabricPurchaseHistory, setFabricPurchaseHistory] = useState([]);

  // const BASE_URL = 'https://raw-material-backend.onrender.com';
  // const BASE_URL = "http://localhost:5000"

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    const storedToken = localStorage.getItem('token');

    if (storedUser && storedToken) {
      setUser({ ...JSON.parse(storedUser), token: storedToken });
    }
  }, []);
  // fetching stock from database
  const fetchStock = async () => {
    const API_URL = `${BASE_URL}/stock`;
    setStockLoading(true);
    try {
      const { data } = await axios.get(API_URL);

      setStock(data.data);
      //  console.log(data.data)
    } catch (error) {
      console.log('Failed to fetch stock from database. The error is: ', error);
    } finally {
      setStockLoading(false);
    }
  };

  // fetching stylenumber with patternumber from database
  const fetchStyleNumber = async () => {
    const API_URL = `${BASE_URL}/style-details`;
    try {
      setStyleLoading(true);
      const { data } = await axios.get(API_URL);
      setStyleNumber(data.data);
      // console.log(data.data);
    } catch (error) {
      console.log(`Failed to fetch style nubmer from database. The error is :`, error);
    } finally {
      setStyleLoading(false);
    }
  };

  // fetching meter and kg relationship from database
  const fetchMeterAndKgRelationShip = async () => {
    const API_URL = `${BASE_URL}/relation/get-relationship`;
    try {
      setStyleLoading(true);
      const { data } = await axios.get(API_URL);
      setMeterAndKG(data.data);
      // console.log(data.data);
    } catch (error) {
      console.log(
        `Failed to fetch meter and kg relationship data from database. The error is :`,
        error
      );
    } finally {
      setStyleLoading(false);
    }
  };

  // fetching users list

  const fetchUsersList = async () => {
    setStyleLoading(true);
    try {
      const response = await axios.get(
        `${BASE_URL}/users`,
        {}
        // { withCredentials: true }
      );
      setUsersList(response.data.data);
    } catch (error) {
      console.log('Failed to fetch users ', error);
    } finally {
      setStyleLoading(false);
    }
  };

  // updadint user detils
  const updateUserRole = async (id, data) => {
    try {
      const res = await axios.put(
        `${BASE_URL}/users/update-user/${id}`,
        { role: data }
        //  { withCredentials: true }
      );
      return res;
    } catch (error) {
      console.error('Failed to update user error :: ', error);
    }
  };

  // delete user

  const deleteUser = async (id) => {
    try {
      const res = await axios.delete(
        `${BASE_URL}/users/${id}`,

        { withCredentials: true }
      );
      return res;
    } catch (error) {
      console.log('Failed to delete user error :: ', error);
    }
  };

  // fetch store helper scanned order_id  details

  const fetchStoreHelperOrderIds = async (date) => {
    setStyleLoading(true);
    try {
      let allRecords = [];
      let offset = 0;
      const limit = 1000; // Max records per request
      let hasMore = true;
      while (hasMore) {
        const options = {
          method: 'GET',
          url: 'https://nocodb.qurvii.com/api/v2/tables/mhhxiprapvyqjtf/records',
          params: {
            limit: limit.toString(),
            offset: offset.toString(),
            where: `(scanned_timestamp,eq,exactDate,${date})`,
          },
          headers: {
            'xc-token': 'LsOnEY-1wS4Nqjz15D1_gxHu0pFVcmA_5LNqCAqK',
          },
        };

        const res = await axios.request(options);

        if (res.data.list && res.data.list.length > 0) {
          allRecords = [...allRecords, ...res.data.list];
          offset += res.data.list.length;

          // Check if we got fewer records than requested (end of data)
          if (res.data.list.length < limit) {
            hasMore = false;
          }
        } else {
          hasMore = false;
        }
      }

      let filteredRecord = allRecords.filter(
        (r) => r.locations?.name?.split(' / ')[0].toLowerCase() === 'store helper'
      );
      console.log(filteredRecord);
      setStoreHelperOrderIds(filteredRecord);
    } catch (error) {
      console.log('Failed to fetch store helper details from nocodb error :: ', error);
    } finally {
      setStyleLoading(false);
    }
  };

  // fetch fabric purchase history from database
  const fetchFabricPurchaseHistory = async () => {
    setStyleLoading(true);
    try {
      const response = await axios.get(`${BASE_URL}/fabric-rate/`);
      console.log(response.data.data);
      setFabricPurchaseHistory(response.data.data);
    } catch (error) {
      console.log('Failed to fetch fabric purchase history error :: ', error);
      throw Error(error?.message || error);
    } finally {
      setStyleLoading(false);
    }
  };

  // fetching stock from database
  const fetchStock2 = async () => {
    const API_URL = `${BASE_URL}/stock2/`;
    setStockLoading(true);
    try {
      const { data } = await axios.get(API_URL);
      setStock2(data.message.stocks);
      //  console.log(data.data)
    } catch (error) {
      console.log('Failed to fetch stock2 from database. The error is: ', error);
    } finally {
      setStockLoading(false);
    }
  };

  useEffect(() => {
    fetchStyleNumber();
    fetchStock();
    fetchStock2();
  }, []);

  return (
    <StockContext.Provider
      value={{
        stock,
        stock2,
        styleNumber,
        styleLoading,
        stockLoading,
        meterAndKG,
        deleteUser,
        fetchMeterAndKgRelationShip,
        user,
        setUser,
        fetchUsersList,
        usersList,
        updateUserRole,
        fetchStoreHelperOrderIds,
        storeHelperOrderIds,
        fabricPurchaseHistory,
        fetchFabricPurchaseHistory,
        fetchStock,
      }}
    >
      {' '}
      {children}{' '}
    </StockContext.Provider>
  );
};

const useGlobalContext = () => {
  return useContext(StockContext);
};

export { useGlobalContext, StockContextProvider };
