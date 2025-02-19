from rest_framework import permissions
from rest_framework.views import APIView
from rest_framework.response import Response
from knox.auth import TokenAuthentication

from .models import Song, SongBook, Category
from .serializers import CategorySerializer, SongSerializer

from django.db.models import Prefetch


class AllSongs(APIView):
    authentication_classes = [TokenAuthentication]
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, format=None):
        res = {}

        songbooks = SongBook.objects.prefetch_related(
            Prefetch("category_set", queryset=Category.objects.prefetch_related("song_set"))
        )

        for songbook in songbooks:
            res[songbook.name] = {}
            for category in songbook.category_set.all():
                res[songbook.name][category.name] = CategorySerializer(category).data
                res[songbook.name][category.name]["songs"] = SongSerializer(category.song_set.all(), many=True).data

        return Response(res)


class AllCategories(APIView):
    authentication_classes = [TokenAuthentication]
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, format=None):
        categories = Category.objects.all()
        serializer = CategorySerializer(categories, many=True)
        return Response(serializer.data)
