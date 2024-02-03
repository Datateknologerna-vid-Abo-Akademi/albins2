from rest_framework import serializers
from .models import Song, Category


class SongSerializer(serializers.ModelSerializer):
    class Meta:
        model = Song
        exclude = ['category', 'id', 'title']


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        exclude = ['songbook', 'id', 'name']
