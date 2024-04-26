import os
import sys
import json
import django

sys.path.append("/code")
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "albins2.settings")
django.setup()

from songs.models import Song, Category, SongBook

with open("albins-data.json", "r", encoding="utf-8") as f:
    data: dict = json.load(f)

songbook_name = "Albins"

songbook = SongBook.objects.get_or_create(name=songbook_name)[0]
songbook.save()

for category in data.keys():
    category_obj = Category.objects.get_or_create(name=category, songbook=songbook)[0]
    category_obj.save()
    for song in data[category]:
        song = data[category][song]
        content = song.get("lyrics", "")
        content = content.replace('\n', '</p><p>')
        content = f"<p>{content}</p>"
        song_obj = Song.objects.get_or_create(
            title=song["title"],
            melody=song.get("melody"),
            author=song.get("author"),
            content=content,
            category=category_obj,
            order=song.get("order"),
        )[0]
        song_obj.save()

print("Done!")
