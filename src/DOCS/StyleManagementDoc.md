# StyleNumber Component — Technical Documentation

> **File:** `StyleNumber.jsx`

---

## Overview

`StyleNumber` is a React functional component that renders a searchable, paginated list of style numbers and their associated fabrics. It consumes `styleNumber` and `styleLoading` from a global context (`useGlobalContext`) and provides features like search, pagination, adjustable records-per-page, expandable fabric details, and links to images.

This document describes the component's responsibilities, props/state, internal utilities, expected data shape, usage examples, styling notes (Tailwind CSS), accessibility considerations, and suggested improvements.

---

## Table of Contents

1. Purpose
2. Expected Data Shape
3. Props & Context
4. Component State
5. Core Behavior & Functions
6. UI Structure
7. Pagination Logic
8. Search & Filter Logic
9. Fabric Details & Expansion
10. Styling & UI Notes
11. Error states & Loading
12. Performance considerations
13. Testing checklist
14. Known issues / TODOs
15. Example usage & sample data
16. License

---

## 1. Purpose

- Display a list/table of style numbers with pattern numbers, a link to a style image, and a quick fabrics summary.
- Allow users to search by style number, pattern number, or fabric number.
- Provide pagination and choose how many records to show per page.
- Expand a style to show per-fabric details and average measurements where available.

---

## 2. Expected Data Shape

The component expects `styleNumber` (an array) delivered by context. Each element should roughly match this shape:

```js
{
  styleNumber: string | number,
  patternNumber: string | number | null,
  styleImage: string | null, // URL
  fabrics: [
    {
      fabric_no: string | number,
      fabric_name: string,
      fabric_image: string | null // URL
      // other fabric-level fields
    }
  ],
  fabricAvgDetails: {
    fabrics: [
      {
        average_xxs_xs?: number,
        average_s_m?: number,
        average_l_xl?: number,
        average_2xl_3xl?: number,
        average_4xl_5xl?: number,
        width?: number
      }
    ]
  }
}
```

> Note: The code references `curStyle.fabricAvgDetails[idx]?.fabrics[idx]...`, so `fabricAvgDetails` should be an object with a `fabrics` array that aligns index-wise with `fabrics`.

---

## 3. Props & Context

- The component does not accept props directly; it consumes values from `useGlobalContext()`:
  - `styleNumber` — `Array` of style objects (see shape above)
  - `styleLoading` — `boolean` to indicate data loading

If you prefer prop-driven usage, you can refactor the component to accept `styles` and `loading` as props and fall back to context when not provided.

---

## 4. Component State

- `currentPage` (`number`) — current page index (1-based)
- `searchTerm` (`string`) — active search term applied when pressing Enter
- `inputValue` (`string`) — controlled input value for the search box
- `expandedFabrics` (`object`) — map of `styleNumber` -> `boolean` to track expanded/collapsed state
- `itemsPerPage` (`number`) — number of records to display per page; default `50`

---

## 5. Core Behavior & Functions

### `toggleFabricDetails(styleNumber)`
Toggles the `expandedFabrics[styleNumber]` boolean.

### `handleItemsPerPageChange(e)`
Parses selected value to `Number`, sets `itemsPerPage` and resets `currentPage` to `1`.

### `handleClearFilter()`
Clears `inputValue` and `searchTerm`, resets `currentPage` to `1`.

---

## 6. UI Structure

- Top header with title and search box (press Enter to apply search).
- Records-per-page selector and top status bar showing how many records are displayed.
- A responsive table with columns: `Style No.`, `Pattern No.`, `Style Image`, `Fabrics`, and `Actions`.
- Each row has a toggle button (if fabrics present) to show a detailed card-grid beneath the row — the expanded area is a `tr` spanning all columns and contains cards for each fabric with averages.
- Pagination controls with "Previous" and "Next" buttons and a condensed numeric pagination set (up to 5 page buttons are shown with logic to display pages around the current page).

---

## 7. Pagination Logic

- `startIndex = (currentPage - 1) * itemsPerPage`
- `endIndex = startIndex + itemsPerPage`
- `totalPages = Math.ceil(styleNumber.length / itemsPerPage)`
- `displayItems` is the slice of data shown on the current page. If `searchTerm` is set, pagination operates on the `filteredData` set (the code currently slices `filteredData` for `displayItems` only when `searchTerm` is truthy).

