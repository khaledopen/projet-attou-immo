const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../config/db');

exports.register = async (req, res) => {
  try {
    const { email, motDePasse, nom, prenom, role, telephone, raisonSociale, typeBailleur } = req.body;

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ message: 'Cet email est déjà utilisé' });
    }

    const passwordToHash = motDePasse || req.body.password;
    if (!passwordToHash) {
      return res.status(400).json({ message: 'Le mot de passe est obligatoire' });
    }

    const hashedPassword = await bcrypt.hash(passwordToHash, 10);

    const user = await prisma.user.create({
      data: {
        email,
        motDePasse: hashedPassword,
        nom,
        prenom,
        role: role || 'LOCATAIRE',
        telephone,
        raisonSociale: role === 'PROPRIETAIRE' ? raisonSociale : null,
        typeBailleur: role === 'PROPRIETAIRE' ? typeBailleur : null,
        statut: 'ACTIF'
      },
    });

    const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, {
      expiresIn: '7d',
    });

    res.status(201).json({ 
      token, 
      user: { 
        id: user.id, 
        email: user.email, 
        role: user.role, 
        nom: user.nom, 
        prenom: user.prenom,
        telephone: user.telephone,
        raisonSociale: user.raisonSociale,
        typeBailleur: user.typeBailleur
      } 
    });
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body; // 'password' from frontend, mapped to 'motDePasse' in DB

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(404).json({ message: "Ce mail n'a pas de compte." });
    }

    if (user.statut === 'SUSPENDU') {
      return res.status(403).json({ message: 'Votre compte a été suspendu pour non-respect de la politique de confidentialité.' });
    }

    const isMatch = await bcrypt.compare(password, user.motDePasse);
    if (!isMatch) {
      return res.status(400).json({ message: 'Mot de passe incorrect.' });
    }

    const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, {
      expiresIn: '7d',
    });

    res.json({ 
      token, 
      user: { 
        id: user.id, 
        email: user.email, 
        role: user.role, 
        nom: user.nom, 
        prenom: user.prenom,
        telephone: user.telephone,
        raisonSociale: user.raisonSociale,
        typeBailleur: user.typeBailleur
      } 
    });
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

exports.googleCallbackPage = (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Authentification AttouHome</title>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            height: 100vh;
            margin: 0;
            background-color: #f8fafc;
            color: #1e293b;
          }
          .spinner {
            border: 4px solid rgba(0, 0, 0, 0.1);
            width: 36px;
            height: 36px;
            border-radius: 50%;
            border-left-color: #0284c7;
            animation: spin 1s linear infinite;
          }
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          h2 { margin-top: 20px; font-weight: 600; font-size: 1.25rem; }
          p { color: #64748b; font-size: 0.95rem; }
        </style>
      </head>
      <body>
        <div class="spinner"></div>
        <h2>Connexion en cours...</h2>
        <p>Veuillez patienter pendant la redirection vers AttouHome.</p>
        <script>
          const hash = window.location.hash;
          const params = new URLSearchParams(hash.substring(1));
          const accessToken = params.get('access_token');
          const stateBase64 = params.get('state');
          let redirect_to = '';
          let role = 'LOCATAIRE';
          if (stateBase64) {
            try {
              let decoded = '';
              const trimmed = stateBase64.trim();
              if (trimmed.startsWith('{') || trimmed.startsWith('%7B')) {
                decoded = decodeURIComponent(trimmed);
              } else {
                decoded = atob(trimmed.replace(/-/g, '+').replace(/_/g, '/'));
              }
              const stateObj = JSON.parse(decoded);
              redirect_to = stateObj.redirect_to;
              role = stateObj.role;
            } catch(e) {
              console.error('Error parsing state:', e);
            }
          }
          if (accessToken && redirect_to) {
            // Append token to deep link
            const url = new URL(redirect_to);
            url.searchParams.set('access_token', accessToken);
            url.searchParams.set('role', role);
            window.location.href = url.toString();
          } else {
            document.body.innerHTML = "<h2>Erreur d'authentification</h2><p>Le token d'accès ou l'URL de redirection est introuvable.</p>";
          }
        </script>
      </body>
    </html>
  `);
};
