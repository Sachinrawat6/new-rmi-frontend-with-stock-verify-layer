# 📦 Fabric Stock Inventory -- README

This README provides complete documentation for the **Fabric Stock
Inventory** React component.

------------------------------------------------------------------------

## 🚀 Overview

The **Stock.jsx** component displays your fabric inventory with:

-   Search functionality\
-   Pagination\
-   Style number expansion\
-   Stock status indicators\
-   Responsive UI using Tailwind CSS

This helps you monitor fabric availability, track related style numbers,
and navigate large datasets efficiently.

------------------------------------------------------------------------

## 📁 Component Features

### ✅ **1. Search Functionality**

You can search by: - Fabric Number\
- Fabric Name\
- Style Numbers

Search triggers on **Enter key**.

------------------------------------------------------------------------

### 📄 **2. Pagination**

-   Displays 50 items per page\
-   Supports Next / Previous navigation\
-   Shows total pages & current range

------------------------------------------------------------------------

### 🎨 **3. Stock Status Colors**

Based on `availableStock`: - **Green** → More than 100 meters\
- **Yellow** → Between 51--100 meters\
- **Red** → Less than 50 meters

------------------------------------------------------------------------

### 📦 **4. Expandable Style Numbers**

If a fabric contains linked style numbers: - A **Show / Hide Styles**
button appears\
- Expands to show all styling numbers in pill design

------------------------------------------------------------------------

### 🚫 **5. Empty State**

When stock or search results are empty, it displays: - Empty state
illustration\
- Option to clear search

------------------------------------------------------------------------

## 🧠 Logic Summary

### 🔍 **Filtering**

``` js
const filteredData = stock.filter((p) => {
  const term = searchTerm.toLowerCase();
  return (
    p.fabricNumber?.toString().toLowerCase().includes(term) ||
    p.fabricName?.toLowerCase().includes(term) ||
    p.styleNumbers?.some((s) => s.toString().toLowerCase().includes(term))
  );
});
```

### 📄 **Pagination**

``` js
const itemsPerPage = 50;
const startIndex = (currentPage - 1) * itemsPerPage;
const endIndex = startIndex + itemsPerPage;
```

------------------------------------------------------------------------

## 📦 Required Dependencies

Ensure these packages exist:

    react
    tailwindcss

For global context:

    useGlobalContext() → returns { stock, stockLoading }

------------------------------------------------------------------------

## 🏗️ Component File Structure

    src/
     ├── context/
     │     └── StockContextProvider.js
     ├── components/
     │     └── Stock.jsx

------------------------------------------------------------------------

## 📌 Usage

``` jsx
import Stock from "./components/Stock";

function App() {
  return (
    <div>
      <Stock />
    </div>
  );
}

export default App;
```

------------------------------------------------------------------------

## 📝 Notes

-   Make sure `stock` is always an array to avoid runtime errors.
-   Pagination resets automatically after clearing search.

------------------------------------------------------------------------

## 👨‍💻 Author

Sachin 

------------------------------------------------------------------------
