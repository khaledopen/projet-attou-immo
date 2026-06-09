import sys
import os
from reportlab.lib.pagesizes import letter, landscape
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.graphics.shapes import Drawing, Rect, String, Line, Circle, Group
from reportlab.pdfgen import canvas

class NumberedCanvas(canvas.Canvas):
    """Canevas personnalisé pour gérer la numérotation des pages en deux étapes et l'en-tête/pied de page professionnel."""
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_decorations(num_pages)
            super().showPage()
        super().save()

    def draw_page_decorations(self, page_count):
        self.saveState()
        
        # Ne pas dessiner d'en-tête/pied de page sur la page 1 (Page de couverture)
        if self._pageNumber == 1:
            self.restoreState()
            return

        # Déterminer la taille et l'orientation de la page
        width, height = self._pagesize
        
        # Header (Top of the page)
        self.setFont("Helvetica-Bold", 8)
        self.setFillColor(colors.HexColor("#0284C7"))
        self.drawString(54, height - 36, "ATTOUHOME — SCHÉMA & DIAGRAMME DE LA BASE DE DONNÉES")
        
        self.setStrokeColor(colors.HexColor("#E2E8F0"))
        self.setLineWidth(0.5)
        self.line(54, height - 42, width - 54, height - 42)
        
        # Footer (Bottom of the page)
        self.setFont("Helvetica", 8)
        self.setFillColor(colors.HexColor("#64748B"))
        self.drawString(54, 36, "Rapport Technique de Conception de la Base de Données PostgreSQL")
        
        page_text = f"Page {self._pageNumber} sur {page_count}"
        self.drawRightString(width - 54, 36, page_text)
        
        self.line(54, 46, width - 54, 46)
        self.restoreState()

