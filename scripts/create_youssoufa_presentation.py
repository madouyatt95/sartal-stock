from __future__ import annotations

from pathlib import Path

from reportlab.lib.colors import Color, HexColor, white
from reportlab.lib.utils import ImageReader
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "output" / "pdf" / "presentation-sartal-restaurant-vente-en-ligne-youssoufa.pdf"
SCREENSHOTS = Path("/private/tmp/sartal-presentation")

PAGE_W = 960
PAGE_H = 540

NAVY = HexColor("#0F172A")
INK = HexColor("#102A2A")
TEAL = HexColor("#0F766E")
DEEP_TEAL = HexColor("#0B3F3A")
MINT = HexColor("#D1FAE5")
PALE_MINT = HexColor("#ECFDF5")
BLUE = HexColor("#2563EB")
SKY = HexColor("#E0F2FE")
CORAL = HexColor("#E76F5B")
PALE_CORAL = HexColor("#FFF1ED")
GOLD = HexColor("#F4C95D")
VIOLET = HexColor("#7C3AED")
SLATE = HexColor("#64748B")
MID = HexColor("#94A3B8")
LINE = HexColor("#DDE6E8")
PAPER = HexColor("#F7FAFA")


def register_fonts() -> None:
    font_dir = Path("/System/Library/Fonts/Supplemental")
    pdfmetrics.registerFont(TTFont("Sartal", str(font_dir / "Arial.ttf")))
    pdfmetrics.registerFont(TTFont("Sartal-Bold", str(font_dir / "Arial Bold.ttf")))
    pdfmetrics.registerFont(TTFont("Sartal-Italic", str(font_dir / "Arial Italic.ttf")))


def words_to_lines(text: str, font: str, size: float, width: float) -> list[str]:
    if not text:
        return []
    lines: list[str] = []
    for paragraph in text.split("\n"):
        words = paragraph.split()
        current = ""
        for word in words:
            candidate = word if not current else f"{current} {word}"
            if pdfmetrics.stringWidth(candidate, font, size) <= width:
                current = candidate
            else:
                if current:
                    lines.append(current)
                current = word
        if current:
            lines.append(current)
        if paragraph == "":
            lines.append("")
    return lines


def text_block(
    c: canvas.Canvas,
    text: str,
    x: float,
    y: float,
    width: float,
    font: str = "Sartal",
    size: float = 14,
    color=INK,
    leading: float | None = None,
    max_lines: int | None = None,
) -> float:
    leading = leading or size * 1.25
    lines = words_to_lines(text, font, size, width)
    if max_lines is not None:
        lines = lines[:max_lines]
    c.setFont(font, size)
    c.setFillColor(color)
    for line in lines:
        c.drawString(x, y, line)
        y -= leading
    return y


def title(c: canvas.Canvas, eyebrow: str, heading: str, subheading: str | None = None) -> None:
    c.setFillColor(TEAL)
    c.setFont("Sartal-Bold", 10)
    c.drawString(44, 498, eyebrow.upper())
    c.setFillColor(NAVY)
    c.setFont("Sartal-Bold", 27)
    c.drawString(44, 463, heading)
    if subheading:
        text_block(c, subheading, 44, 437, 850, size=12.5, color=SLATE, leading=16)


def footer(c: canvas.Canvas, page_number: int, section: str) -> None:
    c.setStrokeColor(LINE)
    c.setLineWidth(0.6)
    c.line(44, 28, 916, 28)
    c.setFillColor(SLATE)
    c.setFont("Sartal", 8)
    c.drawString(44, 14, f"SÁRTAL | {section} | Présentation à Youssoufa")
    c.drawRightString(916, 14, f"{page_number:02d}")


def rounded_card(c: canvas.Canvas, x: float, y: float, w: float, h: float, fill=white, stroke=LINE, radius=12) -> None:
    c.saveState()
    c.setFillColor(Color(0, 0, 0, alpha=0.055))
    c.roundRect(x + 3, y - 3, w, h, radius, fill=1, stroke=0)
    c.setFillColor(fill)
    c.setStrokeColor(stroke)
    c.setLineWidth(0.8)
    c.roundRect(x, y, w, h, radius, fill=1, stroke=1)
    c.restoreState()


