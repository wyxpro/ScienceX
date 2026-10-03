const express = require('express');
const { validate } = require('./validation');
const { asyncHandler } = require('./respond');
const { getContract } = require('../../shared/api-schemas');

const registeredRoutes = [];
function createRouter() {
  const router = express.Router();
  for (const method of ['get', 'post', 'put', 'patch', 'delete']) {
    const original = router[method].bind(router);
    router[method] = (path, ...handlers) => {
      const schemas = getContract(method, path);
      const authenticated = handlers[0]?.name === 'auth';
      registeredRoutes.push({ method, path, schemas, authenticated });
      const prefix = authenticated ? [handlers.shift()] : [];
      return original(path, ...prefix, validate(schemas), ...handlers.map(asyncHandler));
    };
  }
  return router;
}
module.exports = { createRouter, registeredRoutes };
