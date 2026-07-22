from openai import OpenAI
import json
import re
import os
from dotenv import load_dotenv

load_dotenv()
use_online = os.getenv("use_online")

if use_online == "0":
    client = OpenAI(
    base_url=os.getenv("local_api_url"),
    api_key="na"
    )
    model = "local-model"
    
if use_online == "1":
    APIKEY = os.getenv("ONLINE_API_KEY")
    client = OpenAI(
    base_url=os.getenv("online_api_url"),
    api_key=APIKEY
    )
    model = os.getenv("online_model")

def my(user_message):
    system_prompt = """
You are a company's AI gateway reviewer. You must check every user's prompt sent to the AI.
If the message includes high-risk content or may cause a data leak, you must pay attention.
If the message includes medium-risk content you can use warning.

CRITICAL RULE: You must ONLY output a valid JSON object. Do NOT include any markdown blocks (like ```json), explanations, or conversational filler. 

You must put your own reason at reason section

Desired JSON format:
{"status": "approved", "reason": "Your reason"}
{"status": "warning", "reason": "Your reason"}
{"status": "block", "reason": "Your reason"}
"""
    
    user_prompt = f"User input to check: {user_message}"

    try:
        completion = client.chat.completions.create(
            model="local-model",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            extra_body={
                "providerOptions": {
                    "openai": {
                        "reasoningEffort": "high"
                    }
                }
            },
            temperature=0.0,
            response_format={
                "type": "json_schema",
                "json_schema": {
                    "name": "gateway_review",
                    "strict": True,
                    "schema": {
                        "type": "object",
                        "properties": {
                            "status": {
                                "type": "string",
                                "enum": ["approved", "warning", "block"]
                            },
                            "reason": {"type": "string"}
                        },
                        "required": ["status", "reason"],
                        "additionalProperties": False
                    }
                }
            }
        )
        raw_content = completion.choices[0].message.content.strip()
        final_data = json.loads(raw_content)
        return final_data

        
    except json.JSONDecodeError as je:
        # catch malformed R1 output
        print(f"[AI Review Error] JSON parse failed! Raw LLM output:\n{raw_content}")
        return {"status": "block", "reason": f"AI response parse failed: {str(je)}"}
        
    except Exception as e:
        # catch 400/network-level errors
        return {"status": "block", "reason": f"AI Gateway Error: {str(e)}"}
    