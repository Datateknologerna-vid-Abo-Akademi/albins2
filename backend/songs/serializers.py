from rest_framework import serializers
from .models import Song, Category


class SongSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source="category.name", read_only=True)

    class Meta:
        model = Song
        fields = "__all__"  # Or list fields explicitly if needed, e.g., ["id", "title", "category_name", "content"]

class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = "__all__"
