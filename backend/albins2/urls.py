"""
URL configuration for albins2 project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.0/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import re_path

from knox import views as knox_views

urlpatterns = [
    re_path(r'^api/admin/', admin.site.urls),
    # Knox login views
    re_path(r'^api/login/', knox_views.LoginView.as_view(), name='knox_login'),
    re_path(r'^api/logout/', knox_views.LogoutView.as_view(), name='knox_logout'),
]
