import os
import json
import httpx
from google import genai
from google.genai import types
from dotenv import load_dotenv
from typing import Optional

load_dotenv()

# We expect GEMINI_API_KEY to be set in the environment
try:
    client = genai.Client()
except Exception as e:
    print(f"Warning: Could not initialize Gemini Client. Is GEMINI_API_KEY set? {e}")
    client = None

SYSTEM_PROMPT = """
You are the official AI Triage Agent for the Raipur Municipal Corporation (RMC).
Given an image and optional citizen description, return ONLY a
JSON object with these fields:

{
  "is_valid_issue": true/false,
  "category": one of [Public Health & Sanitation, Public Works & Infrastructure, Electrical, Water Supply, Town Planning, Revenue, other],
  "priority": one of [critical, high, medium, low],
  "confidence": float between 0 and 1,
  "ai_description": "2-3 sentence factual description of the issue",
  "priority_reason": "one sentence explaining why this priority"
}

Department mapping rules:
- Public Health & Sanitation: Garbage dumps, dead animals, severe lack of cleanliness.
- Public Works & Infrastructure: Potholes, broken roads, damaged parks, damaged public buildings.
- Electrical: Broken streetlights, hanging dangerous wires.
- Water Supply: Burst pipelines, water leaks, severe waterlogging/flooding from pipes.
- Town Planning: Illegal construction, severe encroachment.
- Revenue: Property tax related visual issues (rare).

Priority rules:
- critical: immediate safety risk (exposed wires, major flooding, collapsed road)
- high: infrastructure failure affecting many people
- medium: quality of life issue, not immediately dangerous
- low: cosmetic or minor

If the image does not show a real civic issue, set is_valid_issue
to false and category to "other".
Return ONLY the JSON. No explanation. No markdown.
"""

def fetch_image_bytes(image_url: str) -> bytes:
    response = httpx.get(image_url, timeout=15, headers={"User-Agent": "CivicSight/1.0"})
    response.raise_for_status()
    return response.content

def classify_image(image_url: str, citizen_description: Optional[str] = None) -> dict:
    if not client:
        return _fallback_result()

    user_text = "Classify this civic issue image.\n\n" + SYSTEM_PROMPT
    if citizen_description:
        user_text += f"\n\nCitizen description: {citizen_description}"

    try:
        image_bytes = fetch_image_bytes(image_url)
        image_part = types.Part.from_bytes(data=image_bytes, mime_type="image/jpeg") # we can assume jpeg or pass it
        
        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=[image_part, user_text],
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
            ),
        )

        raw = response.text.strip()
        result = json.loads(raw)
        
        # Fill in missing fields with safe defaults
        result.setdefault("is_valid_issue", True)
        result.setdefault("category", "other")
        result.setdefault("priority", "medium")
        result.setdefault("confidence", 0.5)
        result.setdefault("ai_description", "Issue detected.")
        result.setdefault("priority_reason", "Assessed by AI.")
        
        return result
    except Exception as e:
        print(f"Classification failed: {e}")
        return _fallback_result()

def _fallback_result():
    return {
        "is_valid_issue": True,
        "category": "other",
        "priority": "medium",
        "confidence": 0.5,
        "ai_description": "AI analysis skipped or failed.",
        "priority_reason": "Fallback default."
    }
