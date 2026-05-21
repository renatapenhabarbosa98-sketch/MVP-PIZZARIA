from django.db import migrations


class Migration(migrations.Migration):
    dependencies = [
        ('auth', '0012_alter_user_first_name_max_length'),
        ('pizzaria_app', '0006_fix_produto_model'),
    ]

    operations = [
        migrations.RunSQL(
            sql="""
            CREATE TABLE IF NOT EXISTS usuarios (
                id          SERIAL PRIMARY KEY,
                usuario_id  INTEGER NOT NULL UNIQUE REFERENCES auth_user(id) ON DELETE CASCADE,
                papel       VARCHAR(20) NOT NULL DEFAULT 'garcom',
                deve_trocar_senha BOOLEAN NOT NULL DEFAULT TRUE,
                token       VARCHAR(64) NOT NULL DEFAULT ''
            );
            """,
            reverse_sql="DROP TABLE IF EXISTS usuarios CASCADE;",
        ),
    ]
