try:
    from app.main import app  # type: ignore
except Exception:
    # Fallback minimal app to avoid container crash if app.main import fails
    from fastapi import FastAPI  # type: ignore
    app = FastAPI(title="Aiser Auth Service (fallback)")


