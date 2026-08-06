# AddStock Component – Technical Documentation

(Documentation content will be added here. Please tell me if you want sections like Overview, Props/State, API Calls, Business Logic, Conditional UI Logic, Full Flowchart, or Sequence Diagram.)


# AddStock Component – Full Technical Documentation

## 1. Overview
The **AddStock Component** is responsible for managing and updating stock entries for fabrics and style numbers. It supports:
- Fetching relation details
- Adding or updating stock quantities
- Calculating balance stock
- Input validation
- Smooth UI handling for Store 1 and Store 2

---

## 2. Component Responsibilities
### ✔ Fetch relation details based on input
### ✔ Allow user to update stock for specific style & fabric
### ✔ Handle both Meter and KG calculations
### ✔ Compute final balance and update backend
### ✔ Provide UI validation & safe user flow

---

## 3. State Variables
| State | Type | Purpose |
|-------|------|---------|
| `inputValue` | string | Stores fabric number / style number entered by user |
| `relationData` | object | Stores fetched relation details |
| `loading` | boolean | Indicates API fetch status |
| `stockData` | object | Stores stock values (meter, kg) for updates |
| `store` | string | Indicates current store (`store1` / `store2`) |
| `error` | string | Error handling and validation messages |

---

## 4. API Endpoints Used
### **1. GET /relation/details/{fabricNumber}**
Fetches relation details for fabric or style.

### **2. POST /stock2**
Adds fresh stock record for Store 2.

### **3. POST /stock/{id}**
Updates existing stock record.

### **4. GET /stock/details/{id}**
Fetch existing stock details.

---

## 5. Business Logic
### **Case 1 — Relation not found**
- Show error **“Relation not found”**
- Disable stock update fields

### **Case 2 — Relation found but stock entry doesn’t exist**
- Create new stock entry
- API → **POST /stock2**

### **Case 3 — Stock entry exists**
- Update stock
- API → **POST /stock/{id}**

---

## 6. Stock Calculation Logic
### **For Meter-based stock**
```
final_meter = previous_meter + added_meter
final_balance = final_meter - issued_meter
```

### **For KG-based stock**
```
after_kg = previous_kg + added_kg
balance_kg = after_kg - issued_kg
```

### **Mixed Mode (Meter → KG)**
If system supports conversion:
```
kg = meter * GSM * width / 1000
```
(May vary per fabric type)

---

## 7. Validation Rules
### ✔ Input field must not be empty
### ✔ Only numbers allowed for stock inputs
### ✔ Negative values not allowed
### ✔ Auto-block operation if relation not fetched
### ✔ Prevent dual submissions

---

## 8. UI Flow
### Step 1: User Enters Fabric / Style Number
- On Enter → Fetch relation details

### Step 2: Show Result
- If found → Display required fields
- If not → Show error message

### Step 3: User Enters New Stock
- Inputs: **Meter**, **KG**, **Rolls** (optional)

### Step 4: Final Submit
- If stock exists → update
- If not → create new

---

## 9. Complete Workflow Diagram
```
[User Input]
     ↓
Fetch Relation Details (API)
     ↓
Is Relation Found?
     ├── No → Show Error → Stop
     └── Yes → Check Existing Stock
                 ↓
         Does Stock Exist?
                 ├── No → Create New Stock
                 └── Yes → Update Existing Stock
                           ↓
                 Recalculate Balances
                           ↓
                     Save & Show Success
```

---

## 10. Edge Cases
### ✔ Wrong fabric number entered
### ✔ API timeout
### ✔ Duplicate submissions
### ✔ Meter and KG both empty
### ✔ User switches store in the middle of process

---

## 11. Example API Payloads
### **Create Payload (POST /stock2)**
```json
{
  "fabricNumber": "F1209",
  "styleNumber": "ST-77",
  "store": "store2",
  "meter": 250,
  "kg": 0,
  "roll": 4
}
```

### **Update Payload (POST /stock/{id})**
```json
{
  "addMeter": 40,
  "addKG": 12,
  "finalMeter": 290,
  "finalKG": 12
}
```

---

## 12. Best Practices
### ✔ Always validate relation before enabling the form
### ✔ Disable submit button while loading
### ✔ Use debounce for input field
### ✔ Show toast notifications for user clarity

---

