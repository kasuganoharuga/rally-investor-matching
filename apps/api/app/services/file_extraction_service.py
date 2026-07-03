from __future__ import annotations

import re
import zipfile
from io import BytesIO
from pathlib import Path
from typing import Any
from xml.etree import ElementTree

from fastapi import HTTPException, UploadFile, status
from pypdf import PdfReader

from app.schemas.files import FileExtractionResponse

MAX_UPLOAD_BYTES = 10 * 1024 * 1024
MAX_EXTRACTED_CHARS = 24_000
TEXT_EXTENSIONS = {".txt", ".md", ".csv", ".tsv", ".json"}
SUPPORTED_EXTENSIONS = {*TEXT_EXTENSIONS, ".docx", ".pdf"}
WORD_NAMESPACE = "{http://schemas.openxmlformats.org/wordprocessingml/2006/main}"


def clean_text(value: str) -> str:
    lines = [re.sub(r"[ \t]+", " ", line).strip() for line in value.splitlines()]
    compact_lines = []
    previous_blank = False
    for line in lines:
        blank = not line
        if blank and previous_blank:
            continue
        compact_lines.append(line)
        previous_blank = blank
    return "\n".join(compact_lines).strip()


def truncate_text(value: str) -> tuple[str, bool]:
    if len(value) <= MAX_EXTRACTED_CHARS:
        return value, False
    return value[:MAX_EXTRACTED_CHARS].rstrip(), True


def decode_text(data: bytes) -> str:
    for encoding in ("utf-8-sig", "utf-16", "cp1252"):
        try:
            return data.decode(encoding)
        except UnicodeDecodeError:
            continue
    return data.decode("utf-8", errors="ignore")


def paragraph_text(paragraph: ElementTree.Element) -> str:
    parts = []
    for node in paragraph.iter():
        if node.tag == f"{WORD_NAMESPACE}t":
            parts.append(node.text or "")
        elif node.tag == f"{WORD_NAMESPACE}tab":
            parts.append("\t")
        elif node.tag == f"{WORD_NAMESPACE}br":
            parts.append("\n")
    return "".join(parts).strip()


def docx_text(data: bytes) -> str:
    try:
        with zipfile.ZipFile(BytesIO(data)) as archive:
            names = [
                "word/document.xml",
                *sorted(
                    name
                    for name in archive.namelist()
                    if name.startswith("word/header") or name.startswith("word/footer")
                ),
            ]
            paragraphs = []
            for name in names:
                if name not in archive.namelist():
                    continue
                root = ElementTree.fromstring(archive.read(name))
                for paragraph in root.iter(f"{WORD_NAMESPACE}p"):
                    text = paragraph_text(paragraph)
                    if text:
                        paragraphs.append(text)
    except (zipfile.BadZipFile, ElementTree.ParseError) as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unable to read Word document text.",
        ) from exc
    return "\n".join(paragraphs)


def pdf_text(data: bytes) -> str:
    try:
        reader = PdfReader(BytesIO(data))
        pages = [page.extract_text() or "" for page in reader.pages]
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unable to read PDF text.",
        ) from exc
    return "\n\n".join(page for page in pages if page.strip())


class FileExtractionService:
    async def extract(self, file: UploadFile) -> FileExtractionResponse:
        data = await file.read()
        if len(data) > MAX_UPLOAD_BYTES:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail="Uploaded file is larger than 10 MB.",
            )

        extension = Path(file.filename or "").suffix.lower()
        if extension not in SUPPORTED_EXTENSIONS:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    "Supported file types are .txt, .md, .csv, .tsv, "
                    ".json, .docx, and .pdf."
                ),
            )

        raw_text = self._extract_by_extension(data, extension)
        text = clean_text(raw_text)
        if not text:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No readable text was found in the uploaded file.",
            )

        text, truncated = truncate_text(text)
        return FileExtractionResponse(
            file_name=file.filename or "uploaded-file",
            content_type=file.content_type,
            extension=extension,
            text=text,
            character_count=len(text),
            truncated=truncated,
        )

    def _extract_by_extension(self, data: bytes, extension: str) -> str:
        extractors: dict[str, Any] = {
            ".docx": docx_text,
            ".pdf": pdf_text,
        }
        extractor = extractors.get(extension)
        if extractor:
            return str(extractor(data))
        return decode_text(data)


file_extraction_service = FileExtractionService()
