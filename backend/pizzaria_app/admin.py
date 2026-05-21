from django.contrib import admin

from .models import Cliente, Configuracao, ItemPedido, Mesa, Pagamento, Pedido, Produto


@admin.register(Produto)
class ProdutoAdmin(admin.ModelAdmin):
    list_display = ("nome", "categoria_id", "preco", "ativo")
    list_filter = ("ativo", "categoria_id")
    search_fields = ("nome",)


@admin.register(Mesa)
class MesaAdmin(admin.ModelAdmin):
    list_display = ("num", "capacidade", "status")
    list_filter = ("status",)


@admin.register(Cliente)
class ClienteAdmin(admin.ModelAdmin):
    list_display = ("nome", "telefone")
    search_fields = ("nome", "telefone")


class ItemPedidoInline(admin.TabularInline):
    model = ItemPedido
    extra = 0
    readonly_fields = ("produto", "quantidade", "preco_unitario", "observacao")


@admin.register(Pedido)
class PedidoAdmin(admin.ModelAdmin):
    list_display = ("id", "tipo", "mesa_num", "cliente_nome", "total", "status")
    list_filter = ("status", "tipo")
    inlines = [ItemPedidoInline]


@admin.register(Pagamento)
class PagamentoAdmin(admin.ModelAdmin):
    list_display = ("pedido", "forma", "valor")


@admin.register(Configuracao)
class ConfiguracaoAdmin(admin.ModelAdmin):
    list_display = ("nome", "cor", "num_mesas")
