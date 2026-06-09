const nodemailer = require('nodemailer');

/**
 * Envoie un e-mail de réinitialisation de mot de passe.
 * - Si SMTP_HOST + SMTP_USER sont définis dans .env → e-mail réel
 * - Sinon → simulation Ethereal (lien visible dans le terminal)
 * Dans tous les cas, le lien est affiché dans le terminal pour faciliter le dev.
 */
const sendResetEmail = async (toEmail, resetUrl) => {
  // ─── Toujours afficher le lien dans le terminal (utile en dev) ───
  console.log('\n╔═══════════════════════════════════════════════════════╗');
  console.log('║          🔑 LIEN DE RÉINITIALISATION DU MOT DE PASSE          ║');
  console.log('╠═══════════════════════════════════════════════════════╣');
  console.log(`║  Destinataire : ${toEmail}`);
  console.log(`║  Lien         : ${resetUrl}`);
  console.log('╚═══════════════════════════════════════════════════════╝\n');

  // ─── Envoi d'e-mail réel si SMTP configuré ───
  if (process.env.SMTP_HOST && process.env.SMTP_USER) {
    try {
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        }
      });

      await transporter.sendMail({
        from: `"AttouHome Support" <${process.env.SMTP_USER}>`,
        to: toEmail,
        subject: 'Réinitialisation de votre mot de passe — AttouHome',
        html: `
          <div style="font-family:'Segoe UI',sans-serif;max-width:600px;margin:0 auto;background:#f8fafc;padding:30px;border-radius:16px;">
            <div style="background:linear-gradient(135deg,#0ea5e9,#0284c7);padding:30px;border-radius:12px;text-align:center;margin-bottom:30px;">
              <h1 style="color:#fff;margin:0;font-size:28px;">🏠 AttouHome</h1>
            </div>
            <div style="background:#fff;padding:30px;border-radius:12px;box-shadow:0 2px 10px rgba(0,0,0,0.05);">
              <h2 style="color:#1e293b;margin-top:0;">Réinitialisation du mot de passe</h2>
              <p style="color:#64748b;line-height:1.6;">Bonjour,</p>
              <p style="color:#64748b;line-height:1.6;">Vous avez demandé la réinitialisation de votre mot de passe. Cliquez sur le bouton ci-dessous pour créer un nouveau mot de passe :</p>
              <div style="text-align:center;margin:35px 0;">
                <a href="${resetUrl}" style="background:#0ea5e9;color:#fff;padding:14px 32px;text-decoration:none;border-radius:10px;font-weight:bold;font-size:16px;display:inline-block;">
                  Réinitialiser mon mot de passe
                </a>
              </div>
              <p style="color:#94a3b8;font-size:13px;">⏰ Ce lien expire dans <strong>1 heure</strong>.</p>
              <p style="color:#94a3b8;font-size:13px;">Si vous n'avez pas fait cette demande, ignorez cet e-mail.</p>
            </div>
            <p style="color:#cbd5e1;font-size:12px;text-align:center;margin-top:20px;">© 2026 AttouHome · Tous droits réservés</p>
          </div>
        `
      });
      console.log(`[Mailer] ✅ E-mail envoyé avec succès à ${toEmail}`);
    } catch (err) {
      console.error(`[Mailer] ❌ Échec envoi SMTP: ${err.message}`);
      console.log('[Mailer] ➡️  Utilisez le lien affiché ci-dessus dans votre terminal.');
    }
    return;
  }

  // ─── Fallback : Ethereal Email (mode dev sans SMTP) ───
  try {
    const testAccount = await nodemailer.createTestAccount();
    const testTransporter = nodemailer.createTransport({
      host: testAccount.smtp.host,
      port: testAccount.smtp.port,
      secure: testAccount.smtp.secure,
      auth: { user: testAccount.user, pass: testAccount.pass }
    });

    const info = await testTransporter.sendMail({
      from: '"AttouHome (Dev)" <noreply@attouhome.dev>',
      to: toEmail,
      subject: 'Réinitialisation mot de passe (Dev)',
      html: `<p>Cliquez <a href="${resetUrl}">ici</a> pour réinitialiser votre mot de passe.</p>`
    });

    const previewUrl = nodemailer.getTestMessageUrl(info);
    console.log(`[Mailer] 📬 Aperçu Ethereal (boîte de simulation) : ${previewUrl}\n`);
  } catch (etherealErr) {
    console.log(`[Mailer] ℹ️  Ethereal indisponible. Utilisez le lien affiché ci-dessus directement.\n`);
  }
};

module.exports = { sendResetEmail };
