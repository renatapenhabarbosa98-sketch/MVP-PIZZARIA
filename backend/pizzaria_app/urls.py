from django.contrib import admin
from django.urls import path
from pizzaria_app import views

urlpatterns = [ # pyright: ignore[reportUnknownVariableType]
    path('admin/', admin.site.urls),

    # Rota raiz e rota da pizzaria
    path('', views.pizzaria_view, name='home'),
    path('pizzaria/', views.pizzaria_view, name='pizzaria'),

    # Arquivos do frontend (funciona tanto pelo Django quanto pelo Live Server)
    path('src/<path:path>', views.serve_frontend),
    path('dist/<path:path>', views.serve_frontend),

    # Cardápio
    path('api/cardapio/', views.api_cardapio, name='api_cardapio'),
    path('api/cardapio/<int:pk>/', views.api_cardapio_detail, name='api_cardapio_detail'),

    # Mesas
    path('api/mesas/', views.api_mesas, name='api_mesas'),
    path('api/mesas/<int:pk>/', views.api_mesa_detail, name='api_mesa_detail'),

    # Clientes
    path('api/clientes/', views.api_clientes, name='api_clientes'),
    path('api/clientes/<int:pk>/', views.api_cliente_detail, name='api_cliente_detail'),

    # Pedidos
    path('api/pedidos/', views.api_pedidos, name='api_pedidos'),
    path('api/pedidos/<int:pk>/', views.api_pedido_detail, name='api_pedido_detail'),

    # Pagamentos
    path('api/pagamentos/', views.api_pagamentos, name='api_pagamentos'),

    # Configuração
    path('api/config/', views.api_config, name='api_config'),

    # Autenticação
    path('api/auth/login/',        views.api_login,        name='api_login'),
    path('api/auth/logout/',       views.api_logout,       name='api_logout'),
    path('api/auth/me/',           views.api_me,           name='api_me'),
    path('api/auth/trocar-senha/', views.api_trocar_senha, name='api_trocar_senha'),

    # Gestão de usuários (admin)
    path('api/usuarios/',          views.api_usuarios,       name='api_usuarios'),
    path('api/usuarios/<int:pk>/', views.api_usuario_detail, name='api_usuario_detail'),
]