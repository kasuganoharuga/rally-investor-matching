from fastapi import FastAPI

app = FastAPI(
    title="Rally Investor Matching API",
    version="0.1.0",
    description="API foundation for founder intake and investor matching workflows.",
)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "service": "rally-investor-matching-api"}
