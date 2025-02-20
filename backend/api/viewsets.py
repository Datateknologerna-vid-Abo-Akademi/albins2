from rest_framework import viewsets, permissions
from knox.auth import TokenAuthentication
from songs.models import Song, Category, SongBook
from .serializers import SongSerializer, CategorySerializer, SongBookSerializer


class SongViewSet(viewsets.ModelViewSet):
    queryset = Song.objects.all().select_related("category")
    serializer_class = SongSerializer
    authentication_classes = [TokenAuthentication]
    permission_classes = [permissions.IsAuthenticated]


class CategoryViewSet(viewsets.ModelViewSet):
    queryset = Category.objects.all().prefetch_related("songs")
    serializer_class = CategorySerializer
    authentication_classes = [TokenAuthentication]
    permission_classes = [permissions.IsAuthenticated]


class SongBookViewSet(viewsets.ModelViewSet):
    queryset = SongBook.objects.all().prefetch_related("categories")
    serializer_class = SongBookSerializer
    authentication_classes = [TokenAuthentication]
    permission_classes = [permissions.IsAuthenticated]
