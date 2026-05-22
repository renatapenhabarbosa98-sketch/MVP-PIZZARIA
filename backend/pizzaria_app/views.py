import json
import secrets

from django.conf import settings
from django.contrib.auth import authenticate
from django.contrib.auth.models import User
from django.http import HttpRequest, HttpResponse, JsonResponse
from django.shortcuts import get_object_or_404, render
from django.views.decorators.csrf import csrf_exempt
from django.views.static import serve as static_serve

from .models import Cliente, Configuracao, ItemPedido, Mesa, Pagamento, Pedido, PerfilUsuario, Produto


def _get_perfil(request: HttpRequest):
    token = request.headers.get('X-Auth-Token', '')
    if not token:
        return None
    try:
        return PerfilUsuario.objects.select_related('usuario').get(token=token)
    except PerfilUsuario.DoesNotExist:
        return None


def _apenas_admin(perfil) -> bool:
    return perfil is not None and perfil.papel == 'admin'


def add_cors(response: HttpResponse):
    response["Access-Control-Allow-Origin"] = "*"
    response["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS"
    response["Access-Control-Allow-Headers"] = "Content-Type, X-Auth-Token"
    return response


def pizzaria_view(request: HttpRequest):
    return render(request, "index.html")


def serve_frontend(request: HttpRequest, path: str) -> HttpResponse:
    return static_serve(request, path, document_root=settings.FRONTEND_DIR)


@csrf_exempt
def api_cardapio(request: HttpRequest):
    if request.method == 'OPTIONS':
        return add_cors(HttpResponse(status=204))
    if request.method == 'GET':
        return add_cors(JsonResponse([i.to_dict() for i in Produto.objects.all()], safe=False))
    if request.method == 'POST':
        perfil = _get_perfil(request)
        if not _apenas_admin(perfil):
            return add_cors(JsonResponse({'erro': 'Sem permissão'}, status=403))
        d = json.loads(request.body)
        tipo = d.get('tipo', 'pizza')
        item = Produto.objects.create(
            nome=d['nome'],
            descricao=d.get('descricao', ''),
            preco=d['preco'],
            categoria_id=1 if tipo == 'pizza' else 2,
            ativo=d.get('ativo', True),
            tamanho=d.get('tam', d.get('tamanho', '')),
        )
        return add_cors(JsonResponse(item.to_dict(), status=201))
    return add_cors(JsonResponse({'erro': 'Método não permitido'}, status=405))


@csrf_exempt
def api_cardapio_detail(request: HttpRequest, pk: int):
    if request.method == 'OPTIONS':
        return add_cors(HttpResponse(status=204))
    item = get_object_or_404(Produto, pk=pk)
    if request.method in ('PUT', 'DELETE'):
        perfil = _get_perfil(request)
        if not _apenas_admin(perfil):
            return add_cors(JsonResponse({'erro': 'Sem permissão'}, status=403))
    if request.method == 'PUT':
        d = json.loads(request.body)
        item.nome = d.get('nome', item.nome)
        if 'tipo' in d:
            item.categoria_id = 1 if d.get('tipo') == 'pizza' else 2
        item.descricao = d.get('descricao', item.descricao)
        item.preco = d.get('preco', item.preco)
        item.ativo = d.get('ativo', item.ativo)
        item.tamanho = d.get('tam', d.get('tamanho', item.tamanho))
        item.save()
        return add_cors(JsonResponse(item.to_dict()))
    if request.method == 'DELETE':
        item.delete()
        return add_cors(JsonResponse({'ok': True}))
    return add_cors(JsonResponse({'erro': 'Método não permitido'}, status=405))


@csrf_exempt
def api_mesas(request: HttpRequest):
    if request.method == 'OPTIONS':
        return add_cors(HttpResponse(status=204))
    if request.method == 'GET':
        return add_cors(JsonResponse([m.to_dict() for m in Mesa.objects.all()], safe=False))
    if request.method == 'POST':
        d = json.loads(request.body)
        total = d.get('total', 10)
        from django.db import connection as _conn
        with _conn.cursor() as cur:
            cur.execute("DELETE FROM mesas")
            for i in range(1, total + 1):
                cur.execute(
                    "INSERT INTO mesas (numero_mesa, num, status, capacidade, abertura) VALUES (%s, %s, 'Livre', 4, NULL)",
                    [i, i]
                )
        return add_cors(JsonResponse([m.to_dict() for m in Mesa.objects.all()], safe=False))
    return add_cors(JsonResponse({'erro': 'Método não permitido'}, status=405))


@csrf_exempt
def api_mesa_detail(request: HttpRequest, pk: int):
    if request.method == 'OPTIONS':
        return add_cors(HttpResponse(status=204))
    mesa = get_object_or_404(Mesa, pk=pk)
    if request.method == 'PUT':
        d = json.loads(request.body)
        mesa.status = d.get('status', mesa.status).capitalize()
        mesa.abertura = d.get('abertura', mesa.abertura)
        mesa.save()
        return add_cors(JsonResponse(mesa.to_dict()))
    return add_cors(JsonResponse({'erro': 'Método não permitido'}, status=405))


@csrf_exempt
def api_clientes(request: HttpRequest):
    if request.method == 'OPTIONS':
        return add_cors(HttpResponse(status=204))
    if request.method == 'GET':
        return add_cors(JsonResponse([c.to_dict() for c in Cliente.objects.all()], safe=False))
    if request.method == 'POST':
        d = json.loads(request.body)
        c = Cliente.objects.create(
            nome=d['nome'],
            telefone=d.get('telefone', d.get('tel', '')),
            endereco=d.get('endereco', d.get('end', '')),
            mesa_reserva=d.get('mesaReserva') or None,
            data_evento=d.get('dataEvento') or None,
        )
        return add_cors(JsonResponse(c.to_dict(), status=201))
    return add_cors(JsonResponse({'erro': 'Método não permitido'}, status=405))


@csrf_exempt
def api_cliente_detail(request: HttpRequest, pk: int):
    if request.method == 'OPTIONS':
        return add_cors(HttpResponse(status=204))
    c = get_object_or_404(Cliente, pk=pk)
    if request.method == 'PUT':
        d = json.loads(request.body)
        c.nome = d.get('nome', c.nome)
        c.telefone = d.get('telefone', d.get('tel', c.telefone))
        c.endereco = d.get('endereco', d.get('end', c.endereco))
        c.mesa_reserva = d.get('mesaReserva') or None
        c.data_evento = d.get('dataEvento') or None
        c.save()
        return add_cors(JsonResponse(c.to_dict()))
    if request.method == 'DELETE':
        c.delete()
        return add_cors(JsonResponse({'ok': True}))
    return add_cors(JsonResponse({'erro': 'Método não permitido'}, status=405))


@csrf_exempt
def api_pedidos(request: HttpRequest):
    if request.method == 'OPTIONS':
        return add_cors(HttpResponse(status=204))
    if request.method == 'GET':
        qs = Pedido.objects.prefetch_related('itens__produto').all()
        return add_cors(JsonResponse([p.to_dict() for p in qs], safe=False))
    if request.method == 'POST':
        d = json.loads(request.body)
        mesa_id_raw = d.get('mesaId')
        mesa_id = mesa_id_raw if mesa_id_raw and Mesa.objects.filter(pk=mesa_id_raw).exists() else None
        cliente_id_raw = d.get('clienteId', d.get('cliId'))
        cliente_id = cliente_id_raw if cliente_id_raw and Cliente.objects.filter(pk=cliente_id_raw).exists() else None
        ped = Pedido.objects.create(
            tipo=d.get('tipo', 'salao'),
            mesa_id=mesa_id,
            mesa_num=d.get('mesaNum'),
            cliente_id=cliente_id,
            cliente_nome=d.get('clienteNome', d.get('cliNome', '')),
            total=d.get('total', 0),
            status=d.get('status', 'Em preparo'),
            criado_em=d.get('criadoEm', 0),
        )
        for item in d.get('items', []):
            prod = get_object_or_404(Produto, pk=item['id'])
            ItemPedido.objects.create(
                pedido=ped,
                produto=prod,
                quantidade=item.get('qtd', 1),
                preco_unitario=item.get('preco', prod.preco),
                observacao=item.get('obs', ''),
            )
        return add_cors(JsonResponse(ped.to_dict(), status=201))
    return add_cors(JsonResponse({'erro': 'Método não permitido'}, status=405))


@csrf_exempt
def api_pedido_detail(request: HttpRequest, pk: int):
    if request.method == 'OPTIONS':
        return add_cors(HttpResponse(status=204))
    ped = get_object_or_404(Pedido.objects.prefetch_related('itens__produto'), pk=pk)
    if request.method == 'PUT':
        d = json.loads(request.body)
        ped.status = d.get('status', ped.status)
        ped.save()
        return add_cors(JsonResponse(ped.to_dict()))
    return add_cors(JsonResponse({'erro': 'Método não permitido'}, status=405))


@csrf_exempt
def api_pagamentos(request: HttpRequest):
    if request.method == 'OPTIONS':
        return add_cors(HttpResponse(status=204))
    if request.method == 'GET':
        return add_cors(JsonResponse([p.to_dict() for p in Pagamento.objects.all()], safe=False))
    if request.method == 'POST':
        d = json.loads(request.body)
        ped = get_object_or_404(Pedido, pk=d.get('pedidoId', d.get('pedId')))
        valor = d.get('valor', 0)
        pag, created = Pagamento.objects.get_or_create(
            pedido=ped,
            defaults={
                'valor_total': valor,
                'forma': d.get('forma', ''),
                'valor': valor,
                'data': d.get('data', 0),
                'descricao': d.get('desc', ''),
            }
        )
        if not created:
            pag.forma = d.get('forma', pag.forma)
            pag.save()
        return add_cors(JsonResponse(pag.to_dict(), status=201))
    return add_cors(JsonResponse({'erro': 'Método não permitido'}, status=405))


@csrf_exempt
def api_config(request: HttpRequest):
    if request.method == 'OPTIONS':
        return add_cors(HttpResponse(status=204))
    cfg, _ = Configuracao.objects.get_or_create(pk=1)
    if request.method == 'GET':
        return add_cors(JsonResponse(cfg.to_dict()))
    if request.method == 'PUT':
        d = json.loads(request.body)
        cfg.nome = d.get('nome', cfg.nome)
        cfg.logo = d.get('logo', cfg.logo)
        cfg.cor = d.get('cor', cfg.cor)
        cfg.num_mesas = d.get('mesas', cfg.num_mesas)
        cfg.tema = d.get('tema', cfg.tema)
        cfg.fonte_tamanho = d.get('fonteTamanho', cfg.fonte_tamanho)
        cfg.atualizado_em = d.get('atualizadoEm', cfg.atualizado_em)
        cfg.save()
        return add_cors(JsonResponse(cfg.to_dict()))
    return add_cors(JsonResponse({'erro': 'Método não permitido'}, status=405))


@csrf_exempt
def api_login(request: HttpRequest):
    if request.method == 'OPTIONS':
        return add_cors(HttpResponse(status=204))
    if request.method == 'POST':
        d = json.loads(request.body)
        senha = d.get('password', '') or d.get('senha', '')
        user = authenticate(username=d.get('username', ''), password=senha)
        if not user or not user.is_active:
            return add_cors(JsonResponse({'erro': 'Usuário ou senha incorretos'}, status=401))
        perfil, _ = PerfilUsuario.objects.get_or_create(
            usuario=user,
            defaults={
                'papel': 'admin' if user.is_superuser else 'garcom',
                'deve_trocar_senha': not user.is_superuser,
            },
        )
        perfil.token = secrets.token_hex(32)
        perfil.save()
        return add_cors(JsonResponse({'token': perfil.token, 'usuario': perfil.to_dict()}))
    return add_cors(JsonResponse({'erro': 'Método não permitido'}, status=405))


@csrf_exempt
def api_logout(request: HttpRequest):
    if request.method == 'OPTIONS':
        return add_cors(HttpResponse(status=204))
    perfil = _get_perfil(request)
    if perfil:
        perfil.token = ''
        perfil.save()
    return add_cors(JsonResponse({'ok': True}))


@csrf_exempt
def api_me(request: HttpRequest):
    if request.method == 'OPTIONS':
        return add_cors(HttpResponse(status=204))
    perfil = _get_perfil(request)
    if not perfil:
        return add_cors(JsonResponse({'erro': 'Não autenticado'}, status=401))
    return add_cors(JsonResponse(perfil.to_dict()))


@csrf_exempt
def api_trocar_senha(request: HttpRequest):
    if request.method == 'OPTIONS':
        return add_cors(HttpResponse(status=204))
    if request.method == 'POST':
        perfil = _get_perfil(request)
        if not perfil:
            return add_cors(JsonResponse({'erro': 'Não autenticado'}, status=401))
        d = json.loads(request.body)
        if not perfil.usuario.check_password(d.get('senhaAtual', '')):
            return add_cors(JsonResponse({'erro': 'Senha atual incorreta'}, status=400))
        nova = d.get('novaSenha', '')
        if len(nova) < 6:
            return add_cors(JsonResponse({'erro': 'A nova senha deve ter no mínimo 6 caracteres'}, status=400))
        perfil.usuario.set_password(nova)
        perfil.usuario.save()
        perfil.deve_trocar_senha = False
        perfil.token = secrets.token_hex(32)
        perfil.save()
        return add_cors(JsonResponse({'ok': True, 'token': perfil.token, 'usuario': perfil.to_dict()}))
    return add_cors(JsonResponse({'erro': 'Método não permitido'}, status=405))


@csrf_exempt
def api_usuarios(request: HttpRequest):
    if request.method == 'OPTIONS':
        return add_cors(HttpResponse(status=204))
    perfil = _get_perfil(request)
    if not perfil:
        return add_cors(JsonResponse({'erro': 'Não autenticado'}, status=401))
    if not _apenas_admin(perfil):
        return add_cors(JsonResponse({'erro': 'Sem permissão'}, status=403))
    if request.method == 'GET':
        todos = PerfilUsuario.objects.select_related('usuario').all()
        return add_cors(JsonResponse([u.to_dict() for u in todos], safe=False))
    if request.method == 'POST':
        d = json.loads(request.body)
        username = d.get('username', '').strip()
        senha = d.get('senha', '').strip()
        nome = d.get('nome', '').strip()
        papel = d.get('papel', 'garcom')
        if not username or not senha:
            return add_cors(JsonResponse({'erro': 'Usuário e senha são obrigatórios'}, status=400))
        if len(senha) < 6:
            return add_cors(JsonResponse({'erro': 'A senha deve ter no mínimo 6 caracteres'}, status=400))
        if User.objects.filter(username=username).exists():
            return add_cors(JsonResponse({'erro': 'Usuário já existe'}, status=400))
        user = User.objects.create_user(username=username, password=senha, first_name=nome)
        novo, _ = PerfilUsuario.objects.get_or_create(
            usuario=user,
            defaults={'papel': papel, 'deve_trocar_senha': True, 'token': ''}
        )
        novo.papel = papel
        novo.save()
        return add_cors(JsonResponse(novo.to_dict(), status=201))
    return add_cors(JsonResponse({'erro': 'Método não permitido'}, status=405))


@csrf_exempt
def api_usuario_detail(request: HttpRequest, pk: int):
    if request.method == 'OPTIONS':
        return add_cors(HttpResponse(status=204))
    perfil = _get_perfil(request)
    if not perfil:
        return add_cors(JsonResponse({'erro': 'Não autenticado'}, status=401))
    if not _apenas_admin(perfil):
        return add_cors(JsonResponse({'erro': 'Sem permissão'}, status=403))
    alvo = get_object_or_404(PerfilUsuario, usuario_id=pk)
    if request.method == 'PUT':
        d = json.loads(request.body)
        if 'papel' in d:
            alvo.papel = d['papel']
        if 'nome' in d:
            alvo.usuario.first_name = d['nome']
            alvo.usuario.save()
        if d.get('novaSenha'):
            if len(d['novaSenha']) < 6:
                return add_cors(JsonResponse({'erro': 'A senha deve ter no mínimo 6 caracteres'}, status=400))
            alvo.usuario.set_password(d['novaSenha'])
            alvo.usuario.save()
            alvo.deve_trocar_senha = True
            alvo.token = ''
        alvo.save()
        return add_cors(JsonResponse(alvo.to_dict()))
    if request.method == 'DELETE':
        if alvo.usuario_id == perfil.usuario_id:
            return add_cors(JsonResponse({'erro': 'Não é possível excluir sua própria conta'}, status=400))
        alvo.usuario.delete()
        return add_cors(JsonResponse({'ok': True}))
    return add_cors(JsonResponse({'erro': 'Método não permitido'}, status=405))
