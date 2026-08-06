# Ship_Stock Component -- Detailed Documentation

## 📌 Overview

The **Ship_Stock** component is a React module used for transferring
fabric stock between different locations (e.g., Store 1 → Store 2 or
Production).\
It integrates with backend APIs to: - Fetch fabric/product details\
- Update main inventory (Stock 1)\
- Add stock to Store 2 when required\
- Preview product information from Myntra\
- Provide a clean UI for entering shipping data

------------------------------------------------------------------------

## 🧩 Component Responsibilities

### 1. **Form Handling**

Captures: - Fabric Number\
- Ship Quantity\
- Current Source\
- Destination

### 2. **Stock Management**

-   Validates available stock\
-   Deducts shipped quantity from Store 1\
-   Moves stock to Store 2 if applicable

### 3. **Store 2 Inventory Update**

Sends POST API request in bulk format:

``` json
{
  "stocks": [
    {
      "fabricNumber": "",
      "fabricName": "",
      "fabric_source": "",
      "availableStock": 0,
      "styleNumbers": []
    }
  ]
}
```

### 4. **Product Preview**

Fetches product info using:

    GET https://inventorybackend-m1z8.onrender.com/api/product?style_code=<styleCode>

Displays Myntra product using an `<iframe>`.

------------------------------------------------------------------------

## 🔌 API Endpoints Used

### **1. Fetch Product**

    GET https://inventorybackend-m1z8.onrender.com/api/product?style_code=<STYLE_CODE>

### **2. Update Main Stock (Store 1)**

    PUT {BASE_URL}/api/v1/stock/<STOCK_ID>

### **3. Update Store 2 Inventory**

    POST {BASE_URL}/api/v1/stock2/bulk

------------------------------------------------------------------------

## 🛠 Internal Functions

### \### **handleChange(event)**

Updates input fields dynamically.

### **handleFetchProduct()**

-   Fetches product using style code\
-   Stores in `product` state\
-   Displays loading spinner while fetching

### **updateStock2Inventory()**

Triggers only when destination is **store2**.

### **handleStockUpdate(e)**

Main shipping handler: 1. Validates stock availability\
2. Updates main stock\
3. Conditionally updates store2 stock\
4. Resets fields and refreshes inventory

------------------------------------------------------------------------

## 🗂 State Variables

  State        Purpose
  ------------ --------------------------------------------
  `loading`    Controls loading spinner for product fetch
  `product`    Stores product API response
  `formData`   Stores form inputs
  `stock`      Global stock data from context

------------------------------------------------------------------------

## 🧠 Context Used

``` js
const { stock, fetchStock } = useGlobalContext();
```

The context provides: - Full inventory list\
- Method to refresh inventory after updates

------------------------------------------------------------------------

## 🖥 UI Features

-   Left section → Stock Form\
-   Right section → Product Preview\
-   Validation alerts\
-   Animated loading spinner\
-   Clean Tailwind UI

------------------------------------------------------------------------

## 📎 Important Logic Notes

-   Product fetch runs on every `fabricNumber` change (via `useEffect`)\
-   If insufficient stock → shipping is blocked\
-   Destination must be selected\
-   After every successful update → global stock is refreshed

------------------------------------------------------------------------

## 🔚 Conclusion

The **Ship_Stock** component provides a complete workflow for
transferring fabric stock between multiple locations in an inventory
management system, with backend sync and product preview functionality.

------------------------------------------------------------------------

