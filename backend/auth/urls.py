from django.urls import path
from knox import views as knox_views
from . import views

urlpatterns = [
    # Knox login views
    path('login/', views.LoginView.as_view(), name='knox_login'),
    path('logout/', knox_views.LogoutView.as_view(), name='knox_logout'),
    path('anonymous-login/', views.AnonymousTokenView.as_view(), name='knox_anonymous_login'),
]
