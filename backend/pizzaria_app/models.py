from django.contrib.auth.models import User
from django.db import models


class Produto(models.Model):
    nome = models.CharField(max_length=100)
    descricao = models.TextField(blank=True)
    preco = models.DecimalField(max_digits=10, decimal_places=2)
    categoria = models.CharField(max_length=100, blank=True, default='', db_column='categoria')
    categoria_id = models.IntegerField(null=True, blank=True, db_column='categoria_id')
    ativo = models.BooleanField(default=True)

    class Meta:
        db_table = "cardapio"
        ordering = ["nome"]

    def __str__(self):
        return self.nome

    def to_dict(self):
        if self.categoria_id == 1:
            tipo = 'pizza'
        elif self.categoria_id == 2:
            tipo = 'bebida'
        else:
            cat = (self.categoria or '').lower()
            tipo = 'bebida' if 'bebida' in cat or 'drink' in cat else 'pizza'
        return {
            'id': self.id,
            'nome': self.nome,
            'tipo': tipo,
            'tam': '',
            'preco': float(self.preco),
            'ativo': self.ativo,
        }


class Mesa(models.Model):
    num = models.IntegerField(unique=True)
    capacidade = models.IntegerField(default=4)
    status = models.CharField(max_length=20, default='livre')
    abertura = models.BigIntegerField(null=True, blank=True)

    class Meta:
        db_table = "mesas"
        ordering = ["num"]

    def __str__(self):
        return f"Mesa {self.num}"

    def to_dict(self):
        return {
            'id': self.id,
            'numero': self.num,
            'capacidade': self.capacidade,
            'status': self.status.lower(),
            'horaAbertura': self.abertura,
        }


class Cliente(models.Model):
    nome = models.CharField(max_length=120)
    telefone = models.CharField(max_length=20)
    endereco = models.TextField(blank=True)
    mesa_reserva = models.IntegerField(null=True, blank=True)
    data_evento = models.CharField(max_length=30, blank=True, null=True)

    class Meta:
        db_table = "clientes"
        ordering = ["nome"]

    def __str__(self):
        return self.nome

    def to_dict(self):
        return {
            'id': self.id,
            'nome': self.nome,
            'telefone': self.telefone,
            'endereco': self.endereco,
            'mesaReserva': self.mesa_reserva,
            'dataEvento': self.data_evento or '',
        }


class Pedido(models.Model):
    tipo = models.CharField(max_length=20, default='salao')
    mesa = models.ForeignKey(Mesa, null=True, blank=True, on_delete=models.SET_NULL)
    mesa_num = models.IntegerField(null=True, blank=True)
    cliente = models.ForeignKey(Cliente, null=True, blank=True, on_delete=models.SET_NULL)
    cliente_nome = models.CharField(max_length=120, blank=True)
    total = models.DecimalField(max_digits=10, decimal_places=2, default=0, db_column='total_consumo')
    status = models.CharField(max_length=30, default='Em preparo', db_column='status_pedido')
    criado_em = models.BigIntegerField(default=0)

    class Meta:
        db_table = "pedidos_mesa"
        ordering = ["-id"]

    def __str__(self):
        return f"Pedido #{self.id}"

    def to_dict(self):
        return {
            'id': self.id,
            'tipo': self.tipo,
            'mesaId': self.mesa_id,
            'mesaNum': self.mesa_num,
            'clienteId': self.cliente_id,
            'clienteNome': self.cliente_nome,
            'items': [item.to_dict() for item in self.itens.all()],
            'total': float(self.total),
            'status': self.status,
            'criadoEm': self.criado_em,
        }


class ItemPedido(models.Model):
    pedido = models.ForeignKey(Pedido, on_delete=models.CASCADE, related_name='itens')
    produto = models.ForeignKey(Produto, on_delete=models.CASCADE)
    quantidade = models.IntegerField(default=1)
    preco_unitario = models.DecimalField(max_digits=10, decimal_places=2)
    observacao = models.CharField(max_length=200, blank=True)

    class Meta:
        db_table = "itens_pedido"

    def to_dict(self):
        return {
            'id': self.produto_id,
            'nome': self.produto.nome,
            'tam': '',
            'preco': float(self.preco_unitario),
            'qtd': self.quantidade,
            'obs': self.observacao,
        }


class Pagamento(models.Model):
    pedido = models.OneToOneField(Pedido, on_delete=models.CASCADE, related_name='pagamento')
    valor_total = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    forma = models.CharField(max_length=30)
    valor = models.DecimalField(max_digits=10, decimal_places=2)
    data = models.BigIntegerField(default=0)
    descricao = models.CharField(max_length=200, blank=True)

    class Meta:
        db_table = "pagamentos"

    def to_dict(self):
        return {
            'pedidoId': self.pedido_id,
            'forma': self.forma,
            'valor': float(self.valor),
            'data': self.data,
            'desc': self.descricao,
        }


class Configuracao(models.Model):
    nome = models.CharField(max_length=100, default='Pizzaria Bella')
    logo = models.TextField(blank=True)
    cor = models.CharField(max_length=10, default='#BF3010')
    num_mesas = models.IntegerField(default=10)
    tema = models.CharField(max_length=10, default='light')
    fonte_tamanho = models.IntegerField(default=14)
    atualizado_em = models.BigIntegerField(default=0)

    class Meta:
        db_table = "configuracao"
        verbose_name = 'Configuração'

    def to_dict(self):
        return {
            'nome': self.nome,
            'logo': self.logo,
            'cor': self.cor,
            'mesas': self.num_mesas,
            'tema': self.tema,
            'fonteTamanho': self.fonte_tamanho,
            'atualizadoEm': self.atualizado_em,
        }


PAPEIS = [('admin', 'Administrador'), ('garcom', 'Garçom'), ('cozinha', 'Cozinha')]


class PerfilUsuario(models.Model):
    usuario = models.OneToOneField(User, on_delete=models.CASCADE, related_name='perfil')
    papel = models.CharField(max_length=20, choices=PAPEIS, default='garcom')
    deve_trocar_senha = models.BooleanField(default=True)
    token = models.CharField(max_length=64, blank=True)

    class Meta:
        db_table = 'usuarios'

    def to_dict(self):
        return {
            'id': self.usuario.id,
            'username': self.usuario.username,
            'nome': self.usuario.first_name or self.usuario.username,
            'papel': self.papel,
            'deveTrocarSenha': self.deve_trocar_senha,
        }
