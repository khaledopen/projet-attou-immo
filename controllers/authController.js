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
      expiresIn: '2h',
    });
    const refreshToken = jwt.sign({ id: user.id, role: user.role, type: 'refresh' }, process.env.JWT_SECRET, {
      expiresIn: '2h',
    });

    res.status(201).json({ 
      token,
      refreshToken, 
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
    const { email, password } = req.body; // 'password' du frontend, mappé à 'motDePasse' dans la BD

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
      expiresIn: '2h',
    });
    const refreshToken = jwt.sign({ id: user.id, role: user.role, type: 'refresh' }, process.env.JWT_SECRET, {
      expiresIn: '2h',
    });

    res.json({ 
      token, 
      refreshToken,
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
            // Ajouter le jeton au lien profond
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

exports.updateProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const { nom, prenom, telephone, raisonSociale, typeBailleur } = req.body;

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        nom,
        prenom,
        telephone,
        raisonSociale,
        typeBailleur
      },
      select: {
        id: true,
        email: true,
        nom: true,
        prenom: true,
        role: true,
        telephone: true,
        raisonSociale: true,
        typeBailleur: true,
        statut: true
      }
    });

    res.json({
      message: 'Profil mis à jour avec succès',
      user: updatedUser
    });
  } catch (error) {
    res.status(500).json({ message: 'Erreur lors de la mise à jour du profil', error: error.message });
  }
};

exports.refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(400).json({ message: 'Refresh token requis' });
    }

    let decoded;
    try {
      decoded = jwt.verify(refreshToken, process.env.JWT_SECRET);
    } catch (err) {
      return res.status(401).json({ message: 'Refresh token invalide ou expiré' });
    }

    if (decoded.type !== 'refresh') {
      return res.status(401).json({ message: 'Token invalide' });
    }

    const user = await prisma.user.findUnique({ where: { id: decoded.id } });
    if (!user || user.statut === 'SUSPENDU') {
      return res.status(403).json({ message: 'Utilisateur non trouvé ou suspendu' });
    }

    const newAccessToken = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, {
      expiresIn: '2h',
    });
    const newRefreshToken = jwt.sign({ id: user.id, role: user.role, type: 'refresh' }, process.env.JWT_SECRET, {
      expiresIn: '2h',
    });

    res.json({
      token: newAccessToken,
      refreshToken: newRefreshToken
    });
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

const { sendResetEmail } = require('../config/mailer');

exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ message: 'Veuillez saisir votre adresse email.' });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      // Par sécurité, ne pas divulguer que l'email n'existe pas
      return res.json({ message: 'Si votre e-mail correspond à un compte, un lien de réinitialisation vous a été envoyé.' });
    }

    // Le jeton expire dans 30 minutes. Signé avec process.env.JWT_SECRET + user.motDePasse
    const token = jwt.sign(
      { id: user.id, action: 'reset-password' },
      process.env.JWT_SECRET + user.motDePasse,
      { expiresIn: '30m' }
    );

    const protocol = req.headers['x-forwarded-proto'] || 'http';
    const host = req.headers.host;
    const resetUrl = `${protocol}://${host}/api/auth/reset-password?token=${token}&userId=${user.id}`;

    await sendResetEmail(user.email, resetUrl);

    res.json({ message: 'Si votre e-mail correspond à un compte, un lien de réinitialisation vous a été envoyé.' });
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

