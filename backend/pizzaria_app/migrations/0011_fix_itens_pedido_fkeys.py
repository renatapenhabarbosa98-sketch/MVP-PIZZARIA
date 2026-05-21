from django.db import migrations


class Migration(migrations.Migration):
    dependencies = [
        ('pizzaria_app', '0010_dados_iniciais'),
    ]

    operations = [
        migrations.RunSQL(
            sql="""
            -- Remove todas as FK constraints de itens_pedido
            DO $$
            DECLARE
                r RECORD;
            BEGIN
                FOR r IN
                    SELECT conname
                    FROM pg_constraint
                    WHERE conrelid = 'itens_pedido'::regclass
                    AND contype = 'f'
                LOOP
                    EXECUTE 'ALTER TABLE itens_pedido DROP CONSTRAINT IF EXISTS ' || r.conname;
                END LOOP;
            END$$;

            -- Recria apontando para as tabelas corretas
            ALTER TABLE itens_pedido
                ADD CONSTRAINT itens_pedido_pedido_id_fkey
                FOREIGN KEY (pedido_id) REFERENCES pedidos_mesa(id) ON DELETE CASCADE;

            ALTER TABLE itens_pedido
                ADD CONSTRAINT itens_pedido_produto_id_fkey
                FOREIGN KEY (produto_id) REFERENCES cardapio(id);
            """,
            reverse_sql="SELECT 1;",
        ),
    ]
