import json
import logging
from typing import AsyncGenerator
import openai
from config import GLM_API_KEY, GLM_URL, GLM_MODEL

log = logging.getLogger("zync.base_agent")

_client = openai.AsyncOpenAI(
    api_key=GLM_API_KEY,
    base_url=GLM_URL,
)

MAX_TOKENS = 4096


def _build_messages(system_prompt: str, user_message: str, images: list = None) -> list:
    content = []

    if images:
        for img in images:
            if not img.startswith("data:"):
                img = f"data:image/jpg;base64,{img}"
            content.append({
                "type":      "image_url",
                "image_url": {"url": img},
            })

    content.append({"type": "text", "text": user_message})

    return [
        {"role": "system",  "content": system_prompt},
        {"role": "user",    "content": content if images else user_message},
    ]


# ─── 1. Single call (no streaming) ───────────────────────────────────────────

async def call_glm(
    system_prompt: str,
    user_message: str,
    tools: list = None,
    images: list = None,
    json_mode: bool = False,
) -> dict:
    """
    Single ILMU call. Returns:
    {
        "output":     str,
        "reasoning":  str,
        "tool_calls": list
    }
    """
    kwargs = dict(
        model=GLM_MODEL,
        max_tokens=MAX_TOKENS,
        messages=_build_messages(system_prompt, user_message, images),
        temperature=0.1,
    )
    if tools:
        kwargs["tools"] = tools
    if json_mode:
        kwargs["response_format"] = {"type": "json_object"}

    response = await _client.chat.completions.create(**kwargs)

    msg = response.choices[0].message
    output = msg.content or ""
    tool_calls = []
    if msg.tool_calls:
        for tc in msg.tool_calls:
            tool_calls.append({
                "id": tc.id,
                "function": {
                    "name":      tc.function.name,
                    "arguments": tc.function.arguments,
                },
            })

    return {"output": output, "reasoning": "", "tool_calls": tool_calls}


# ─── 2. Streaming call ────────────────────────────────────────────────────────

async def stream_glm(
    system_prompt: str,
    user_message: str,
    tools: list = None,
    images: list = None,
    json_mode: bool = False,
) -> AsyncGenerator[dict, None]:
    """
    Streaming ILMU call via OpenAI SDK.

    ilmu-glm-5.1 streams content tokens directly — no separate reasoning trace.
    The frontend right-panel shows them live as the answer builds.

    Yields:
      {"type": "output",  "text": "..."}
      {"type": "done",    "output": full_text, "reasoning": ""}
      {"type": "error",   "message": "..."}
    """
    kwargs = dict(
        model=GLM_MODEL,
        max_tokens=MAX_TOKENS,
        messages=_build_messages(system_prompt, user_message, images),
        temperature=0.1,
        stream=True,
    )
    if json_mode:
        kwargs["response_format"] = {"type": "json_object"}

    full_output = ""

    try:
        stream = await _client.chat.completions.create(**kwargs)
        async for chunk in stream:
            delta = chunk.choices[0].delta if chunk.choices else None
            if delta and delta.content:
                full_output += delta.content
                yield {"type": "output", "text": delta.content}

        yield {"type": "done", "output": full_output, "reasoning": ""}

    except Exception as e:
        log.error(f"stream_glm error: {e}")
        yield {"type": "error", "message": str(e)}


# ─── 3. Tool call helper ──────────────────────────────────────────────────────

async def call_glm_with_tools(
    system_prompt: str,
    user_message: str,
    tools: list,
    tool_executor,
) -> dict:
    """Multi-turn tool use loop (max 5 rounds)."""
    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user",   "content": user_message},
    ]

    for _ in range(5):
        response = await _client.chat.completions.create(
            model=GLM_MODEL,
            max_tokens=MAX_TOKENS,
            messages=messages,
            tools=tools,
            temperature=0.1,
        )

        msg = response.choices[0].message
        output = msg.content or ""
        tool_calls = msg.tool_calls or []

        if response.choices[0].finish_reason != "tool_calls" or not tool_calls:
            return {"output": output, "reasoning": "", "tool_calls": []}

        messages.append({"role": "assistant", "content": msg.content, "tool_calls": [
            {"id": tc.id, "type": "function", "function": {"name": tc.function.name, "arguments": tc.function.arguments}}
            for tc in tool_calls
        ]})

        for tc in tool_calls:
            result = await tool_executor(tc.function.name, json.loads(tc.function.arguments))
            messages.append({
                "role":         "tool",
                "tool_call_id": tc.id,
                "content":      str(result),
            })

    return {"output": "", "reasoning": "", "tool_calls": []}
