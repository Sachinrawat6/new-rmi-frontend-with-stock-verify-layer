import React from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { BASE_URL } from '../constant/index.js';

const LogoutButton = () => {
  const navigate = useNavigate();

  const API_BASE_URL = `${BASE_URL}`;
  const handleLogout = async () => {
    try {
      await axios.post(
        `${API_BASE_URL}/auth/logout`,
        {},
        {
          withCredentials: true,
        }
      );

      // Optional: clear localStorage if you store anything there
      // localStorage.removeItem("user");
      navigate('/login');
    } catch (error) {
      console.error('Logout failed:', error.response?.data?.message || error.message);
    }
  };

  return (
    <button
      onClick={handleLogout}
      className="bg-red-200 text-red-500 px-4 py-2 w-full cursor-pointer mb-4 rounded "
    >
      Logout
    </button>
  );
};

export default LogoutButton;
