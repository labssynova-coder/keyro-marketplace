function validate(schema) {
  return (req, res, next) => {
    const keys = Object.keys(schema);
    const errors = [];

    for (const key of keys) {
      if (schema[key]) {
        const { error } = schema[key].validate(req[key], { abortEarly: false });
        if (error) {
          error.details.forEach(d => errors.push(d.message));
        }
      }
    }

    if (errors.length) {
      return res.status(422).json({ errors });
    }
    next();
  };
}

module.exports = validate;