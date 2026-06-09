const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'AttouNest API Documentation',
      version: '1.0.0',
      description: 'API pour la plateforme immobilière AttouNest (Admin, Propriétaire, Locataire)',
      contact: {
        name: 'Support AttouNest',
      },
    },
    servers: [
      {
        url: 'http://localhost:5000',
        description: 'Serveur de développement local',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
  },
  apis: ['./routes/*.js', './controllers/*.js'], // Scanner les routes et contrôleurs pour JSDoc
};

const specs = swaggerJsdoc(options);
module.exports = specs;
