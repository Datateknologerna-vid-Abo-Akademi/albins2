from rest_framework.throttling import SimpleRateThrottle

class TokenRateThrottle(SimpleRateThrottle):
    scope = 'token'

    def get_cache_key(self, request, view):
        """
        Rate-limit per Knox authentication token, instead of per user.
        """
        user_token = request.auth  # Knox token object
        if not user_token:
            return None  # No auth means no throttling

        return f"throttle_{self.scope}_{user_token}"  # Use token as key
