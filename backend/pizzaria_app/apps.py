from django.apps import AppConfig


class PizzariaAppConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "pizzaria_app"
    verbose_name = "Pizzaria"

    def ready(self):
        import pizzaria_app.signals  # noqa: F401
