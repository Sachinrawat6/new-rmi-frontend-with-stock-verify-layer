import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import UploadStock from './components/UploadStock';
import UploadFabricNumber from './components/UploadFabricNumber';
import Stock from './components/Stock';
import StyleNumber from './components/StyleNumber';
import ShipStock from './components/ShipStock';
import AddStock from './components/AddStock';
import Login from './components/Login';
import ProtectedRoute from './components/ProtectedRoutes';
import Signup from './components/Signup';
import LowStock from './components/LowStock';
import MeterAndKgRelationship from './components/MeterAndKgRelationship';
import MeterAndKgUploader from './components/UploadMeterAndKgRelationshipData';
import { useGlobalContext } from './components/context/StockContextProvider';
import { ToastContainer, toast } from 'react-toastify';
import axios from 'axios';
import Users from './components/Users';
import FabricUpload from './components/FabricAverageUpload';
import FabricTable from './components/FabricAverageTable';
import FabricRate from './components/FabricRate';
import FabricPurchaseHistory from './pages/FabricPurchaseHistory';
import Add_Ship from './pages/Add_Ship';
import Ship_Stock from './pages/Ship_Stock';
import Stock2 from './pages/Store2';
import StyleCsvUploader from './pages/UploadStyleAndAccessoryNumbers';
import AccessoryManager from './pages/AccessoryUpload';
import AccessoryList from './pages/AccessoryStock';
import AccessoryUpdate from './pages/AccessoryUpdate';
import DashboardInstructions from './pages/Docs';
import ProductionReport from './pages/ProductionReport';
import Test from './pages/test';
import LowStockInventory from './components/LowStockInventory';
import StockKeepingWithStyleNumber from './pages/StockKeepingWithStyleNumber';
import AddStockWithStyleNumber from './pages/AddStockWithStyleNumber';
import UploadAndGenerateInventory from './pages/UploadAndGenerateInventory';
import OverwriteStylesManager from './pages/OverwriteStyles';
import StockLog from './pages/StockLog';
import StockLogRecords from './pages/StockLogRecords';
import Session from './components/Session';
import UserManagement from './pages/WhitelistedUserManagement';

