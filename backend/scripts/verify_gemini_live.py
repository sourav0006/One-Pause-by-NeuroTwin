#!/usr/bin/env python3
"""Script to verify live Google Gemini API connectivity and structured output validation.

Usage:
    export GEMINI_API_KEY="your-actual-api-key"
    python scripts/verify_gemini_live.py
"""
import asyncio
import os
import sys

# Add backend root to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.ai.base import AIProviderConfigError, AIProviderException
from app.ai.gemini import GeminiProvider
from app.core.config import settings


async def main():
    print("=== ONE PAUSE: Live Gemini Reflection Engine Verification ===")
    api_key = os.environ.get("GEMINI_API_KEY") or settings.GEMINI_API_KEY
    if not api_key:
        print("[-] GEMINI_API_KEY is not configured.")
        print("    Please set GEMINI_API_KEY in your environment or backend/.env to run live calls.")
        sys.exit(1)

    print(f"[+] Found GEMINI_API_KEY (starts with {api_key[:6]}...)")
    print(f"[+] Configured Model: {settings.GEMINI_MODEL}")

    provider = GeminiProvider(api_key=api_key)
    situation = (
        "My manager has given me another task, but I'm already overloaded. "
        "I want to say yes because I don't want to disappoint him."
    )
    context = "I am concerned about protecting my professional reputation."

    print(f"\n[+] Sending situation for analysis:\n    \"{situation}\"")
    try:
        state = await provider.analyze_situation(situation=situation, context=context)
        print("\n[+] Success! Validated Structured Reflection State received:")
        print(f"    - Encounter: {state.encounter.description}")
        print(f"    - Reported Facts ({len(state.reported_facts)}):")
        for f in state.reported_facts:
            print(f"      * [{f.id}] {f.text} (source: {f.source})")
        print(f"    - Hypotheses ({len(state.hypotheses)}):")
        for h in state.hypotheses:
            print(f"      * [{h.id}] {h.text} (status: {h.status}, confidence: {h.confidence})")
        print(f"    - Unknowns ({len(state.unknowns)}):")
        for u in state.unknowns:
            print(f"      * [{u.id}] {u.text}")
        if state.follow_up_question:
            print(f"    - Follow-up Question: {state.follow_up_question.text}")
            print(f"      Purpose: {state.follow_up_question.purpose}")
        print(f"    - Possible Responses ({len(state.possible_responses)}):")
        for opt in state.possible_responses:
            print(f"      * [{opt.id}] {opt.action}")
            print(f"        Appropriate when: {opt.appropriate_when}")
        print("\n[+] ALL LIVE VALIDATIONS PASSED.")
    except AIProviderConfigError as ce:
        print(f"[-] Config Error: {ce}")
        sys.exit(1)
    except AIProviderException as pe:
        print(f"[-] AI Provider Error: {pe.message} (Code: {pe.code})")
        sys.exit(1)
    except Exception as e:
        print(f"[-] Unexpected error: {e}")
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())
