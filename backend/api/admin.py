from django.contrib import admin
from admin_ordering.admin import OrderableAdmin

from .models import Song, Category, SongBook


class SongFormInline(OrderableAdmin, admin.TabularInline):
    line_numbering = 0
    model = Song
    extra = 0
    can_delete = False
    can_add = False
    ordering_field = ("order",)
    ordering = ["order"]
    fields = ["order", "title", "page_number", "negative_page_number"]
    ordering_field_hide_input = True


class CategoryFormInline(OrderableAdmin, admin.TabularInline):
    line_numbering = 0
    model = Category
    extra = 0
    can_delete = False
    can_add = False
    ordering_field = ("order",)
    ordering = ["order"]
    fields = ["order", "name"]
    ordering_field_hide_input = False


# Register your models here.

@admin.register(Song)
class SongAdmin(admin.ModelAdmin):
    exclude = ["order"]
    list_display = ["title", "category", "page_number", "negative_page_number"]
    list_editable = ["page_number", "negative_page_number"]
    list_filter = ["category"]
    search_fields = ["title", "melody", "author", "content"]


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    inlines = [SongFormInline]
    list_display = ["name", "songbook", "order"]
    list_editable = ["order"]
    list_filter = ["songbook"]
    search_fields = ["name"]
    ordering = ["songbook", "order", "name"]


@admin.register(SongBook)
class SongBookAdmin(admin.ModelAdmin):
    inlines = [CategoryFormInline]
