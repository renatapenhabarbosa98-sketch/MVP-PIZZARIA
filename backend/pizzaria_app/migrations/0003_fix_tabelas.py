from django.db import migrations


class Migration(migrations.Migration):
    dependencies = [
        ('pizzaria_app', '0002_novos_models'),
    ]

    operations = [
        migrations.RunSQL(
            sql="""
            ALTER TABLE IF EXISTS produtos RENAME TO core_produto;

            DROP TABLE IF EXISTS itens_pedido CASCADE;
            DROP TABLE IF EXISTS pagamentos CASCADE;
            DROP TABLE IF EXISTS pedidos CASCADE;
            DROP TABLE IF EXISTS clientes CASCADE;

            CREATE TABLE clientes (
                id SERIAL PRIMARY KEY,
                nome VARCHAR(120) NOT NULL,
                telefone VARCHAR(20) NOT NULL DEFAULT '',
                endereco TEXT NOT NULL DEFAULT ''
            );

            CREATE TABLE pedidos (
                id SERIAL PRIMARY KEY,
                tipo VARCHAR(20) NOT NULL DEFAULT 'salao',
                mesa_id INTEGER REFERENCES mesas(id) ON DELETE SET NULL,
                mesa_num INTEGER,
                cliente_id INTEGER REFERENCES clientes(id) ON DELETE SET NULL,
                cliente_nome VARCHAR(120) NOT NULL DEFAULT '',
                total DECIMAL(10,2) NOT NULL DEFAULT 0,
                status VARCHAR(30) NOT NULL DEFAULT 'Em preparo',
                criado_em BIGINT NOT NULL DEFAULT 0
            );

            CREATE TABLE itens_pedido (
                id SERIAL PRIMARY KEY,
                pedido_id INTEGER NOT NULL REFERENCES pedidos(id) ON DELETE CASCADE,
                produto_id INTEGER NOT NULL REFERENCES core_produto(id),
                quantidade INTEGER NOT NULL DEFAULT 1,
                preco_unitario DECIMAL(10,2) NOT NULL,
                observacao VARCHAR(200) NOT NULL DEFAULT ''
            );

            CREATE TABLE pagamentos (
                id SERIAL PRIMARY KEY,
                pedido_id INTEGER NOT NULL UNIQUE REFERENCES pedidos(id) ON DELETE CASCADE,
                forma VARCHAR(30) NOT NULL DEFAULT '',
                valor DECIMAL(10,2) NOT NULL DEFAULT 0,
                data BIGINT NOT NULL DEFAULT 0,
                descricao VARCHAR(200) NOT NULL DEFAULT ''
            );
            """,
            reverse_sql="""
            DROP TABLE IF EXISTS pagamentos CASCADE;
            DROP TABLE IF EXISTS itens_pedido CASCADE;
            DROP TABLE IF EXISTS pedidos CASCADE;
            DROP TABLE IF EXISTS clientes CASCADE;
            """
        ),
    ]
