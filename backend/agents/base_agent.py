import httpx
import json
from typing import AsyncGenerator
from config import GLM_API_KEY, GLM_URL, GLM_MODEL

HEADERS = {
    "Authorization": f"Bearer {GLM_API_KEY}",
    "Content-Type": "application/json",
}


def _build_payload(
    system_prompt: str,
    user_message: str,
    tools: list = None,
    images: list = None,
    stream: bool = False,
    json_mode: bool = False,
) -> dict:
    """Build the request payload for GLM API."""

    # Default: plain text message
    content = user_message

    # Multimodal: attach images if provided
    if images:
        content = [
            {"type": "image_url", "image_url": {"url": img}}
            for img in images
        ] + [{"type": "text", "text": user_message}]

    payload = {
        "model": GLM_MODEL,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user",   "content": content},
        ],
        "temperature": 0.1,   # Low = deterministic, good for engineering
        "stream": stream,
    }

    # Force structured JSON output (used by Agent 2, 4, 5)
    if json_mode:
        payload["response_format"] = {"type": "json_object"}

    # Attach function-calling tools (used by Agent 2 lixiviant KB lookup)
    if tools:
        payload["tools"] = tools

    return payload


# ─── 1. Single call (no streaming) ───────────────────────────────────────────

async def call_glm(
    system_prompt: str,
    user_message: str,
    tools: list = None,
    images: list = None,
    json_mode: bool = False,
) -> dict:
    """
    Single GLM call. Returns:
    {
        "output":    str,   # final answer text or JSON string
        "reasoning": str,   # GLM's internal thinking trace (XAI block)
        "tool_calls": list  # if GLM called a function tool
    }
    """
    payload = _build_payload(
        system_prompt, user_message,
        tools=tools, images=images,
        stream=False, json_mode=json_mode,
    )

    async with httpx.AsyncClient(timeout=120) as client:
        res = await client.post(GLM_URL, json=payload, headers=HEADERS)
        res.raise_for_status()
        data = res.json()

    message = data["choices"][0]["message"]

    return {
        "output":     message.get("content", ""),
        "reasoning":  message.get("reasoning_content", ""),  # XAI trace
        "tool_calls": message.get("tool_calls", []),
    }


# ─── 2. Streaming call ────────────────────────────────────────────────────────

async def stream_glm(
    system_prompt: str,
    user_message: str,
    tools: list = None,
    images: list = None,
    json_mode: bool = False,
) -> AsyncGenerator[dict, None]:
    """
    Streaming GLM call. Yields chunks as they arrive:

    Reasoning chunk  → {"type": "reasoning", "text": "..."}
    Answer chunk     → {"type": "output",    "text": "..."}
    Final chunk      → {"type": "done",      "output": full_text,
                                              "reasoning": full_reasoning}
    Error chunk      → {"type": "error",     "message": "..."}

    Usage (in agent):
        async for chunk in stream_glm(system, message):
            yield chunk   # forward straight to SSE route
    """
    payload = _build_payload(
        system_prompt, user_message,
        tools=tools, images=images,
        stream=True, json_mode=json_mode,
    )

    full_output    = ""
    full_reasoning = ""

    try:
        async with httpx.AsyncClient(timeout=180) as client:
            async with client.stream(
                "POST", GLM_URL, json=payload, headers=HEADERS
            ) as response:
                response.raise_for_status()

                async for line in response.aiter_lines():
                    if not line.startswith("data: "):
                        continue

                    raw = line[6:].strip()

                    if raw == "[DONE]":
                        # Final chunk — send complete assembled output
                        yield {
                            "type":      "done",
                            "output":    full_output,
                            "reasoning": full_reasoning,
                        }
                        return

                    try:
                        chunk = json.loads(raw)
                    except json.JSONDecodeError:
                        continue

                    delta = chunk["choices"][0].get("delta", {})

                    # Reasoning trace (thinking mode — XAI block)
                    reasoning_delta = delta.get("reasoning_content", "")
                    if reasoning_delta:
                        full_reasoning += reasoning_delta
                        yield {"type": "reasoning", "text": reasoning_delta}

                    # Answer text
                    output_delta = delta.get("content", "")
                    if output_delta:
                        full_output += output_delta
                        yield {"type": "output", "text": output_delta}

    except httpx.HTTPStatusError as e:
        yield {"type": "error", "message": f"GLM API error: {e.response.status_code}"}
    except httpx.TimeoutException:
        yield {"type": "error", "message": "GLM API timeout — model took too long"}
    except Exception as e:
        yield {"type": "error", "message": str(e)}


# ─── 3. Tool call helper ──────────────────────────────────────────────────────

async def call_glm_with_tools(
    system_prompt: str,
    user_message: str,
    tools: list,
    tool_executor,          # async fn(tool_name, tool_args) → str
) -> dict:
    """
    Multi-turn tool use loop:
    1. Call GLM with tools defined
    2. If GLM calls a tool → execute it → send result back
    3. Repeat until GLM gives final answer (no more tool calls)

    Returns same shape as call_glm().
    """
    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user",   "content": user_message},
    ]

    async with httpx.AsyncClient(timeout=120) as client:
        for _ in range(5):  # Max 5 tool-call rounds
            payload = {
                "model":       GLM_MODEL,
                "messages":    messages,
                "temperature": 0.1,
                "tools":       tools,
            }

            res = await client.post(GLM_URL, json=payload, headers=HEADERS)
            res.raise_for_status()
            data = res.json()

            message = data["choices"][0]["message"]
            messages.append(message)  # Add assistant turn to history

            # No tool calls → GLM gave final answer
            if not message.get("tool_calls"):
                return {
                    "output":     message.get("content", ""),
                    "reasoning":  message.get("reasoning_content", ""),
                    "tool_calls": [],
                }

            # Execute each tool call and feed results back
            for tool_call in message["tool_calls"]:
                tool_name = tool_call["function"]["name"]
                tool_args = json.loads(tool_call["function"]["arguments"])

                tool_result = await tool_executor(tool_name, tool_args)

                messages.append({
                    "role":         "tool",
                    "tool_call_id": tool_call["id"],
                    "content":      str(tool_result),
                })

    # Fallback if loop exhausted
    return {"output": "", "reasoning": "", "tool_calls": []}