def create_diagram_drawing():
    """Génère le diagramme de classes de relation d'entité visuel principal dans un dessin ReportLab."""
    # Zone de paysage personnalisée : 720 de large, 400 de haut
    d = Drawing(720, 420)
    
    # 1. Zone d'arrière-plan
    d.add(Rect(0, 0, 720, 420, fillColor=colors.HexColor('#F8FAFC'), strokeColor=colors.HexColor('#E2E8F0'), rx=10, ry=10))
    
    # 2. Dessiner les relations (lignes et étiquettes)
    def draw_rel(x1, y1, x2, y2, label="", card1="", card2=""):
        d.add(Line(x1, y1, x2, y2, strokeColor=colors.HexColor('#0284C7'), strokeWidth=1.5))
        # Dessiner les ancrages de connecteurs
        d.add(Circle(x1, y1, 3, fillColor=colors.HexColor('#0F172A'), strokeColor=None))
        d.add(Circle(x2, y2, 3, fillColor=colors.HexColor('#0F172A'), strokeColor=None))
        # Étiquettes et cardinalités
        mid_x = (x1 + x2) / 2
        mid_y = (y1 + y2) / 2
        if label:
            d.add(String(mid_x, mid_y + 4, label, fontName='Helvetica-Oblique', fontSize=7, fillColor=colors.HexColor('#0284C7'), textAnchor='middle'))
        if card1:
            d.add(String(x1 + (12 if x2 > x1 else -12 if x2 < x1 else 0), y1 + (8 if y2 > y1 else -12 if y2 < y1 else 4), card1, fontName='Helvetica-Bold', fontSize=7, fillColor=colors.HexColor('#64748B'), textAnchor='middle'))
        if card2:
            d.add(String(x2 + (-12 if x2 > x1 else 12 if x2 < x1 else 0), y2 + (-12 if y2 > y1 else 8 if y2 < y1 else 4), card2, fontName='Helvetica-Bold', fontSize=7, fillColor=colors.HexColor('#64748B'), textAnchor='middle'))

    # Dessiner les lignes de connexion
    # User ➔ Annonce
    draw_rel(170, 335, 270, 335, "publie", "1..1", "0..*")
    # Annonce ➔ Bien
    draw_rel(410, 335, 510, 335, "décrit", "1..1", "1..1")
    # Bien ➔ Adresse
    draw_rel(580, 290, 580, 220, "se situe à", "1..1", "1..1")
    # Annonce ➔ Photo
    draw_rel(340, 290, 340, 220, "contient", "1..1", "0..*")
    # User ➔ DemandeVisite
    draw_rel(95, 290, 95, 220, "effectue", "1..1", "0..*")
    # Annonce ➔ DemandeVisite (incliné)
    draw_rel(300, 290, 170, 185, "reçoit", "1..1", "0..*")
    # User ➔ Notification
    draw_rel(120, 290, 510, 60, "reçoit", "1..1", "0..*")
    # User ➔ Conversation (Locataire)
    draw_rel(70, 290, 70, 100, "locataire", "1..1", "0..*")
    # Conversation ➔ Message
    draw_rel(170, 60, 270, 60, "contient", "1..1", "0..*")

    # Fonction d'aide pour dessiner de belles cartes arrondies modernes
    def draw_class_box(name, x, y, width, height, fields):
        # Bloc arrondi de l'en-tête
        d.add(Rect(x, y + height - 20, width, 20, fillColor=colors.HexColor('#0F172A'), strokeColor=None, rx=4, ry=4))
        d.add(Rect(x, y + height - 20, width, 8, fillColor=colors.HexColor('#0F172A'), strokeColor=None)) # Couvrir les coins inférieurs de l'en-tête
        
        # Bloc de corps arrondi
        d.add(Rect(x, y, width, height - 16, fillColor=colors.HexColor('#FFFFFF'), strokeColor=colors.HexColor('#CBD5E1'), rx=4, ry=4))
        
        # Texte de titre de classe
        d.add(String(x + width/2, y + height - 14, name.upper(), fontName='Helvetica-Bold', fontSize=9, fillColor=colors.HexColor('#FFFFFF'), textAnchor='middle'))
        
        # Liste des attributs de classe
        curr_y = y + height - 32
        for field in fields:
            d.add(String(x + 8, curr_y, field, fontName='Helvetica', fontSize=7, fillColor=colors.HexColor('#334155')))
            curr_y -= 10

    # Configurations des coordonnées de mise en page
    # Rangée 3 (Rangée supérieure - y=290)
    draw_class_box("User", 20, 290, 150, 115, [
        "+ id : String [PK]",
        "+ nom : String",
        "+ prenom : String",
        "+ email : String [U]",
        "+ statut : StatutCompte",
        "+ role : Role"
    ])
    
    draw_class_box("Annonce", 270, 290, 140, 115, [
        "+ id : String [PK]",
        "+ titre : String",
        "+ prix : Float",
        "+ surface : Float",
        "+ proprietaireId [FK]",
        "+ bienId [FK]"
    ])
    
    draw_class_box("Bien", 510, 290, 140, 115, [
        "+ id : String [PK]",
        "+ typeBien : TypeBien",
        "+ surface : Float",
        "+ nombreChambres : Int",
        "+ adresseId [FK]"
    ])

    # Rangée 2 (Rangée du milieu - y=150)
    draw_class_box("DemandeVisite", 20, 150, 150, 70, [
        "+ id : String [PK]",
        "+ dateProposee : DateTime",
        "+ statut : StatutDemande",
        "+ locataireId [FK]"
    ])
    
    draw_class_box("Photo", 270, 150, 140, 70, [
        "+ id : String [PK]",
        "+ url : String",
        "+ ordre : Int",
        "+ annonceId [FK]"
    ])
    
    draw_class_box("Adresse", 510, 150, 140, 70, [
        "+ id : String [PK]",
        "+ rue : String",
        "+ ville : String",
        "+ pays : String"
    ])

    # Rangée 1 (Rangée inférieure - y=20)
    draw_class_box("Conversation", 20, 20, 150, 80, [
        "+ id : String [PK]",
        "+ locataireId [FK]",
        "+ proprietaireId [FK]",
        "+ annonceId [FK]"
    ])
    
    draw_class_box("Message", 270, 20, 140, 80, [
        "+ id : String [PK]",
        "+ contenu : String",
        "+ lu : Boolean",
        "+ expediteurId [FK]"
    ])
    
    draw_class_box("Notification", 510, 20, 140, 80, [
        "+ id : String [PK]",
        "+ titre : String",
        "+ contenu : String",
        "+ userId [FK]"
    ])
    
    return d

