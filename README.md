# Objetivo da Entrega
Implementação da base tecnológica do projeto: configuração do ambiente de
desenvolvimento, camada de persistência (ORM) e lógica de negócio central com
integração de paradigmas.

**Equipe:**
1. Renata Penha Barbosa – Líder - Banco de Dados Responsável pela liderança geral
do projeto. Atuou no banco de dados com a criação das tabelas, execução das migrações
e ajustes/alterações necessárias ao longo do desenvolvimento.
2. Kelry Silva De Sousa –  Backend Responsável pelo desenvolvimento
completo do backend da aplicação, incluindo rotas, views, lógica de negócio e
integração com o banco de dados.
3. Erika Vitória Da Cruz Silva – Frontend Responsável pelo desenvolvimento da
interface do usuário, incluindo layout, estilização e experiência visual da aplicação.
4. Victorya Lima Souza – Banco de Dados Atuou na estruturação do banco de dados,
com a criação do banco e das tabelas utilizadas pelo sistema.
5. Pedro Rusvel Pinheiro Siqueira De Carvalho – Requisitos Vice-líder | Revisão de Código
Responsável pelo levantamento de requisitos do sistema e pela revisão e verificação dos
códigos produzidos pela equipe.

---

## Estrutura do Projeto

```
MVP-PIZZARIA-main/
├── backend/
│   ├── pizzaria_app/
│   │   ├── models.py        ← Modelos ORM (Mesa, Pedido, Cliente, Produto...)
│   │   ├── views.py         ← Endpoints da API REST
│   │   ├── urls.py          ← Rotas
│   │   └── migrations/      ← Migrações do banco
│   ├── manage.py
│   ├── settings.py
│   ├── requirements.txt
│   └── .env                 ← Credenciais do banco (não versionado)
└── frontend/
    ├── src/
    │   ├── app.ts           ← Lógica da aplicação (TypeScript)
    │   ├── types.ts         ← Interfaces e tipos
    │   └── style.css        ← Estilização
    ├── dist/                ← JavaScript compilado
    └── index.html           ← Página principal
```

---



### Tecnologias 
- Python 3.10+
- PostgreSQL
- Node.js (para compilar o TypeScript)

### 1. Configuração do Banco de dados 

Edite `backend/.env` com suas credenciais:

```
DB_NAME=projeto
DB_USER=postgres
DB_PASSWORD=****
DB_HOST=localhost
DB_PORT=5432
```

### 2.Dependências instaladas 

```bash
cd backend
python -m venv venv
venv\Scripts\activate        # Windows
pip install -r requirements.txt
python manage.py runserver
```

---

## Stack Tecnológica

| Camada         | Tecnologia 
| Backend        | Python + Django 
| Banco de Dados | PostgreSQL 18 
| ORM            | Django ORM 
| Frontend       | TypeScript + HTML + CSS 
| Servidor       | Django Dev Server 

---

## Requisitos Funcionais

| RF   | Descrição |
| RF01 | Gestão de Cardápio (pizzas e bebidas) |
| RF02 | Cadastro de Clientes com reserva de mesa e evento |
| RF03 | Controle de Mesas (livre, ocupada, reservada) |
| RF04 | Abertura de Pedidos (salão e delivery) |
| RF05 | Acompanhamento de Status do Pedido (KDS) |
| RF06 | Fechamento de Conta com seleção de método de pagamento |
| RF07 | Exportação do caixa do dia em Excel (.xls) |

---

## Paradigmas Implementados

**Orientado a Objetos:** herança, polimorfismo e encapsulamento nos modelos Django (`Produto`, `Pedido`, `Mesa`, `Cliente`, `Pagamento`).

**Imperativo / Estruturado:** controle de fluxo nas views (`if/else`, `for`) e na lógica do frontend TypeScript.

## Atualizações 
- Framework backend migrado de FastAPI para Django
- Banco de dados de produção migrado de MySQL para PostgreSQL
- Módulo de delivery removido do escopo
- Adicionado frontend com JavaScript 
- Exportação do caixa do dia em Excel (.xls)
- Incremeto de tela cliente para a Reversa do local.
- Pagina de login 

## Login
- usuario: admin
- senha: admin123