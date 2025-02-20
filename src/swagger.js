import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'API Documentation',
      version: '1.0.0',
      description: 'API documentation for your backend services',
    },
    servers: [
      {
        url: 'http://localhost:8000', // Update with your backend server URL
      },
    ],
  },
  apis: ["./src/routes/**/*.js"], // Path to your route files
};

const specs = swaggerJsdoc(options);
console.log("Swagger Docs:", specs);

export default (app) => {
  console.log("✅ Applying Swagger middleware...");
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs));
};
