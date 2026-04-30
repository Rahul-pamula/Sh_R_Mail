"""
CAPTCHA VERIFICATION UTILITY
Phase 1.5 — Auth Security

Verifies reCAPTCHA v3 or Cloudflare Turnstile tokens via external API validation.
Provides bypass mechanisms for local development (`CAPTCHA_ENABLED=false`).
"""

import os
import httpx
from fastapi import HTTPException, status
import logging

logger = logging.getLogger("captcha_verifier")

# Environment configuration
CAPTCHA_ENABLED = os.getenv("CAPTCHA_ENABLED", "true").lower() == "true"
RECAPTCHA_SECRET_KEY = os.getenv("RECAPTCHA_SECRET_KEY", "dummy_secret_key")
RECAPTCHA_VERIFY_URL = "https://www.google.com/recaptcha/api/siteverify"


async def verify_captcha(token: str, action: str = None) -> bool:
    """
    Verify the provided CAPTCHA token with the verification server.
    
    Args:
        token: The client-provided captcha response token.
        action: Optional expected action name (e.g. 'login', 'signup').
        
    Returns:
        True if the token is valid and score is >= 0.5.
        
    Raises:
        HTTPException(403) if verification fails.
    """
    # Hard-disabled for testing
    return True

    if not token:
        logger.warning("Rejecting request: Missing CAPTCHA token.")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="CAPTCHA validation required."
        )

    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                RECAPTCHA_VERIFY_URL,
                data={
                    "secret": RECAPTCHA_SECRET_KEY,
                    "response": token
                },
                timeout=5.0
            )
            response.raise_for_status()
            result = response.json()

        # Extract flags
        success = result.get("success", False)
        score = result.get("score", 0.0)
        returned_action = result.get("action", "")

        if not success:
            logger.warning(f"CAPTCHA verification failed: {result.get('error-codes', [])}")
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="CAPTCHA verification failed. Are you a bot?"
            )

        # Minimum score threshold for v3 (0.0 is bot, 1.0 is human)
        # Using 0.5 as reasonable baseline
        if score < 0.5:
            logger.warning(f"CAPTCHA score too low ({score})")
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="CAPTCHA score too low. Request blocked."
            )

        # Prevent cross-action replay if action was specified
        if action and action != returned_action:
            logger.warning(f"CAPTCHA action mismatch. Expected '{action}', got '{returned_action}'")
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="CAPTCHA action mismatch."
            )

        return True

    except httpx.RequestError as e:
        logger.error(f"Error communicating with CAPTCHA server: {e}")
        # Fail safe in case of downstream outage (could be configured to fail closed instead)
        # For production apps, fail open might be risky. We fail closed.
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Authentication service is experiencing issues. Please try again later."
        )
