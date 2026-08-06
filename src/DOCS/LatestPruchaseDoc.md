# 📘 FabricRate Component – User Guide

This document explains how the **FabricRate** React component works, how to use it, and how the data flow operates.

---

## 🚀 Overview

The `FabricRate` component is responsible for:

- Fetching fabric data from a **Google Sheet**
- Saving fabric data to your backend
- Displaying real-time fabric purchase records
- Applying search, filtering, pagination
- Updating Fabric Meter ↔ KG relationship
- Managing UI states like loading, errors, stats, and tables

---

## 📂 File Location

```
/src/components/FabricRate.jsx
```

---

## 🔧 Key Functionalities

### ✔ 1. Fetch Fabric Records (Google Sheet → Frontend)
Uses:
```js
fetchFabricDataFromGoogleSheet()
```
Stores response in:
```js
fabricRate state
```

---

### ✔ 2. Save Fabric Data to Backend (Google Sheet → Database)
Automatically triggers when sheet data loads:
```js
upsertFabricDetails()
```
POST → 
```
/api/v1/fabric-rate/add-fabric-details
```

Payload includes:
- fabric_number  
- fabric_name  
- vender  
- fabric_rate  
- unit  
- fabric_length  
- recieved_qty_meter  
- recieved_qty_kg  
- width  
- recieved_date  

---

### ✔ 3. Add Meter-to-KG Relationship
On button click:
```js
updateMeterAndKgRelationShip()
```
POST →
```
/api/v1/relation/add-relationship
```

Relationship stored as:
```
1 KG = (meter/kg ratio)
```

---

## 🔍 Search Features

You can search by:
- Fabric number  
- Fabric name  
- Vendor  
- Unit  
- Length  
- Width  
- Date  

Search updates table + page number automatically.

---

## 📑 Pagination

- Page size = **50**
- Auto calculates:
  - total pages
  - slice of results per page
  - buttons for navigation

---

## 🧮 Metric Calculations

**Meter/KG Ratio:**
```js
(fab.recieved_qty_meter / fab.recieved_qty_kg).toFixed(2)
```

Width formatting:
- Normal
- Big
- Raw value otherwise

---

## 🎨 UI Enhancements

- Loading spinner  
- Error alert box  
- Colored tags for:
  - Vendor  
  - Ratio  
  - Dates  

---

## 🖥 API Endpoints

### Fetch Sheet Data (internal service)
```
fetchFabricDataFromGoogleSheet()
```

### Save Fabric Details
```
POST /api/v1/fabric-rate/add-fabric-details
```

### Add Meter–KG Relationship
```
POST /api/v1/relation/add-relationship
```

---

## 🧷 Important Notes

- Backend auto-updates when Google Sheet changes.
- Relationship update must be triggered manually.
- Errors appear as red UI alerts.
- Component autoloads fresh data on mount.

---

## 🏁 How to Use

1. Open the page where FabricRate is used.
2. It will *auto fetch* fabric data.
3. It will *auto push* fabric records to backend.
4. Search anything in the search bar.
5. Use pagination at bottom.
6. Click **Update Relations** to sync Meter↔KG ratio.

---

## ✨ Conclusion

This component provides a complete automated workflow:
- Google Sheet → Frontend → Database → Relationship Table  
Everything is optimized, modular, and scalable.

---


