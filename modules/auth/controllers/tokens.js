const jwt = require('jsonwebtoken');
const config = require('config');
const User = require('../../user/models/User');
const BlackToken = require('../models/BlackToken');

function createAccessAndRefreshTokens(user) {
  const accessTokenExpiresIn = 60 * 30; // 60sec * 30 = 30min
  const refreshTokenExpiresIn = 86400 * 30; // 86400inOneDay * 30 = 30days

  const access_token = jwt.sign({ _id: user._id }, config.secretOrKey, {
    algorithm: config.jsonwebtoken.algorithm,
    expiresIn: accessTokenExpiresIn
  });

  const refresh_token = jwt.sign({ _id: user._id }, config.secretOrKey, {
    algorithm: config.jsonwebtoken.algorithm,
    expiresIn: refreshTokenExpiresIn
  });

  return {
    access_token,
    refresh_token,
    access_token_expiration_date: Date.now() * accessTokenExpiresIn * 1000,
    refresh_token_expiration_date: Date.now() * refreshTokenExpiresIn * 1000
  };
}

function setCookiesAndTokens(ctx, tokens) {
  const cookiesOptions = {
    signed: true,
    secure: false,
    httpOnly: true
  };

  ctx.cookies.set('x-access-token', tokens.access_token, {
    ...cookiesOptions,
    expires: new Date(tokens.access_token_expiration_date)
  });

  ctx.cookies.set('x-refresh-token', tokens.refresh_token, {
    ...cookiesOptions,
    expires: new Date(tokens.refresh_token_expiration_date)
  });
}

async function refreshTokens(ctx) {
  const accessToken = ctx.headers['x-access-token'] ||
                      ctx.query.access_token ||
                      ctx.cookies.get('x-access-token') ||
                      ctx.body && ctx.body.access_token;

  const refreshToken = ctx.headers['x-refresh-token'] ||
                      ctx.query.refresh_token ||
                      ctx.cookies.get('x-refresh-token') ||
                      ctx.body && ctx.body.refresh_token;

  try {
    const decoded = jwt.decode(refreshToken);
    const userId = decoded._id;
    const user = await User.findOne({ _id: userId }).lean().exec();

    if (!accessToken || !refreshToken) return ctx.throw(401, 'No token!');
    if (!user) return ctx.throw(500, 'Invalid token!');

    await Promise.all([accessToken, refreshToken].map(token => {
      const verifyOptions = {
        algorithm: [config.jsonwebtoken.algorithm],
        ignoreExpiration: true
      };
      const expires = jwt.verify(token, config.secretOrKey, verifyOptions).exp;
      const blackToken = new BlackToken({
        token,
        expiresIn: expires * 1000
      });
      return blackToken.save();
    }));
    const createTokens = createAccessAndRefreshTokens(user);
    setCookiesAndTokens(ctx, createTokens);
    ctx.type = 'json';
    ctx.body = createTokens;
  } catch (err) {
    ctx.cookies.set('x-access-token', null);
    ctx.cookies.set('x-refresh-token', null);
    return ctx.throw(401, 'Refresh token validation error!');
  }
}

exports.refreshTokens = refreshTokens;
exports.createAccessAndRefreshTokens = createAccessAndRefreshTokens;
exports.setCookiesAndTokens = setCookiesAndTokens;