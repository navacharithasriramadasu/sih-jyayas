# ☁️ Cloud Processing Guide: KCC Dataset (Memory Safe Version)

Ah, the dataset is so massive that it actually **crashed Google's servers by running out of RAM** when trying to load it all at once! 

To bypass this, I have rewritten the script to use **Chunking**. This means it will read the gigabytes of data in small, 100,000-row pieces, extract the queries we need, and discard the rest to keep RAM usage extremely low.

## Step 1: Restart Colab
Since the kernel crashed, refresh your Colab page to get a fresh session.

## Step 2: Run the Memory-Safe Script
Paste this new script into the cell and hit Play:

```python
!pip install kagglehub pandas

import kagglehub
import pandas as pd
import json
import os
import gc

print("1. Downloading massive KCC dataset to Google Cloud...")
path = kagglehub.dataset_download("sridhargutam/kcc-dataset")

# Find the main CSV file
csv_file = None
for root, dirs, files in os.walk(path):
    for f in files:
        if f.endswith('.csv'):
            csv_file = os.path.join(root, f)
            break

if not csv_file:
    print("Error: Could not find CSV file.")
else:
    print(f"2. Processing CSV in chunks to save RAM: {csv_file}")
    
    # Define keywords for our 3 intents
    sell_keywords = ['sell', 'buyer', 'ammu', 'bechna', 'sale']
    price_keywords = ['price', 'rate', 'cost', 'bhav', 'dhara', 'market']
    demand_keywords = ['demand', 'need', 'require', 'kharidne']
    
    sell_queries, price_queries, demand_queries = [], [], []
    
    # Process the massive file in chunks of 100,000 rows
    chunk_size = 100000
    try:
        for chunk in pd.read_csv(csv_file, usecols=['QueryText'], chunksize=chunk_size, low_memory=False):
            # Clean and lowercase the chunk
            chunk = chunk.dropna()
            queries = chunk['QueryText'].astype(str).str.lower()
            
            # If we don't have enough queries yet, extract them
            if len(sell_queries) < 500:
                sells = queries[queries.str.contains('|'.join(sell_keywords))].tolist()
                sell_queries.extend(sells)
                
            if len(price_queries) < 500:
                prices = queries[queries.str.contains('|'.join(price_keywords))].tolist()
                price_queries.extend(prices)
                
            if len(demand_queries) < 500:
                demands = queries[queries.str.contains('|'.join(demand_keywords))].tolist()
                demand_queries.extend(demands)
                
            # Free memory
            del chunk
            gc.collect()
            
            # Stop reading if we found enough data!
            if len(sell_queries) >= 500 and len(price_queries) >= 500 and len(demand_queries) >= 500:
                print("Found enough training data! Stopping early to save time.")
                break
    except Exception as e:
        print(f"Error during chunking: {e}")

    # Keep exactly 500
    sell_queries = sell_queries[:500]
    price_queries = price_queries[:500]
    demand_queries = demand_queries[:500]

    print(f"Extracted {len(sell_queries)} sell, {len(price_queries)} price, {len(demand_queries)} demand.")

    # 3. Save to a tiny JSON file
    intents_data = {
        "intents": [
            {"tag": "sell_produce", "patterns": sell_queries},
            {"tag": "check_price", "patterns": price_queries},
            {"tag": "check_demand", "patterns": demand_queries}
        ]
    }

    output_file = '/content/kcc_intents_filtered.json'
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(intents_data, f, indent=4)

    print(f"\n✅ SUCCESS! Tiny training dataset generated at: {output_file}")
    
    # Auto-download the file to your computer
    from google.colab import files
    files.download(output_file)
```
