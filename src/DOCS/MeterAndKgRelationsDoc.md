# Meter ↔ Kilogram Relationship Component — Technical Documentation

> **File:** `MeterAndKgRelationship.jsx`

---

## Overview
`MeterAndKgRelationship` is a React functional component designed to display, search, and paginate a dataset representing the relationship between **fabric weight in kilograms** and **fabric length in meters**. The data is fetched from a global context (`useGlobalContext`), filtered in real-time, and displayed with animated UI elements powered by TailwindCSS.

This documentation covers component structure, expected data shape, search & filtering mechanics, pagination logic, UI structure, performance, error handling, and best‑practice improvements.

---

## Table of Contents
1. Purpose
2. Data Source & Expected Shape
3. Props & Context
4. Component State
5. Data Fetching & Effects
6. Filtering Logic
7. Pagination Logic
8. UI Structure
9. Loading & No‑Data States
10. Performance Considerations
11. Testing Checklist
12. Improvements & Refactoring Suggestions
13. Example Usage

---

## 1. Purpose
The component provides:
- Searchable list of fabric conversion records.
- Pagination with dynamic page counts.
- Real‑time filtering of fabric numbers.
- Animated visual indicators for KG & Meter values.
- Smooth responsive UI for mobile and desktop.

---

## 2. Data Source & Expected Shape
The component expects data from the global context in this approximate format:

```js
{
  _id: string,
  fabric_number: string | number,
  fabric_in_KG: number,      // numeric value representing weight
  fabric_in_meter: number,   // numeric value representing length (> 0 for visibility)
}
```

The raw dataset is accessed via:
```js
const { fetchMeterAndKgRelationShip, meterAndKG, styleLoading } = useGlobalContext();
```

---

## 3. Props & Context
This component **does not accept props**. Instead, values come from global context:
- `fetchMeterAndKgRelationShip()` – function that loads the data.
- `meterAndKG` – array of fabric conversion records.
- `styleLoading` – `boolean` to control the loading state.

---

## 4. Component State
| State | Type | Purpose |
|-------|------|----------|
| `searchTerm` | string | Live search filter for fabric numbers |
| `currentPage` | number | Current page index (starts at 1) |
| `recordsPerPage` | number | Fixed number of records displayed per page (25) |

---

## 5. Data Fetching & Effects
### Initial Fetch
```js
useEffect(() => {
    fetchMeterAndKgRelationShip();
}, []);
```
Runs once on mount to fetch conversion data.

### Resetting Pagination
```js
useEffect(() => setCurrentPage(1), [searchTerm]);
```
Ensures that whenever the search term changes, the UI resets to page 1.

---

## 6. Filtering Logic
### Step 1 — Basic Search Filter
```js
const filteredData = useMemo(() => {
    return meterAndKG.filter(item =>
        item.fabric_number?.toString().toLowerCase().includes(searchTerm.toLowerCase())
    );
}, [meterAndKG, searchTerm]);
```
Filters by partial match of `fabric_number`.

### Step 2 — Only Keep Records with `fabric_in_meter > 0`
```js
const filteredWithMeter = useMemo(() => {
    return filteredData.filter(item => item.fabric_in_meter > 0);
}, [filteredData]);
```
Only meaningful conversion entries (>0 meter) are shown.

---

## 7. Pagination Logic
- **Records per page:** `25`
- **Total pages:**
```js
const totalPages = Math.ceil(filteredWithMeter.length / recordsPerPage);
```
- **Current slice:**
```js
const indexOfLastRecord = currentPage * recordsPerPage;
const indexOfFirstRecord = indexOfLastRecord - recordsPerPage;
const currentRecords = filteredWithMeter.slice(indexOfFirstRecord, indexOfLastRecord);
```
- **Navigation:**
  - `paginate(pageNumber)` → jump to page
  - `prevPage()` → go back
  - `nextPage()` → go forward

The component displays:
- Up to 5 page buttons
- Last page shortcut when needed
- “Previous / Next” controls

---

## 8. UI Structure
The UI is divided into sections:

### **1. Header Section**
- Title
- Subtitle
- Category badge

### **2. Search + Stats Card**
Displays:
- Search input
- Count of matched records
- Total pages

### **3. Main Table**
Columns:
- Fabric Number
- Fabric Weight (KG) (with animated bar)
- Fabric Length (Meter) (with animated bar)

### **4. Pagination Component**
- Previous / Next buttons
- 3–5 page buttons
- Ellipsis (…)
- Last page button

### **5. No Data State**
Shows a friendly message + “Clear Search” button.

---

## 9. Loading & No‑Data States
### Loading
Animated spinner + overlay messages.

### No Matching Records
When `searchTerm` is active but yields zero matches, the UI displays:
- Icon
- “No matching results found”
- Description
- Clear Search button

### No Data Available
If dataset is empty and no search term, a general empty state is shown.

---

## 10. Performance Considerations
- **useMemo** optimizes filtering.
- For extremely large datasets, consider:
  - Virtualized rendering (react-window)
  - Server‑side pagination
  - Debounced search

---

## 11. Testing Checklist
- [ ] Data fetch triggers on mount
- [ ] Loading spinner displays when `styleLoading === true`
- [ ] Search filters results in real-time
- [ ] Pagination shows correct page numbers
- [ ] Previous/Next disable correctly at boundaries
- [ ] Bars scale correctly for KG/Meter values
- [ ] Handles empty / missing fields gracefully
- [ ] Responsive layout works on mobile/tablet

---

## 12. Improvements & Refactoring Suggestions
- Add **sorting** by KG or Meter.
- Add **records per page selector**.
- Convert to **TypeScript** for better type safety.
- Add a debounce (300ms) to search input.
- Extract table + pagination into reusable components.
- Improve bar width calculation scaling (currently linear).
- Add CSV export button.

---

## 13. Example Usage
If wrapped in Global Context Provider:
```jsx
import MeterAndKgRelationship from './MeterAndKgRelationship';

function Page() {
  return <MeterAndKgRelationship />;
}
```

---

