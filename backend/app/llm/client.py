import os

from .prompts import SYSTEM_PROMPT

MODEL_NAME = os.getenv("ANTHROPIC_MODEL", "claude-sonnet-5")


class LLMNotConfiguredError(RuntimeError):
    pass


def generate_draft(user_prompt: str) -> str:
    """Call the configured LLM to produce a legal document draft.

    Raises LLMNotConfiguredError if no API key is set, so callers can
    surface a clear setup error instead of a generic failure.
    """
    api_key = os.getenv("ANTHROPIC_API_KEY")
    if not api_key:
        raise LLMNotConfiguredError(
            "ANTHROPIC_API_KEY אינו מוגדר בסביבת השרת. יש להגדיר משתנה סביבה זה "
            "כדי לאפשר יצירת טיוטות מסמכים."
        )

    import anthropic

    client = anthropic.Anthropic(api_key=api_key)
    response = client.messages.create(
        model=MODEL_NAME,
        max_tokens=4096,
        system=SYSTEM_PROMPT,
        messages=[{"role": "user", "content": user_prompt}],
    )
    return "".join(block.text for block in response.content if block.type == "text")
