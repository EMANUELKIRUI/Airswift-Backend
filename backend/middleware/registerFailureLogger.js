const logRegisterFailure = (req, res, next) => {
  const originalJson = res.json.bind(res);

  res.json = (payload) => {
    const statusCode = res.statusCode || 200;

    if (statusCode >= 400) {
      const responseReason =
        payload && typeof payload === 'object'
          ? payload.message || payload.error || JSON.stringify(payload)
          : String(payload);

      console.error("[REGISTER FAILURE]", {
        endpoint: req.originalUrl || req.url,
        method: req.method,
        statusCode,
        requestPayload: req.body,
        responseReason,
        responseBody: payload,
      });
    }

    return originalJson(payload);
  };

  next();
};

module.exports = {
  logRegisterFailure,
};
