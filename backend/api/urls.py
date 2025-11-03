from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .viewsets import SongViewSet
from .views import SongBookDetailView

router = DefaultRouter()
router.register(r"songs", SongViewSet, basename="songs")

urlpatterns = [
    path("songbook/", SongBookDetailView.as_view(), name="songbook-detail"),
    path("", include(router.urls)),
]
