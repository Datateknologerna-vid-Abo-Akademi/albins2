from django.urls import re_path, include
from django.views.decorators.csrf import csrf_exempt
from knox import views as knox_views
from . import views

urlpatterns = [
    # Knox login views
    re_path(r'login/', views.LoginView.as_view(), name='knox_login'),
    re_path(r'logout/', knox_views.LogoutView.as_view(), name='knox_logout'),
]