def pill(c: canvas.Canvas, label: str, x: float, y: float, fill, color=INK, width: float | None = None) -> float:
    c.setFont("Sartal-Bold", 9)
    width = width or pdfmetrics.stringWidth(label, "Sartal-Bold", 9) + 24
    c.setFillColor(fill)
    c.roundRect(x, y, width, 24, 12, fill=1, stroke=0)
    c.setFillColor(color)
    c.drawCentredString(x + width / 2, y + 7.5, label)
    return width


def bullet(c: canvas.Canvas, text: str, x: float, y: float, width: float, color=TEAL, size=11.5) -> float:
    c.setFillColor(color)
    c.circle(x + 5, y + 3.5, 3.5, fill=1, stroke=0)
    return text_block(c, text, x + 18, y + 8, width - 18, size=size, color=INK, leading=size * 1.32)


def image_cover(c: canvas.Canvas, path: Path, x: float, y: float, w: float, h: float, radius: float = 0) -> None:
    image = ImageReader(str(path))
    iw, ih = image.getSize()
    scale = max(w / iw, h / ih)
    dw, dh = iw * scale, ih * scale
    dx, dy = x + (w - dw) / 2, y + (h - dh) / 2
    c.saveState()
    clip = c.beginPath()
    if radius:
        clip.roundRect(x, y, w, h, radius)
    else:
        clip.rect(x, y, w, h)
    c.clipPath(clip, stroke=0, fill=0)
    c.drawImage(image, dx, dy, width=dw, height=dh, mask="auto")
    c.restoreState()


def image_contain(c: canvas.Canvas, path: Path, x: float, y: float, w: float, h: float, radius: float = 10) -> None:
    image = ImageReader(str(path))
    iw, ih = image.getSize()
    scale = min(w / iw, h / ih)
    dw, dh = iw * scale, ih * scale
    dx, dy = x + (w - dw) / 2, y + (h - dh) / 2
    rounded_card(c, x, y, w, h, fill=white, stroke=LINE, radius=radius)
    c.drawImage(image, dx, dy, width=dw, height=dh, mask="auto")


def numbered_step(c: canvas.Canvas, number: int, heading: str, body: str, x: float, y: float, w: float, accent=TEAL) -> None:
    rounded_card(c, x, y, w, 126, fill=white)
    c.setFillColor(accent)
    c.circle(x + 30, y + 94, 17, fill=1, stroke=0)
    c.setFillColor(white)
    c.setFont("Sartal-Bold", 12)
    c.drawCentredString(x + 30, y + 90, str(number))
    c.setFillColor(NAVY)
    c.setFont("Sartal-Bold", 13)
    c.drawString(x + 58, y + 91, heading)
    text_block(c, body, x + 20, y + 64, w - 40, size=10.5, color=SLATE, leading=14, max_lines=4)


def stat(c: canvas.Canvas, label: str, value: str, x: float, y: float, w: float, accent=TEAL) -> None:
    rounded_card(c, x, y, w, 76, fill=white)
    c.setFillColor(accent)
    c.rect(x, y, 5, 76, fill=1, stroke=0)
    c.setFillColor(SLATE)
    c.setFont("Sartal-Bold", 9)
    c.drawString(x + 20, y + 49, label.upper())
    c.setFillColor(NAVY)
    c.setFont("Sartal-Bold", 18)
    c.drawString(x + 20, y + 20, value)


def slide_cover(c: canvas.Canvas) -> None:
    restaurant = ROOT / "public" / "sartal-client-restaurant.jpg"
    grocery = ROOT / "public" / "sartal-client-grocery.jpg"
    image_cover(c, restaurant, 0, 0, 610, PAGE_H)
    image_cover(c, grocery, 610, 0, 350, PAGE_H)
    c.saveState()
    c.setFillColor(Color(0.025, 0.09, 0.09, alpha=0.76))
    c.rect(0, 0, PAGE_W, PAGE_H, fill=1, stroke=0)
    c.setFillColor(Color(0.04, 0.30, 0.28, alpha=0.62))
    c.rect(610, 0, 350, PAGE_H, fill=1, stroke=0)
    c.restoreState()

    icon = ROOT / "public" / "pwa-icon-512.png"
    c.drawImage(str(icon), 54, 420, 62, 62, mask="auto")
    c.setFillColor(white)
    c.setFont("Sartal-Bold", 28)
    c.drawString(132, 451, "SÁRTAL")
    c.setFont("Sartal", 11)
    c.setFillColor(HexColor("#BFE8E1"))
    c.drawString(132, 430, "Stock et opérations")

    c.setFillColor(white)
    c.setFont("Sartal-Bold", 44)
    c.drawString(54, 328, "SÁRTAL STOCK")
    text_block(c, "Le socle opérationnel pour piloter les produits, les dépôts et les métiers.", 56, 276, 620, font="Sartal-Bold", size=18, color=GOLD, leading=23)
    text_block(c, "Un catalogue unique, des stocks fiables et des opérations traçables, du restaurant à la vente en ligne.", 56, 217, 545, size=13.5, color=white, leading=18)

    pill(c, "1  SÁRTAL STOCK", 56, 102, SKY, color=BLUE, width=142)
    pill(c, "2  RESTAURANT", 208, 102, PALE_CORAL, color=CORAL, width=132)
    pill(c, "3  VENTE EN LIGNE", 350, 102, PALE_MINT, color=TEAL, width=162)
    c.setFillColor(HexColor("#DDE7E7"))
    c.setFont("Sartal", 10)
    c.drawString(56, 66, "Présentation à Youssoufa | 23 juillet 2026")
    c.drawRightString(904, 34, "Démonstration fonctionnelle et proposition de cadrage")


