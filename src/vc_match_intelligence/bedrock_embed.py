"""Embed RAG chunks in PostgreSQL using Amazon Bedrock."""

from __future__ import annotations

import argparse
import json
import os
from typing import Any

import boto3
from psycopg import connect


DEFAULT_MODEL = "amazon.titan-embed-text-v2:0"
DEFAULT_REGION = "ap-southeast-2"


def database_url(value: str | None) -> str:
    url = value or os.getenv("DATABASE_URL")
    if not url:
        raise SystemExit("DATABASE_URL is required")
    return url


def vector_literal(values: list[float]) -> str:
    return "[" + ",".join(str(float(value)) for value in values) + "]"


def embed_text(client: Any, model_id: str, text: str, dimensions: int) -> list[float]:
    body = {
        "inputText": text,
        "dimensions": dimensions,
        "normalize": True,
    }
    response = client.invoke_model(
        modelId=model_id,
        body=json.dumps(body),
        accept="application/json",
        contentType="application/json",
    )
    payload = json.loads(response["body"].read())
    embedding = payload.get("embedding")
    if not isinstance(embedding, list):
        raise RuntimeError(f"Bedrock response did not include an embedding: {payload}")
    return [float(value) for value in embedding]


def embed_pending_chunks(
    *,
    db_url: str,
    region: str,
    model_id: str,
    dimensions: int,
    limit: int,
) -> dict[str, Any]:
    client = boto3.client("bedrock-runtime", region_name=region)
    embedded = 0

    with connect(db_url) as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT chunk_id, chunk_text
                FROM rag_chunks
                WHERE rag_allowed = true
                  AND embedding IS NULL
                ORDER BY created_at
                LIMIT %s
                """,
                (limit,),
            )
            rows = cur.fetchall()
            for chunk_id, text in rows:
                embedding = embed_text(client, model_id, text, dimensions)
                cur.execute(
                    """
                    UPDATE rag_chunks
                    SET embedding = %s::vector,
                        embedding_model = %s
                    WHERE chunk_id = %s
                    """,
                    (vector_literal(embedding), model_id, chunk_id),
                )
                embedded += 1
        conn.commit()

    return {
        "embedded_chunks": embedded,
        "model_id": model_id,
        "region": region,
        "dimensions": dimensions,
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="Embed pending rag_chunks with Amazon Bedrock")
    parser.add_argument("--database-url", default=None, help="PostgreSQL DATABASE_URL")
    parser.add_argument("--region", default=os.getenv("AWS_REGION", DEFAULT_REGION))
    parser.add_argument("--model-id", default=os.getenv("BEDROCK_EMBEDDING_MODEL", DEFAULT_MODEL))
    parser.add_argument("--dimensions", type=int, default=1024)
    parser.add_argument("--limit", type=int, default=100)
    args = parser.parse_args()

    result = embed_pending_chunks(
        db_url=database_url(args.database_url),
        region=args.region,
        model_id=args.model_id,
        dimensions=args.dimensions,
        limit=args.limit,
    )
    print(json.dumps(result, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
