from django.db import migrations


class Migration(migrations.Migration):
    dependencies = [
        ('pizzaria_app', '0003_fix_tabelas'),
    ]

    operations = [
        migrations.RunSQL(
            sql="""
            ALTER TABLE configuracao
              ALTER COLUMN logo TYPE TEXT,
              ADD COLUMN IF NOT EXISTS tema VARCHAR(10) NOT NULL DEFAULT 'light',
              ADD COLUMN IF NOT EXISTS fonte_tamanho INTEGER NOT NULL DEFAULT 14;
            """,
            reverse_sql="""
            ALTER TABLE configuracao
              DROP COLUMN IF EXISTS tema,
              DROP COLUMN IF EXISTS fonte_tamanho,
              ALTER COLUMN logo TYPE VARCHAR(200);
            """,
        ),
    ]
