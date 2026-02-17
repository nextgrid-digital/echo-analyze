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


def _is_password_error(err_str: str) -> bool:
    """Check if an exception message looks like a password-related failure."""
    lower = err_str.lower()
    return any(kw in lower for kw in [
        "password", "encrypted", "decrypt", "invalid credential",
        "wrong password", "incorrect password", "pdfminer",
        "file has not been decrypted", "owner password",
    ])

def parse_with_casparser(pdf_path_or_buffer: Union[str, io.BytesIO], password: str = "") -> Dict[str, Any]:
    """
    Parses a CAS PDF file using casparser library.
    Handles password-protected PDFs gracefully.
    """
    import tempfile
    import os

    tmp_path = None
    try:
        # Write buffer to a temp file (casparser needs a file path)
        with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp:
            if hasattr(pdf_path_or_buffer, "read"):
                tmp.write(pdf_path_or_buffer.read())
                tmp_path = tmp.name
            else:
                # Already a path string
                tmp_path = None
                try:
                    data = read_cas_pdf(pdf_path_or_buffer, password=password)
                    return {"success": True, "data": recursive_to_dict(data)}
                except Exception as e:
                    if _is_password_error(str(e)):
                        if not password:
                            return {"success": False, "error": "This PDF is password-protected. Please enter the password (usually your PAN, e.g. ABCDE1234F)."}
                        return {"success": False, "error": "Incorrect password. CAS PDFs are usually protected with your PAN (e.g. ABCDE1234F). Please try again."}
                    return {"success": False, "error": str(e)}

        # Parse the temp file
        try:
            data = read_cas_pdf(tmp_path, password=password)
            data = recursive_to_dict(data)
            return {"success": True, "data": data}
        except Exception as e:
            err_msg = str(e)
            if _is_password_error(err_msg):
                if not password:
                    return {"success": False, "error": "This PDF is password-protected. Please enter the password (usually your PAN, e.g. ABCDE1234F)."}
                return {"success": False, "error": "Incorrect password. CAS PDFs are usually protected with your PAN (e.g. ABCDE1234F). Please try again."}
            # If password was provided but parsing still failed, it's likely a bad password
            if password:
                return {"success": False, "error": f"Failed to parse PDF. If the file is password-protected, please verify your password (usually your PAN). Error: {err_msg}"}
            return {"success": False, "error": err_msg}

    except Exception as e:
        return {"success": False, "error": str(e)}
    finally:
        if tmp_path and os.path.exists(tmp_path):
            try:
                os.remove(tmp_path)
            except:
                pass

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
