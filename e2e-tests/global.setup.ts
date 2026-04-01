import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';

const SEED_SCRIPT = `
from datetime import timedelta
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.utils.timezone import now
from django_scopes import scopes_disabled

from pretix.base.models import Event, Item, ItemCategory, Organizer, Quota, Team


def merge_plugins(existing: str, *required: str) -> str:
    current = [part for part in (existing or "").split(",") if part]
    for plugin in required:
        if plugin not in current:
            current.append(plugin)
    return ",".join(current)


User = get_user_model()

with scopes_disabled():
    admin, _ = User.objects.get_or_create(
        email="admin@localhost",
        defaults={
            "fullname": "E2E Admin",
            "is_staff": True,
            "is_active": True,
            "is_verified": True,
        },
    )
    admin.fullname = admin.fullname or "E2E Admin"
    admin.is_staff = True
    admin.is_active = True
    admin.is_verified = True
    admin.needs_password_change = False
    admin.set_password("admin")
    admin.save()

    organizer, _ = Organizer.objects.get_or_create(
        slug="test-org",
        defaults={
            "name": "Test Organizer",
            "plugins": "pretix.plugins.banktransfer,pretix.plugins.manualpayment",
        },
    )
    organizer.name = "Test Organizer"
    organizer.plugins = merge_plugins(
        organizer.plugins,
        "pretix.plugins.banktransfer",
        "pretix.plugins.manualpayment",
    )
    organizer.save()

    team, _ = Team.objects.get_or_create(
        organizer=organizer,
        name="E2E Team",
        defaults={
            "all_events": True,
            "all_event_permissions": True,
            "all_organizer_permissions": True,
            "limit_event_permissions": {},
            "limit_organizer_permissions": {},
        },
    )
    dirty_team = False
    for field, value in {
        "all_events": True,
        "all_event_permissions": True,
        "all_organizer_permissions": True,
    }.items():
        if getattr(team, field) != value:
            setattr(team, field, value)
            dirty_team = True
    if dirty_team:
        team.save()
    team.members.add(admin)

    event, created = Event.objects.get_or_create(
        organizer=organizer,
        slug="test-concert",
        defaults={
            "name": "Test Concert 2026",
            "currency": "EUR",
            "date_from": now() + timedelta(days=30),
            "live": True,
            "plugins": "pretix.plugins.banktransfer,pretix.plugins.manualpayment",
        },
    )
    event.name = "Test Concert 2026"
    event.currency = "EUR"
    event.live = True
    if event.date_from <= now():
        event.date_from = now() + timedelta(days=30)
    event.plugins = merge_plugins(
        event.plugins,
        "pretix.plugins.banktransfer",
        "pretix.plugins.manualpayment",
    )
    event.save()

    if created:
        event.set_defaults()

    event.settings.set("timezone", "UTC")
    event.settings.set("attendee_names_asked", False)
    event.settings.set("payment_banktransfer__enabled", True)
    event.settings.set("payment_manual__enabled", True)

    tax_rule = event.tax_rules.filter(default=True).first()
    if not tax_rule:
        tax_rule = event.tax_rules.create(rate=Decimal("19.00"), default=True)

    category, _ = ItemCategory.objects.get_or_create(
        event=event,
        name="General admission",
        defaults={"position": 0},
    )
    if category.position != 0:
        category.position = 0
        category.save(update_fields=["position"])

    quota, _ = Quota.objects.get_or_create(
        event=event,
        name="Main quota",
        defaults={"size": 100},
    )
    if quota.size < 10:
        quota.size = 100
        quota.save(update_fields=["size"])

    items = (
        ("free-entry", "Free Entry", Decimal("0.00"), 0),
        ("general-admission", "General Admission", Decimal("23.00"), 1),
    )

    for internal_name, name, price, position in items:
        item, _ = Item.objects.get_or_create(
            event=event,
            internal_name=internal_name,
            defaults={
                "category": category,
                "name": name,
                "default_price": price,
                "tax_rule": tax_rule,
                "admission": True,
                "personalized": False,
                "position": position,
                "active": True,
            },
        )
        dirty = False
        for field, value in {
            "category": category,
            "name": name,
            "default_price": price,
            "tax_rule": tax_rule,
            "admission": True,
            "personalized": False,
            "position": position,
            "active": True,
        }.items():
            if getattr(item, field) != value:
                setattr(item, field, value)
                dirty = True
        if dirty:
            item.save()
        quota.items.add(item)

    print("Pretix E2E bootstrap complete for test-org/test-concert")
`;

export default async function globalSetup() {
  if (process.env.PRETIX_E2E_BOOTSTRAP === '0') {
    return;
  }

  const repoRoot = path.resolve(__dirname, '..');
  if (!existsSync(path.join(repoRoot, 'docker-compose.yml'))) {
    return;
  }

  try {
    execFileSync(
      'docker',
      ['compose', 'exec', '-T', 'pretix', 'bash', '-lc', 'cd /pretix/src && python manage.py shell'],
      {
        cwd: repoRoot,
        input: SEED_SCRIPT,
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'pipe'],
      }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Failed to bootstrap Pretix E2E data. Start the local stack with "docker compose up -d" or set PRETIX_E2E_BOOTSTRAP=0 to skip bootstrap.\n${message}`
    );
  }
}