def slide_vision(c: canvas.Canvas, page: int) -> None:
    c.setFillColor(PAPER)
    c.rect(0, 0, PAGE_W, PAGE_H, fill=1, stroke=0)
    title(c, "1 - Présentation de Sártal Stock", "Piloter ce qui entre, ce qui bouge et ce qui sort", "Sártal Stock centralise les données de référence et rend chaque mouvement compréhensible, du fournisseur jusqu'au client.")

    cards = [
        ("RÉFÉRENTIEL", "Catalogue et prix", ["Un produit créé une seule fois", "Catégories, unités, recettes et coûts", "Prix, TVA et disponibilité par canal"], BLUE, SKY),
        ("OPÉRATIONS", "Stock et flux", ["Achats, réceptions et fournisseurs", "Dépôts, transferts, lots et inventaires", "Pertes, péremptions et réapprovisionnement"], TEAL, PALE_MINT),
        ("PILOTAGE", "Contrôle et équipes", ["Stock réel et écarts valorisés", "Rapports, alertes et traçabilité", "Rôles, permissions et périmètres"], CORAL, PALE_CORAL),
    ]
    for index, (eyebrow, heading, bullets, accent, pale) in enumerate(cards):
        x = 44 + index * 292
        rounded_card(c, x, 150, 270, 238, fill=white)
        c.setFillColor(pale)
        c.roundRect(x + 18, 337, 234, 32, 8, fill=1, stroke=0)
        c.setFillColor(accent)
        c.setFont("Sartal-Bold", 9)
        c.drawString(x + 30, 349, eyebrow)
        c.setFillColor(NAVY)
        c.setFont("Sartal-Bold", 18)
        c.drawString(x + 22, 306, heading)
        y = 268
        for item in bullets:
            y = bullet(c, item, x + 22, y, 226, color=accent, size=10.8) - 10

    c.setFillColor(DEEP_TEAL)
    c.roundRect(44, 62, 852, 62, 12, fill=1, stroke=0)
    c.setFillColor(MINT)
    c.setFont("Sartal-Bold", 12)
    c.drawString(66, 94, "Le principe")
    c.setFillColor(white)
    c.setFont("Sartal-Bold", 15)
    c.drawString(158, 91, "Sártal Stock fonctionne seul, puis alimente les modules Restaurant, Vente en ligne ou PMS activés.")
    footer(c, page, "Sártal Stock")


def slide_stock_cycle(c: canvas.Canvas, page: int) -> None:
    c.setFillColor(PAPER)
    c.rect(0, 0, PAGE_W, PAGE_H, fill=1, stroke=0)
    title(c, "1 - Présentation de Sártal Stock", "Une chaîne complète, de l'achat au rapport", "Chaque étape modifie une donnée réelle, conserve son justificatif et prépare la décision suivante.")

    steps = [
        (1, "Acheter", "Commandes fournisseurs, coûts négociés et besoins de réapprovisionnement."),
        (2, "Réceptionner", "Quantités contrôlées, lots, dates de péremption et écarts de livraison."),
        (3, "Distribuer", "Transferts entre dépôt central, restaurants et dépôt de préparation."),
        (4, "Consommer", "Vente directe, recette produite ou réservation pour une commande en ligne."),
        (5, "Contrôler", "Inventaire, casse, perte, correction validée et écart valorisé."),
        (6, "Décider", "Stock disponible, rotation, coût matière, marge, alertes et audit."),
    ]
    for i, (number, heading, body) in enumerate(steps):
        row, col = divmod(i, 3)
        numbered_step(c, number, heading, body, 44 + col * 292, 266 - row * 148, 270, BLUE if row == 0 else TEAL)

    c.setFillColor(DEEP_TEAL)
    c.roundRect(44, 58, 872, 55, 12, fill=1, stroke=0)
    c.setFillColor(MINT)
    c.setFont("Sartal-Bold", 10.5)
    c.drawString(64, 88, "UNE SEULE VÉRITÉ")
    c.setFillColor(white)
    c.setFont("Sartal", 10.8)
    c.drawString(184, 87, "Physique, réservé, disponible à vendre et valorisé restent distincts, mais toujours rapprochables.")
    footer(c, page, "Sártal Stock - Cycle")


