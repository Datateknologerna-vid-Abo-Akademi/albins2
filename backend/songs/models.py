from django.db import models

from ckeditor.fields import RichTextField
# Create your models here.


class SongBook(models.Model):
    name = models.CharField("Name")

    def __str__(self) -> str:
        return self.name


class Category(models.Model):
    name = models.CharField("Name")
    order = models.IntegerField("order", unique=True)
    songbook = models.ForeignKey(SongBook, on_delete=models.CASCADE)

    class Meta:
        verbose_name = "Category"
        verbose_name_plural = "Categories"
        ordering = ["id"]

    def __str__(self) -> str:
        return self.name


class Song(models.Model):
    title = models.CharField("Title", max_length=100)
    melody = models.CharField("Melody", max_length=255, blank=True, null=True)
    author = models.CharField("Author", max_length=255, blank=True, null=True)
    content = RichTextField("Content", blank=True, null=True)
    audio = models.FileField("Audio", blank=True, null=True)
    category = models.ForeignKey(Category, on_delete=models.CASCADE)
    order = models.IntegerField("#", blank=True)

    class Meta:
        verbose_name = "Song"
        verbose_name_plural = "Songs"
        ordering = ["id"]

    def __str__(self) -> str:
        return self.title
    
    def save(self, *args, **kwargs):
        if self.order is None:
            self.order = (self.category.song_set.count() + 1)*10
        super().save(*args, **kwargs)
