import logging

from fastapi import FastAPI, HTTPException, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.providers.llm import LLMProviderError

logger = logging.getLogger(__name__)

# The message is deliberately the same for every class: which upstream is
# unhappy, and why, is ops information (it reaches the logs and the status
# code), not something to hand an anonymous caller. The *status* is what
# differs, so the Next.js proxy and any monitor can tell "retry shortly"
# (503) from "this request will never work as sent" (502).
LLM_RETRY_MESSAGE = (
    "Investor matching is temporarily unavailable. Please try again in a few minutes."
)
LLM_FAILED_MESSAGE = (
    "Investor matching could not complete this request. Please try again."
)
# Classes an operator must fix — the caller retrying will not help, but the
# service really is down for this feature, so 503 is still the honest code.
LLM_OPERATOR_ACTION_CLASSES = frozenset(
    {"credit_balance", "auth", "model_access_not_granted"}
)


def build_error_response(
    *,
    code: str,
    message: str,
    request_id: str | None,
) -> dict[str, dict[str, str]]:
    return {
        "error": {
            "code": code,
            "message": message,
            "request_id": request_id or "",
        }
    }


def register_exception_handlers(app: FastAPI) -> None:
    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(
        request: Request,
        exc: RequestValidationError,
    ) -> JSONResponse:
        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            content=build_error_response(
                code="VALIDATION_ERROR",
                message="Invalid request payload",
                request_id=getattr(request.state, "request_id", None),
            ),
        )

    @app.exception_handler(HTTPException)
    async def http_exception_handler(
        request: Request,
        exc: HTTPException,
    ) -> JSONResponse:
        return JSONResponse(
            status_code=exc.status_code,
            content=build_error_response(
                code="HTTP_ERROR",
                message=str(exc.detail),
                request_id=getattr(request.state, "request_id", None),
            ),
        )

    @app.exception_handler(StarletteHTTPException)
    async def starlette_http_exception_handler(
        request: Request,
        exc: StarletteHTTPException,
    ) -> JSONResponse:
        return JSONResponse(
            status_code=exc.status_code,
            content=build_error_response(
                code="HTTP_ERROR",
                message=str(exc.detail),
                request_id=getattr(request.state, "request_id", None),
            ),
        )

    @app.exception_handler(LLMProviderError)
    async def llm_provider_error_handler(
        request: Request,
        exc: LLMProviderError,
    ) -> JSONResponse:
        # Logged at error level with the class so "we are out of Anthropic
        # credit" is greppable and alertable, instead of hiding inside a
        # generic 500 alongside every unrelated crash.
        logger.error(
            "llm_provider_error error_class=%s retryable=%s path=%s",
            exc.error_class,
            exc.retryable,
            request.url.path,
        )
        retry_later = exc.retryable or exc.error_class in LLM_OPERATOR_ACTION_CLASSES
        return JSONResponse(
            status_code=(
                status.HTTP_503_SERVICE_UNAVAILABLE
                if retry_later
                else status.HTTP_502_BAD_GATEWAY
            ),
            content=build_error_response(
                code="LLM_PROVIDER_ERROR",
                message=LLM_RETRY_MESSAGE if retry_later else LLM_FAILED_MESSAGE,
                request_id=getattr(request.state, "request_id", None),
            ),
        )

    @app.exception_handler(Exception)
    async def unhandled_exception_handler(
        request: Request,
        exc: Exception,
    ) -> JSONResponse:
        logger.exception("Unhandled API exception", exc_info=exc)
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content=build_error_response(
                code="INTERNAL_SERVER_ERROR",
                message="Internal server error",
                request_id=getattr(request.state, "request_id", None),
            ),
        )
