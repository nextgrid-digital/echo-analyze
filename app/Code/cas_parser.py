from casparser import read_cas_pdf
from typing import Dict, Any, Union
import io
import datetime
from openpyxl import Workbook

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
    Converts parsed JSON data to an Excel file buffer (openpyxl only, no pandas).
    """
    wb = Workbook()
    ws = wb.active
    ws.title = "Transactions"

    headers = [
        "AMC", "Folio", "Scheme", "Advisor", "Date", "Description",
        "Amount", "Units", "NAV", "Balance", "Type"
    ]
    ws.append(headers)

    folios = json_data.get("folios", [])
    for folio_data in folios:
        schemes = folio_data.get("schemes", [])
        for scheme in schemes:
            scheme_name = scheme.get("scheme", "Unknown")
            folio_num = folio_data.get("folio", scheme.get("folio", "Unknown"))
            advisor = scheme.get("advisor", "")
            amc = folio_data.get("amc", scheme.get("amc", ""))

            for txn in scheme.get("transactions", []):
                row = [
                    amc,
                    folio_num,
                    scheme_name,
                    advisor,
                    txn.get("date"),
                    txn.get("description"),
                    txn.get("amount"),
                    txn.get("units"),
                    txn.get("nav"),
                    txn.get("balance"),
                    txn.get("type"),
                ]
                ws.append(row)

    if ws.max_row == 1:
        ws.append(["No transactions found"])

    output = io.BytesIO()
    wb.save(output)
    output.seek(0)
    return output