exports.renderResetPasswordPage = async (req, res) => {
  const { token, userId } = req.query;

  if (!token || !userId) {
    return res.status(400).send('Lien invalide. Paramètres manquants.');
  }

  try {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return res.status(404).send('Utilisateur non trouvé.');
    }

    // Vérifier si le token est valide et n'a pas expiré
    jwt.verify(token, process.env.JWT_SECRET + user.motDePasse);
  } catch (err) {
    return res.status(400).send(`
      <!DOCTYPE html>
      <html lang="fr">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>AttouHome - Lien Expiré</title>
        <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;800&display=swap" rel="stylesheet">
        <style>
          body {
            background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
            color: #f8fafc;
            min-height: 100vh;
            display: flex;
            justify-content: center;
            align-items: center;
            padding: 20px;
            font-family: 'Outfit', sans-serif;
            text-align: center;
          }
          .container {
            background: rgba(30, 41, 59, 0.7);
            backdrop-filter: blur(16px);
            border: 1px solid rgba(255, 255, 255, 0.08);
            border-radius: 24px;
            padding: 40px;
            width: 100%;
            max-width: 450px;
            box-shadow: 0 20px 40px rgba(0,0,0,0.3);
          }
          h1 { color: #f87171; font-size: 24px; font-weight: 800; margin-bottom: 15px; }
          p { color: #94a3b8; font-size: 14px; line-height: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>Lien expiré ou invalide ⚠️</h1>
          <p>Ce lien de réinitialisation du mot de passe a expiré (validité de 30 minutes) ou a déjà été utilisé. Veuillez refaire une demande depuis l'application mobile.</p>
        </div>
      </body>
      </html>
    `);
  }

  // Affiche une interface premium de réinitialisation du mot de passe
  res.send(`
    <!DOCTYPE html>
    <html lang="fr">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>AttouHome - Nouveau mot de passe</title>
      <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;800&display=swap" rel="stylesheet">
      <style>
        * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
          font-family: 'Outfit', sans-serif;
        }
        body {
          background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
          color: #f8fafc;
          min-height: 100vh;
          display: flex;
          justify-content: center;
          align-items: center;
          padding: 20px;
        }
        .container {
          background: rgba(30, 41, 59, 0.7);
          backdrop-filter: blur(16px);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 24px;
          padding: 40px;
          width: 100%;
          max-width: 450px;
          box-shadow: 0 20px 40px rgba(0,0,0,0.3);
          text-align: center;
          animation: fadeIn 0.6s ease-out;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(15px); }
          to { opacity: 1; transform: translateY(0); }
        }
        h1 {
          font-size: 28px;
          font-weight: 800;
          background: linear-gradient(to right, #0ea5e9, #38bdf8);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          margin-bottom: 10px;
        }
        p {
          color: #94a3b8;
          font-size: 14px;
          margin-bottom: 30px;
        }
        .form-group {
          text-align: left;
          margin-bottom: 20px;
        }
        label {
          display: block;
          font-size: 12px;
          font-weight: 600;
          text-transform: uppercase;
          color: #38bdf8;
          margin-bottom: 8px;
          letter-spacing: 0.5px;
        }
        input {
          width: 100%;
          background: rgba(15, 23, 42, 0.6);
          border: 1.5px solid #334155;
          border-radius: 12px;
          padding: 14px 16px;
          font-size: 16px;
          color: #fff;
          transition: all 0.3s ease;
        }
        input:focus {
          outline: none;
          border-color: #0ea5e9;
          box-shadow: 0 0 12px rgba(14, 165, 233, 0.2);
        }
        .btn {
          width: 100%;
          background: #0ea5e9;
          color: #fff;
          border: none;
          border-radius: 12px;
          padding: 16px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          margin-top: 10px;
          box-shadow: 0 4px 14px rgba(14, 165, 233, 0.3);
        }
        .btn:hover {
          background: #0284c7;
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(14, 165, 233, 0.4);
        }
        .btn:active {
          transform: translateY(0);
        }
        .status-message {
          margin-top: 20px;
          padding: 12px;
          border-radius: 10px;
          font-size: 14px;
          display: none;
        }
        .success {
          background: rgba(16, 185, 129, 0.15);
          border: 1px solid #10b981;
          color: #34d399;
          display: block;
        }
        .error {
          background: rgba(239, 68, 68, 0.15);
          border: 1px solid #ef4444;
          color: #f87171;
          display: block;
        }
      </style>
    </head>
    <body>
      <div class="container" id="form-container">
        <h1>AttouHome</h1>
        <p>Saisissez votre nouveau mot de passe ci-dessous.</p>
        
        <form id="reset-form">
          <div class="form-group">
            <label for="password">Nouveau mot de passe</label>
            <input type="password" id="password" required minlength="6" placeholder="••••••••">
          </div>
          
          <div class="form-group">
            <label for="confirm">Confirmer le mot de passe</label>
            <input type="password" id="confirm" required minlength="6" placeholder="••••••••">
          </div>

          <button type="submit" class="btn" id="submit-btn">Mettre à jour le mot de passe</button>
        </form>
        
        <div id="status" class="status-message"></div>
      </div>

      <script>
        const form = document.getElementById('reset-form');
        const statusDiv = document.getElementById('status');
        const submitBtn = document.getElementById('submit-btn');

        form.addEventListener('submit', async (e) => {
          e.preventDefault();
          statusDiv.style.display = 'none';
          statusDiv.className = 'status-message';
          
          const password = document.getElementById('password').value;
          const confirm = document.getElementById('confirm').value;

          if (password !== confirm) {
            statusDiv.innerText = 'Les mots de passe ne correspondent pas.';
            statusDiv.classList.add('error');
            return;
          }

          try {
            submitBtn.disabled = true;
            submitBtn.innerText = 'Mise à jour en cours...';

            const response = await fetch('/api/auth/reset-password', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                userId: '${userId}',
                token: '${token}',
                newPassword: password
              })
            });

            const data = await response.json();
            
            if (response.ok) {
              document.getElementById('form-container').innerHTML = \`
                <h1 style="color: #34d399;">Succès ! 🎉</h1>
                <p style="margin-top: 15px; font-size: 16px; color: #f8fafc;">Votre mot de passe a été modifié avec succès.</p>
                <p style="margin-top: 10px; color: #94a3b8;">Vous pouvez maintenant fermer ce navigateur et vous connecter à votre application mobile.</p>
              \`;
            } else {
              statusDiv.innerText = data.message || 'Une erreur est survenue.';
              statusDiv.classList.add('error');
              submitBtn.disabled = false;
              submitBtn.innerText = 'Mettre à jour le mot de passe';
            }
          } catch (err) {
            statusDiv.innerText = 'Connexion au serveur impossible.';
            statusDiv.classList.add('error');
            submitBtn.disabled = false;
            submitBtn.innerText = 'Mettre à jour le mot de passe';
          }
        });
      </script>
    </body>
    </html>
  `);
};


exports.resetPassword = async (req, res) => {
  try {
    const { userId, token, newPassword } = req.body;

    if (!userId || !token || !newPassword) {
      return res.status(400).json({ message: 'Tous les champs sont obligatoires.' });
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return res.status(404).json({ message: 'Utilisateur non trouvé.' });
    }

    // Vérifier le jeton en utilisant l'ancien hash du mot de passe de l'utilisateur comme partie du secret
    try {
      jwt.verify(token, process.env.JWT_SECRET + user.motDePasse);
    } catch (err) {
      return res.status(400).json({ message: 'Le lien de réinitialisation est invalide ou a expiré.' });
    }

    // Hasher le nouveau mot de passe et mettre à jour
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { id: userId },
      data: { motDePasse: hashedPassword }
    });

    res.json({ message: 'Votre mot de passe a été réinitialisé avec succès.' });
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};