**Note:** The component currently calculates `totalPages` using `styleNumber.length` even when a search is active — if you want pagination to reflect filtered results, derive `totalPages` from `filteredData.length` when `searchTerm` is active.

---

## 8. Search & Filter Logic

- Controlled input is `inputValue`.
- Search applies only when the Enter key is pressed; `searchTerm` holds the applied filter.
- Filter compares lowercase strings for:
  - `p.styleNumber`
  - `p.patternNumber`
  - any `f.fabric_no` inside `p.fabrics`

> Implementation detail: The filter uses `p.fabrics?.some(f => f.fabric_no?.toString().toLowerCase().includes(term))`.

**Improvement:** Consider debounced live search (e.g., apply 300–500ms after typing) and/or a separate "Search" button for clarity.

---

## 9. Fabric Details & Expansion

- When a style row is expanded, the code maps `curStyle.fabrics` and renders cards containing fabric metadata and average measurements.
- It references `curStyle.fabricAvgDetails[idx]?.fabrics[idx]` for average values; ensure the `fabricAvgDetails` structure matches this indexing.

---

## 10. Styling & UI Notes

- Tailwind CSS classes are used throughout. The component expects Tailwind to be configured in the hosting project.
- Cards and buttons use small rounded corners and subtle shadows for a modern aesthetic.
- Buttons include inline SVG icons for accessibility and visual affordance.

---

## 11. Error states & Loading

- While `styleLoading` is true, a centered spinner is shown.
- If `displayItems.length === 0` the table shows a friendly "No results found" message.

**Edge cases to handle:**
- Null/undefined fields in `styleNumber` array elements.
- Mismatched lengths between `fabrics` and `fabricAvgDetails.fabrics`.

---

## 12. Performance considerations

- For very large datasets, consider server-side pagination or virtualization (`react-window` / `react-virtualized`) to avoid rendering many DOM nodes.
- Memoize derived data (`filteredData`, `displayItems`) with `useMemo` to avoid recomputation on unrelated state changes.
- Consider storing the expanded state by index instead of `styleNumber` string if `styleNumber` is not unique.

---

## 13. Testing checklist

- [ ] Renders a spinner when `styleLoading` is `true`.
- [ ] Shows correct number of rows for given `itemsPerPage`.
- [ ] Search filters by style, pattern, and fabric number.
- [ ] Pagination buttons navigate correctly including edge pages.
- [ ] Expand / collapse fabric details toggles correctly and displays averages.
- [ ] Handles missing images gracefully (shows "No image").
- [ ] Works correctly when `fabrics` is an empty array.

---

## 14. Known issues / TODOs

- `totalPages` is always computed from `styleNumber.length`. If pagination should reflect filtered results, compute from `filteredData.length` when `searchTerm` is active.
- `fabricAvgDetails` indexing may be fragile; consider normalizing the data on ingestion so each fabric object contains its own average values.
- `searchTerm` only applies on Enter; for better UX offer a "Search" button and/or debounced live search.
- Accessibility: Add `aria-expanded` and `aria-controls` attributes to the toggle buttons; ensure focus states and keyboard navigation are complete.

---

## 15. Example usage & sample data

**Usage** (component is default export):

```jsx
import StyleNumber from './StyleNumber';

function Page() {
  return <StyleNumber />; // assumes context provider is wrapping the app
}
```

**Sample single record:**

```json
{
  "styleNumber": "ST-001",
  "patternNumber": "PAT-45",
  "styleImage": "https://example.com/style/ST-001.jpg",
  "fabrics": [
    { "fabric_no": "F-1001", "fabric_name": "Cotton Jersey", "fabric_image": "https://example.com/fab/F-1001.jpg" }
  ],
  "fabricAvgDetails": {
    "fabrics": [
      { "average_xxs_xs": 24, "average_s_m": 26, "average_l_xl": 28, "average_2xl_3xl": 30, "average_4xl_5xl": 32, "width": 150 }
    ]
  }
}
```

---

