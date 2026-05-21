from django.db import migrations


def criar_dados_iniciais(apps, schema_editor):
    Configuracao = apps.get_model('pizzaria_app', 'Configuracao')
    Mesa = apps.get_model('pizzaria_app', 'Mesa')

    cfg, _ = Configuracao.objects.get_or_create(
        pk=1,
        defaults={
            'nome': 'Pizzaria MVP',
            'logo': '',
            'cor': '#BF3010',
            'num_mesas': 10,
            'tema': 'light',
            'fonte_tamanho': 14,
            'atualizado_em': 0,
        }
    )

    for i in range(1, cfg.num_mesas + 1):
        Mesa.objects.get_or_create(
            num=i,
            defaults={'capacidade': 4, 'status': 'livre'}
        )


class Migration(migrations.Migration):
    dependencies = [
        ('pizzaria_app', '0009_remove_produto_disponivel_remove_produto_tamanho_and_more'),
    ]

    operations = [
        migrations.RunPython(criar_dados_iniciais, migrations.RunPython.noop),
    ]
