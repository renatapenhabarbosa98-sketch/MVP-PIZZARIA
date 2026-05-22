from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ('pizzaria_app', '0014_garantir_mesas'),
    ]

    operations = [
        migrations.SeparateDatabaseAndState(
            database_operations=[
                migrations.RunSQL(
                    sql="ALTER TABLE cardapio ADD COLUMN IF NOT EXISTS tamanho VARCHAR(5) NOT NULL DEFAULT '';",
                    reverse_sql="SELECT 1;",
                ),
            ],
            state_operations=[
                migrations.AddField(
                    model_name='produto',
                    name='tamanho',
                    field=models.CharField(blank=True, default='', max_length=5),
                ),
            ],
        ),
    ]
