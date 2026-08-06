import React, { useEffect, useState } from 'react';
import { useGlobalContext } from './context/StockContextProvider';
import {
    FaUserCog,
    FaUserShield,
    FaUser,
    FaEdit,
    FaCheck,
    FaTimes,
    FaEnvelope,
    FaIdBadge,
    FaCrown,
    FaUserTie,
    FaSort,
    FaSortUp,
    FaSortDown
} from 'react-icons/fa';

const Users = () => {
    const { usersList, fetchUsersList, updateUserRole, deleteUser } = useGlobalContext();
    const [editingUserId, setEditingUserId] = useState(null);
    const [selectedRole, setSelectedRole] = useState('');
    const [loading, setLoading] = useState(false);
    const [sortConfig, setSortConfig] = useState({ key: 'username', direction: 'asc' });
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        fetchUsersList();
    }, []);

    console.log(usersList)
    // Filter and sort users
    const filteredAndSortedUsers = React.useMemo(() => {
        let filtered = usersList.filter(user =>
            user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.role.toLowerCase().includes(searchTerm.toLowerCase())
        );

        if (sortConfig.key) {
            filtered.sort((a, b) => {
                if (a[sortConfig.key] < b[sortConfig.key]) {
                    return sortConfig.direction === 'asc' ? -1 : 1;
                }
                if (a[sortConfig.key] > b[sortConfig.key]) {
                    return sortConfig.direction === 'asc' ? 1 : -1;
                }
                return 0;
            });
        }

        return filtered;
    }, [usersList, sortConfig, searchTerm]);

    const handleSort = (key) => {
        setSortConfig(prevConfig => ({
            key,
            direction: prevConfig.key === key && prevConfig.direction === 'asc' ? 'desc' : 'asc'
        }));
    };

    const getSortIcon = (key) => {
        if (sortConfig.key !== key) return <FaSort className="text-gray-400" />;
        return sortConfig.direction === 'asc' ? <FaSortUp className="text-blue-600" /> : <FaSortDown className="text-blue-600" />;
    };

    const handleEditClick = (user) => {
        setEditingUserId(user._id);
        setSelectedRole(user.role);
    };

    const handleCancelEdit = () => {
        setEditingUserId(null);
        setSelectedRole('');
    };

    const handleRoleUpdate = async (userId) => {
        if (!selectedRole) return;

        setLoading(true);
        try {
            await updateUserRole(userId, selectedRole);
            setEditingUserId(null);
            setSelectedRole('');
            fetchUsersList();
        } catch (error) {
            console.error('Error updating user role:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteUser = async (id) => {
        const userConfirmation = window.confirm("Are you sure want to delete this user");
        if (!userConfirmation) return
        try {
            await deleteUser(id)
            fetchUsersList();
        } catch (error) {
            console.log("Failed to delete user error :: ", error);
        }
    }



    const getRoleIcon = (role) => {
        switch (role) {
            case 'super-admin':
                return <FaCrown className="text-yellow-600" />;
            case 'admin':
                return <FaUserShield className="text-red-600" />;
            default:
                return <FaUser className="text-blue-600" />;
        }
    };

    const getRoleBadgeColor = (role) => {
        switch (role) {
            case 'super-admin':
                return 'bg-yellow-100 text-yellow-800 border border-yellow-200';
            case 'admin':
                return 'bg-red-100 text-red-800 border border-red-200';
            default:
                return 'bg-blue-100 text-blue-800 border border-blue-200';
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            {/* Header */}
            <div className="mb-8">
                <div className="flex items-center gap-3 mb-2">
                    <div className="p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-sm">
                        <FaUserTie className="text-2xl text-white" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
                        <p className="text-gray-600">Manage user roles and permissions</p>
                    </div>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-gray-600 text-sm font-medium">Total Users</p>
                            <p className="text-2xl font-bold text-gray-900">{usersList.length}</p>
                        </div>
                        <div className="p-3 bg-blue-50 rounded-lg">
                            <FaUser className="text-2xl text-blue-600" />
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-gray-600 text-sm font-medium">Admins</p>
                            <p className="text-2xl font-bold text-gray-900">
                                {usersList.filter(user => user.role === 'admin').length}
                            </p>
                        </div>
                        <div className="p-3 bg-red-50 rounded-lg">
                            <FaUserShield className="text-2xl text-red-600" />
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-gray-600 text-sm font-medium">Super Admins</p>
                            <p className="text-2xl font-bold text-gray-900">
                                {usersList.filter(user => user.role === 'super-admin').length}
                            </p>
                        </div>
                        <div className="p-3 bg-yellow-50 rounded-lg">
                            <FaCrown className="text-2xl text-yellow-600" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Search and Controls */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
                <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
                    <div className="flex-1 w-full">
                        <div className="relative">
                            <input
                                type="text"
                                placeholder="Search users by name, email, or role..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                            <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                                <FaUser className="text-gray-400" />
                            </div>
                        </div>
                    </div>
                    <div className="text-sm text-gray-600 bg-gray-50 px-3 py-2 rounded-lg border border-gray-200">
                        Showing {filteredAndSortedUsers.length} of {usersList.length} users
                    </div>
                </div>
            </div>

            {/* Users Table */}
            {usersList.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-xl shadow-sm border border-gray-200">
                    <FaUser className="text-6xl text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500 text-xl font-medium">No users found</p>
                    <p className="text-gray-400">Users will appear here once they register</p>
                </div>
            ) : (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    {/* Table Header */}
                    <div className="grid grid-cols-12 gap-4 px-6 py-4 bg-gray-50 border-b border-gray-200 font-semibold text-gray-700 text-sm">
                        <div className="col-span-3 flex items-center gap-2 cursor-pointer" onClick={() => handleSort('username')}>
                            User
                            {getSortIcon('username')}
                        </div>
                        <div className="col-span-3 flex items-center gap-2 cursor-pointer" onClick={() => handleSort('email')}>
                            Email
                            {getSortIcon('email')}
                        </div>
                        <div className="col-span-2 flex items-center gap-2 cursor-pointer" onClick={() => handleSort('role')}>
                            Role
                            {getSortIcon('role')}
                        </div>
                        <div className="col-span-2 flex items-center gap-2 cursor-pointer" onClick={() => handleSort('createdAt')}>
                            Joined Date
                            {getSortIcon('createdAt')}
                        </div>
                        <div className="col-span-2 text-right">Actions</div>
                    </div>

                    {/* Table Body */}
                    <div className="divide-y divide-gray-200">
                        {filteredAndSortedUsers.map((user) => (
                            <div key={user._id} className="grid grid-cols-12 gap-4 px-6 py-4 hover:bg-gray-50 transition-colors">
                                {/* User Info */}
                                <div className="col-span-3 flex items-center gap-3">
                                    <img
                                        src={user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.username)}&background=random&color=fff&size=64`}
                                        alt={user.username}
                                        className="w-10 h-10 rounded-full object-cover border border-gray-300"
                                        onError={(e) => {
                                            e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.username)}&background=random&color=fff&size=64`;
                                        }}
                                    />
                                    <div>
                                        <div className="font-medium text-gray-900">{user.username}</div>
                                        <div className="text-sm text-gray-500 font-mono">#{user._id.slice(-8)}</div>
                                    </div>
                                </div>

                                {/* Email */}
                                <div className="col-span-3 flex items-center">
                                    <div className="flex items-center gap-2 text-gray-700">
                                        <FaEnvelope className="text-blue-500 text-sm" />
                                        <span className="text-sm truncate">{user.email}</span>
                                    </div>
                                </div>

                                {/* Role */}
                                <div className="col-span-2 flex items-center">
                                    {editingUserId === user._id ? (
                                        <select
                                            value={selectedRole}
                                            onChange={(e) => setSelectedRole(e.target.value)}
                                            className="w-full bg-white border border-gray-300 rounded-lg px-3 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                        >
                                            <option value="user">User</option>
                                            <option value="admin">Admin</option>
                                            <option value="super-admin">Super Admin</option>
                                        </select>
                                    ) : (
                                        <div className="flex items-center gap-2">
                                            {getRoleIcon(user.role)}
                                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRoleBadgeColor(user.role)}`}>
                                                {user.role.replace('-', ' ')}
                                            </span>
                                        </div>
                                    )}
                                </div>

                                {/* Joined Date */}
                                <div className="col-span-2 flex items-center text-sm text-gray-600">
                                    {new Date(user.createdAt).toLocaleDateString()}
                                </div>

                                {/* Actions */}
                                <div className="col-span-2 flex items-center justify-end gap-2">
                                    {editingUserId === user._id ? (
                                        <>
                                            <button
                                                onClick={() => handleRoleUpdate(user._id)}
                                                disabled={loading || !selectedRole}
                                                className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                                title="Confirm"
                                            >
                                                <FaCheck />
                                            </button>
                                            <button
                                                onClick={handleCancelEdit}
                                                disabled={loading}
                                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                                                title="Cancel"
                                            >
                                                <FaTimes />
                                            </button>
                                        </>
                                    ) : (
                                        <div className='flex gap-2'>
                                            <button
                                                onClick={() => handleDeleteUser(user?._id)}
                                                className="flex items-center gap-2 px-3 py-2 bg-red-50 text-red-700 cursor-pointer hover:bg-red-100 rounded-lg transition-colors text-sm font-medium"
                                            >
                                                <FaUserCog className="text-sm" />
                                                Delete
                                            </button>
                                            <button
                                                onClick={() => handleEditClick(user)
                                                }
                                                className="flex items-center gap-2 px-3 py-2 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg cursor-pointer transition-colors text-sm font-medium"
                                            >
                                                <FaUserCog className="text-sm" />
                                                Edit
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Footer Info */}
            {usersList.length > 0 && (
                <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="flex items-center gap-3 text-blue-800">
                        <div className="p-2 bg-blue-100 rounded-lg">
                            <FaUserCog className="text-lg" />
                        </div>
                        <div className="text-sm">
                            <strong>Role Permissions:</strong> Super Admins have full system access, Admins can manage content, Users have limited access
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Users;