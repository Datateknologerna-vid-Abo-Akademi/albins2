from django.urls import path, include
from . import views


urlpatterns = [
    path('all', views.AllSongs.as_view(), name='song-list'),
]
