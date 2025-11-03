from django.db.models import Prefetch
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Category, Song, SongBook
from .serializers import SongBookSerializer


class SongBookDetailView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        queryset = SongBook.objects.prefetch_related(
            Prefetch(
                "categories",
                queryset=Category.objects.order_by("order", "id").prefetch_related(
                    Prefetch("songs", queryset=Song.objects.order_by("order", "id"))
                ),
            )
        )

        try:
            songbook = queryset.get()
        except SongBook.DoesNotExist:
            return Response({"detail": "Songbook not found."}, status=status.HTTP_404_NOT_FOUND)
        except SongBook.MultipleObjectsReturned:
            return Response(
                {"detail": "Multiple songbooks found. Please ensure only one songbook exists."},
                status=status.HTTP_409_CONFLICT,
            )

        serializer = SongBookSerializer(songbook)
        return Response(serializer.data, status=status.HTTP_200_OK)
