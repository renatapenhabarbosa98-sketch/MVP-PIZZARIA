from django.contrib.auth.models import User
from django.db.models.signals import post_save
from django.dispatch import receiver

from .models import PerfilUsuario


@receiver(post_save, sender=User)
def criar_perfil(sender, instance, created, **kwargs):
    if not created:
        return
    papel = 'admin' if instance.is_superuser else 'garcom'
    deve_trocar = not instance.is_superuser
    PerfilUsuario.objects.get_or_create(
        usuario=instance,
        defaults={'papel': papel, 'deve_trocar_senha': deve_trocar},
    )
