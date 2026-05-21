from django.db import migrations, models


class Migration(migrations.Migration):
    initial = True

    dependencies = []

    operations = [
        migrations.CreateModel(
            name="Pedido",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                ("cliente", models.CharField(max_length=120)),
                (
                    "total",
                    models.DecimalField(
                        blank=True,
                        decimal_places=2,
                        max_digits=10,
                        null=True,
                    ),
                ),
                ("status", models.CharField(default="pendente", max_length=30)),
            ],
            options={
                "db_table": "pedidos",
                "ordering": ["-id"],
            },
        ),
        migrations.CreateModel(
            name="Produto",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                ("nome", models.CharField(max_length=120)),
                ("descricao", models.TextField(blank=True)),
                ("preco", models.DecimalField(decimal_places=2, max_digits=10)),
                ("disponivel", models.BooleanField(default=True)),
            ],
            options={
                "db_table": "produtos",
                "ordering": ["nome"],
            },
        ),
    ]
