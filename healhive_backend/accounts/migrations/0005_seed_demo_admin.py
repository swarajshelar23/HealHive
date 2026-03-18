from django.contrib.auth.hashers import make_password
from django.db import migrations


def seed_demo_admin(apps, schema_editor):
    User = apps.get_model('accounts', 'User')

    admin_email = 'admin@healhive.com'
    admin_password = 'admin123'

    admin_user = User.objects.filter(email=admin_email).first()
    if not admin_user:
        admin_user = User(
            username=admin_email,
            email=admin_email,
            full_name='HealHive Admin',
            role='admin',
            is_active=True,
            is_staff=True,
            is_superuser=True,
            password=make_password(admin_password),
        )
        admin_user.save()
        return

    admin_user.role = 'admin'
    admin_user.is_active = True
    admin_user.is_staff = True
    admin_user.is_superuser = True
    admin_user.password = make_password(admin_password)
    admin_user.save(update_fields=['role', 'is_active', 'is_staff', 'is_superuser', 'password'])


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0004_seed_demo_accounts'),
    ]

    operations = [
        migrations.RunPython(seed_demo_admin, migrations.RunPython.noop),
    ]
