import React, { useState } from 'react';
import {
    LayoutDashboard,
    BarChart3,
    Link,
    RefreshCw,
    AlertTriangle,
    Search,
    Warehouse,
    Package,
    TrendingUp,
    Layers,
    FileText,
    ShoppingCart,
    Settings,
    Download,
    ChevronRight,
    Home,
    Box,
    Ruler,
    Calculator,
    History,
    MapPin,
    ArrowLeftRight,
    Upload,
    Database,
    FileSpreadsheet,
    Hash,
    Scale,
    Type,
    FolderInput
} from 'lucide-react';

const InventoryDocumentation = () => {
    const [activeSection, setActiveSection] = useState('dashboard');
    const [searchQuery, setSearchQuery] = useState('');
    const [expandedCategories, setExpandedCategories] = useState({
        dashboard: true,
        management: false,
        relations: false,
        transactions: false,
        monitoring: false,
        bulk: true // Added bulk operations
    });

    const toggleCategory = (category) => {
        setExpandedCategories(prev => ({
            ...prev,
            [category]: !prev[category]
        }));
    };

    const categories = {
        dashboard: {
            icon: <LayoutDashboard size={20} />,
            label: 'Dashboard',
            color: 'text-blue-600',
            bgColor: 'bg-blue-50',
            sections: [
                { id: 'store1', label: 'Store 1 Stock', icon: <Warehouse size={18} /> },
                { id: 'store2', label: 'Store 2 Stock', icon: <Warehouse size={18} /> },
                { id: 'accessory', label: 'Accessory Stock', icon: <Package size={18} /> },
                { id: 'purchase', label: 'Latest Purchase', icon: <History size={18} /> },
                { id: 'averages', label: 'Fabric Averages', icon: <Calculator size={18} /> }
            ]
        },
        management: {
            icon: <Settings size={20} />,
            label: 'Management',
            color: 'text-purple-600',
            bgColor: 'bg-purple-50',
            sections: [
                { id: 'style', label: 'Style Management', icon: <Layers size={18} /> }
            ]
        },
        relations: {
            icon: <Link size={20} />,
            label: 'Relations',
            color: 'text-emerald-600',
            bgColor: 'bg-emerald-50',
            sections: [
                { id: 'fabric', label: 'Fabric Relations', icon: <Ruler size={18} /> }
            ]
        },
        transactions: {
            icon: <RefreshCw size={20} />,
            label: 'Transactions',
            color: 'text-amber-600',
            bgColor: 'bg-amber-50',
            sections: [
                { id: 'add-ship', label: 'Add/Ship Fabric', icon: <ArrowLeftRight size={18} /> },
                { id: 'accessory-update', label: 'Accessory Update', icon: <Box size={18} /> }
            ]
        },
        monitoring: {
            icon: <AlertTriangle size={20} />,
            label: 'Monitoring',
            color: 'text-rose-600',
            bgColor: 'bg-rose-50',
            sections: [
                { id: 'low-stock', label: 'Low Stock Alert', icon: <AlertTriangle size={18} /> }
            ]
        },
        bulk: {
            icon: <Upload size={20} />,
            label: 'Bulk Operations',
            color: 'text-indigo-600',
            bgColor: 'bg-indigo-50',
            sections: [
                { id: 'upload-stock', label: 'Upload Stock', icon: <Database size={18} /> },
                { id: 'upload-averages', label: 'Upload Averages', icon: <FileSpreadsheet size={18} /> },
                { id: 'upload-fabric', label: 'Upload Fabric Mapping', icon: <Hash size={18} /> },
                { id: 'upload-relations', label: 'Upload Relations', icon: <Scale size={18} /> },
                { id: 'upload-accessory', label: 'Upload Accessory', icon: <Type size={18} /> }
            ]
        }
    };

    const documentationContent = {
        dashboard: {
            title: 'Dashboard Operations',
            icon: <LayoutDashboard className="text-blue-600" size={24} />,
            content: `
        The Dashboard provides real-time insights into your inventory across different stores and categories. 
        Access various stock information with quick search functionality.
      `
        },
        store1: {
            title: 'Store 1 Stock Check',
            icon: <Warehouse className="text-blue-500" size={24} />,
            content: `
        ## How to Check Stock in Store 1
        1. Navigate to **Dashboard** in the sidebar
        2. Click on **Store 1 Stock**
        3. Enter fabric number OR style number in the search box
        4. Press Enter or click the search icon
        5. View real-time stock availability, location, and linked styles
      `
        },
        store2: {
            title: 'Store 2 Stock Check',
            icon: <Warehouse className="text-green-500" size={24} />,
            content: `
        ## How to Check Stock in Store 2
        1. Go to **Dashboard** section
        2. Select **Store 2 Stock**
        3. Input either fabric number or style number
        4. Press Enter to execute search
        5. Review stock details specific to Store 2
      `
        },
        accessory: {
            title: 'Accessory Stock Management',
            icon: <Package className="text-purple-500" size={24} />,
            content: `
        ## Accessory Stock Verification
        1. From **Dashboard**, choose **Accessory Stock**
        2. Enter accessory number OR related style number
        3. Search results will show all matching accessories
      `
        },
        purchase: {
            title: 'Latest Purchase Records',
            icon: <History className="text-amber-500" size={24} />,
            content: `
        ## View Recent Purchases
        1. Select **Latest Purchase** from Dashboard
        2. Enter fabric number to search
        3. View complete purchase history for that fabric
      `
        },
        averages: {
            title: 'Fabric Averages Analysis',
            icon: <Calculator className="text-indigo-500" size={24} />,
            content: `
        ## Check Fabric Averages
        1. Click on **Fabric Averages** in Dashboard
        2. Enter pattern number for analysis
        3. View comprehensive average calculations
      `
        },
        style: {
            title: 'Style Number Management',
            icon: <Layers className="text-purple-500" size={24} />,
            content: `
        ## View Style-Pattern-Average Mapping
        1. Navigate to **Management** section
        2. Click on **Style Management**
        3. Enter style number to search
        4. Press Enter to view complete mapping
      `
        },
        fabric: {
            title: 'Meter-Kilogram Relationship',
            icon: <Ruler className="text-emerald-500" size={24} />,
            content: `
        ## View Fabric Conversion Relationships
        1. Go to **Relations** section
        2. Select **Fabric Relations**
        3. Search by fabric number
        4. View conversion ratios and relationships
      `
        },
        'add-ship': {
            title: 'Add/Ship Fabric Operations',
            icon: <ArrowLeftRight className="text-amber-500" size={24} />,
            content: `
        ## Stock Movement Operations
        ### 1. Add New Stock
        **Steps:**
        1. Select **Add Stock** operation type
        2. Enter fabric number
        3. Choose fabric source
        4. Input quantity in meters
        5. Specify storage location
        6. Click **Add Stock** button

        ### 2. Ship Existing Stock
        **Steps:**
        1. Select **Ship Stock** operation type
        2. Enter fabric number
        3. Input quantity to ship
        4. Select current location
        5. Choose destination
        6. Click **Ship Stock** button
      `
        },
        'accessory-update': {
            title: 'Accessory Stock Update',
            icon: <Box className="text-amber-500" size={24} />,
            content: `
        ## Update Accessory Inventory
        **Procedure:**
        1. Navigate to **Accessory Update** section
        2. Enter accessory number and search
        3. Select action type: Add Stock or Ship Stock
        4. Enter quantity in units
        5. Click corresponding action button
      `
        },
        'low-stock': {
            title: 'Low Stock Alerts',
            icon: <AlertTriangle className="text-rose-500" size={24} />,
            content: `
        ## Monitor Low Inventory Levels
        **Access Procedure:**
        1. Go to **Monitoring** section
        2. Click on **Low Stock Alert**
        3. View all items below predefined thresholds
        4. Export data using CSV download option
      `
        },
        // Bulk Operations Content
        'upload-stock': {
            title: 'Bulk Stock Creation',
            icon: <Database className="text-indigo-500" size={24} />,
            content: `
        ## Create New Fabric Stock in Bulk

        ### Step-by-Step Process:
        1. **Navigate to Bulk Operations** tab in sidebar
        2. **Click on Upload Stock**
        3. **Download Sample File** using the download button
        4. **Open Sample File** - You'll find 3 columns:
           - **Fabric Name**
           - **Fabric #**
           - **Style #'s**

        ### Data Preparation:
        1. **Open Google Sheet** and search for **Fabric Average Sheet**
        2. **Go to Fabric Style Map** tab
        3. **Search for fabric** you want to create stock for
        4. **Copy data** from these columns:
           - Fabric Name
           - Fabric Number
           - Style Numbers
        5. **Paste data** into the sample file

        ### Important Notes:
        - ✅ **DO NOT MODIFY HEADERS** in the sample file
        - ✅ Ensure all 3 columns are filled for each fabric
        - ✅ Multiple fabrics can be added in one file
        - ✅ Save file as CSV format before upload
        - ✅ Upload the completed file to create stock

        ### File Format Example:
        \`\`\`
        Fabric Name,Fabric #,Style #'s
        Cotton Blend,FAB001,STY001,STY002
        Polyester Mix,FAB002,STY003
        Silk Blend,FAB003,STY004,STY005
        \`\`\`

        ### Verification Steps:
        1. After upload, check Store 1/Store 2 stock
        2. Verify fabric appears in search results
        3. Confirm style numbers are correctly linked
      `
        },
        'upload-averages': {
            title: 'Bulk Average Upload',
            icon: <FileSpreadsheet className="text-indigo-500" size={24} />,
            content: `
        ## Upload Fabric Averages in Bulk

        ### Step-by-Step Process:
        1. **Go to Bulk Operations** section
        2. **Click on Upload Averages**
        3. **Download Sample File**
        4. **Open Sample File** - Keep headers intact

        ### Data Source Preparation:
        1. **Open Google Sheet** and search for **Fabric Averages Sheet**
        2. **Navigate to Style Fabric Average** tab
        3. **Search for style** you want to update
        4. **Copy data** from Column A to Column T (20 columns)

        ### Important Instructions:
        - ✅ **DO NOT MODIFY HEADERS** in sample file
        - ✅ **DO NOT CHANGE COLUMN STRUCTURE**
        - ✅ Copy complete row data (A to T)
        - ✅ Multiple styles can be updated in one file
        - ✅ Save as CSV before upload

        ### Data Columns Include:
        - Style Number
        - Pattern Number
        - Monthly Average
        - Quarterly Average
        - Yearly Average
        - Consumption Rate
        - Forecast Data
        - Historical Usage

        ### File Format Example:
        \`\`\`
        Style,Pattern,MonthlyAvg,QuarterlyAvg,YearlyAvg,...
        STY001,PAT001,150,450,1800,...
        STY002,PAT002,200,600,2400,...
        \`\`\`

        ### Post-Upload Verification:
        1. Check Fabric Averages section
        2. Verify updated averages for each style
        3. Confirm data accuracy in reports
      `
        },
        'upload-fabric': {
            title: 'Style-Fabric Mapping',
            icon: <Hash className="text-indigo-500" size={24} />,
            content: `
        ## Bulk Style-Fabric Number Mapping

        ### Step-by-Step Process:
        1. **Access Bulk Operations** tab
        2. **Click on Upload Fabric**
        3. **Download Sample File**
        4. **Keep headers unchanged**

        ### Data Preparation:
        1. **Open Google Sheet** → Search **Fabric Averages Sheet**
        2. **Go to Style Pattern Fabric Mapping** tab
        3. **Find style** you want to map
        4. **Copy data** from Column A to Column M (13 columns)

        ### Critical Instructions:
        - ✅ **HEADERS MUST REMAIN UNCHANGED**
        - ✅ Copy complete row (A to M columns)
        - ✅ Ensure data consistency
        - ✅ Multiple mappings per file supported

        ### Mapping Columns Include:
        - Style Number
        - Pattern Number
        - Fabric Number 1
        - Fabric Number 2
        - Fabric Type
        - Consumption Rate
        - Linked Accessories
        - Production Requirements

        ### File Format Example:
        \`\`\`
        Style,Pattern,Fabric1,Fabric2,FabricType,...
        STY001,PAT001,FAB001,FAB002,Cotton,...
        STY002,PAT002,FAB003,FAB004,Polyester,...
        \`\`\`

        ### Verification Process:
        1. After upload, check Style Management
        2. Verify mapping appears correctly
        3. Test search functionality with mapped styles
      `
        },
        'upload-relations': {
            title: 'Meter-Kg Relationship Upload',
            icon: <Scale className="text-indigo-500" size={24} />,
            content: `
        ## Upload Fabric Conversion Relationships

        ### Step-by-Step Process:
        1. **Navigate to Bulk Operations**
        2. **Click on Upload Relations**
        3. **Download Sample File**
        4. **Maintain header structure**

        ### Data Entry Guidelines:
        1. **Column A**: Fabric Number
        2. **Column B**: fabric_in_KG → **ALWAYS ENTER 1**
        3. **Column C**: fabric_in_meter → Enter meters per 1kg

        ### Important Rules:
        - ✅ **Column B MUST BE 1** for all entries
        - ✅ Column C = Meters equivalent to 1kg
        - ✅ Example: If 1kg = 5 meters, enter 5 in Column C
        - ✅ DO NOT modify headers

        ### Example Data Entry:
        \`\`\`
        fabric_number,fabric_in_KG,fabric_in_meter
        FAB001,1,5.2
        FAB002,1,4.8
        FAB003,1,6.0
        \`\`\`

        ### Calculation Guide:
        - **1kg = X meters** (Enter X in fabric_in_meter)
        - Formula: Meters per kg = Total meters / Total kg
        - Round to 2 decimal places for accuracy

        ### File Format Requirements:
        - CSV format only
        - No empty rows between data
        - No special characters
        - Save with UTF-8 encoding

        ### Post-Upload Verification:
        1. Check Fabric Relations section
        2. Search for uploaded fabric numbers
        3. Verify conversion ratios are correct
        4. Test calculations with sample data
      `
        },
        'upload-accessory': {
            title: 'Bulk Accessory Creation',
            icon: <Type className="text-indigo-500" size={24} />,
            content: `
        ## Create Multiple Accessories in Bulk

        ### Step-by-Step Process:
        1. **Go to Bulk Operations** section
        2. **Click on Upload Accessory**
        3. **Download Sample File**
        4. **Clear existing data** (keep headers)

        ### Data Entry Instructions:
        1. **Column 1**: Style Number
        2. **Column 2**: Accessory 1 Number
        3. **Column 3**: Accessory 1 Name
        4. **Column 4**: Accessory 1 Type

        ### File Preparation:
        - ✅ **DELETE ALL EXISTING DATA** except headers
        - ✅ **DO NOT MODIFY HEADERS**
        - ✅ Fill data row by row
        - ✅ Multiple accessories per style supported

        ### Complete File Structure:
        \`\`\`
        Style,Accessory1,Name1,Type1,Accessory2,Name2,Type2,...
        STY001,ACC001,Button,Closure,ACC002,Zipper,Fastener
        STY002,ACC003,Thread,Sewing,ACC004,Label,Tagging
        \`\`\`

        ### Important Notes:
        - You can add multiple accessories per row
        - Follow the pattern: Number, Name, Type
        - Ensure consistency in accessory numbering
        - Save file as CSV before upload

        ### Accessory Types Available:
        - Closure (Buttons, Zippers)
        - Fastener (Hooks, Snaps)
        - Sewing (Thread, Needles)
        - Tagging (Labels, Tags)
        - Packaging (Bags, Boxes)
        - Embellishment (Sequins, Beads)

        ### Verification Steps:
        1. After upload, check Accessory Stock section
        2. Search for created accessories
        3. Verify details match uploaded data
        4. Test accessory updates functionality
      `
        }
    };

    const filteredSections = Object.entries(categories).reduce((acc, [category, data]) => {
        const filtered = data.sections.filter(section =>
            section.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
            category.toLowerCase().includes(searchQuery.toLowerCase())
        );
        if (filtered.length > 0) {
            acc[category] = { ...data, sections: filtered };
        }
        return acc;
    }, {});

    const currentContent = documentationContent[activeSection] || documentationContent.dashboard;

    return (
        <div className="flex min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
            {/* Sidebar */}
            <div className="w-80 bg-white border-r border-gray-200 shadow-lg">
                <div className="p-6 border-b border-gray-200">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg">
                            <BarChart3 className="text-white" size={24} />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-gray-800">Inventory System</h1>
                            <p className="text-sm text-gray-500">Complete Documentation</p>
                        </div>
                    </div>

                    {/* Search Bar */}
                    <div className="relative mb-6">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                        <input
                            type="text"
                            placeholder="Search sections..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                        />
                    </div>
                </div>

                {/* Navigation Categories */}
                <div className="p-4 space-y-1">
                    {Object.entries(filteredSections).map(([category, data]) => (
                        <div key={category} className="mb-2">
                            <button
                                onClick={() => toggleCategory(category)}
                                className={`w-full flex items-center justify-between p-3 rounded-lg transition-all duration-200 ${expandedCategories[category] ? data.bgColor : 'hover:bg-gray-50'}`}
                            >
                                <div className="flex items-center gap-3">
                                    <span className={data.color}>{data.icon}</span>
                                    <span className="font-medium text-gray-700">{data.label}</span>
                                </div>
                                <ChevronRight
                                    size={18}
                                    className={`text-gray-400 transition-transform duration-200 ${expandedCategories[category] ? 'rotate-90' : ''}`}
                                />
                            </button>

                            {/* Sub-sections */}
                            {expandedCategories[category] && (
                                <div className="ml-4 mt-1 space-y-1 border-l border-gray-200 pl-4">
                                    {data.sections.map((section) => (
                                        <button
                                            key={section.id}
                                            onClick={() => setActiveSection(section.id)}
                                            className={`w-full flex items-center gap-3 p-3 rounded-lg transition-all duration-200 ${activeSection === section.id ? 'bg-blue-50 text-blue-600' : 'hover:bg-gray-50 text-gray-600'}`}
                                        >
                                            <span className={activeSection === section.id ? 'text-blue-500' : 'text-gray-400'}>
                                                {section.icon}
                                            </span>
                                            <span className="text-sm font-medium">{section.label}</span>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}
                </div>

                {/* Quick Stats */}
                <div className="p-4 border-t border-gray-200 mt-6">
                    <div className="text-xs text-gray-500 mb-2">DOCUMENTATION STATS</div>
                    <div className="grid grid-cols-2 gap-2">
                        <div className="bg-blue-50 p-3 rounded-lg">
                            <div className="text-2xl font-bold text-blue-600">{Object.keys(documentationContent).length}</div>
                            <div className="text-xs text-gray-600">Total Sections</div>
                        </div>
                        <div className="bg-indigo-50 p-3 rounded-lg">
                            <div className="text-2xl font-bold text-indigo-600">{Object.keys(categories).length}</div>
                            <div className="text-xs text-gray-600">Categories</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 p-8 overflow-y-auto">
                <div className="max-w-7xl mx-auto">
                    {/* Header */}
                    <div className="mb-8">
                        <div className="flex items-center gap-4 mb-4">
                            <div className="p-3 bg-white rounded-xl shadow-sm border border-gray-200">
                                {currentContent.icon}
                            </div>
                            <div>
                                <h1 className="text-3xl font-bold text-gray-900">{currentContent.title}</h1>
                                <div className="flex items-center gap-2 mt-2">
                                    <span className="px-3 py-1 bg-gradient-to-r from-indigo-100 to-blue-100 text-indigo-700 text-xs font-medium rounded-full">
                                        {Object.keys(categories).find(cat =>
                                            categories[cat].sections.some(s => s.id === activeSection)
                                        )?.toUpperCase() || 'DASHBOARD'}
                                    </span>
                                    <span className="text-gray-500">•</span>
                                    <span className="text-gray-500 text-sm">Updated just now</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Content Card */}
                    <div className="bg-white rounded-2xl shadow-xs border border-gray-200 overflow-hidden">
                        {/* Content Navigation */}
                        <div className="border-b border-gray-200">
                            <div className="flex items-center gap-4 px-6 py-4">
                                <button className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-medium rounded-lg hover:from-blue-700 hover:to-indigo-700 transition">
                                    View Instructions
                                </button>

                            </div>
                        </div>

                        {/* Documentation Content */}
                        <div className="p-8">
                            <div className="prose prose-lg max-w-none">
                                <div className="text-gray-600 mb-6 text-lg leading-relaxed">
                                    {currentContent.content.split('\n').map((line, index) => {
                                        if (line.startsWith('## ')) {
                                            return <h2 key={index} className="text-2xl font-bold text-gray-900 mt-8 mb-4">{line.replace('## ', '')}</h2>;
                                        }
                                        if (line.startsWith('### ')) {
                                            return <h3 key={index} className="text-xl font-semibold text-gray-800 mt-6 mb-3">{line.replace('### ', '')}</h3>;
                                        }
                                        if (line.startsWith('- ') || line.startsWith('**') || line.startsWith('1. ')) {
                                            return <p key={index} className="text-gray-700 mb-3 leading-relaxed">{line}</p>;
                                        }
                                        if (line.startsWith('```')) {
                                            return null; // Skip code block markers
                                        }
                                        if (line.includes('`')) {
                                            return <code key={index} className="bg-gray-100 px-2 py-1 rounded text-sm font-mono text-gray-800">{line.replace(/`/g, '')}</code>;
                                        }
                                        return <p key={index} className="text-gray-700 mb-4 leading-relaxed">{line}</p>;
                                    })}
                                </div>

                                {/* Step-by-step Guide for Bulk Operations */}
                                {activeSection.includes('upload') && (
                                    <div className="mt-8 p-6 bg-gradient-to-r from-indigo-50 to-blue-50 rounded-xl border border-indigo-100">
                                        <h3 className="text-lg font-semibold text-indigo-800 mb-4 flex items-center gap-2">
                                            <FolderInput size={20} />
                                            Bulk Operation Checklist
                                        </h3>
                                        <ol className="space-y-3 text-indigo-700">
                                            <li className="flex items-start gap-3">
                                                <span className="flex-shrink-0 w-6 h-6 bg-indigo-600 text-white rounded-full flex items-center justify-center text-sm">1</span>
                                                <span>Download sample file template</span>
                                            </li>
                                            <li className="flex items-start gap-3">
                                                <span className="flex-shrink-0 w-6 h-6 bg-indigo-600 text-white rounded-full flex items-center justify-center text-sm">2</span>
                                                <span>Prepare data in Google Sheets as per instructions</span>
                                            </li>
                                            <li className="flex items-start gap-3">
                                                <span className="flex-shrink-0 w-6 h-6 bg-indigo-600 text-white rounded-full flex items-center justify-center text-sm">3</span>
                                                <span>Copy-paste data to sample file (DO NOT modify headers)</span>
                                            </li>
                                            <li className="flex items-start gap-3">
                                                <span className="flex-shrink-0 w-6 h-6 bg-indigo-600 text-white rounded-full flex items-center justify-center text-sm">4</span>
                                                <span>Save file as CSV format</span>
                                            </li>
                                            <li className="flex items-start gap-3">
                                                <span className="flex-shrink-0 w-6 h-6 bg-indigo-600 text-white rounded-full flex items-center justify-center text-sm">5</span>
                                                <span>Upload file through the system interface</span>
                                            </li>
                                            <li className="flex items-start gap-3">
                                                <span className="flex-shrink-0 w-6 h-6 bg-indigo-600 text-white rounded-full flex items-center justify-center text-sm">6</span>
                                                <span>Verify data in respective sections after upload</span>
                                            </li>
                                        </ol>
                                    </div>
                                )}

                                {/* Important Notes Section */}
                                <div className="mt-8 p-6 bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl border border-amber-100">
                                    <h3 className="text-lg font-semibold text-amber-800 mb-4 flex items-center gap-2">
                                        <AlertTriangle size={20} />
                                        Critical Instructions
                                    </h3>
                                    <ul className="space-y-2 text-amber-700">
                                        <li className="flex items-start gap-2">
                                            <AlertTriangle size={16} className="mt-1 flex-shrink-0" />
                                            <strong>DO NOT MODIFY HEADERS</strong> in any sample file
                                        </li>
                                        <li className="flex items-start gap-2">
                                            <AlertTriangle size={16} className="mt-1 flex-shrink-0" />
                                            Always use CSV format for uploads
                                        </li>
                                        <li className="flex items-start gap-2">
                                            <AlertTriangle size={16} className="mt-1 flex-shrink-0" />
                                            Verify data in Google Sheets before copying
                                        </li>
                                        <li className="flex items-start gap-2">
                                            <AlertTriangle size={16} className="mt-1 flex-shrink-0" />
                                            Save backups of uploaded files
                                        </li>
                                        <li className="flex items-start gap-2">
                                            <AlertTriangle size={16} className="mt-1 flex-shrink-0" />
                                            Check upload confirmation messages
                                        </li>
                                    </ul>
                                </div>

                                {/* File Format Tips */}
                                {activeSection.includes('upload') && (
                                    <div className="mt-8 p-6 bg-gradient-to-r from-emerald-50 to-green-50 rounded-xl border border-emerald-100">
                                        <h3 className="text-lg font-semibold text-emerald-800 mb-4 flex items-center gap-2">
                                            <FileSpreadsheet size={20} />
                                            File Format Requirements
                                        </h3>
                                        <ul className="space-y-2 text-emerald-700">
                                            <li className="flex items-start gap-2">
                                                <span className="mt-1">✅</span>
                                                <span>Use <strong>CSV (Comma Separated Values)</strong> format</span>
                                            </li>
                                            <li className="flex items-start gap-2">
                                                <span className="mt-1">✅</span>
                                                <span>UTF-8 encoding recommended</span>
                                            </li>
                                            <li className="flex items-start gap-2">
                                                <span className="mt-1">✅</span>
                                                <span>No empty rows between data entries</span>
                                            </li>
                                            <li className="flex items-start gap-2">
                                                <span className="mt-1">✅</span>
                                                <span>Remove special characters from data</span>
                                            </li>
                                            <li className="flex items-start gap-2">
                                                <span className="mt-1">✅</span>
                                                <span>Keep file size under 10MB for optimal performance</span>
                                            </li>
                                        </ul>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Footer Navigation */}
                        <div className="border-t border-gray-200 px-8 py-6 bg-gray-50">
                            <div className="flex justify-between items-center">
                                <div className="text-sm text-gray-500">
                                    Need more help? Contact system administrator
                                    <p className='mt-2 font-bold text-md'>Mobile No. <span className='text-blue-400 font-bold'>9137902483</span> </p>
                                </div>

                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default InventoryDocumentation;