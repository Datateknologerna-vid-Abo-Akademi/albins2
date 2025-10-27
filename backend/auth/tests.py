from datetime import datetime, timedelta

from django.conf import settings
from django.contrib.auth import get_user_model
from django.test import override_settings
from django.urls import reverse
from django.utils import timezone
from knox.models import AuthToken
from rest_framework import status
from rest_framework.test import APITestCase


class AnonymousTokenViewTests(APITestCase):
    @override_settings(SERVICE_ACCOUNT_USERNAME="service_account", SERVICE_ACCOUNT_EMAIL="service@example.com")
    def test_creates_service_account_and_returns_token(self):
        url = reverse("knox_anonymous_login")
        response = self.client.post(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("token", response.data)
        self.assertIn("expiry", response.data)

        expiry = datetime.fromisoformat(response.data["expiry"])
        self.assertGreater(expiry, timezone.now() - timedelta(seconds=1))

        user = get_user_model().objects.get(username="service_account")
        self.assertEqual(user.email, "service@example.com")
        self.assertFalse(user.has_usable_password())
        self.assertEqual(AuthToken.objects.filter(user=user).count(), 1)

    @override_settings(SERVICE_ACCOUNT_USERNAME="service_account", SERVICE_ACCOUNT_EMAIL="service@example.com")
    def test_reuses_existing_service_account_and_cleans_expired_tokens(self):
        user = get_user_model().objects.create(username="service_account", email="service@example.com")
        user.set_unusable_password()
        user.save(update_fields=["password"])

        expired_token, _ = AuthToken.objects.create(user)
        expired_token.expiry = timezone.now() - timedelta(hours=1)
        expired_token.save(update_fields=["expiry"])

        url = reverse("knox_anonymous_login")
        response = self.client.post(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(get_user_model().objects.filter(username="service_account").count(), 1)

        tokens = AuthToken.objects.filter(user=user)
        self.assertEqual(tokens.count(), 1)
        self.assertGreater(tokens.first().expiry, timezone.now())

    @override_settings(SERVICE_ACCOUNT_USERNAME="", SERVICE_ACCOUNT_EMAIL="")
    def test_missing_service_account_configuration_returns_error(self):
        url = reverse("knox_anonymous_login")
        response = self.client.post(url)

        self.assertEqual(response.status_code, status.HTTP_500_INTERNAL_SERVER_ERROR)
        self.assertEqual(response.data["detail"], "Service account not configured")


class LoginViewTests(APITestCase):
    def setUp(self):
        self.user = get_user_model().objects.create_user(
            username="login-user",
            password="strong-password",
            email="login@example.com",
        )

    def test_returns_token_with_configured_expiry(self):
        url = reverse("knox_login")
        response = self.client.post(url, {"username": "login-user", "password": "strong-password"}, format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("token", response.data)
        self.assertEqual(response.data["expiry"], settings.TOKEN_EXPIRY)

    def test_rejects_invalid_credentials(self):
        url = reverse("knox_login")
        response = self.client.post(url, {"username": "login-user", "password": "wrong"}, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("non_field_errors", response.data)
