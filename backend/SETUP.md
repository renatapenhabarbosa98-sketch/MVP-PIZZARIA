# Como configurar e rodar o projeto

## 0. Criar o ambiente virtual Python

Execute **dentro da pasta `backend/`**:

```bash
python -m venv venv

# Windows
venv\Scripts\activate

# Linux / Mac
source venv/bin/activate

pip install -r requirements.txt
```

---

## 1. Configurar credenciais

Edite o arquivo `backend/.env` com sua senha do PostgreSQL:

```
DB_NAME=PROJETO
DB_USER=postgres
DB_PASSWORD=7003
DB_HOST=localhost
DB_PORT=5432
```

## 2. Rodar as migrations

Execute **dentro da pasta `backend/`**:

```bash
# Passo 1 — cria as tabelas internas do Django (auth, sessões, admin)
python manage.py migrate auth
python manage.py migrate contenttypes
python manage.py migrate sessions
python manage.py migrate admin

# Passo 2 — marca as migrations 0001-0007 como já aplicadas
#           (o banco PROJETO já tem as tabelas base)
python manage.py migrate pizzaria_app 0007 --fake

# Passo 3 — roda a migration de adaptação (adiciona colunas que faltam)
python manage.py migrate pizzaria_app 0008
```

## 3. Criar o primeiro administrador

```bash
python manage.py createsuperuser
```

Digite usuário, e-mail (opcional) e senha.  
Esse usuário será criado com papel **admin** e poderá criar outros usuários pelo sistema.

## 4. Iniciar o servidor

```bash
python manage.py runserver
```

Acesse: http://127.0.0.1:8000/pizzaria/

---

## Tabelas do banco × modelos Django

| Tabela no banco | Modelo Django    | Observação                              |
|----------------|------------------|-----------------------------------------|
| `cardapio`     | `Produto`        | Renomeado de `core_produto`             |
| `clientes`     | `Cliente`        | Já existia — colunas adicionadas        |
| `mesas`        | `Mesa`           | Já existia — colunas adicionadas        |
| `pedidos_mesa` | `Pedido`         | Renomeado de `pedidos`; `total_consumo` e `status_pedido` mapeados |
| `itens_pedido` | `ItemPedido`     | Criada pela migration 0008              |
| `pagamentos`   | `Pagamento`      | Já existia — colunas adicionadas        |
| `configuracao` | `Configuracao`   | Criada pela migration 0008              |
| `perfis_usuario`| `PerfilUsuario` | Criada pela migration 0008              |
