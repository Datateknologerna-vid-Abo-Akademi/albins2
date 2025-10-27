from django.db import models
from django_ckeditor_5.fields import CKEditor5Field


class SongBook(models.Model):
    name = models.CharField(max_length=255, verbose_name="Name", unique=True)

    def __str__(self):
        return self.name


class Category(models.Model):
    name = models.CharField(max_length=255, verbose_name="Name")
    order = models.PositiveIntegerField(blank=True, null=True)
    songbook = models.ForeignKey(SongBook, on_delete=models.CASCADE, related_name="categories")

    class Meta:
        verbose_name = "Category"
        verbose_name_plural = "Categories"
        ordering = ["order", "id"]
        constraints = [
            models.UniqueConstraint(fields=["songbook", "name"], name="unique_category_per_book"),
        ]

    def save(self, *args, **kwargs):
        if self.order is None and self.songbook_id:
            last_order = (
                Category.objects.filter(songbook=self.songbook)
                .order_by("-order")
                .first()
            )
            base_order = last_order.order if last_order and last_order.order is not None else 0
            self.order = base_order + 10
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.name} ({self.songbook.name})"

class Song(models.Model):
    title = models.CharField(max_length=255, verbose_name="Title")
    melody = models.CharField(max_length=255, blank=True, null=True, verbose_name="Melody")
    author = models.CharField(max_length=255, blank=True, null=True, verbose_name="Author")
    content = CKEditor5Field(blank=True, null=True, verbose_name="Content")
    audio = models.FileField(upload_to="songs/audio/", blank=True, null=True, verbose_name="Audio")
    category = models.ForeignKey(Category, on_delete=models.CASCADE, related_name="songs")
    order = models.PositiveIntegerField(blank=True, null=True)

    class Meta:
        verbose_name = "Song"
        verbose_name_plural = "Songs"
        ordering = ["order", "id"]

    def save(self, *args, **kwargs):
        if self.order is None:
            last_order = Song.objects.filter(category=self.category).order_by("-order").first()
            self.order = (last_order.order + 10) if last_order else 10
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.title} ({self.category.name})"
