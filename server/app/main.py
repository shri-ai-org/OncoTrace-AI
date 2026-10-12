import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .api import routes_auth, routes_vcf
from .core import config
from .core.security import DemoAuthError

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s %(message)s")

app = FastAPI(
    title="OncoTrace VCF Analysis",
    description=(
        "Parses uploaded oncology-panel VCFs and annotates them against locally-hosted "
        "open-source databases. Early-stage research pipeline, not a diagnostic device."
    ),
    version="0.1.0",
    docs_url="/docs" if config.API_DOCS else None,
    redoc_url="/redoc" if config.API_DOCS else None,
    openapi_url="/openapi.json" if config.API_DOCS else None,
)

# Added before CORS so that CORS wraps it: the gate's early 401/503 responses
# then carry the same CORS headers as every other response.
app.add_middleware(routes_vcf.AnalyzeGate, path="/api/v1/vcf/analyze")

if config.CORS_ORIGINS:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=config.CORS_ORIGINS,
        allow_credentials=False,
        allow_methods=["GET", "POST"],
        allow_headers=["*"],
    )


# Auth failures use the same flat {error_kind, message} body as every other
# API error (the client reads those two keys), not FastAPI's {"detail": ...}.
@app.exception_handler(DemoAuthError)
async def _demo_auth_error(_request, exc: DemoAuthError):
    return exc.response()


app.include_router(routes_auth.router, prefix="/api/v1")
app.include_router(routes_vcf.router, prefix="/api/v1")

if not config.demo_auth_configured():
    logging.getLogger("oncotrace.auth").warning(
        "%s -- /api/v1/vcf/analyze and /api/v1/auth/verify will refuse every request with 503 "
        "until a usable credential is configured. See server/.env.example.",
        config.demo_auth_problem(),
    )
