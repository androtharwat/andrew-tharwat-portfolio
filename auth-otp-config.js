(() => {
  const OTP_LENGTH = 8;
  window.ATS_AUTH = Object.freeze({
    otpLength: OTP_LENGTH,
    otpLabel: OTP_LENGTH + '-DIGIT LOGIN CODE'
  });
})();