def slide_restaurant_case(c: canvas.Canvas, page: int) -> None:
    c.setFillColor(PAPER)
    c.rect(0, 0, PAGE_W, PAGE_H, fill=1, stroke=0)
    title(c, "Cas d'usage 1 - Restaurant", "De la table au stock, sans ressaisie", "Un parcours continu pour la salle, la cuisine, la caisse et le magasin.")

    steps = [
        (1, "Accueillir", "Réservation ou arrivée spontanée. Placement selon la capacité, les préférences et les allergies."),
        (2, "Commander", "Le serveur saisit la commande à table. Chaque article part vers le bon poste de production."),
        (3, "Produire", "Cuisine, bar et passe voient uniquement leurs tickets, les urgences et les temps d'attente."),
        (4, "Servir", "La salle est informée en direct. Les demandes client et promesses restent visibles jusqu'à résolution."),
        (5, "Encaisser", "Addition partagée, espèces, carte, Wave, Orange Money ou imputation sur une chambre PMS."),
        (6, "Déduire", "La recette ou le produit sort du dépôt lié au POS. La vente et le mouvement sont rapprochables."),
    ]
    for i, (number, heading, body) in enumerate(steps):
        row, col = divmod(i, 3)
        numbered_step(c, number, heading, body, 44 + col * 292, 266 - row * 148, 270, CORAL if row == 0 else TEAL)

    c.setFillColor(NAVY)
    c.setFont("Sartal-Bold", 12)
    c.drawString(44, 68, "Exemple concret")
    c.setFillColor(SLATE)
    c.setFont("Sartal", 11)
    c.drawString(145, 68, "Table T12 : Thieboudienne + Yassa poulet + 2 eaux. Allergie arachides visible. Paiement et consommation tracés.")
    footer(c, page, "Restaurant")


def slide_floor(c: canvas.Canvas, page: int) -> None:
    c.setFillColor(PAPER)
    c.rect(0, 0, PAGE_W, PAGE_H, fill=1, stroke=0)
    title(c, "Cas d'usage 1 - Restaurant", "La salle devient un poste de pilotage", "Le manager voit les tables, les serveurs, les retards, les additions et les demandes dans une seule vue.")
    image_contain(c, SCREENSHOTS / "restaurant-floor.png", 44, 88, 650, 332, radius=12)

    rounded_card(c, 716, 88, 200, 332, fill=DEEP_TEAL, stroke=DEEP_TEAL)
    c.setFillColor(MINT)
    c.setFont("Sartal-Bold", 10)
    c.drawString(738, 386, "SALLE EN DIRECT")
    c.setFillColor(white)
    c.setFont("Sartal-Bold", 20)
    c.drawString(738, 354, "Décider vite")
    y = 318
    for item in [
        "Code couleur par état de table",
        "Placement et transfert assistés",
        "Retards cuisine et additions visibles",
        "Affectation par serveur et secteur",
        "Mode tablette pour le service",
        "Historique de chaque table",
    ]:
        c.setFillColor(GOLD)
        c.circle(742, y + 3, 3, fill=1, stroke=0)
        y = text_block(c, item, 754, y + 7, 142, size=10.5, color=white, leading=14, max_lines=2) - 12
    pill(c, "98 COUVERTS", 738, 112, HexColor("#1A5D56"), color=white, width=104)
    footer(c, page, "Restaurant - Salle")


