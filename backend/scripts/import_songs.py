import os
import sys
import json
import django

# Set up Django environment
sys.path.append("/app")
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "albins2.settings")
django.setup()

from api.models import Song, Category, SongBook

# Load JSON data
json_file = "songs.json"

with open(json_file, "r", encoding="utf-8") as f:
    songs_data = json.load(f)

# Get or create the songbook
songbook_name = "Albins"
songbook, _ = SongBook.objects.get_or_create(name=songbook_name)

# Process each song in the JSON file
for song_entry in songs_data:
    category_name = song_entry["category"]
    category, _ = Category.objects.get_or_create(name=category_name, songbook=songbook)

    content = song_entry["text"].replace('\n', '</p><p>')  # Format lyrics with paragraph tags
    content = f"<p>{content}</p>"

    song, created = Song.objects.get_or_create(
        title=song_entry["title"],
        defaults={
            "melody": song_entry.get("melody", ""),
            "author": "",
            "content": content,
            "category": category,
            "order": None,  # Order will be set automatically by model
        },
    )

    if created:
        song.save()

print("Songs successfully imported!")
