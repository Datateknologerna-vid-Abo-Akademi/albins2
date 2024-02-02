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
    fields = ["order", "title"]
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
    ordering_field_hide_input = True


# Register your models here.

@admin.register(Song)
class SongAdmin(admin.ModelAdmin):
    exclude = ["order"]


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    inlines = [SongFormInline]


@admin.register(SongBook)
class SongBookAdmin(admin.ModelAdmin):
    inlines = [CategoryFormInline]
