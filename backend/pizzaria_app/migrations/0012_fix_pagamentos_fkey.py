from django.db import migrations


class Migration(migrations.Migration):
    dependencies = [
        ('pizzaria_app', '0011_fix_itens_pedido_fkeys'),
    ]

    operations = [
        migrations.RunSQL(
            sql="""
            -- Remove todas as FK constraints de pagamentos que referenciam pedidos antigos
            DO $$
            DECLARE
                r RECORD;
            BEGIN
                FOR r IN
                    SELECT conname
                    FROM pg_constraint
                    WHERE conrelid = 'pagamentos'::regclass
                    AND contype = 'f'
                LOOP
                    EXECUTE 'ALTER TABLE pagamentos DROP CONSTRAINT IF EXISTS ' || r.conname;
                END LOOP;
            END$$;

            -- Recria FK apontando para pedidos_mesa
            ALTER TABLE pagamentos
                ADD CONSTRAINT pagamentos_pedido_id_fkey
                FOREIGN KEY (pedido_id) REFERENCES pedidos_mesa(id) ON DELETE CASCADE;
            """,
            reverse_sql="SELECT 1;",
        ),
    ]
