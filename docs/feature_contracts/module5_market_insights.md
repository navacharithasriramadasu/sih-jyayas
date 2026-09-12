# 📈 Frontend Feature Contract - Module 5: Demand Forecasting & Market Insights

This document guides frontend developers on how to fetch and render the Machine Learning data, specifically the Demand Forecasting graphs and Price Recommendations.

## 📱 Feature Overview
This module directly answers the core problem statement for the hackathon. It allows farmers to see if demand for a crop is rising (so they can charge more) or falling. It relies on the NestJS API which aggregates official Government Agmarknet prices with our internal platform search volume.

---

## 🔌 API Specification

### 1. Fetch Historical Demand & Price Recommendations
**Endpoint:** `GET /api/v1/market-insights/historical-demand?crop=tomato`
*(Auth is optional for this endpoint so it can be shown on public dashboards)*

**What it does:** Fetches a 30-day time-series array of exact market prices (from `data.gov.in`) alongside internal platform demand (how many buyers searched for tomatoes).

**Success Response (200 OK):**
```json
{
  "success": true,
  "crop": "tomato",
  "data": {
    "search_volume": [
      { "created_at": "2026-08-15T10:00:00Z", "required_quantity_kg": "500" },
      { "created_at": "2026-08-18T14:30:00Z", "required_quantity_kg": "750" }
      // ... up to 30 days of data
    ],
    "historical_prices": [
      { "recorded_at": "2026-08-15T00:00:00Z", "modal_price": "24.5" },
      { "recorded_at": "2026-08-16T00:00:00Z", "modal_price": "25.0" }
      // ... up to 30 days of official govt data
    ]
  }
}
```

---

## 🎨 UI/UX Guidelines & Edge Cases

> [!TIP]  
> **Plotting the Graphs (Flutter):**
> Use the `fl_chart` package. Plot the `historical_prices` on a standard Line Chart (X-axis = Date, Y-axis = Price in ₹). Overlay the `search_volume` as a Bar Chart in the background to show the exact correlation between rising demand and rising prices!

### Recommended UI Flow (Price Recommendation):
1. **Farmer Registration Screen:** When a farmer is filling out the "Add Produce" form (Module 2), as soon as they select "Tomato" from the dropdown, immediately fire a background `GET` request to this endpoint.
2. **Dynamic UI Update:** Look at the most recent `modal_price` in the array (e.g., `25.0`). Update the UI to say: *"💡 The official government Mandi price today is ₹25/kg. We recommend listing near this price."*
3. **Smart Pre-fill:** Automatically pre-fill the `expected_price_per_kg` text box with this recommended value so the farmer doesn't even have to type it!
