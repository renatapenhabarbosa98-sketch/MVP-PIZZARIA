from django.db import migrations


class Migration(migrations.Migration):
    dependencies = [
        ('auth', '0012_alter_user_first_name_max_length'),
        ('pizzaria_app', '0007_perfil_usuario'),
    ]

    operations = [
        migrations.RunSQL(
            sql="""
            -- ── cardapio ─────────────────────────────────────────────────────
            CREATE TABLE IF NOT EXISTS cardapio (
                id           SERIAL PRIMARY KEY,
                nome         VARCHAR(100)  NOT NULL DEFAULT '',
                descricao    TEXT          NOT NULL DEFAULT '',
                preco        DECIMAL(10,2) NOT NULL DEFAULT 0,
                categoria    VARCHAR(100)  NOT NULL DEFAULT '',
                categoria_id INTEGER,
                ativo        BOOLEAN       NOT NULL DEFAULT TRUE
            );
            ALTER TABLE cardapio
              ADD COLUMN IF NOT EXISTS descricao    TEXT          NOT NULL DEFAULT '',
              ADD COLUMN IF NOT EXISTS categoria    VARCHAR(100)  NOT NULL DEFAULT '',
              ADD COLUMN IF NOT EXISTS categoria_id INTEGER,
              ADD COLUMN IF NOT EXISTS ativo        BOOLEAN       NOT NULL DEFAULT TRUE;

            -- ── mesas ────────────────────────────────────────────────────────
            ALTER TABLE mesas
              ADD COLUMN IF NOT EXISTS num        INTEGER,
              ADD COLUMN IF NOT EXISTS capacidade INTEGER  NOT NULL DEFAULT 4,
              ADD COLUMN IF NOT EXISTS status     VARCHAR(20) NOT NULL DEFAULT 'livre',
              ADD COLUMN IF NOT EXISTS abertura   BIGINT;

            DO $$
            BEGIN
              IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'mesas_num_key') THEN
                ALTER TABLE mesas ADD CONSTRAINT mesas_num_key UNIQUE (num);
              END IF;
            END$$;

            -- ── clientes ─────────────────────────────────────────────────────
            ALTER TABLE clientes
              ADD COLUMN IF NOT EXISTS telefone     VARCHAR(20) NOT NULL DEFAULT '',
              ADD COLUMN IF NOT EXISTS endereco     TEXT        NOT NULL DEFAULT '',
              ADD COLUMN IF NOT EXISTS mesa_reserva INTEGER,
              ADD COLUMN IF NOT EXISTS data_evento  VARCHAR(30);

            -- ── pedidos_mesa ─────────────────────────────────────────────────
            CREATE TABLE IF NOT EXISTS pedidos_mesa (
                id            SERIAL PRIMARY KEY,
                tipo          VARCHAR(20)   NOT NULL DEFAULT 'salao',
                mesa_id       INTEGER       REFERENCES mesas(id) ON DELETE SET NULL,
                mesa_num      INTEGER,
                cliente_id    INTEGER       REFERENCES clientes(id) ON DELETE SET NULL,
                cliente_nome  VARCHAR(120)  NOT NULL DEFAULT '',
                total_consumo DECIMAL(10,2) NOT NULL DEFAULT 0,
                status_pedido VARCHAR(30)   NOT NULL DEFAULT 'Em preparo',
                criado_em     BIGINT        NOT NULL DEFAULT 0
            );
            ALTER TABLE pedidos_mesa
              ADD COLUMN IF NOT EXISTS tipo         VARCHAR(20)  NOT NULL DEFAULT 'salao',
              ADD COLUMN IF NOT EXISTS mesa_num     INTEGER,
              ADD COLUMN IF NOT EXISTS cliente_nome VARCHAR(120) NOT NULL DEFAULT '',
              ADD COLUMN IF NOT EXISTS criado_em    BIGINT       NOT NULL DEFAULT 0;
            ALTER TABLE pedidos_mesa
              ADD COLUMN IF NOT EXISTS cliente_id INTEGER REFERENCES clientes(id) ON DELETE SET NULL;

            -- ── itens_pedido ─────────────────────────────────────────────────
            CREATE TABLE IF NOT EXISTS itens_pedido (
                id             SERIAL PRIMARY KEY,
                pedido_id      INTEGER       NOT NULL REFERENCES pedidos_mesa(id) ON DELETE CASCADE,
                produto_id     INTEGER       NOT NULL REFERENCES cardapio(id),
                quantidade     INTEGER       NOT NULL DEFAULT 1,
                preco_unitario DECIMAL(10,2) NOT NULL,
                observacao     VARCHAR(200)  NOT NULL DEFAULT ''
            );

            -- ── pagamentos ───────────────────────────────────────────────────
            CREATE TABLE IF NOT EXISTS pagamentos (
                id          SERIAL PRIMARY KEY,
                pedido_id   INTEGER       UNIQUE REFERENCES pedidos_mesa(id) ON DELETE CASCADE,
                valor_total DECIMAL(10,2) NOT NULL DEFAULT 0,
                forma       VARCHAR(30)   NOT NULL DEFAULT '',
                valor       DECIMAL(10,2) NOT NULL DEFAULT 0,
                data        BIGINT        NOT NULL DEFAULT 0,
                descricao   VARCHAR(200)  NOT NULL DEFAULT ''
            );
            ALTER TABLE pagamentos
              ADD COLUMN IF NOT EXISTS valor_total DECIMAL(10,2) NOT NULL DEFAULT 0,
              ADD COLUMN IF NOT EXISTS forma       VARCHAR(30)   NOT NULL DEFAULT '',
              ADD COLUMN IF NOT EXISTS valor       DECIMAL(10,2) NOT NULL DEFAULT 0,
              ADD COLUMN IF NOT EXISTS data        BIGINT        NOT NULL DEFAULT 0,
              ADD COLUMN IF NOT EXISTS descricao   VARCHAR(200)  NOT NULL DEFAULT '';
            ALTER TABLE pagamentos
              ADD COLUMN IF NOT EXISTS pedido_id INTEGER REFERENCES pedidos_mesa(id) ON DELETE CASCADE;

            DO $$
            BEGIN
              IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'pagamentos_pedido_id_key') THEN
                ALTER TABLE pagamentos ADD CONSTRAINT pagamentos_pedido_id_key UNIQUE (pedido_id);
              END IF;
            END$$;

            -- ── configuracao ─────────────────────────────────────────────────
            CREATE TABLE IF NOT EXISTS configuracao (
                id            SERIAL PRIMARY KEY,
                nome          VARCHAR(100) NOT NULL DEFAULT 'Pizzaria MVP',
                logo          TEXT         NOT NULL DEFAULT '',
                cor           VARCHAR(10)  NOT NULL DEFAULT '#BF3010',
                num_mesas     INTEGER      NOT NULL DEFAULT 10,
                tema          VARCHAR(10)  NOT NULL DEFAULT 'light',
                fonte_tamanho INTEGER      NOT NULL DEFAULT 14,
                atualizado_em BIGINT       NOT NULL DEFAULT 0
            );
            ALTER TABLE configuracao
              ADD COLUMN IF NOT EXISTS tema          VARCHAR(10) NOT NULL DEFAULT 'light',
              ADD COLUMN IF NOT EXISTS fonte_tamanho INTEGER     NOT NULL DEFAULT 14,
              ADD COLUMN IF NOT EXISTS atualizado_em BIGINT      NOT NULL DEFAULT 0;

            -- ── usuarios ─────────────────────────────────────────────────────
            CREATE TABLE IF NOT EXISTS usuarios (
                id                SERIAL PRIMARY KEY,
                usuario_id        INTEGER     NOT NULL UNIQUE REFERENCES auth_user(id) ON DELETE CASCADE,
                papel             VARCHAR(20) NOT NULL DEFAULT 'garcom',
                deve_trocar_senha BOOLEAN     NOT NULL DEFAULT TRUE,
                token             VARCHAR(64) NOT NULL DEFAULT ''
            );
            """,
            reverse_sql="""
            DROP TABLE IF EXISTS usuarios      CASCADE;
            DROP TABLE IF EXISTS itens_pedido  CASCADE;
            DROP TABLE IF EXISTS pagamentos    CASCADE;
            DROP TABLE IF EXISTS pedidos_mesa  CASCADE;
            DROP TABLE IF EXISTS configuracao  CASCADE;
            DROP TABLE IF EXISTS cardapio      CASCADE;
            """,
        ),
    ]
