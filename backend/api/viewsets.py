from rest_framework import viewsets, permissions
from .models import Song, Category, SongBook
from .serializers import SongSerializer, CategorySerializer, SongBookSerializer


class SongViewSet(viewsets.ModelViewSet):
    queryset = Song.objects.select_related("category")
    serializer_class = SongSerializer
    permission_classes = [permissions.IsAuthenticated]

class CategoryViewSet(viewsets.ModelViewSet):
    queryset = Category.objects.prefetch_related("songs")
    serializer_class = CategorySerializer
    permission_classes = [permissions.IsAuthenticated]

class SongBookViewSet(viewsets.ModelViewSet):
    queryset = SongBook.objects.prefetch_related("categories")
    serializer_class = SongBookSerializer
    permission_classes = [permissions.IsAuthenticated]