def build_pdf_report(filename="AttouHome_Schema_BD.pdf"):
    # Mise en page paysage cible (11 x 8.5 pouces = 792 x 612 pt)
    doc = SimpleDocTemplate(
        filename,
        pagesize=landscape(letter),
        leftMargin=54,
        rightMargin=54,
        topMargin=54,
        bottomMargin=54
    )

    styles = getSampleStyleSheet()
    
    # Custom high-quality styles
    style_cover_title = ParagraphStyle(
        'CoverTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=38,
        textColor=colors.HexColor('#0F172A'),
        spaceAfter=15,
        alignment=0
    )
    
    style_cover_subtitle = ParagraphStyle(
        'CoverSubtitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=18,
        textColor=colors.HexColor('#0284C7'),
        spaceAfter=30,
        alignment=0
    )

    style_body = ParagraphStyle(
        'MainBody',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=10,
        textColor=colors.HexColor('#334155'),
        leading=15,
        spaceAfter=10
    )

    style_h1 = ParagraphStyle(
        'SectionH1',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=20,
        textColor=colors.HexColor('#0F172A'),
        spaceAfter=15,
        keepWithNext=True
    )

    style_table_header = ParagraphStyle(
        'TableHeaderStyle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=9,
        textColor=colors.HexColor('#FFFFFF')
    )

    style_table_cell = ParagraphStyle(
        'TableCellStyle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8,
        textColor=colors.HexColor('#334155')
    )

    story = []

    # ==========================================================================
    # PAGE 1 : PAGE DE COUVERTURE (Mise en page de style paysage)
    # ==========================================================================
    story.append(Spacer(1, 80))
    story.append(Paragraph("ATTOUHOME", style_cover_title))
    story.append(Paragraph("Spécification Technique et Schéma de la Base de Données", style_cover_subtitle))
    
    story.append(Spacer(1, 40))
    
    # Résumé abstrait dans un tableau à fond gris clair
    summary_text = (
        "<b>Rapport Technique Complet de l'Infrastructure PostgreSQL & Prisma.</b><br/>"
        "Ce rapport présente le diagramme de classes logique, les relations de tables "
        "et les définitions détaillées des attributs de l'application immobilière AttouHome.<br/>"
        "Comprend les schémas d'utilisateurs, d'annonces, de messagerie en direct et de modération active."
    )
    summary_p = Paragraph(summary_text, style_body)
    summary_table = Table([[summary_p]], colWidths=[684])
    summary_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#F1F5F9')),
        ('TOPPADDING', (0,0), (-1,-1), 15),
        ('BOTTOMPADDING', (0,0), (-1,-1), 15),
        ('LEFTPADDING', (0,0), (-1,-1), 20),
        ('RIGHTPADDING', (0,0), (-1,-1), 20),
        ('ROUNDEDCORNERS', [8, 8, 8, 8]),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor('#CBD5E1')),
    ]))
    story.append(summary_table)
    
    story.append(Spacer(1, 60))
    story.append(Paragraph("<b>Auteur:</b> Équipe de Développement Technique AttouHome<br/><b>Date:</b> Juin 2026", style_body))
    story.append(PageBreak())

    # ==========================================================================
    # PAGE 2 : DIAGRAMME DE CLASSES ER (Démonstration du canevas de dessin)
    # ==========================================================================
    story.append(Paragraph("1. Diagramme Entité-Relation Logique (Conception)", style_h1))
    story.append(Paragraph(
        "Ce diagramme modélise l'ensemble des entités logiques de la base de données. Les relations "
        "indiquent les clés étrangères (FK) et les contraintes de cardinalité.",
        style_body
    ))
    story.append(Spacer(1, 10))
    
    # Add the beautiful drawing canvas
    story.append(create_diagram_drawing())
    story.append(PageBreak())

    # ==========================================================================
    # PAGE 3 : RÉFÉRENCE DES SPÉCIFICATIONS DES TABLES (Dictionnaire de données)
    # ==========================================================================
    story.append(Paragraph("2. Dictionnaire de Données Référentiel", style_h1))
    story.append(Paragraph(
        "Le tableau ci-dessous liste et détaille les champs clés, les types et les fonctions métiers "
        "des tables principales configurées sous Prisma PostgreSQL.",
        style_body
    ))
    story.append(Spacer(1, 15))

    # Lignes du tableau du dictionnaire de données
    data_dict = [
        [
            Paragraph("<b>Table</b>", style_table_header),
            Paragraph("<b>Attribut</b>", style_table_header),
            Paragraph("<b>Type</b>", style_table_header),
            Paragraph("<b>Contraintes</b>", style_table_header),
            Paragraph("<b>Description Métier</b>", style_table_header)
        ],
        [
            Paragraph("utilisateurs", style_table_cell),
            Paragraph("id", style_table_cell),
            Paragraph("String (UUID)", style_table_cell),
            Paragraph("PK, default(uuid)", style_table_cell),
            Paragraph("Identifiant unique de l'utilisateur", style_table_cell)
        ],
        [
            Paragraph("utilisateurs", style_table_cell),
            Paragraph("email", style_table_cell),
            Paragraph("String", style_table_cell),
            Paragraph("Unique, Indexé", style_table_cell),
            Paragraph("Adresse e-mail servant d'identifiant de connexion", style_table_cell)
        ],
        [
            Paragraph("utilisateurs", style_table_cell),
            Paragraph("statut", style_table_cell),
            Paragraph("Enum Compte", style_table_cell),
            Paragraph("default(ACTIF)", style_table_cell),
            Paragraph("État du compte (ACTIF, SUSPENDU, DESACTIVE)", style_table_cell)
        ],
        [
            Paragraph("annonces", style_table_cell),
            Paragraph("id", style_table_cell),
            Paragraph("String (UUID)", style_table_cell),
            Paragraph("PK, default(uuid)", style_table_cell),
            Paragraph("Identifiant unique de l'annonce", style_table_cell)
        ],
        [
            Paragraph("annonces", style_table_cell),
            Paragraph("prix", style_table_cell),
            Paragraph("Float", style_table_cell),
            Paragraph("Requis", style_table_cell),
            Paragraph("Loyer mensuel ou montant en FCFA", style_table_cell)
        ],
        [
            Paragraph("annonces", style_table_cell),
            Paragraph("bienId", style_table_cell),
            Paragraph("String", style_table_cell),
            Paragraph("FK, Unique", style_table_cell),
            Paragraph("Lien 1:1 vers les caractéristiques du bien physique", style_table_cell)
        ],
        [
            Paragraph("biens", style_table_cell),
            Paragraph("id", style_table_cell),
            Paragraph("String (UUID)", style_table_cell),
            Paragraph("PK", style_table_cell),
            Paragraph("Identifiant unique du bien physique", style_table_cell)
        ],
        [
            Paragraph("biens", style_table_cell),
            Paragraph("adresseId", style_table_cell),
            Paragraph("String", style_table_cell),
            Paragraph("FK, Unique", style_table_cell),
            Paragraph("Lien 1:1 vers l'adresse postale et coordonnées GPS", style_table_cell)
        ],
        [
            Paragraph("demandes_visites", style_table_cell),
            Paragraph("id", style_table_cell),
            Paragraph("String (UUID)", style_table_cell),
            Paragraph("PK", style_table_cell),
            Paragraph("Identifiant unique de la réservation de visite", style_table_cell)
        ],
        [
            Paragraph("demandes_visites", style_table_cell),
            Paragraph("locataireId", style_table_cell),
            Paragraph("String", style_table_cell),
            Paragraph("FK", style_table_cell),
            Paragraph("Locataire demandeur (relation N:1)", style_table_cell)
        ],
        [
            Paragraph("conversations", style_table_cell),
            Paragraph("id", style_table_cell),
            Paragraph("String (UUID)", style_table_cell),
            Paragraph("PK", style_table_cell),
            Paragraph("Identifiant unique du canal de chat", style_table_cell)
        ]
    ]

    # Render data dictionary table with premium stylings
    t = Table(data_dict, colWidths=[110, 110, 110, 110, 244])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#0F172A')),
        ('ALIGN', (0,0), (-1,-1), 'LEFT'),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('BOTTOMPADDING', (0,0), (-1,0), 8),
        ('TOPPADDING', (0,0), (-1,0), 8),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#E2E8F0')),
        ('BACKGROUND', (0,1), (-1,1), colors.HexColor('#F8FAFC')),
        ('BACKGROUND', (0,3), (-1,3), colors.HexColor('#F8FAFC')),
        ('BACKGROUND', (0,5), (-1,5), colors.HexColor('#F8FAFC')),
        ('BACKGROUND', (0,7), (-1,7), colors.HexColor('#F8FAFC')),
        ('BACKGROUND', (0,9), (-1,9), colors.HexColor('#F8FAFC')),
        ('BACKGROUND', (0,11), (-1,11), colors.HexColor('#F8FAFC')),
        ('TOPPADDING', (0,1), (-1,-1), 6),
        ('BOTTOMPADDING', (0,1), (-1,-1), 6),
    ]))
    
    story.append(t)

    # Construire le document en utilisant le canevas numéroté personnalisé
    doc.build(story, canvasmaker=NumberedCanvas)
    print(f"Technical PDF document successfully built as {filename}!")

if __name__ == "__main__":
    build_pdf_report()
