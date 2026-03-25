from app.Code.env_loader import load_project_env
from app.Code.pdfminer_hardening import harden_pdfminer_cmap_loading

load_project_env()
harden_pdfminer_cmap_loading()
