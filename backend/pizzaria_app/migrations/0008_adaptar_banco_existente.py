from django.db import migrations


class Migration(migrations.Migration):
    """
    Adapta o banco 'PROJETO' (existente no pgAdmin) para funcionar com o Django.
    Usa ADD COLUMN IF NOT EXISTS para preservar dados já existentes.
    Renomeia colunas antigas apenas quando necessário.
    """

    dependencies = [
        ('auth', '0012_alter_user_first_name_max_length'),
        ('pizzaria_app', '0007_perfil_usuario'),
    ]

    operations = [
        migrations.RunSQL(
            sql="""
            -- ── cardapio ─────────────────────────────────────────────────────
            -- Tabela já existe; garante colunas que o Django precisa
            ALTER TABLE cardapio
              ADD COLUMN IF NOT EXISTS descricao   TEXT             NOT NULL DEFAULT '',
              ADD COLUMN IF NOT EXISTS categoria_id INTEGER,
              ADD COLUMN IF NOT EXISTS ativo        BOOLEAN         NOT NULL DEFAULT TRUE;

            -- ── mesas ────────────────────────────────────────────────────────
            ALTER TABLE mesas
              ADD COLUMN IF NOT EXISTS num         INTEGER,
              ADD COLUMN IF NOT EXISTS capacidade  INTEGER         NOT NULL DEFAULT 4,
              ADD COLUMN IF NOT EXISTS status      VARCHAR(20)     NOT NULL DEFAULT 'livre',
              ADD COLUMN IF NOT EXISTS abertura    BIGINT;

            -- Unique em mesas.num (se ainda não existir)
            DO $$
            BEGIN
              IF NOT EXISTS (
                SELECT 1 FROM pg_constraint
                WHERE conname = 'mesas_num_key'
              ) THEN
                ALTER TABLE mesas ADD CONSTRAINT mesas_num_key UNIQUE (num);
              END IF;
            END$$;

            -- ── clientes ─────────────────────────────────────────────────────
            ALTER TABLE clientes
              ADD COLUMN IF NOT EXISTS telefone VARCHAR(20) NOT NULL DEFAULT '',
              ADD COLUMN IF NOT EXISTS endereco TEXT        NOT NULL DEFAULT '';

            -- ── pedidos_mesa ─────────────────────────────────────────────────
            -- Aumenta status_pedido para 30 chars (ex: "Saiu para entrega")
            ALTER TABLE pedidos_mesa
              ALTER COLUMN status_pedido TYPE VARCHAR(30);

            ALTER TABLE pedidos_mesa
              ADD COLUMN IF NOT EXISTS tipo         VARCHAR(20)  NOT NULL DEFAULT 'salao',
              ADD COLUMN IF NOT EXISTS mesa_num     INTEGER,
              ADD COLUMN IF NOT EXISTS cliente_id   INTEGER      REFERENCES clientes(id) ON DELETE SET NULL,
              ADD COLUMN IF NOT EXISTS cliente_nome VARCHAR(120) NOT NULL DEFAULT '',
              ADD COLUMN IF NOT EXISTS criado_em    BIGINT       NOT NULL DEFAULT 0;

            -- ── itens_pedido ─────────────────────────────────────────────────
            CREATE TABLE IF NOT EXISTS itens_pedido (
                id             SERIAL PRIMARY KEY,
                pedido_id      INTEGER        NOT NULL REFERENCES pedidos_mesa(id) ON DELETE CASCADE,
                produto_id     INTEGER        NOT NULL REFERENCES cardapio(id),
                quantidade     INTEGER        NOT NULL DEFAULT 1,
                preco_unitario DECIMAL(10,2)  NOT NULL,
                observacao     VARCHAR(200)   NOT NULL DEFAULT ''
            );

            -- ── pagamentos ───────────────────────────────────────────────────
            ALTER TABLE pagamentos
              ADD COLUMN IF NOT EXISTS pedido_id  INTEGER       REFERENCES pedidos_mesa(id) ON DELETE CASCADE,
              ADD COLUMN IF NOT EXISTS forma      VARCHAR(30)   NOT NULL DEFAULT '',
              ADD COLUMN IF NOT EXISTS valor      DECIMAL(10,2) NOT NULL DEFAULT 0,
              ADD COLUMN IF NOT EXISTS data       BIGINT        NOT NULL DEFAULT 0,
              ADD COLUMN IF NOT EXISTS descricao  VARCHAR(200)  NOT NULL DEFAULT '';

            -- Unique em pagamentos.pedido_id (tabela OneToOne com pedido)
            DO $$
            BEGIN
              IF NOT EXISTS (
                SELECT 1 FROM pg_constraint
                WHERE conname = 'pagamentos_pedido_id_key'
              ) THEN
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

            -- ── usuarios ────────────────────────────────────────────────
            CREATE TABLE IF NOT EXISTS usuarios (
                id                SERIAL PRIMARY KEY,
                usuario_id        INTEGER     NOT NULL UNIQUE REFERENCES auth_user(id) ON DELETE CASCADE,
                papel             VARCHAR(20) NOT NULL DEFAULT 'garcom',
                deve_trocar_senha BOOLEAN     NOT NULL DEFAULT TRUE,
                token             VARCHAR(64) NOT NULL DEFAULT ''
            );
            """,
            reverse_sql="""
            -- Reverte apenas as colunas adicionadas; nunca destrói dados originais
            ALTER TABLE cardapio    DROP COLUMN IF EXISTS descricao, DROP COLUMN IF EXISTS categoria_id, DROP COLUMN IF EXISTS ativo;
            ALTER TABLE mesas       DROP COLUMN IF EXISTS num, DROP COLUMN IF EXISTS capacidade, DROP COLUMN IF EXISTS status, DROP COLUMN IF EXISTS abertura;
            ALTER TABLE clientes    DROP COLUMN IF EXISTS telefone, DROP COLUMN IF EXISTS endereco;
            ALTER TABLE pedidos_mesa DROP COLUMN IF EXISTS tipo, DROP COLUMN IF EXISTS mesa_num, DROP COLUMN IF EXISTS cliente_id, DROP COLUMN IF EXISTS cliente_nome, DROP COLUMN IF EXISTS criado_em;
            DROP TABLE IF EXISTS itens_pedido  CASCADE;
            DROP TABLE IF EXISTS configuracao  CASCADE;
            DROP TABLE IF EXISTS usuarios CASCADE;
            """,
        ),
    ]
