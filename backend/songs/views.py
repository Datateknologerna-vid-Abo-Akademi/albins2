from rest_framework import authentication, permissions
from rest_framework.views import APIView
from rest_framework.response import Response

from .models import Song

# Create your views here.

class AllSongs(APIView):
    
    authentication_classes = [authentication.TokenAuthentication]
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, pk, format=None):
        songs = [song for song in Song.objects.all()]

        return Response(songs)