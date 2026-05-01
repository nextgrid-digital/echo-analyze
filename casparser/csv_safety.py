import re
from typing import Any, Mapping


DANGEROUS_SPREADSHEET_PREFIX = re.compile(r"^[\t\r\n]|^\s*[=+\-@]")


def sanitize_spreadsheet_cell(value: Any) -> Any:
    if isinstance(value, str) and DANGEROUS_SPREADSHEET_PREFIX.search(value):
        return f"'{value}"
    return value


def sanitize_csv_row(row: list[Any] | tuple[Any, ...]) -> list[Any]:
    return [sanitize_spreadsheet_cell(value) for value in row]


def sanitize_csv_mapping(row: Mapping[str, Any]) -> dict[str, Any]:
    return {key: sanitize_spreadsheet_cell(value) for key, value in row.items()}
