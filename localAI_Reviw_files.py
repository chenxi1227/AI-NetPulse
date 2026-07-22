from openai import OpenAI
import json
import base64
import os
from pathlib import Path
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



def detect_and_mask(text):
    system_prompt = """You are a highly precision-focused sensitive data masking tool. Your goal is to identify and mask all sensitive and Personally Identifiable Information (PII) in the provided text.

Strictly identify and mask the following categories:
1. INFRASTRUCTURE & CREDENTIALS: Passwords, tokens, API keys, private keys, credentials, secrets, connection strings, IP addresses.
2. PERSONAL IDENTIFIERS: Full names, personal IDs (National ID, SSN, Passport), phone numbers, email addresses, gender.
3. FINANCIAL DATA: Credit card numbers, bank account numbers, CVVs.
4. SPATIAL & TEMPORAL PII: Full addresses, partial addresses (streets, cities, districts), dates of birth (DOB), exact birth years, and age-related private dates.
5. All data may can be tracking, e.g. mac-address, any ID(userid, employeeid, studentid, etc.), date and time

Here is some label from Microsoft Presidio:
CREDIT_CARD
CRYPTO
DATE_TIME
EMAIL_ADDRESS
IBAN_CODE
IP_ADDRESS
MAC_ADDRESS
NRP
LOCATION
PERSON
PHONE_NUMBER
MEDICAL_LICENSE
URL
US_BANK_NUMBER
US_DRIVER_LICENSE
US_ITIN
US_MBI
US_NPI
US_PASSPORT
US_SSN
UK_DRIVING_LICENCE
UK_NHS
UK_NINO
UK_PASSPORT
UK_POSTCODE
UK_VEHICLE_REGISTRATION
ES_NIF
ES_NIE
ES_PASSPORT
IT_FISCAL_CODE
IT_DRIVER_LICENSE
IT_VAT_CODE
IT_PASSPORT
IT_IDENTITY_CARD
PL_PESEL
SG_NRIC_FIN
SG_UEN
AU_ABN
AU_ACN
AU_TFN
AU_MEDICARE
IN_PAN
IN_AADHAAR
IN_VEHICLE_REGISTRATION
IN_VOTER
IN_PASSPORT
IN_GSTIN
FI_PERSONAL_IDENTITY_CODE
KR_DRIVER_LICENSE
KR_FRN
KR_PASSPORT
KR_BRN
KR_RRN
NG_NIN
NG_VEHICLE_REGISTRATION
PH_TIN
CA_SIN
SE_ORGANISATIONSNUMMER
SE_PERSONNUMMER
ZA_ID_NUMBER
TH_TNIN
TR_NATIONAL_ID
TR_LICENSE_PLATE
DE_TAX_ID
DE_TAX_NUMBER
DE_PASSPORT
DE_ID_CARD
DE_SOCIAL_SECURITY
DE_HEALTH_INSURANCE
DE_KFZ
DE_HANDELSREGISTER
DE_PLZ
MEDICAL_DISEASE_DISORDER
MEDICAL_MEDICATION
MEDICAL_THERAPEUTIC_PROCEDURE
MEDICAL_CLINICAL_EVENT
MEDICAL_BIOLOGICAL_ATTRIBUTE
MEDICAL_BIOLOGICAL_STRUCTURE
MEDICAL_FAMILY_HISTORY
MEDICAL_HISTORY

MASKING RULES:
- Replace ONLY the sensitive VALUE with exactly "***". 
- CRITICAL: Do NOT mask the context, labels, or keys (e.g., Keep "Name: ", "DOB: ", "Address: " exactly as they are. Only mask the actual name, date, or address that follows them).
- Maintain all punctuation, line breaks (\n), and spacing precisely.

CRITICAL RULE: You must ONLY output a single valid JSON object. Do NOT include any markdown code blocks (like ```json).

Few-Shot Example:
Input: "Applicant Name: John Doe, Gender: Male, Date of Birth: 1990-05-12. Current Address: 123 Elm St, New York. Contact Number: +1-202-555-0143."
Output: {"masked": "Applicant Name: ***, Gender: ***, Date of Birth: ***. Current Address: ***. Contact Number: ***.", "has_sensitive": true}
Input: "Internal Employee ID: EMP-123. Driver License: DL-998. SSN (masked): ***-**-4455. MAC Address: 00-11-22-33-44-55. Timestamp: 2026-07-22T01:00:00Z."
Output: {"masked": "Internal Employee ID: ***. Driver License: ***. SSN (masked): ***. MAC Address: ***. Timestamp: ***.", "has_sensitive": true}

Desired JSON format:
{"masked": "text with all sensitive values replaced by ***(accouding by word's count)", "has_sensitive": true/false}
"""
    try:
        completion = client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": text}
            ],
            temperature=0.0,
            response_format={
                "type": "json_schema",
                "json_schema": {
                    "name": "mask_result",
                    "strict": True,
                    "schema": {
                        "type": "object",
                        "properties": {
                            "masked": {"type": "string"},
                            "has_sensitive": {"type": "boolean"}
                        },
                        "required": ["masked", "has_sensitive"],
                        "additionalProperties": False
                    }
                }
            }
        )
        raw = completion.choices[0].message.content.strip()
        return json.loads(raw)
    except Exception as e:
        return {"masked": text, "has_sensitive": False}


