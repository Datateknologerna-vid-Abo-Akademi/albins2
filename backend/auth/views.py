from django.contrib.auth import get_user_model, login
from knox.models import AuthToken
from knox.views import LoginView as KnoxLoginView
from django.utils import timezone
from rest_framework import permissions, status
from rest_framework.authtoken.serializers import AuthTokenSerializer
from rest_framework.response import Response
from rest_framework.views import APIView
from albins2 import settings


class LoginView(KnoxLoginView):
    permission_classes = (permissions.AllowAny,)

    def post(self, request, format=None):
        serializer = AuthTokenSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data["user"]
        login(request, user)

        # Generate Knox token
        response = super().post(request, format=None)
        response.data["expiry"] = settings.TOKEN_EXPIRY
        return response


class AnonymousTokenView(APIView):
    permission_classes = (permissions.AllowAny,)

    def post(self, request, format=None):
        service_username = settings.SERVICE_ACCOUNT_USERNAME

        if not service_username:
            return Response({"detail": "Service account not configured"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        User = get_user_model()
        user, created = User.objects.get_or_create(
            username=service_username,
            defaults={
                "email": settings.SERVICE_ACCOUNT_EMAIL,
                "is_active": True,
            },
        )

        if created:
            user.set_unusable_password()
            user.save(update_fields=["password"])

        # Clean up expired tokens
        AuthToken.objects.filter(user=user, expiry__lt=timezone.now()).delete()
        token_instance, token = AuthToken.objects.create(user)

        return Response(
            {
                "token": token,
                "expiry": token_instance.expiry.isoformat(),
            }
        )
