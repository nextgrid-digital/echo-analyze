
import logging
import os

LOG_FILE = "backend_debug.log"

def setup_file_logging():
    # Configure logging to write to a file
    logging.basicConfig(
        filename=LOG_FILE,
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    )
    logger = logging.getLogger("backend_debug")
    logger.info("Logging started")
    return logger

# Example usage in main.py:
# from app.logger import setup_file_logging
# logger = setup_file_logging()
# logger.info("Some message")
