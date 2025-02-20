from rest_framework import serializers
from .models import Song, Category, SongBook

class SongSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source="category.name", read_only=True)

    class Meta:
        model = Song
        fields = "__all__"

class CategorySerializer(serializers.ModelSerializer):
    songs = SongSerializer(many=True, read_only=True)

    class Meta:
        model = Category
        fields = ["id", "name", "order", "songs"]

class SongBookSerializer(serializers.ModelSerializer):
    categories = CategorySerializer(many=True, read_only=True)

    class Meta:
        model = SongBook
        fields = ["id", "name", "categories"]
