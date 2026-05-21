import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ('pizzaria_app', '0008_adaptar_banco_existente'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.SeparateDatabaseAndState(
            database_operations=[],
            state_operations=[
                migrations.RemoveField(model_name='produto', name='disponivel'),
                migrations.RemoveField(model_name='produto', name='tamanho'),
                migrations.RemoveField(model_name='produto', name='tipo'),
                migrations.AddField(model_name='cliente', name='data_evento', field=models.CharField(blank=True, max_length=30, null=True)),
                migrations.AddField(model_name='cliente', name='mesa_reserva', field=models.IntegerField(blank=True, null=True)),
                migrations.AddField(model_name='configuracao', name='atualizado_em', field=models.BigIntegerField(default=0)),
                migrations.AddField(model_name='configuracao', name='fonte_tamanho', field=models.IntegerField(default=14)),
                migrations.AddField(model_name='configuracao', name='tema', field=models.CharField(default='light', max_length=10)),
                migrations.AddField(model_name='pagamento', name='valor_total', field=models.DecimalField(decimal_places=2, default=0, max_digits=10)),
                migrations.AddField(model_name='produto', name='ativo', field=models.BooleanField(default=True)),
                migrations.AddField(model_name='produto', name='categoria', field=models.CharField(blank=True, db_column='categoria', default='', max_length=100)),
                migrations.AddField(model_name='produto', name='categoria_id', field=models.IntegerField(blank=True, db_column='categoria_id', null=True)),
                migrations.AlterField(model_name='configuracao', name='logo', field=models.TextField(blank=True)),
                migrations.AlterField(model_name='pedido', name='status', field=models.CharField(db_column='status_pedido', default='Em preparo', max_length=30)),
                migrations.AlterField(model_name='pedido', name='total', field=models.DecimalField(db_column='total_consumo', decimal_places=2, default=0, max_digits=10)),
                migrations.AlterField(model_name='produto', name='nome', field=models.CharField(max_length=100)),
                migrations.AlterModelTable(name='pedido', table='pedidos_mesa'),
                migrations.AlterModelTable(name='produto', table='cardapio'),
                migrations.CreateModel(
                    name='PerfilUsuario',
                    fields=[
                        ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                        ('papel', models.CharField(choices=[('admin', 'Administrador'), ('garcom', 'Garçom'), ('cozinha', 'Cozinha')], default='garcom', max_length=20)),
                        ('deve_trocar_senha', models.BooleanField(default=True)),
                        ('token', models.CharField(blank=True, max_length=64)),
                        ('usuario', models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name='perfil', to=settings.AUTH_USER_MODEL)),
                    ],
                    options={'db_table': 'usuarios'},
                ),
            ],
        ),
    ]