const AppContent = () => {
  const { user, setUser } = useGlobalContext();
  const navigate = useNavigate();
  const location = useLocation(); // Get current route
  const [loading, setLoading] = useState(true);
  const BASE_URL = 'https://raw-material-backend.onrender.com';

  // Check if current route is documentation page
  const isDocPage = location.pathname === '/docs';

  // Persistent login on page refresh
  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    const token = localStorage.getItem('token');
    if (savedUser && token) {
      setUser(JSON.parse(savedUser));
    }
    setLoading(false);
  }, [setUser]);

  const handleLogout = async () => {
    try {
      await axios.post(
        `${BASE_URL}/api/v1/users/logout`,
        {}
        // { withCredentials: true }
      );
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      setUser(null);

      toast.success('Logout successful!', {
        position: 'top-center',
        autoClose: 2000,
        hideProgressBar: true,
      });
      navigate('/login');
    } catch (err) {
      console.error('Logout failed:', err);
      toast.error(err.response?.data?.message || 'Logout failed!', {
        position: 'top-center',
      });
    }
  };

  // Don't render anything until we've checked localStorage
  if (loading) return null;

  return (
    <div className="flex">
      {/* Conditionally render sidebar - NOT on docs page */}
      {!isDocPage && user && (
        <Sidebar isAuthenticated={!!user} user={user} setUser={setUser} onLogout={handleLogout} />
      )}

      {/* Main content area with conditional margin */}
      <div
        className={
          isDocPage
            ? 'w-full min-h-screen'
            : user
              ? 'ml-64 w-[calc(100vw-16rem)] min-h-screen p-6'
              : 'w-full min-h-screen'
        }
      >
        <Routes>
          <Route path="/login" element={<Login setUser={setUser} />} />
          <Route path="/signup" element={<Signup />} />

          <Route
            path="/"
            element={
              <ProtectedRoute user={user}>
                <Stock />
              </ProtectedRoute>
            }
          />
          <Route
            path="/stock2"
            element={
              <ProtectedRoute user={user}>
                <Stock2 />
              </ProtectedRoute>
            }
          />

          <Route
            path="/stock-log"
            element={
              <ProtectedRoute user={user}>
                <StockLog />
              </ProtectedRoute>
            }
          />
          <Route
            path="/session"
            element={
              <ProtectedRoute user={user}>
                <Session />
              </ProtectedRoute>
            }
          />

          <Route
            path="/stock-log-records/:session_id"
            element={
              <ProtectedRoute user={user}>
                <StockLogRecords />
              </ProtectedRoute>
            }
          />
          <Route
            path="/users"
            element={
              <ProtectedRoute user={user}>
                <UserManagement />
              </ProtectedRoute>
            }
          />
          <Route
            path="/add-stock"
            element={
              <ProtectedRoute user={user}>
                <AddStock />
              </ProtectedRoute>
            }
          />
          <Route
            path="/generate-inventory"
            element={
              <ProtectedRoute user={user}>
                <UploadAndGenerateInventory />
              </ProtectedRoute>
            }
          />
          <Route
            path="/stock-keeping-with-style-number"
            element={
              <ProtectedRoute user={user}>
                <StockKeepingWithStyleNumber />
              </ProtectedRoute>
            }
          />
          <Route
            path="/add-ship"
            element={
              <ProtectedRoute user={user}>
                <Add_Ship />
              </ProtectedRoute>
            }
          />
          <Route
            path="/add-stock-with-style-number"
            element={
              <ProtectedRoute user={user}>
                <AddStockWithStyleNumber />
              </ProtectedRoute>
            }
          />

          <Route
            path="/ship-stock"
            element={
              <ProtectedRoute user={user}>
                <Ship_Stock />
              </ProtectedRoute>
            }
          />
          <Route
            path="/upload-stock"
            element={
              <ProtectedRoute user={user}>
                <UploadStock />
              </ProtectedRoute>
            }
          />
          <Route
            path="/upload-fabric"
            element={
              <ProtectedRoute user={user}>
                <UploadFabricNumber />
              </ProtectedRoute>
            }
          />
          <Route
            path="/style-number"
            element={
              <ProtectedRoute user={user}>
                <StyleNumber />
              </ProtectedRoute>
            }
          />
          <Route
            path="/low-stock"
            element={
              <ProtectedRoute user={user}>
                <LowStock />
              </ProtectedRoute>
            }
          />
          <Route
            path="/low-stock-inventory"
            element={
              <ProtectedRoute user={user}>
                <LowStockInventory />
              </ProtectedRoute>
            }
          />
          <Route
            path="/meter-and-kg"
            element={
              <ProtectedRoute user={user}>
                <MeterAndKgRelationship />
              </ProtectedRoute>
            }
          />
          <Route
            path="/upload-mtr-kg"
            element={
              <ProtectedRoute user={user}>
                <MeterAndKgUploader />
              </ProtectedRoute>
            }
          />
          <Route
            path="/users-list"
            element={
              <ProtectedRoute user={user}>
                <Users />
              </ProtectedRoute>
            }
          />
          <Route
            path="/upload-fabric-average"
            element={
              <ProtectedRoute user={user}>
                <FabricUpload />
              </ProtectedRoute>
            }
          />

          <Route
            path="/fabric-average"
            element={
              <ProtectedRoute user={user}>
                <FabricTable />
              </ProtectedRoute>
            }
          />

          <Route
            path="/latest-purchase"
            element={
              <ProtectedRoute user={user}>
                <FabricRate />
              </ProtectedRoute>
            }
          />
          <Route
            path="/fabric-purchase-history"
            element={
              <ProtectedRoute user={user}>
                <FabricPurchaseHistory />
              </ProtectedRoute>
            }
          />

          <Route
            path="/style-accessory"
            element={
              <ProtectedRoute user={user}>
                <StyleCsvUploader />
              </ProtectedRoute>
            }
          />

          <Route
            path="/accessory-upload"
            element={
              <ProtectedRoute user={user}>
                <AccessoryManager />
              </ProtectedRoute>
            }
          />
          <Route
            path="/accessory-stock"
            element={
              <ProtectedRoute user={user}>
                <AccessoryList />
              </ProtectedRoute>
            }
          />

          <Route
            path="/production_report"
            element={
              <ProtectedRoute user={user}>
                <ProductionReport />
              </ProtectedRoute>
            }
          />
          <Route
            path="/accessory-update"
            element={
              <ProtectedRoute user={user}>
                <AccessoryUpdate />
              </ProtectedRoute>
            }
          />

          <Route
            path="/overwrite-style-status"
            element={
              <ProtectedRoute user={user}>
                <OverwriteStylesManager />
              </ProtectedRoute>
            }
          />

          {/* Documentation Route - Public access */}
          <Route path="/docs" element={<DashboardInstructions />} />
          <Route path="/test" element={<Test />} />

          <Route path="*" element={user ? <Stock /> : <Login setUser={setUser} />} />
        </Routes>
      </div>
      <ToastContainer />
    </div>
  );
};

const App = () => {
  return (
    <Router>
      <AppContent />
    </Router>
  );
};

export default App;
