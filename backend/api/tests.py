from django.contrib.auth import get_user_model
from django.db import IntegrityError
from django.test import TestCase
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from .models import Category, Song, SongBook


class CategoryModelTests(TestCase):
    def setUp(self):
        self.songbook = SongBook.objects.create(name="Sunday Service")

    def test_assigns_incremental_order_when_missing(self):
        first = Category.objects.create(name="Opening", songbook=self.songbook)
        second = Category.objects.create(name="Closing", songbook=self.songbook)

        self.assertEqual(first.order, 10)
        self.assertEqual(second.order, 20)

    def test_respects_explicit_order(self):
        category = Category.objects.create(name="Special", songbook=self.songbook, order=5)

        self.assertEqual(category.order, 5)

    def test_unique_category_name_per_songbook(self):
        Category.objects.create(name="Shared", songbook=self.songbook)

        with self.assertRaises(IntegrityError):
            Category.objects.create(name="Shared", songbook=self.songbook)

    def test_allows_same_category_name_in_different_songbooks(self):
        other_songbook = SongBook.objects.create(name="Evening Service")
        Category.objects.create(name="Shared", songbook=self.songbook)

        try:
            Category.objects.create(name="Shared", songbook=other_songbook)
        except IntegrityError:  # pragma: no cover
            self.fail("Category name should be unique per songbook, not globally.")


class SongModelTests(TestCase):
    def setUp(self):
        songbook = SongBook.objects.create(name="Morning Worship")
        self.category = Category.objects.create(name="Praise", songbook=songbook)

    def test_assigns_incremental_order_when_missing(self):
        first = Song.objects.create(title="Joyful Noise", category=self.category)
        second = Song.objects.create(title="Quiet Reflection", category=self.category)

        self.assertEqual(first.order, 10)
        self.assertEqual(second.order, 20)

    def test_respects_explicit_order(self):
        song = Song.objects.create(title="Special Number", category=self.category, order=3)

        self.assertEqual(song.order, 3)

    def test_retains_null_negative_when_not_provided(self):
        song = Song.objects.create(
            title="Standard Page",
            category=self.category,
            page_number=10,
        )

        self.assertEqual(song.page_number, 10)
        self.assertIsNone(song.negative_page_number)

    def test_retains_null_page_when_only_negative_provided(self):
        song = Song.objects.create(
            title="Flipped Only",
            category=self.category,
            negative_page_number=-12,
        )

        self.assertIsNone(song.page_number)
        self.assertEqual(song.negative_page_number, -12)

    def test_coerces_signs_when_both_provided(self):
        song = Song.objects.create(
            title="Matching Pair",
            category=self.category,
            page_number=-7,
            negative_page_number=9,
        )

        self.assertEqual(song.page_number, 7)
        self.assertEqual(song.negative_page_number, -9)


class SongBookAPITests(APITestCase):
    def setUp(self):
        self.user = get_user_model().objects.create_user(username="test-user", password="password123")
        self.songbook = SongBook.objects.create(name="Seasonal Favorites")
        self.first_category = Category.objects.create(name="Advent", songbook=self.songbook, order=10)
        self.second_category = Category.objects.create(name="Easter", songbook=self.songbook, order=30)

        self.alpha_song = Song.objects.create(title="Alpha Song", category=self.first_category, order=10)
        self.beta_song = Song.objects.create(title="Beta Song", category=self.first_category, order=30)
        self.gamma_song = Song.objects.create(title="Gamma Song", category=self.second_category, order=20)

    def test_songbook_endpoint_requires_authentication(self):
        url = reverse("songbook-detail")
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_songbook_endpoint_returns_single_songbook_payload(self):
        self.client.force_authenticate(user=self.user)
        url = reverse("songbook-detail")
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["id"], self.songbook.id)
        self.assertEqual(response.data["name"], self.songbook.name)
        categories = response.data["categories"]
        self.assertEqual(len(categories), 2)
        self.assertEqual([category["name"] for category in categories], ["Advent", "Easter"])
        self.assertEqual([song["title"] for song in categories[0]["songs"]], ["Alpha Song", "Beta Song"])

    def test_songbook_endpoint_returns_error_if_multiple_songbooks_exist(self):
        SongBook.objects.create(name="Extra Book")
        self.client.force_authenticate(user=self.user)
        url = reverse("songbook-detail")
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_409_CONFLICT)
        self.assertIn("Multiple songbooks", response.data["detail"])


class SongViewSetTests(APITestCase):
    def setUp(self):
        self.user = get_user_model().objects.create_user(username="api-user", password="password123")
        songbook = SongBook.objects.create(name="General Songs")
        self.category = Category.objects.create(name="Favorites", songbook=songbook)
        self.song = Song.objects.create(title="Shared Tune", category=self.category)

    def test_song_list_includes_category_name(self):
        url = reverse("songs-list")

        unauthenticated_response = self.client.get(url)
        self.assertEqual(unauthenticated_response.status_code, status.HTTP_401_UNAUTHORIZED)

        self.client.force_authenticate(user=self.user)
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data[0]["id"], self.song.id)
        self.assertEqual(response.data[0]["category_name"], self.category.name)
