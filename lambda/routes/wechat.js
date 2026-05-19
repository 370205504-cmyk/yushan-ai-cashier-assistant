const express = require('express');
const wechatService = require('../services/wechatService');
const authService = require('../services/authService');
const { optionalAuth } = require('../middleware/auth');

const router = express.Router();

router.get('/authorize', (req, res) => {
  const state = req.query.state || 'web';
  const redirectUrl = wechatService.getAuthorizeUrl(state);
  res.redirect(redirectUrl);
});

router.get('/callback', async (req, res) => {
  const { code, state } = req.query;

  if (!code) {
    return res.status(400).json({ success: false, message: '授权码不能为空' });
  }

  try {
    const tokenResult = await wechatService.getAccessToken(code);
    if (!tokenResult.success) {
      return res.status(400).json({ success: false, message: tokenResult.message });
    }

    const userInfoResult = await wechatService.getUserInfo(
      tokenResult.accessToken,
      tokenResult.openid
    );

    const openid = tokenResult.openid;
    const userInfo = userInfoResult.success ? userInfoResult.userInfo : {};

    const wechatLoginResult = await authService.wechatLogin(
      openid,
      userInfo.nickname || '微信用户',
      userInfo.headimgurl || ''
    );

    if (wechatLoginResult.success) {
      res.redirect(`/mobile?token=${wechatLoginResult.token}&type=wechat`);
    } else {
      res.redirect(`/mobile?error=${encodeURIComponent(wechatLoginResult.message)}`);
    }
  } catch (error) {
    console.error('微信回调处理失败:', error);
    res.redirect('/mobile?error=授权处理失败');
  }
});

router.post('/login', async (req, res) => {
  const { code } = req.body;

  if (!code) {
    return res.status(400).json({ success: false, message: '授权码不能为空' });
  }

  try {
    const tokenResult = await wechatService.getAccessToken(code);
    if (!tokenResult.success) {
      return res.status(400).json({ success: false, message: tokenResult.message });
    }

    const userInfoResult = await wechatService.getUserInfo(
      tokenResult.accessToken,
      tokenResult.openid
    );

    const openid = tokenResult.openid;
    const userInfo = userInfoResult.success ? userInfoResult.userInfo : {};

    const loginResult = await authService.wechatLogin(
      openid,
      userInfo.nickname || '微信用户',
      userInfo.headimgurl || ''
    );

    res.json(loginResult);
  } catch (error) {
    console.error('微信登录失败:', error);
    res.status(500).json({ success: false, message: '登录失败' });
  }
});

router.get('/qrcode', optionalAuth, async (req, res) => {
  try {
    const state = req.userId ? `user_${req.userId}` : 'guest';
    const url = wechatService.getAuthorizeUrl(state);
    res.json({ success: true, authorizeUrl: url });
  } catch (error) {
    res.status(500).json({ success: false, message: '获取授权链接失败' });
  }
});

router.get('/check', optionalAuth, (req, res) => {
  res.json({
    success: true,
    configured: !!(process.env.WECHAT_APPID && process.env.WECHAT_SECRET),
    enabled: !!(process.env.WECHAT_APPID && process.env.WECHAT_SECRET && process.env.WECHAT_MCHID)
  });
});

module.exports = router;
