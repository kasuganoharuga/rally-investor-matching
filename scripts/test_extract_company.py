from __future__ import annotations

import json

from vc_match_intelligence.founder_parser import parse_founder_message


def main() -> None:
    print("Paste your company description, then press Enter:")
    message = input("> ").strip()
    if not message:
        raise SystemExit("No company description provided.")

    parsed = parse_founder_message(message)
    print(json.dumps(parsed, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
