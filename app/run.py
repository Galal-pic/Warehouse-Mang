"""
Run script for the FastAPI application.

Usage:
    python run.py

This script adds the app directory to the Python path and starts the server.
"""
import sys
from pathlib import Path

# Add the app directory to Python path
app_dir = Path(__file__).parent
sys.path.insert(0, str(app_dir))

if __name__ == "__main__":
    import uvicorn
    from src.config import settings

    uvicorn.run(
        "src.main:app",
        host="127.0.0.1",
        port=8000,
        reload=settings.DEBUG,
    )