def slide_multipos(c: canvas.Canvas, page: int) -> None:
    c.setFillColor(PAPER)
    c.rect(0, 0, PAGE_W, PAGE_H, fill=1, stroke=0)
    title(c, "Cas d'usage 1 - Restaurant", "Le même produit, trois prix, trois stocks", "Le produit reste unique. Le contexte de vente choisit automatiquement le tarif, la TVA et le dépôt à déduire.")
    image_contain(c, SCREENSHOTS / "restaurant-multipos.png", 44, 146, 560, 273, radius=12)

    rounded_card(c, 626, 146, 290, 273, fill=white)
    rows = [
        ("Restaurant La Terrasse", "1 500 FCFA", "Dépôt Restaurant", CORAL),
        ("Bar casino", "2 000 FCFA", "Dépôt Bar Casino", BLUE),
        ("Night-club", "2 500 FCFA", "Dépôt Night Club", VIOLET),
    ]
    c.setFillColor(NAVY)
    c.setFont("Sartal-Bold", 14)
    c.drawString(648, 387, "Coca-Cola 33 cl")
    c.setFillColor(SLATE)
    c.setFont("Sartal", 9.5)
    c.drawString(670, 369, "Un seul produit dans le référentiel")
    y = 327
    for name, price, warehouse, accent in rows:
        c.setFillColor(accent)
        c.roundRect(648, y - 3, 8, 53, 4, fill=1, stroke=0)
        c.setFillColor(NAVY)
        c.setFont("Sartal-Bold", 10.5)
        c.drawString(670, y + 31, name)
        c.setFillColor(accent)
        c.setFont("Sartal-Bold", 11.5)
        c.drawString(670, y + 13, price)
        c.setFillColor(SLATE)
        c.setFont("Sartal", 9)
        c.drawRightString(894, y + 14, warehouse)
        y -= 66

    c.setFillColor(DEEP_TEAL)
    c.roundRect(44, 59, 872, 62, 12, fill=1, stroke=0)
    c.setFillColor(MINT)
    c.setFont("Sartal-Bold", 11)
    c.drawString(64, 92, "Pour plusieurs restaurants")
    c.setFillColor(white)
    c.setFont("Sartal", 11)
    c.drawString(222, 92, "Le même principe s'applique par enseigne, site, cuisine centrale, réserve ou zone de livraison.")
    footer(c, page, "Restaurant - Multi-POS")


