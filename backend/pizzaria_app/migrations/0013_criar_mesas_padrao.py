from django.db import migrations


def criar_mesas_iniciais(apps, schema_editor):
    from django.db import connection
    with connection.cursor() as cur:
        cur.execute("SELECT COUNT(*) FROM mesas")
        if cur.fetchone()[0] > 0:
            return

        cur.execute("SELECT num_mesas FROM configuracao WHERE id = 1")
        row = cur.fetchone()
        total = row[0] if row else 10

        cur.execute("""
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'mesas' AND column_name = 'numero_mesa'
        """)
        tem_numero_mesa = cur.fetchone() is not None

        for i in range(1, total + 1):
            if tem_numero_mesa:
                cur.execute(
                    "INSERT INTO mesas (numero_mesa, num, status, capacidade, abertura) "
                    "VALUES (%s, %s, 'Livre', 4, NULL) ON CONFLICT (num) DO NOTHING",
                    [i, i],
                )
            else:
                cur.execute(
                    "INSERT INTO mesas (num, status, capacidade, abertura) "
                    "VALUES (%s, 'livre', 4, NULL) ON CONFLICT (num) DO NOTHING",
                    [i],
                )


class Migration(migrations.Migration):
    dependencies = [
        ('pizzaria_app', '0012_fix_pagamentos_fkey'),
    ]

    operations = [
        migrations.RunPython(criar_mesas_iniciais, migrations.RunPython.noop),
    ]
