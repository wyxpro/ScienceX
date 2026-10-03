const { fail } = require('./respond');

function validate(schemas = {}) {
  return (req, res, next) => {
    for (const location of ['params', 'query', 'body']) {
      if (!schemas[location]) continue;
      const parsed = schemas[location].safeParse(req[location] ?? {});
      if (!parsed.success) {
        return fail(res, 400, 40011, '参数校验失败', parsed.error.issues.map((issue) => ({
          field: [location, ...issue.path].join('.'), message: issue.message,
        })));
      }
      req[location] = parsed.data;
    }
    next();
  };
}

module.exports = { validate };
