import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  FaBoxOpen,
  FaShippingFast,
  FaUpload,
  FaWarehouse,
  FaExclamationTriangle,
  FaCubes,
  FaSignOutAlt,
  FaUser,
  FaBalanceScale,
  FaExchangeAlt,
  FaLayerGroup,
  FaChartLine,
  FaHistory,
  FaFileAlt,
  FaLink,
  FaTags,
  FaCalculator,
  FaDatabase,
  FaClipboardList,
  FaBell,
  FaBook,
  FaChevronDown,
  FaChevronRight,
  FaList,
  FaHome,
  FaUsers,
  FaCog,
  FaBox,
  FaTruck,
  FaPlusCircle,
  FaMinusCircle,
  FaSync,
  FaFileUpload,
  FaFileDownload,
  FaChartBar,
  FaClock,
  FaShieldAlt,
  FaUserCog,
  FaStore,
  FaPallet,
  FaRulerCombined,
  FaWeightHanging,
  FaThLarge,
  FaThList as FaThListIcon,
  FaEye,
  FaBars,
  FaTimes,
  FaArrowLeft,
  FaArrowRight,
} from 'react-icons/fa';
import { toast } from 'react-toastify';

const Sidebar = ({ isAuthenticated, user, setUser, onLogout }) => {
  const location = useLocation();
  const navigate = useNavigate();

  // ─── State ──────────────────────────────────────────────────
  const [isCollapsed, setIsCollapsed] = useState(() => {
    // Load from localStorage
    const saved = localStorage.getItem('sidebarCollapsed');
    return saved ? JSON.parse(saved) : false;
  });

  const [expandedCategories, setExpandedCategories] = useState({});
  const [hoveredCategory, setHoveredCategory] = useState(null);

  // ─── Category Configuration ──────────────────────────────────
  const CATEGORY_CONFIG = useMemo(
    () => ({
      Dashboard: { icon: FaHome, color: 'blue' },
      Management: { icon: FaCog, color: 'purple' },
      Relations: { icon: FaLink, color: 'green' },
      Transactions: { icon: FaExchangeAlt, color: 'orange' },
      Uploads: { icon: FaUpload, color: 'yellow' },
      Monitoring: { icon: FaEye, color: 'red' },
      Resources: { icon: FaBook, color: 'teal' },
    }),
    []
  );

  // ─── Define Links by Role ──────────────────────────────────
  const linksByRole = useMemo(
    () => ({
      // Base links for all users (staff)
      base: [
        { name: 'Store 1', icon: FaStore, path: '/', category: 'Dashboard' },
        { name: 'Store 2', icon: FaWarehouse, path: '/stock2', category: 'Dashboard' },
        { name: 'Accessory Stock', icon: FaBox, path: '/accessory-stock', category: 'Dashboard' },
        {
          name: 'Style Management',
          icon: FaLayerGroup,
          path: '/style-number',
          category: 'Management',
        },
        { name: 'Fabric Relations', icon: FaLink, path: '/meter-and-kg', category: 'Relations' },
        {
          name: 'Low Stock Inventory',
          icon: FaExclamationTriangle,
          path: '/low-stock-inventory',
          category: 'Monitoring',
        },
        {
          name: 'Live/Zero Inventory',
          icon: FaExclamationTriangle,
          path: '/generate-inventory',
          category: 'Monitoring',
        },
        { name: 'Stock Log', icon: FaClock, path: '/stock-log', category: 'Monitoring' },
        {
          name: 'Documentation',
          icon: FaBook,
          path: '/docs',
          category: 'Resources',
          external: true,
        },
      ],

      // Admin additional links
      admin: [
        {
          name: 'Fabric Averages',
          icon: FaCalculator,
          path: '/fabric-average',
          category: 'Dashboard',
        },
        {
          name: 'Add/Ship Fabric',
          icon: FaShippingFast,
          path: '/add-ship',
          category: 'Transactions',
        },
        {
          name: 'Accessory Update',
          icon: FaBoxOpen,
          path: '/accessory-update',
          category: 'Transactions',
        },
        {
          name: 'Upload Stock',
          icon: FaDatabase,
          path: '/upload-stock',
          category: 'Uploads',
        },
        {
          name: 'Upload Averages',
          icon: FaFileUpload,
          path: '/upload-fabric-average',
          category: 'Uploads',
        },
        {
          name: 'Upload Fabric',
          icon: FaFileUpload,
          path: '/upload-fabric',
          category: 'Uploads',
        },
        {
          name: 'Upload Relations',
          icon: FaFileUpload,
          path: '/upload-mtr-kg',
          category: 'Uploads',
        },
        {
          name: 'Upload Accessory',
          icon: FaFileUpload,
          path: '/accessory-upload',
          category: 'Uploads',
        },
        {
          name: 'Production Report',
          icon: FaChartBar,
          path: '/production_report',
          category: 'Monitoring',
        },
        {
          name: 'Overwrite Style Status',
          icon: FaSync,
          path: '/overwrite-style-status',
          category: 'Monitoring',
        },
      ],

      // Super Admin additional links
      superAdmin: [
        { name: 'User Management', icon: FaUsers, path: '/users', category: 'Monitoring' },
      ],
    }),
    []
  );

  // ─── Get Role-Based Links ──────────────────────────────────
  const roleLinks = useMemo(() => {
    let links = [...linksByRole.base];

    if (user?.role === 'admin' || user?.role === 'super-admin') {
      links = [...links, ...linksByRole.admin];
    }

    if (user?.role === 'super-admin') {
      links = [...links, ...linksByRole.superAdmin];
    }

    return links;
  }, [user?.role, linksByRole]);

  // ─── Group Links by Category ──────────────────────────────
  const groupedLinks = useMemo(() => {
    return roleLinks.reduce((acc, link) => {
      if (!acc[link.category]) acc[link.category] = [];
      acc[link.category].push(link);
      return acc;
    }, {});
  }, [roleLinks]);

  // ─── Initialize - All categories collapsed ──────────────────
  useEffect(() => {
    const initialExpandedState = {};
    Object.keys(groupedLinks).forEach((category) => {
      initialExpandedState[category] = false; // Start collapsed
    });
    setExpandedCategories(initialExpandedState);
  }, [groupedLinks]);

  // ─── Save collapse state to localStorage ──────────────────
  useEffect(() => {
    localStorage.setItem('sidebarCollapsed', JSON.stringify(isCollapsed));
  }, [isCollapsed]);

  // ─── Handlers ──────────────────────────────────────────────
  const toggleCategory = useCallback(
    (category) => {
      if (isCollapsed) return; // Don't expand if collapsed
      setExpandedCategories((prev) => ({
        ...prev,
        [category]: !prev[category],
      }));
    },
    [isCollapsed]
  );

  const toggleSidebar = useCallback(() => {
    setIsCollapsed((prev) => !prev);
    // Collapse all categories when sidebar is collapsed
    if (!isCollapsed) {
      const collapsedState = {};
      Object.keys(groupedLinks).forEach((category) => {
        collapsedState[category] = false;
      });
      setExpandedCategories(collapsedState);
    }
  }, [isCollapsed, groupedLinks]);

  // ─── Logout Handler ──────────────────────────────────────
  const handleLogout = useCallback(async () => {
    try {
      if (onLogout) {
        onLogout();
      } else {
        localStorage.removeItem('user');
        localStorage.removeItem('session');
        navigate('/login');
        toast.success('Logged out successfully');
      }
    } catch (error) {
      console.error('Logout error:', error);
      toast.error('Failed to logout');
    }
  }, [onLogout, navigate]);

  if (!isAuthenticated) return null;

  // ─── Render ────────────────────────────────────────────────
  return (
    <div
      className={`fixed h-screen bg-gradient-to-b from-gray-950 to-gray-900 text-white shadow-2xl flex flex-col border-r border-gray-800 z-50 transition-all duration-300 ease-in-out ${
        isCollapsed ? 'w-20' : 'w-64'
      }`}
    >
      {/* Header */}
      <div
        className={`px-4 py-6 border-b border-gray-800 ${isCollapsed ? 'flex justify-center' : ''}`}
      >
        <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'}`}>
          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg flex-shrink-0">
            <FaWarehouse className="text-2xl text-white" />
          </div>
          {!isCollapsed && (
            <div>
              <h2 className="text-xl font-bold text-white tracking-tight">FabricPro</h2>
              <p className="text-xs text-gray-400">Inventory System</p>
            </div>
          )}
        </div>

        {/* Collapse Toggle Button */}
        <button
          onClick={toggleSidebar}
          className={`mt-4 p-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-all ${
            isCollapsed ? 'w-full flex justify-center' : 'w-full'
          }`}
          title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
        >
          {isCollapsed ? <FaArrowRight className="text-sm" /> : <FaArrowLeft className="text-sm" />}
        </button>
      </div>

      {/* User Info - Hide when collapsed */}
      {!isCollapsed && (
        <div className="px-6 py-4 border-b border-gray-800">
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-4 border border-gray-700">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center shadow-md">
                  <FaUser className="text-sm text-white" />
                </div>
                <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-gray-900"></div>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-white truncate">{user?.username || 'User'}</p>
                <p className="text-gray-400 text-xs truncate">
                  {user?.emailid || user?.email || 'user@example.com'}
                </p>
                <p
                  className={`font-bold text-xs truncate ${
                    user?.role === 'admin'
                      ? 'text-purple-400'
                      : user?.role === 'super-admin'
                        ? 'text-red-400'
                        : 'text-green-400'
                  }`}
                >
                  {user?.role || 'Staff'}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto custom-scrollbar px-4 py-4 space-y-1">
        {Object.entries(groupedLinks).map(([category, categoryLinks]) => {
          const CategoryIcon = CATEGORY_CONFIG[category]?.icon || FaCog;
          const categoryColor = CATEGORY_CONFIG[category]?.color || 'gray';
          const isExpanded = expandedCategories[category];
          const isHovered = hoveredCategory === category;

          // In collapsed mode, show tooltip on hover
          const showTooltip = isCollapsed && isHovered;

          return (
            <div key={category} className="mb-2">
              {/* Category Header */}
              <button
                onClick={() => toggleCategory(category)}
                onMouseEnter={() => setHoveredCategory(category)}
                onMouseLeave={() => setHoveredCategory(null)}
                className={`w-full flex items-center ${
                  isCollapsed ? 'justify-center' : 'justify-between'
                } px-3 py-3 rounded-lg hover:bg-gray-800/50 transition-colors group relative`}
                title={isCollapsed ? category : ''}
              >
                <div className="flex items-center gap-3">
                  {!isCollapsed && (
                    <div className="text-gray-500 group-hover:text-blue-400 transition-colors">
                      {isExpanded ? (
                        <FaChevronDown className="text-xs" />
                      ) : (
                        <FaChevronRight className="text-xs" />
                      )}
                    </div>
                  )}
                  <CategoryIcon
                    className={`text-sm ${isCollapsed ? 'text-blue-400' : `text-${categoryColor}-400`}`}
                  />
                  {!isCollapsed && (
                    <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">
                      {category}
                    </h3>
                  )}
                </div>
                {!isCollapsed && (
                  <span className="text-xs text-gray-500 bg-gray-800 px-2 py-1 rounded">
                    {categoryLinks.length}
                  </span>
                )}

                {/* Tooltip for collapsed mode */}
                {showTooltip && (
                  <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 bg-gray-800 text-white px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap z-50 shadow-xl border border-gray-700">
                    {category}
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 -ml-1 w-2 h-2 bg-gray-800 rotate-45 border-l border-t border-gray-700"></div>
                  </div>
                )}
              </button>

              {/* Category Links */}
              <div
                className={`overflow-hidden transition-all duration-300 ease-in-out ${
                  !isCollapsed && isExpanded ? 'max-h-[800px] opacity-100' : 'max-h-0 opacity-0'
                }`}
              >
                {!isCollapsed && (
                  <div className="ml-8 space-y-1 py-2">
                    {categoryLinks.map((link) => {
                      const Icon = link.icon;
                      const isActive = location.pathname === link.path;

                      if (link.external) {
                        return (
                          <a
                            key={link.name}
                            href={link.path}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="group flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 hover:bg-gray-800 hover:text-white text-gray-400"
                          >
                            <Icon className="text-lg text-gray-500 group-hover:text-blue-400 transition-colors" />
                            <span className="font-medium flex-1 text-sm">{link.name}</span>
                            <span className="text-xs text-gray-500">↗</span>
                          </a>
                        );
                      }

                      return (
                        <NavLink
                          key={link.name}
                          to={link.path}
                          className={({ isActive: navActive }) =>
                            `group flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                              navActive || isActive
                                ? 'bg-gradient-to-r from-blue-600/20 to-purple-600/20 text-white border-l-4 border-blue-500 shadow-lg'
                                : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                            }`
                          }
                        >
                          <Icon
                            className={`text-lg transition-colors ${
                              isActive || location.pathname === link.path
                                ? 'text-blue-400'
                                : 'text-gray-500 group-hover:text-blue-400'
                            }`}
                          />
                          <span className="font-medium flex-1 text-sm">{link.name}</span>
                          {(isActive || location.pathname === link.path) && (
                            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                          )}
                        </NavLink>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </nav>

      {/* Footer */}
      <div
        className={`px-4 py-4 border-t border-gray-800 bg-gray-900/50 ${isCollapsed ? 'flex justify-center' : ''}`}
      >
        <button
          onClick={handleLogout}
          className={`flex items-center gap-2 px-4 py-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded-lg transition-all text-sm font-medium ${
            isCollapsed ? 'justify-center w-12' : 'w-full'
          }`}
          title={isCollapsed ? 'Logout' : ''}
        >
          <FaSignOutAlt className="text-sm" />
          {!isCollapsed && <span>Logout</span>}
        </button>
        {!isCollapsed && (
          <p className="text-gray-600 text-xs text-center mt-4">
            © {new Date().getFullYear()} FabricPro
          </p>
        )}
      </div>

      {/* Custom Scrollbar Styles */}
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(31, 41, 55, 0.5);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: linear-gradient(to bottom, #3b82f6, #8b5cf6);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(to bottom, #2563eb, #7c3aed);
        }
      `}</style>
    </div>
  );
};

export default Sidebar;
