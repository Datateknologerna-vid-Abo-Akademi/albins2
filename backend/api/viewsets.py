from rest_framework import permissions, viewsets

from .models import Song
from .serializers import SongSerializer


class SongViewSet(viewsets.ModelViewSet):
    queryset = Song.objects.select_related("category")
    serializer_class = SongSerializer
    permission_classes = [permissions.IsAuthenticated]
