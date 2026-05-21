from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("pizzaria_app", "0001_initial"),
    ]

    operations = [
        # Adiciona campos novos em Produto
        migrations.AddField(
            model_name="produto",
            name="tipo",
            field=models.CharField(default="pizza", max_length=20),
        ),
        migrations.AddField(
            model_name="produto",
            name="tamanho",
            field=models.CharField(blank=True, max_length=5),
        ),
        # Recria Pedido com os novos campos
        migrations.DeleteModel(name="Pedido"),
        migrations.CreateModel(
            name="Mesa",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("num", models.IntegerField(unique=True)),
                ("capacidade", models.IntegerField(default=4)),
                ("status", models.CharField(default="livre", max_length=20)),
                ("abertura", models.BigIntegerField(blank=True, null=True)),
            ],
            options={"db_table": "mesas", "ordering": ["num"]},
        ),
        migrations.CreateModel(
            name="Cliente",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("nome", models.CharField(max_length=120)),
                ("telefone", models.CharField(max_length=20)),
                ("endereco", models.TextField(blank=True)),
            ],
            options={"db_table": "clientes", "ordering": ["nome"]},
        ),
        migrations.CreateModel(
            name="Configuracao",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("nome", models.CharField(default="Pizzaria Bella", max_length=100)),
                ("logo", models.URLField(blank=True)),
                ("cor", models.CharField(default="#BF3010", max_length=10)),
                ("num_mesas", models.IntegerField(default=10)),
            ],
            options={"db_table": "configuracao", "verbose_name": "Configuração"},
        ),
        migrations.CreateModel(
            name="Pedido",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("tipo", models.CharField(default="salao", max_length=20)),
                ("mesa_num", models.IntegerField(blank=True, null=True)),
                ("cliente_nome", models.CharField(blank=True, max_length=120)),
                ("total", models.DecimalField(decimal_places=2, default=0, max_digits=10)),
                ("status", models.CharField(default="Em preparo", max_length=30)),
                ("criado_em", models.BigIntegerField(default=0)),
                ("mesa", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, to="pizzaria_app.mesa")),
                ("cliente", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, to="pizzaria_app.cliente")),
            ],
            options={"db_table": "pedidos", "ordering": ["-id"]},
        ),
        migrations.CreateModel(
            name="ItemPedido",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("quantidade", models.IntegerField(default=1)),
                ("preco_unitario", models.DecimalField(decimal_places=2, max_digits=10)),
                ("observacao", models.CharField(blank=True, max_length=200)),
                ("pedido", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="itens", to="pizzaria_app.pedido")),
                ("produto", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to="pizzaria_app.produto")),
            ],
            options={"db_table": "itens_pedido"},
        ),
        migrations.CreateModel(
            name="Pagamento",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("forma", models.CharField(max_length=30)),
                ("valor", models.DecimalField(decimal_places=2, max_digits=10)),
                ("data", models.BigIntegerField(default=0)),
                ("descricao", models.CharField(blank=True, max_length=200)),
                ("pedido", models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name="pagamento", to="pizzaria_app.pedido")),
            ],
            options={"db_table": "pagamentos"},
        ),
    ]
