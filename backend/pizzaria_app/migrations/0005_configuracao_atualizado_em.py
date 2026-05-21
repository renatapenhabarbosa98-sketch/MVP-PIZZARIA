from django.db import migrations


class Migration(migrations.Migration):
    dependencies = [
        ('pizzaria_app', '0004_configuracao_aparencia'),
    ]

    operations = [
        migrations.RunSQL(
            sql="""
            ALTER TABLE configuracao
              ADD COLUMN IF NOT EXISTS atualizado_em BIGINT NOT NULL DEFAULT 0;
            """,
            reverse_sql="""
            ALTER TABLE configuracao
              DROP COLUMN IF EXISTS atualizado_em;
            """,
        ),
    ]
