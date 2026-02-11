import asyncio
import sys
import os
from datetime import datetime

# Add project root to path
sys.path.append(os.getcwd())

from app.Code.main import map_casparser_to_analysis, Holding

async def test_analysis():
    print("Testing map_casparser_to_analysis...")
    
    # Mock data resembling CAS parser output
    mock_data = {
        "ok": True,
        "folios": [
            {
                "folio": "12345678",
                "amc": "Test AMC",
                "schemes": [
                    {
                        "scheme": "HDFC Liquid Fund - Direct Plan - Growth Option",
                        "amfi": "119063",
                        "type": "DEBT",
                        "close": 100.0,
                        "valuation": {"nav": 4500.0, "value": 450000.0},
                        "transactions": [
                            {"date": "2023-01-01", "description": "Purchase", "amount": 400000.0, "units": 95.0},
                            {"date": "2023-06-01", "description": "Purchase", "amount": 20000.0, "units": 4.5}
                        ]
                    },
                    {
                        "scheme": "Parag Parikh Flexi Cap Fund - Direct Growth",
                        "amfi": "122639",
                        "type": "EQUITY",
                        "close": 500.0,
                        "valuation": {"nav": 75.0, "value": 37500.0},
                        "transactions": [
                             {"date": "2020-01-01", "description": "SIP", "amount": 10000.0},
                             {"date": "2021-01-01", "description": "SIP", "amount": 10000.0}
                        ]
                    }
                ]
            }
        ],
        "statement_period": {"from": "2020-01-01", "to": "2024-01-01"}
    }
    
    try:
        result = await map_casparser_to_analysis(mock_data)
        if hasattr(result, "holdings"):
            print(f"Success! Processed {len(result.holdings)} holdings.")
            for h in result.holdings:
                print(f"Scheme: {h.scheme_name}")
                print(f"  Category: {h.category}, Sub: {h.sub_category}")
                print(f"  XIRR: {h.xirr}%, Benchmark XIRR: {h.benchmark_xirr}%")
                print(f"  Date of Entry: {h.date_of_entry}")
                
                # Assertions
                if "Liquid" in h.scheme_name and h.sub_category != "Diff - Liquidity":
                    print("  [ERROR] Incorrect sub-category for Liquid fund.")
                if h.date_of_entry is None:
                    print("  [ERROR] Date of entry is None.")
                    
            # Check Asset Allocation
            allocs = result.summary.asset_allocation
            print("\nAsset Allocation:")
            for a in allocs:
                print(f"  {a.category}: {a.value}")
                
        else:
            print("Error: Result format unexpected.")
            
    except Exception as e:
        print(f"Validation Failed with Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_analysis())
