from openai import OpenAI

client = OpenAI(
    api_key="sk-23b72203e1362a6381a882dca7749e579524686ef88d17f0",
    base_url="https://api.ilmu.ai/v1",
    timeout=30,
)

print("Sending request...")
response = client.chat.completions.create(
    model="ilmu-glm-5.1",
    messages=[
        {"role": "user", "content": "Say hello."}
    ],
    max_tokens=50,
)

print("Raw response:", response)
print("Content:", response.choices[0].message.content)