const express = require('express');
const router = express.Router();
const upload = require('../middleware/upload');
const { protect } = require('../middleware/authMiddleware');
const cloudinary = require('../config/cloudinary');
const fs = require('fs');

router.post('/', protect, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Aucun fichier fourni' });
    }

    // Upload to Cloudinary
    const result = await cloudinary.uploader.upload(req.file.path, {
      folder: 'attouhome',
    });

    // Supprimer le fichier local après téléchargement réussi pour libérer de l'espace disque
    try {
      fs.unlinkSync(req.file.path);
    } catch (unlinkError) {
      console.error('Error deleting temp file:', unlinkError);
    }

    res.status(201).json({ url: result.secure_url });
  } catch (error) {
    // Supprimer le fichier local s'il existe et que le chargement a échoué
    if (req.file && req.file.path) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (unlinkError) {
        console.error('Error deleting temp file on failure:', unlinkError);
      }
    }
    res.status(500).json({ message: 'Erreur lors du chargement de l\'image sur Cloudinary', error: error.message });
  }
});

module.exports = router;
