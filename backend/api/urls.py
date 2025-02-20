from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .viewsets import SongViewSet, CategoryViewSet, SongBookViewSet

router = DefaultRouter()
router.register(r"songs", SongViewSet, basename="songs")
router.register(r"categories", CategoryViewSet, basename="categories")
router.register(r"songbooks", SongBookViewSet, basename="songbooks")

urlpatterns = [
    path("", include(router.urls)),
]
