from django.db import migrations


class Migration(migrations.Migration):
    dependencies = [
        ('pizzaria_app', '0005_configuracao_atualizado_em'),
    ]

    operations = [
        migrations.RunSQL(
            sql="""
            ALTER TABLE core_produto
              ADD COLUMN IF NOT EXISTS categoria_id INTEGER,
              ADD COLUMN IF NOT EXISTS ativo BOOLEAN NOT NULL DEFAULT TRUE;

            UPDATE core_produto SET ativo = disponivel WHERE disponivel IS NOT NULL;

            ALTER TABLE core_produto
              DROP COLUMN IF EXISTS disponivel,
              DROP COLUMN IF EXISTS tipo,
              DROP COLUMN IF EXISTS tamanho;
            """,
            reverse_sql="""
            ALTER TABLE core_produto
              ADD COLUMN IF NOT EXISTS disponivel BOOLEAN NOT NULL DEFAULT TRUE,
              ADD COLUMN IF NOT EXISTS tipo VARCHAR(20) NOT NULL DEFAULT 'pizza',
              ADD COLUMN IF NOT EXISTS tamanho VARCHAR(5) NOT NULL DEFAULT '';

            UPDATE core_produto SET disponivel = ativo;

            ALTER TABLE core_produto
              DROP COLUMN IF EXISTS ativo,
              DROP COLUMN IF EXISTS categoria_id;
            """,
        ),
    ]