def my(user_message, skip_mask=False):
    if skip_mask:
        text_to_review = user_message
        has_sensitive = False
    else:
        detect_result = detect_and_mask(user_message)
        text_to_review = detect_result.get("masked", user_message)
        has_sensitive = detect_result.get("has_sensitive", False)

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
    
    user_prompt = f"User input to check: {text_to_review}"

    try:
        completion = client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            extra_body={
                "providerOptions": {
                    "openai": {
                        "reasoningEffort": "max"
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
        if has_sensitive:
            final_data["reason"] = f"[sensitive masked] {final_data['reason']}"
        return final_data

    except json.JSONDecodeError as je:
        print(f"[AI Review Error] JSON parse failed! Raw LLM output:\n{raw_content}")
        return {"status": "block", "reason": f"AI response parse failed: {str(je)}"}
        
    except Exception as e:
        return {"status": "block", "reason": f"AI Gateway Error: {str(e)}"}


def my_image(image_bytes, mime_type):
    base64_image = base64.b64encode(image_bytes).decode("utf-8")
    
    system_prompt = """
You are a company's AI gateway reviewer. You must check every user's uploaded image.
If the image includes high-risk content, confidential corporate data, credentials, private source code, or may cause a data leak, you must block it.
If the image includes medium-risk content you can use warning.
If it is safe, approve it.

CRITICAL RULE: You must ONLY output a valid JSON object. Do NOT include any markdown blocks (like ```json), explanations, or conversational filler. 

You must put your own reason at reason section

Desired JSON format:
{"status": "approved", "reason": "Your reason"}
{"status": "warning", "reason": "Your reason"}
{"status": "block", "reason": "Your reason"}
"""

    try:
        completion = client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": system_prompt},
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": "Analyze this uploaded image for security and compliance."},
                        {"type": "image_url", "image_url": {"url": f"data:{mime_type};base64,{base64_image}"}}
                    ]
                }
            ],
            extra_body={
                "providerOptions": {
                    "openai": {
                        "reasoningEffort": "max"
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
        print(f"[AI Image Review Error] JSON parse failed! Raw LLM output:\n{raw_content}")
        return {"status": "block", "reason": f"AI image response parse failed: {str(je)}"}
        
    except Exception as e:
        return {"status": "block", "reason": f"AI Image Gateway Error: {str(e)}"}


def my_classify(extension):
    system_prompt = """You are a file type analyzer. Given a file extension, determine:
1. Whether this is a document format that can contain text content worth reviewing
2. What Python library can read it (standard library preferred)
3. How to extract text from it

CRITICAL RULE: You must ONLY output a valid JSON object. Do NOT include any markdown blocks.

Desired JSON format:
{"is_document": true, "read_library": "python-docx", "pip_install": "pip install python-docx", "note": "A .docx file is a ZIP of XML; use python-docx or zipfile+xml.etree to extract text."}
"""

    try:
        completion = client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": f"File extension: .{extension}"}
            ],
            temperature=0.0,
            response_format={
                "type": "json_schema",
                "json_schema": {
                    "name": "file_classification",
                    "strict": True,
                    "schema": {
                        "type": "object",
                        "properties": {
                            "is_document": {"type": "boolean"},
                            "read_library": {"type": "string"},
                            "pip_install": {"type": "string"},
                            "note": {"type": "string"}
                        },
                        "required": ["is_document", "read_library", "pip_install", "note"],
                        "additionalProperties": False
                    }
                }
            }
        )
        raw_content = completion.choices[0].message.content.strip()
        return json.loads(raw_content)
    except Exception as e:
        return {"is_document": False, "read_library": "", "pip_install": "", "note": f"Classification failed: {str(e)}"}


def my_classify_site(host, search_context):
    system_prompt = """You are a strict website classifier for a corporate network gateway. 
Your goal is to detect if the SPECIFIC provided domain/subdomain is primarily a **dedicated AI Chatbot platform or AI generative service** (like ChatGPT, Claude, Poe, Midjourney, or specialized AI tools) where users paste proprietary source code or prompts.

CRITICAL DISTINCTIONS FOR YOU:
1. **Analyze the FULL Host**: Look closely at the exact subdomain provided. If the host is 'copilot.microsoft.com', it is NOT a general product page; it is Microsoft's dedicated LLM chat interface. You MUST classify it as `is_ai: true`.
2. **General Portals**: Only classify as `is_ai: false` if the domain is purely informational, a documentation wiki, or a general retail site that just happens to mention AI features in its news/blogs.
3. **CDNs / Static Assets**: Always return `is_ai: false` for pure asset/CDN domains (e.g., *.oaiusercontent.com).

CRITICAL RULE: You must ONLY output a valid JSON object with no markdown blocks.
"""
    try:
        completion = client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": f"Domain: {host}\n\nSearch Context:\n{search_context}"}
            ],
            temperature=0.0,
            response_format={
                "type": "json_schema",
                "json_schema": {
                    "name": "site_classification",
                    "strict": True,
                    "schema": {
                        "type": "object",
                        "properties": {
                            "is_ai": {"type": "boolean"},
                            "reason": {"type": "string"}
                        },
                        "required": ["is_ai", "reason"],
                        "additionalProperties": False
                    }
                }
            }
        )
        raw = completion.choices[0].message.content.strip()
        print(f"[SITE DEBUG] AI raw response for {host}: {raw}")
        return json.loads(raw)
    except Exception as e:
        print(f"[SITE DEBUG] AI classify exception for {host}: {e}")
        return {"is_ai": False, "reason": f"Classification error: {str(e)}"}
