from rest_framework import permissions
from rest_framework.views import APIView
from rest_framework.response import Response
from knox.auth import TokenAuthentication

from .models import Song, SongBook, Category
from .serializers import CategorySerializer, SongSerializer

# Create your views here.

class AllSongs(APIView):
    authentication_classes = [TokenAuthentication]
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, format=None):
        res = {}
        
        songbooks = SongBook.objects.all()

        for songbook in songbooks:
            categories = Category.objects.filter(songbook=songbook)
            res[songbook.name] = {}
            for category in categories:
                res[songbook.name][category.name] = CategorySerializer(category).data
                for song in Song.objects.filter(category=category):
                    res[songbook.name][category.name][song.title] = SongSerializer(song).data


        return Response(res)
