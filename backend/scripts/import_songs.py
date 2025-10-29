import json
import os
import sys
from pathlib import Path

import django

# Set up Django environment
sys.path.append("/app")
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "albins2.settings")
django.setup()

from api.models import Category, Song, SongBook

# Load JSON data
script_dir = Path(__file__).resolve().parent
env_source = os.environ.get("ALBINS_SONG_SOURCE")

if env_source:
    json_path = Path(env_source)
    if not json_path.is_absolute():
        json_path = script_dir / json_path
else:
    json_path = script_dir / "songs.json"

with json_path.open("r", encoding="utf-8") as f:
    songs_data = json.load(f)

# Get or create the songbook
songbook_name = "Albins"
songbook, _ = SongBook.objects.get_or_create(name=songbook_name)

# Process each song in the JSON file
for song_entry in songs_data:
    category_name = song_entry["category"]
    category, _ = Category.objects.get_or_create(name=category_name, songbook=songbook)

    content = song_entry["text"].replace('\n', '</p><p>')
    content = f"<p>{content}</p>"

    raw_page = (
        song_entry.get("page_number")
        or song_entry.get("page")
        or song_entry.get("pageNumber")
    )
    raw_negative_page = (
        song_entry.get("negative_page_number")
        or song_entry.get("flipped_page_number")
        or song_entry.get("flippedPageNumber")
    )

    page_number = None
    negative_page_number = None

    if raw_page is not None:
        try:
            page_number = abs(int(raw_page))
        except (TypeError, ValueError):
            page_number = None

    if raw_negative_page is not None:
        try:
            negative_page_number = -abs(int(raw_negative_page))
        except (TypeError, ValueError):
            negative_page_number = None

    defaults = {
        "melody": song_entry.get("melody", ""),
        "author": "",
        "content": content,
        "category": category,
        "order": None,
        "page_number": page_number,
        "negative_page_number": negative_page_number,
    }

    song, _ = Song.objects.update_or_create(
        title=song_entry["title"],
        category=category,
        defaults=defaults,
    )

print("Songs successfully imported!")
