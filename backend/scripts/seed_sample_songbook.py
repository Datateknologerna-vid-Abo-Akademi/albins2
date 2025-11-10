"""Seed a demo songbook with sample categories and songs for UI testing."""

import os
import sys
from pathlib import Path

import django
from django.db import transaction


# Ensure the backend package is on PYTHONPATH before configuring Django.
BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.append(str(BACKEND_DIR))

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "albins2.settings")
django.setup()

from api.models import Category, Song, SongBook  # noqa: E402  (import after django.setup)


BOOK_NAME = "Visual Test Songbook"
SONGS_PER_CATEGORY = 12  # 5 categories * 12 songs = 60 sample entries
NEGATIVE_PAGE_INTERVAL = 7

CATEGORY_SPECS = [
    "Sunrise Starters",
    "Evening Echoes",
    "Campfire Classics",
    "Traveling Tunes",
    "Late Night Lullabies",
]


def _build_content(title: str, category_name: str, stanza_number: int, page_number: int) -> str:
    """Create a lightweight HTML body so the CKEditor field renders nicely."""

    paragraphs = [
        f"{title} lives inside the {category_name} set.",
        f"Stanza {stanza_number + 1} keeps page {page_number} company.",
        "Lorem ipsum lyrics are good enough for layout smoke tests.",
    ]
    return "".join(f"<p>{line}</p>" for line in paragraphs)


@transaction.atomic
def main() -> None:
    songbook, _ = SongBook.objects.get_or_create(name=BOOK_NAME)

    # Reset just this songbook so repeated runs stay deterministic.
    songbook.categories.all().delete()

    categories: list[Category] = []
    for idx, name in enumerate(CATEGORY_SPECS):
        categories.append(
            Category.objects.create(
                name=name,
                songbook=songbook,
                order=(idx + 1) * 100,
            )
        )

    total_songs = 0
    page_number = 1
    order_counter = 10

    for cat_index, category in enumerate(categories):
        for song_index in range(SONGS_PER_CATEGORY):
            title = f"{category.name} #{song_index + 1}"
            negative_page = -page_number if page_number % NEGATIVE_PAGE_INTERVAL == 0 else None
            content = _build_content(title, category.name, song_index, page_number)

            Song.objects.create(
                title=title,
                melody=f"Melody Pattern {cat_index + 1}-{song_index + 1}",
                author="Sample Generator",
                content=content,
                category=category,
                page_number=page_number,
                negative_page_number=negative_page,
                order=order_counter,
            )

            total_songs += 1
            page_number += 1
            order_counter += 10

    print(
        f"Seeded {total_songs} songs across {len(categories)} categories in '{songbook.name}'."
    )


if __name__ == "__main__":
    main()
