from typing import Dict, Any, Optional, Union
import io
import datetime
import re
from contextlib import suppress
from openpyxl import Workbook

from app.Code.pdfminer_hardening import harden_pdfminer_cmap_loading


harden_pdfminer_cmap_loading()

from casparser import read_cas_pdf

DANGEROUS_SPREADSHEET_PREFIX = re.compile(r"^[\t\r]|^\s*[=+\-@]")


def _excel_safe_cell(value):
    if not isinstance(value, str):
        return value
    if DANGEROUS_SPREADSHEET_PREFIX.search(value):
        return f"'{value}"
    return value

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


def _safe_parse_error(message: str) -> str:
    lower = (message or "").lower()
    if "not a pdf" in lower or "pdf" in lower and "corrupt" in lower:
        return "The uploaded file appears to be invalid or corrupted."
    if "timeout" in lower:
        return "PDF parsing timed out. Please try again with a smaller file."
    return "Unable to parse the provided PDF file."

def parse_with_casparser(pdf_path_or_buffer: Union[str, io.BytesIO], password: Optional[str] = None) -> Dict[str, Any]:
    """
    Parses a CAS PDF file using casparser library.
    Handles password-protected PDFs gracefully.
    """
    harden_pdfminer_cmap_loading()

    import tempfile
    import os

    pdf_password = password or ""
    tmp_path = None
    try:
        if not hasattr(pdf_path_or_buffer, "read"):
            try:
                data = read_cas_pdf(pdf_path_or_buffer, password=pdf_password)
                return {"success": True, "data": recursive_to_dict(data)}
            except Exception as e:
                if _is_password_error(str(e)):
                    if not pdf_password:
                        return {"success": False, "error": "This PDF is password-protected. Please enter the password (usually your PAN, e.g. ABCDE1234F)."}
                    return {"success": False, "error": "Incorrect password. CAS PDFs are usually protected with your PAN (e.g. ABCDE1234F). Please try again."}
                return {"success": False, "error": _safe_parse_error(str(e))}

        # Write buffer to a temp file (casparser needs a file path)
        with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp:
            tmp.write(pdf_path_or_buffer.read())
            tmp_path = tmp.name

        # Parse the temp file
        try:
            data = read_cas_pdf(tmp_path, password=pdf_password)
            data = recursive_to_dict(data)
            return {"success": True, "data": data}
        except Exception as e:
            err_msg = str(e)
            if _is_password_error(err_msg):
                if not pdf_password:
                    return {"success": False, "error": "This PDF is password-protected. Please enter the password (usually your PAN, e.g. ABCDE1234F)."}
                return {"success": False, "error": "Incorrect password. CAS PDFs are usually protected with your PAN (e.g. ABCDE1234F). Please try again."}
            if pdf_password:
                return {"success": False, "error": "Failed to parse PDF. Please verify your password and file integrity."}
            return {"success": False, "error": _safe_parse_error(err_msg)}

    except Exception as e:
        return {"success": False, "error": _safe_parse_error(str(e))}
    finally:
        if tmp_path and os.path.exists(tmp_path):
            with suppress(OSError):
                os.remove(tmp_path)

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
                    _excel_safe_cell(amc),
                    _excel_safe_cell(folio_num),
                    _excel_safe_cell(scheme_name),
                    _excel_safe_cell(advisor),
                    _excel_safe_cell(txn.get("date")),
                    _excel_safe_cell(txn.get("description")),
                    txn.get("amount"),
                    txn.get("units"),
                    txn.get("nav"),
                    txn.get("balance"),
                    _excel_safe_cell(txn.get("type")),
                ]
                ws.append(row)

    if ws.max_row == 1:
        ws.append(["No transactions found"])

    output = io.BytesIO()
    wb.save(output)
    output.seek(0)
    return output
