from typing import Any

from psycopg import Connection
from psycopg.rows import dict_row

RAG_RETRIEVAL_LIMIT = 5


def query_terms(founder_profile: dict[str, Any]) -> list[str]:
    values = [
        founder_profile.get("company_name"),
        founder_profile.get("company_hq_country"),
        founder_profile.get("primary_market"),
        founder_profile.get("stage"),
        founder_profile.get("round_type"),
        founder_profile.get("sector"),
        founder_profile.get("business_model"),
        founder_profile.get("traction_summary"),
        founder_profile.get("one_sentence_summary"),
    ]
    terms: list[str] = []
    for value in values:
        if value is None:
            continue
        text = str(value).strip()
        if text:
            terms.append(text)
    return terms


def websearch_query(founder_profile: dict[str, Any]) -> str:
    terms = query_terms(founder_profile)
    if not terms:
        return "investor OR deal OR founder"
    return " OR ".join(terms)


def source_urls(value: Any) -> list[str]:
    if not value:
        return []
    return [str(item) for item in value if item]


class RagRepository:
    def retrieve_for_match(
        self,
        connection: Connection,
        *,
        investor_slug: str,
        founder_profile: dict[str, Any],
        limit: int = RAG_RETRIEVAL_LIMIT,
    ) -> list[dict[str, Any]]:
        query = websearch_query(founder_profile)
        with connection.cursor(row_factory=dict_row) as cursor:
            cursor.execute(
                """
                WITH search AS (
                  SELECT websearch_to_tsquery('english', %s) AS query
                )
                SELECT
                  id::text AS chunk_id,
                  investor_slug,
                  entity_type,
                  entity_id,
                  section_key,
                  chunk_text,
                  source_urls,
                  metadata,
                  confidence,
                  review_needed,
                  ts_rank_cd(search_vector, search.query) AS retrieval_score,
                  search_vector @@ search.query AS text_match
                FROM rag_chunks, search
                WHERE investor_slug = %s
                  AND rag_allowed = true
                ORDER BY
                  text_match DESC,
                  retrieval_score DESC,
                  review_needed ASC,
                  section_key,
                  created_at DESC
                LIMIT %s
                """,
                (query, investor_slug, limit),
            )
            rows = [dict(row) for row in cursor.fetchall()]

        chunks = []
        for row in rows:
            text = row.get("chunk_text")
            if not text:
                continue
            chunks.append(
                {
                    "chunk_id": row.get("chunk_id"),
                    "section_key": row.get("section_key"),
                    "entity_type": row.get("entity_type"),
                    "entity_id": row.get("entity_id"),
                    "confidence": row.get("confidence") or "medium",
                    "review_needed": bool(row.get("review_needed")),
                    "retrieval_score": float(row.get("retrieval_score") or 0),
                    "text_match": bool(row.get("text_match")),
                    "chunk_text": text,
                    "source_urls": source_urls(row.get("source_urls")),
                    "metadata": row.get("metadata") or {},
                }
            )
        return chunks


rag_repository = RagRepository()