def slide_restaurant_experience(c: canvas.Canvas, page: int) -> None:
    c.setFillColor(PAPER)
    c.rect(0, 0, PAGE_W, PAGE_H, fill=1, stroke=0)
    title(c, "Cas d'usage 1 - Restaurant", "Une expérience pensée pour chaque personne", "Les écrans ne sont pas identiques : ils sont adaptés au rôle, au moment de service et aux droits accordés.")
    image_cover(c, ROOT / "public" / "sartal-client-restaurant.jpg", 620, 80, 296, 344, radius=14)
    c.saveState()
    c.setFillColor(Color(0.02, 0.18, 0.16, alpha=0.50))
    c.roundRect(620, 80, 296, 344, 14, fill=1, stroke=0)
    c.restoreState()
    c.setFillColor(white)
    c.setFont("Sartal-Bold", 18)
    c.drawString(642, 124, "Le client reste au centre")
    c.setFont("Sartal", 10.5)
    c.drawString(642, 103, "Avant, pendant et après le repas")

    roles = [
        ("Manager", "Salle en direct, planning, validations, performance", CORAL),
        ("Serveur", "Tables, commandes, demandes, addition et encaissement", TEAL),
        ("Cuisine KDS", "Tickets routés, allergies, temps et rupture produit", GOLD),
        ("Caissier", "Fonds, tickets, Wave, Orange Money, X/Z et écarts", BLUE),
    ]
    for i, (role, body, accent) in enumerate(roles):
        x = 44 + (i % 2) * 282
        y = 270 - (i // 2) * 142
        rounded_card(c, x, y, 260, 122, fill=white)
        c.setFillColor(accent)
        c.roundRect(x + 18, y + 74, 58, 28, 8, fill=1, stroke=0)
        c.setFillColor(white if accent != GOLD else NAVY)
        c.setFont("Sartal-Bold", 9)
        c.drawCentredString(x + 47, y + 84, role.upper())
        text_block(c, body, x + 18, y + 56, 220, size=11, color=NAVY, leading=15, max_lines=3)

    rounded_card(c, 44, 58, 542, 52, fill=SKY, stroke=SKY)
    c.setFillColor(BLUE)
    c.setFont("Sartal-Bold", 10)
    c.drawString(62, 88, "CÔTÉ CLIENT")
    c.setFillColor(NAVY)
    c.setFont("Sartal", 10.5)
    c.drawString(150, 87, "Réserver, suivre la commande, demander le service, partager l'addition, payer et fidéliser.")
    footer(c, page, "Restaurant - Expérience")


def slide_delivery_case(c: canvas.Canvas, page: int) -> None:
    c.setFillColor(PAPER)
    c.rect(0, 0, PAGE_W, PAGE_H, fill=1, stroke=0)
    title(c, "Cas d'usage 2 - Vente en ligne", "De la commande à la preuve de remise", "Le stock est réservé dès la confirmation, mais il ne sort physiquement qu'au moment où la livraison est certifiée.")

    image_cover(c, ROOT / "public" / "sartal-client-grocery.jpg", 646, 84, 270, 340, radius=14)
    c.saveState()
    c.setFillColor(Color(0.02, 0.16, 0.14, alpha=0.30))
    c.roundRect(646, 84, 270, 340, 14, fill=1, stroke=0)
    c.restoreState()

    flow = [
        (1, "Commander", "Catalogue, prix du canal, créneau et paiement."),
        (2, "Réserver", "Le stock n'est plus vendable ailleurs."),
        (3, "Préparer", "Picking guidé et substitutions validées."),
        (4, "Dispatcher", "Zone, délai, tournée et livreur affecté."),
        (5, "Remettre", "Code, signature, photo et position."),
        (6, "Déduire", "Sortie stock, vente et rapports mis à jour."),
    ]
    for i, (number, heading, body) in enumerate(flow):
        row, col = divmod(i, 2)
        x = 44 + col * 286
        y = 314 - row * 112
        rounded_card(c, x, y, 264, 94, fill=white)
        c.setFillColor(TEAL)
        c.circle(x + 28, y + 64, 15, fill=1, stroke=0)
        c.setFillColor(white)
        c.setFont("Sartal-Bold", 11)
        c.drawCentredString(x + 28, y + 60, str(number))
        c.setFillColor(NAVY)
        c.setFont("Sartal-Bold", 12)
        c.drawString(x + 52, y + 64, heading)
        text_block(c, body, x + 20, y + 38, 224, size=9.8, color=SLATE, leading=13, max_lines=2)

    c.setFillColor(DEEP_TEAL)
    c.roundRect(660, 102, 242, 73, 10, fill=1, stroke=0)
    c.setFillColor(MINT)
    c.setFont("Sartal-Bold", 9)
    c.drawString(678, 149, "EXEMPLE DÉMO")
    c.setFillColor(white)
    c.setFont("Sartal-Bold", 13)
    c.drawString(678, 127, "Awa Diop - 31 900 FCFA")
    c.setFont("Sartal", 9.5)
    c.drawString(678, 111, "Point E / Fann - Wave payé - 45 min")
    footer(c, page, "Vente en ligne")


def slide_delivery_dashboard(c: canvas.Canvas, page: int) -> None:
    c.setFillColor(PAPER)
    c.rect(0, 0, PAGE_W, PAGE_H, fill=1, stroke=0)
    title(c, "Cas d'usage 2 - Vente en ligne", "Le pilotage opérationnel en un coup d'oeil", "Commandes, disponibilité, réservations, zones, livreurs et montants à encaisser sont réunis.")
    image_contain(c, SCREENSHOTS / "delivery-ops.png", 44, 90, 668, 329, radius=12)

    stat(c, "Commandes à traiter", "5", 734, 343, 182, TEAL)
    stat(c, "Produits en ligne", "19", 734, 251, 182, BLUE)
    stat(c, "Zone sélectionnée", "Point E / Fann", 734, 159, 182, CORAL)
    stat(c, "Délai cible", "45 min", 734, 67, 182, GOLD)
    footer(c, page, "Vente en ligne - Pilotage")


def slide_delivery_order(c: canvas.Canvas, page: int) -> None:
    c.setFillColor(PAPER)
    c.rect(0, 0, PAGE_W, PAGE_H, fill=1, stroke=0)
    title(c, "Cas d'usage 2 - Vente en ligne", "Chaque commande garde sa logique de stock", "La réservation évite la survente. La préparation guide l'équipe. La livraison déclenche la sortie définitive.")
    image_contain(c, SCREENSHOTS / "delivery-order.png", 44, 108, 610, 310, radius=12)

    rounded_card(c, 676, 108, 240, 310, fill=white)
    c.setFillColor(NAVY)
    c.setFont("Sartal-Bold", 14)
    c.drawString(698, 386, "Contrôles clés")
    y = 350
    for heading, body, accent in [
        ("Stock réservé", "La quantité disparaît du disponible à vendre.", TEAL),
        ("Picking", "Le préparateur voit l'emplacement et le stock restant.", BLUE),
        ("Substitution", "Une alternative est proposée puis validée avec le client.", CORAL),
        ("Preuve de remise", "Code, nom, photo et GPS sécurisent la clôture.", VIOLET),
        ("Incident", "Client absent ou retour dépôt sans perdre la trace.", GOLD),
    ]:
        c.setFillColor(accent)
        c.circle(703, y + 3, 4, fill=1, stroke=0)
        c.setFillColor(NAVY)
        c.setFont("Sartal-Bold", 10.5)
        c.drawString(718, y, heading)
        y = text_block(c, body, 718, y - 16, 176, size=9.3, color=SLATE, leading=12.5, max_lines=2) - 12

    c.setFillColor(DEEP_TEAL)
    c.roundRect(44, 55, 872, 35, 10, fill=1, stroke=0)
    c.setFillColor(white)
    c.setFont("Sartal-Bold", 10.5)
    c.drawCentredString(480, 67, "Le site existant peut rester la vitrine. Sártal fournit le catalogue, la disponibilité, les commandes et le suivi par API.")
    footer(c, page, "Vente en ligne - Commande")


def slide_foundation(c: canvas.Canvas, page: int) -> None:
    c.setFillColor(PAPER)
    c.rect(0, 0, PAGE_W, PAGE_H, fill=1, stroke=0)
    title(c, "Architecture cible", "Un socle commun, des interfaces séparées", "L'entreprise active les modules achetés. Chaque utilisateur arrive directement sur l'espace correspondant à son rôle.")

    left_items = [("POS restaurant", CORAL), ("Site / application client", TEAL), ("Interfaces employés", BLUE)]
    right_items = [("Achats et fournisseurs", CORAL), ("Dépôts et inventaires", TEAL), ("Rapports et audit", BLUE)]
    for i, (label, accent) in enumerate(left_items):
        y = 326 - i * 86
        rounded_card(c, 44, y, 220, 62, fill=white)
        c.setFillColor(accent)
        c.roundRect(44, y, 7, 62, 4, fill=1, stroke=0)
        c.setFillColor(NAVY)
        c.setFont("Sartal-Bold", 11)
        c.drawString(68, y + 24, label)
        c.setStrokeColor(MID)
        c.setLineWidth(1.6)
        c.line(264, y + 31, 332, y + 31)

    rounded_card(c, 332, 147, 296, 258, fill=DEEP_TEAL, stroke=DEEP_TEAL, radius=16)
    c.drawImage(str(ROOT / "public" / "pwa-icon-512.png"), 432, 321, 96, 96, mask="auto")
    c.setFillColor(white)
    c.setFont("Sartal-Bold", 20)
    c.drawCentredString(480, 292, "SÁRTAL STOCK")
    c.setFillColor(MINT)
    c.setFont("Sartal-Bold", 11)
    c.drawCentredString(480, 269, "LA VÉRITÉ OPÉRATIONNELLE")
    core = ["Catalogue unique", "Prix et règles par canal", "Stocks par dépôt", "Droits et traçabilité"]
    y = 236
    for item in core:
        c.setFillColor(GOLD)
        c.circle(389, y + 3, 3, fill=1, stroke=0)
        c.setFillColor(white)
        c.setFont("Sartal", 10.5)
        c.drawString(402, y, item)
        y -= 23

    for i, (label, accent) in enumerate(right_items):
        y = 326 - i * 86
        c.setStrokeColor(MID)
        c.setLineWidth(1.6)
        c.line(628, y + 31, 696, y + 31)
        rounded_card(c, 696, y, 220, 62, fill=white)
        c.setFillColor(accent)
        c.roundRect(909, y, 7, 62, 4, fill=1, stroke=0)
        c.setFillColor(NAVY)
        c.setFont("Sartal-Bold", 11)
        c.drawString(718, y + 24, label)

    rounded_card(c, 44, 61, 872, 58, fill=SKY, stroke=SKY)
    c.setFillColor(BLUE)
    c.setFont("Sartal-Bold", 10)
    c.drawString(64, 94, "INTÉGRATION PROGRESSIVE")
    c.setFillColor(NAVY)
    c.setFont("Sartal", 10.5)
    c.drawString(252, 93, "Imports au départ, puis API et webhooks selon les systèmes disponibles. Pas de remplacement brutal nécessaire.")
    footer(c, page, "Socle commun")


def slide_next_steps(c: canvas.Canvas, page: int) -> None:
    c.setFillColor(DEEP_TEAL)
    c.rect(0, 0, PAGE_W, PAGE_H, fill=1, stroke=0)
    c.setFillColor(MINT)
    c.setFont("Sartal-Bold", 10)
    c.drawString(44, 500, "PROPOSITION DE SUITE")
    c.setFillColor(white)
    c.setFont("Sartal-Bold", 29)
    c.drawString(44, 462, "Passer de la démonstration au pilote")
    text_block(c, "Le rendez-vous doit permettre de choisir un périmètre concret, mesurable et suffisamment petit pour être configuré correctement.", 44, 431, 820, size=12.5, color=HexColor("#DDEBE8"), leading=17)

    phases = [
        ("01", "Cartographier", "Sites, POS, dépôts, catalogue, recettes, canaux et outils existants."),
        ("02", "Configurer", "Règles de prix, droits, flux stock, paiements et interfaces par rôle."),
        ("03", "Piloter", "Un restaurant et une zone de livraison avec données réelles contrôlées."),
        ("04", "Déployer", "Former, mesurer, corriger puis étendre aux autres sites et équipes."),
    ]
    for i, (number, heading, body) in enumerate(phases):
        x = 44 + i * 218
        rounded_card(c, x, 246, 196, 142, fill=white, stroke=white)
        c.setFillColor(TEAL if i % 2 == 0 else CORAL)
        c.setFont("Sartal-Bold", 24)
        c.drawString(x + 18, 348, number)
        c.setFillColor(NAVY)
        c.setFont("Sartal-Bold", 14)
        c.drawString(x + 18, 319, heading)
        text_block(c, body, x + 18, 293, 158, size=9.7, color=SLATE, leading=13, max_lines=4)

    c.setFillColor(GOLD)
    c.setFont("Sartal-Bold", 10)
    c.drawString(44, 207, "TROIS DÉCISIONS À PRENDRE ENSEMBLE")
    questions = [
        "Quel restaurant pour le pilote ?",
        "Quel parcours en ligne connecter en priorité ?",
        "Quels exports ou accès techniques sont disponibles ?",
    ]
    for i, question in enumerate(questions):
        x = 44 + i * 290
        c.setFillColor(HexColor("#16554F"))
        c.roundRect(x, 105, 270, 76, 10, fill=1, stroke=0)
        c.setFillColor(GOLD)
        c.circle(x + 24, 143, 12, fill=1, stroke=0)
        c.setFillColor(DEEP_TEAL)
        c.setFont("Sartal-Bold", 10)
        c.drawCentredString(x + 24, 139, str(i + 1))
        text_block(c, question, x + 48, 153, 198, font="Sartal-Bold", size=10.2, color=white, leading=14, max_lines=3)

    c.setFillColor(white)
    c.setFont("Sartal-Bold", 14)
    c.drawString(44, 66, "SÁRTAL")
    c.setFillColor(HexColor("#B7DAD5"))
    c.setFont("Sartal", 10)
    c.drawString(112, 67, "Une plateforme adaptée au fonctionnement réel, pas l'inverse.")
    c.setFont("Sartal", 8)
    c.drawRightString(916, 24, "Le périmètre de production, les connecteurs et les délais seront validés après audit.")


def build() -> Path:
    register_fonts()
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    c = canvas.Canvas(str(OUTPUT), pagesize=(PAGE_W, PAGE_H), pageCompression=1)
    c.setTitle("Sártal - Restaurant et vente en ligne")
    c.setAuthor("Sártal")
    c.setSubject("Présentation des cas d'usage Restaurant et Vente en ligne")

    slides = [
        slide_cover,
        slide_vision,
        slide_stock_cycle,
        slide_restaurant_case,
        slide_floor,
        slide_multipos,
        slide_restaurant_experience,
        slide_delivery_case,
        slide_delivery_dashboard,
        slide_delivery_order,
        slide_foundation,
        slide_next_steps,
    ]
    for page_number, slide in enumerate(slides, start=1):
        if page_number == 1:
            slide(c)
        else:
            slide(c, page_number)
        c.showPage()
    c.save()
    return OUTPUT


if __name__ == "__main__":
    print(build())
