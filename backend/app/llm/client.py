import os

from .prompts import SYSTEM_PROMPT
from .research_prompts import RESEARCH_SYSTEM_PROMPT

MODEL_NAME = os.getenv("ANTHROPIC_MODEL", "claude-sonnet-5")


class LLMNotConfiguredError(RuntimeError):
    pass


def _require_api_key() -> str:
    api_key = os.getenv("ANTHROPIC_API_KEY")
    if not api_key:
        raise LLMNotConfiguredError(
            "ANTHROPIC_API_KEY אינו מוגדר בסביבת השרת. יש להגדיר משתנה סביבה זה "
            "כדי לאפשר שימוש ביכולת זו."
        )
    return api_key


def generate_research(user_prompt: str) -> tuple[str, list[dict]]:
    """Call the configured LLM with the web-search tool enabled to produce a
    grounded legal-research answer, plus the list of web sources it actually
    consulted.

    Raises LLMNotConfiguredError if no API key is set. Source extraction is
    best-effort and defensive: if the web-search result content blocks don't
    match the expected shape (e.g. after an SDK/API change), the answer text
    is still returned with an empty source list rather than crashing.
    """
    api_key = _require_api_key()

    import anthropic

    client = anthropic.Anthropic(api_key=api_key)
    response = client.messages.create(
        model=MODEL_NAME,
        max_tokens=4096,
        system=RESEARCH_SYSTEM_PROMPT,
        messages=[{"role": "user", "content": user_prompt}],
        tools=[{"type": "web_search_20250305", "name": "web_search", "max_uses": 5}],
    )

    answer_parts = []
    sources = []
    for block in response.content:
        block_type = getattr(block, "type", None)
        if block_type == "text":
            answer_parts.append(block.text)
        elif block_type == "web_search_tool_result":
            try:
                for item in getattr(block, "content", None) or []:
                    if getattr(item, "type", None) == "web_search_result":
                        sources.append(
                            {"title": getattr(item, "title", None), "url": getattr(item, "url", None)}
                        )
            except Exception:
                pass  # defensive: never let source extraction break the answer

    return "".join(answer_parts), sources


def generate_draft(user_prompt: str) -> str:
    """Call the configured LLM to produce a legal document draft.

    Raises LLMNotConfiguredError if no API key is set, so callers can
    surface a clear setup error instead of a generic failure.
    """
    api_key = _require_api_key()

    import anthropic

    client = anthropic.Anthropic(api_key=api_key)
    response = client.messages.create(
        model=MODEL_NAME,
        max_tokens=4096,
        system=SYSTEM_PROMPT,
        messages=[{"role": "user", "content": user_prompt}],
    )
    return "".join(block.text for block in response.content if block.type == "text")
