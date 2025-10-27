from django.db.models import Prefetch
from rest_framework import permissions, viewsets

from .models import Category, Song, SongBook
from .serializers import CategorySerializer, SongBookSerializer, SongSerializer


class SongViewSet(viewsets.ModelViewSet):
    queryset = Song.objects.select_related("category")
    serializer_class = SongSerializer
    permission_classes = [permissions.IsAuthenticated]

class CategoryViewSet(viewsets.ModelViewSet):
    queryset = Category.objects.prefetch_related(
        Prefetch("songs", queryset=Song.objects.order_by("order", "id"))
    ).order_by("order", "id")
    serializer_class = CategorySerializer
    permission_classes = [permissions.IsAuthenticated]

class SongBookViewSet(viewsets.ModelViewSet):
    queryset = SongBook.objects.prefetch_related(
        Prefetch(
            "categories",
            queryset=Category.objects.order_by("order", "id").prefetch_related(
                Prefetch("songs", queryset=Song.objects.order_by("order", "id"))
            ),
        )
    )
    serializer_class = SongBookSerializer
    permission_classes = [permissions.IsAuthenticated]
