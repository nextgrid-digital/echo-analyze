from casparser import read_cas_pdf
from typing import Dict, Any, Union
import pandas as pd
import io
import json
import datetime

def recursive_to_dict(obj):
    if hasattr(obj, "to_dict"):
        return recursive_to_dict(obj.to_dict())
    if hasattr(obj, "__dict__"):
        return recursive_to_dict({k: v for k, v in obj.__dict__.items() if not k.startswith('_')})
    if isinstance(obj, dict):
        return {k: recursive_to_dict(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [recursive_to_dict(x) for x in obj]
    if isinstance(obj, (datetime.date, datetime.datetime)):
        return obj.isoformat()
    return obj


def parse_with_casparser(pdf_path_or_buffer: Union[str, io.BytesIO], password: str = "") -> Dict[str, Any]:
    """
    Parses a CAS PDF file using casparser library.
    
    Args:
        pdf_path_or_buffer: Path to file or bytes buffer
        password: Password for the PDF
        
    Returns:
        Dict containing parsed data
    """
    try:
        import tempfile
        import os
        
        # Create a temporary file
        with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp:
            # If it's bytes buffer, write to file
            if hasattr(pdf_path_or_buffer, "read"):
                tmp.write(pdf_path_or_buffer.read())
            else:
                 # If it's already a path (string), just use it
                 return {"success": True, "data": read_cas_pdf(pdf_path_or_buffer, password=password)}
            tmp_path = tmp.name

        try:
            data = read_cas_pdf(tmp_path, password=password)
            # Recursively convert everything to dict/primitives
            data = recursive_to_dict(data)
            
            return {"success": True, "data": data}
        finally:
            # Clean up temp file
            if os.path.exists(tmp_path):
                os.remove(tmp_path)
                
    except Exception as e:
        return {"success": False, "error": str(e)}

def convert_to_excel(json_data: Dict[str, Any]) -> io.BytesIO:
    """
    Converts parsed JSON data to an Excel file buffer.
    
    Args:
        json_data: The data dictionary from casparser
        
    Returns:
        io.BytesIO buffer containing the Excel file
    """
    output = io.BytesIO()
    
    # casparser structure: data['folios'] -> list of folios -> 'schemes' -> list of schemes
    folios = json_data.get('folios', [])
    flattened_data = []
    
    for folio_data in folios:
        schemes = folio_data.get('schemes', [])
        for scheme in schemes:
            scheme_name = scheme.get('scheme', 'Unknown')
            folio_num = folio_data.get('folio', scheme.get('folio', 'Unknown'))
            advisor = scheme.get('advisor', '')
            amc = folio_data.get('amc', scheme.get('amc', ''))
            
            for txn in scheme.get('transactions', []):
                row = {
                    "AMC": amc,
                    "Folio": folio_num,
                    "Scheme": scheme_name,
                    "Advisor": advisor,
                    "Date": txn.get("date"),
                    "Description": txn.get("description"),
                    "Amount": txn.get("amount"),
                    "Units": txn.get("units"),
                    "NAV": txn.get("nav"),
                    "Balance": txn.get("balance"),
                    "Type": txn.get("type")
                }
                flattened_data.append(row)
    
    if not flattened_data:
        # Create empty df if no data
        df = pd.DataFrame(columns=["Message"])
        df.loc[0] = ["No transactions found"]
    else:
        df = pd.DataFrame(flattened_data)
        
    with pd.ExcelWriter(output, engine='openpyxl') as writer:
        df.to_excel(writer, index=False, sheet_name='Transactions')
        
    output.seek(0)
    return output
