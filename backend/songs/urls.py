from django.urls import path
from . import views


urlpatterns = [
    path('all', views.AllSongs.as_view(), name='song-list'),
]
